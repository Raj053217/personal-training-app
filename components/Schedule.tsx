import React, { useState, useEffect } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, isSameDay, addDays, startOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, XCircle, X, Calendar as CalendarIcon, Clock, Filter } from 'lucide-react';

interface ScheduleProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ clients, onUpdateClient }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllStatus, setShowAllStatus] = useState(false); // Default to filtering for "Scheduled" only
  
  // Modal State
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // Reset rescheduling state when modal opens/closes
  useEffect(() => {
    if (activeSession) {
      setNewDate(activeSession.session.date);
      setNewTime(activeSession.session.time);
      setIsRescheduling(false);
    }
  }, [activeSession]);

  const getAllSessions = () => {
    const all: { session: Session; clientName: string; clientId: string }[] = [];
    clients.forEach(client => {
      client.sessions.forEach(session => {
        all.push({ session, clientName: client.name, clientId: client.id });
      });
    });
    return all.sort((a, b) => new Date(`${a.session.date}T${a.session.time}`).getTime() - new Date(`${b.session.date}T${b.session.time}`).getTime());
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  
  // 1. Filter by Date
  const daySessions = getAllSessions().filter(s => isSameDay(new Date(s.session.date), selectedDate));
  
  // 2. Filter by Status (User request: "see schedule session only")
  const displayedSessions = showAllStatus 
    ? daySessions 
    : daySessions.filter(s => !s.session.status || s.session.status === 'scheduled');

  const updateStatus = (status: SessionStatus) => {
    if (!activeSession) return;
    const client = clients.find(c => c.id === activeSession.clientId);
    if (client) {
        const updated = client.sessions.map(s => s.id === activeSession.session.id ? { ...s, status, completed: status === 'completed' } : s);
        onUpdateClient({ ...client, sessions: updated });
        setActiveSession(null);
    }
  };

  const handleReschedule = () => {
    if (!activeSession || !newDate || !newTime) return;
    const client = clients.find(c => c.id === activeSession.clientId);
    if (client) {
        // Update date, time, and reset status to scheduled (remove completed/cancelled flags)
        const updated = client.sessions.map(s => s.id === activeSession.session.id ? { 
            ...s, 
            date: newDate, 
            time: newTime, 
            status: 'scheduled' as SessionStatus, 
            completed: false 
        } : s);
        onUpdateClient({ ...client, sessions: updated });
        setActiveSession(null);
    }
  };

  const getSessionStyles = (status?: SessionStatus) => {
    switch (status) {
      case 'completed':
        return {
          container: 'border-green-400 bg-green-50/90 dark:bg-green-900/20 border',
          icon: <CheckCircle size={20} className="text-green-600 dark:text-green-500" fill="currentColor" stroke="white" strokeWidth={2.5} />,
          text: 'text-green-900 dark:text-green-100',
          metaText: 'text-green-700 dark:text-green-300',
          badge: 'bg-green-200/50 text-green-800 dark:bg-green-800/50 dark:text-green-200',
          opacity: ''
        };
      case 'missed':
        return {
          container: 'border-orange-400 bg-orange-50/90 dark:bg-orange-900/20 border',
          icon: <AlertCircle size={20} className="text-orange-600 dark:text-orange-500" strokeWidth={2.5} />,
          text: 'text-orange-900 dark:text-orange-100',
          metaText: 'text-orange-700 dark:text-orange-300',
          badge: 'bg-orange-200/50 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200',
          opacity: ''
        };
      case 'cancelled':
        return {
          container: 'border-red-400 bg-red-50/90 dark:bg-red-900/20 border',
          icon: <XCircle size={20} className="text-red-600 dark:text-red-500" strokeWidth={2.5} />,
          text: 'text-red-900 dark:text-red-100',
          metaText: 'text-red-700 dark:text-red-300',
          badge: 'bg-red-200/50 text-red-800 dark:bg-red-800/50 dark:text-red-200',
          opacity: 'opacity-80 grayscale-[0.2]'
        };
      default:
        return {
          container: 'border-l-ios-blue bg-white dark:bg-ios-card-dark border-transparent border-l-[4px] shadow-sm',
          icon: null,
          text: 'text-black dark:text-white',
          metaText: 'text-ios-gray',
          badge: 'hidden',
          opacity: ''
        };
    }
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       
       {/* Large Title & Filter Toggle */}
       <div className="pt-2 px-1 mb-4 flex justify-between items-end">
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Schedule</h1>
         <button 
           onClick={() => setShowAllStatus(!showAllStatus)}
           className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${showAllStatus ? 'bg-ios-blue text-white' : 'bg-gray-200 dark:bg-gray-800 text-ios-gray'}`}
         >
            <Filter size={12} />
            {showAllStatus ? 'All' : 'Scheduled Only'}
         </button>
      </div>

       {/* Calendar Strip */}
       <div className="bg-ios-card-light dark:bg-ios-card-dark shadow-sm pb-2 sticky top-0 z-10 mx-[-16px] px-[16px]">
          <div className="flex justify-between items-center py-2 px-2">
             <span className="text-[17px] font-semibold text-ios-red">{format(currentWeekStart, 'MMMM yyyy')}</span>
             <div className="flex gap-4">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}><ChevronLeft size={22} className="text-ios-red" /></button>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}><ChevronRight size={22} className="text-ios-red" /></button>
             </div>
          </div>
          <div className="flex justify-between mt-1">
            {weekDays.map(day => {
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              return (
                <button 
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center justify-center w-[45px] h-[60px] rounded-[10px] transition-all ${isSelected ? 'bg-ios-red shadow-md' : ''}`}
                >
                  <span className={`text-[11px] font-semibold uppercase mb-0.5 ${isSelected ? 'text-white' : 'text-ios-gray'}`}>{format(day, 'EEE')}</span>
                  <div className={`text-[20px] font-medium w-8 h-8 flex items-center justify-center rounded-full ${isSelected ? 'text-white' : isTodayDate ? 'bg-ios-red text-white' : 'text-black dark:text-white'}`}>
                    {format(day, 'd')}
                  </div>
                </button>
              );
            })}
          </div>
       </div>

       {/* Timeline List */}
       <div className="flex-1 mt-4 space-y-3 pb-24">
         {displayedSessions.length > 0 ? (
           displayedSessions.map((item) => {
             const styles = getSessionStyles(item.session.status);
             return (
               <div 
                 key={item.session.id} 
                 onClick={() => setActiveSession(item)}
                 className={`flex gap-4 cursor-pointer group ${styles.opacity}`}
               >
                  {/* Time Column */}
                  <div className="w-16 pt-1 text-right">
                      <span className="text-[15px] font-semibold text-black dark:text-white block">{item.session.time}</span>
                      <span className="text-[11px] text-ios-gray font-medium uppercase">{parseInt(item.session.time) >= 12 ? 'PM' : 'AM'}</span>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 p-3.5 rounded-[16px] relative overflow-hidden active:scale-[0.99] transition-all duration-200 ${styles.container}`}>
                      <div className="pr-8">
                        <h3 className={`text-[17px] font-bold leading-snug ${styles.text}`}>{item.clientName}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={13} className={styles.metaText} />
                          <p className={`text-[13px] font-medium ${styles.metaText}`}>Personal Training</p>
                        </div>
                      </div>
                      
                      {/* Status Indicators */}
                      <div className="absolute top-3.5 right-3.5 flex flex-col items-end gap-1">
                          {styles.icon}
                          {item.session.status && item.session.status !== 'scheduled' && (
                             <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 ${styles.badge}`}>
                               {item.session.status}
                             </span>
                          )}
                      </div>
                  </div>
               </div>
             );
           })
         ) : (
           <div className="flex flex-col items-center justify-center py-20 text-ios-gray">
             <CalendarIcon size={48} strokeWidth={1} className="mb-4 opacity-20" />
             <p className="text-[17px] font-medium">No Sessions</p>
             {!showAllStatus && daySessions.length > 0 && (
                <button onClick={() => setShowAllStatus(true)} className="mt-2 text-sm text-ios-blue font-medium">
                    Show {daySessions.length} hidden
                </button>
             )}
           </div>
         )}
       </div>

       {/* Action Modal */}
       {activeSession && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm p-4 animate-fadeIn">
             <div className="bg-ios-card-light dark:bg-ios-card-dark w-full max-w-sm rounded-[14px] overflow-hidden shadow-2xl animate-slideUp">
                <div className="p-4 border-b border-ios-separator-light dark:border-ios-separator-dark flex justify-between items-center">
                    <div>
                      <span className="font-semibold block text-black dark:text-white">
                        {isRescheduling ? 'Reschedule Session' : 'Manage Session'}
                      </span>
                      <span className="text-xs text-ios-gray">{activeSession.clientName} • {activeSession.session.time}</span>
                    </div>
                    <button onClick={() => setActiveSession(null)} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-ios-gray"><X size={16}/></button>
                </div>
                
                <div className="p-4 space-y-2">
                    {!isRescheduling ? (
                        /* Standard Actions */
                        <>
                            <button onClick={() => updateStatus('completed')} className="w-full py-3.5 rounded-[12px] bg-ios-green text-white font-semibold text-[17px] active:scale-[0.98] transition shadow-sm flex items-center justify-center gap-2">
                                <CheckCircle size={20} fill="currentColor" stroke="white" /> Mark Completed
                            </button>
                            
                            <button onClick={() => updateStatus('missed')} className="w-full py-3.5 rounded-[12px] bg-ios-orange text-white font-semibold text-[17px] active:scale-[0.98] transition shadow-sm flex items-center justify-center gap-2">
                                <AlertCircle size={20} /> Mark Missed
                            </button>
                            
                            <button onClick={() => setIsRescheduling(true)} className="w-full py-3.5 rounded-[12px] bg-ios-blue text-white font-semibold text-[17px] active:scale-[0.98] transition shadow-sm flex items-center justify-center gap-2">
                                <CalendarIcon size={20} /> Reschedule / Cancel
                            </button>

                            {activeSession.session.status && activeSession.session.status !== 'scheduled' && (
                                <button onClick={() => updateStatus('scheduled')} className="w-full py-3.5 rounded-[12px] bg-ios-gray5 dark:bg-[#3A3A3C] text-black dark:text-white font-semibold text-[17px] mt-2 active:scale-[0.98] transition">
                                    Reset to Scheduled
                                </button>
                            )}
                        </>
                    ) : (
                        /* Reschedule Workflow */
                        <div className="space-y-4">
                            <p className="text-center text-sm text-gray-500 mb-2">Change date or cancel permanently?</p>
                            
                            <div className="bg-white dark:bg-[#2C2C2E] p-3 rounded-xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">New Date</label>
                                    <input 
                                        type="date" 
                                        value={newDate} 
                                        onChange={(e) => setNewDate(e.target.value)} 
                                        className="bg-gray-100 dark:bg-black rounded-lg px-3 py-2 text-right"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">New Time</label>
                                    <input 
                                        type="time" 
                                        value={newTime} 
                                        onChange={(e) => setNewTime(e.target.value)} 
                                        className="bg-gray-100 dark:bg-black rounded-lg px-3 py-2 text-right"
                                    />
                                </div>
                            </div>

                            <button onClick={handleReschedule} className="w-full py-3.5 rounded-[12px] bg-ios-blue text-white font-semibold text-[17px] active:scale-[0.98] transition shadow-sm">
                                Confirm Reschedule
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => setIsRescheduling(false)} className="flex-1 py-3.5 rounded-[12px] bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-semibold text-[17px]">
                                    Back
                                </button>
                                <button onClick={() => updateStatus('cancelled')} className="flex-1 py-3.5 rounded-[12px] bg-ios-red text-white font-semibold text-[17px] active:scale-[0.98] transition shadow-sm">
                                    Cancel Session
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default Schedule;