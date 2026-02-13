
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, ChevronDown, LayoutGrid, List, CheckCircle2, CalendarDays, AlertCircle, Filter } from 'lucide-react';

interface ScheduleProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  viewingClient?: Client;
}

const Schedule: React.FC<ScheduleProps> = ({ clients, onUpdateClient, viewingClient }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(viewingClient ? viewingClient.id : 'all');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'missed' | 'cancelled'>('all');
  
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string; client: Client } | null>(null);
  
  // Modal States
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isHandlingMissed, setIsHandlingMissed] = useState(false);

  const [sessionIntensity, setSessionIntensity] = useState(7);
  const [sessionFeedback, setSessionFeedback] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (activeSession) {
      setNewDate(activeSession.session.date);
      setNewTime(activeSession.session.time);
      setSessionIntensity(activeSession.session.intensity || 7);
      setSessionFeedback(activeSession.session.feedback || '');
      // Reset all modal modes
      setIsRescheduling(false);
      setIsCompleting(false);
      setIsHandlingMissed(false);
    }
  }, [activeSession]);

  const allSessions = useMemo(() => {
    const all: { session: Session; clientName: string; clientId: string; client: Client; startHour: number; isDoubleBooked?: boolean }[] = [];
    
    clients.forEach(client => {
      if (viewingClient && client.id !== viewingClient.id) return;
      if (selectedClientId !== 'all' && client.id !== selectedClientId) return;

      client.sessions.forEach(session => {
         const effectiveStatus = session.status || (session.completed ? 'completed' : 'scheduled');
         
         // 1. Status Filter
         // If a specific status is selected, only show that status.
         if (statusFilter !== 'all' && effectiveStatus !== statusFilter) {
             return;
         }

         // 2. History Filter (Legacy toggle)
         // Only apply "Hide History" if we are in 'all' mode. 
         // If user explicitly asks for "Completed" or "Missed" via filter, show them regardless of history toggle.
         const isFinished = effectiveStatus === 'completed' || effectiveStatus === 'cancelled' || effectiveStatus === 'missed';
         if (statusFilter === 'all' && !showHistory && isFinished) {
             return;
         }
         
         const startHour = parseInt(session.time.split(':')[0]);
         all.push({ session, clientName: client.name, clientId: client.id, client, startHour });
      });
    });

    const timeMap: Record<string, number> = {};
    all.forEach(s => {
        const key = `${s.session.date}-${s.session.time}`;
        timeMap[key] = (timeMap[key] || 0) + 1;
    });

    return all.map(s => ({
        ...s,
        isDoubleBooked: timeMap[`${s.session.date}-${s.session.time}`] > 1 && s.session.status !== 'cancelled'
    })).sort((a, b) => a.session.time.localeCompare(b.session.time));
  }, [clients, viewingClient, selectedClientId, showHistory, statusFilter]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const weekStats = useMemo(() => {
      if (viewingClient) return null;
      let totalRevenue = 0;
      let totalSessions = 0;
      let completedCount = 0;

      const weekStart = currentWeekStart;
      const weekEnd = addDays(weekStart, 6);

      clients.forEach(c => {
          const sessionRate = c.totalFee / (c.sessions.length || 1);
          c.sessions.forEach(s => {
              const d = new Date(s.date);
              if (d >= weekStart && d <= weekEnd && s.status !== 'cancelled') {
                  totalSessions++;
                  totalRevenue += sessionRate;
                  if (s.status === 'completed' || s.completed) completedCount++;
              }
          });
      });

      return {
          revenue: Math.round(totalRevenue),
          count: totalSessions,
          completion: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0
      };
  }, [clients, currentWeekStart, viewingClient]);
  
  const updateStatus = (status: SessionStatus, extraData?: { intensity?: number, feedback?: string }) => {
    if (!activeSession) return;
    
    // Always find the freshest client object from props
    const client = clients.find(c => c.id === activeSession.clientId);
    if (client) {
        // Create new sessions array
        const updatedSessions = client.sessions.map(s => s.id === activeSession.session.id ? { 
          ...s, 
          status: status, 
          completed: status === 'completed', 
          intensity: extraData?.intensity, 
          feedback: extraData?.feedback
        } : s);

        // Update Client via prop callback - this triggers app-wide re-render
        onUpdateClient({ ...client, sessions: updatedSessions });
        
        // Close modal immediately
        setActiveSession(null);
    }
  };

  const handleReschedule = () => {
      if (!activeSession || !newDate || !newTime) return;
      const client = clients.find(c => c.id === activeSession.clientId);
      if (client) {
          const updated = client.sessions.map(s => s.id === activeSession.session.id ? {
              ...s, date: newDate, time: newTime, status: 'scheduled' as SessionStatus, completed: false
          } : s);
          onUpdateClient({ ...client, sessions: updated });
          setActiveSession(null);
      }
  };

  const renderDayView = () => {
      const hours = Array.from({ length: 17 }, (_, i) => 5 + i); // 05:00 to 21:00
      const sessionsToday = allSessions.filter(s => s.session.date === format(selectedDate, 'yyyy-MM-dd'));

      return (
          <div className="space-y-4 animate-slideUp">
              <div className="flex justify-between items-center px-2 py-2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-4">
                   <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"><ChevronLeft size={20}/></button>
                   <div className="text-center">
                       <h2 className="text-lg font-black text-black dark:text-white">{format(selectedDate, 'EEEE')}</h2>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{format(selectedDate, 'MMM do')}</p>
                   </div>
                   <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"><ChevronRight size={20}/></button>
              </div>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-white/5 relative">
                  {hours.map(hour => {
                      const hourSessions = sessionsToday.filter(s => s.startHour === hour);
                      return (
                          <div key={hour} className="flex gap-4 min-h-[80px] group">
                              <div className="w-10 text-right pt-0.5">
                                  <span className="text-[10px] font-bold text-gray-400">{hour > 12 ? `${hour-12} PM` : `${hour} AM`}</span>
                              </div>
                              <div className="flex-1 border-l-2 border-gray-100 dark:border-white/5 pl-4 pb-4 relative">
                                  {hourSessions.length > 0 ? (
                                      <div className="grid grid-cols-1 gap-2">
                                          {hourSessions.map((item, idx) => {
                                              const isCompleted = item.session.status === 'completed' || item.session.completed;
                                              const status = item.session.status || (isCompleted ? 'completed' : 'scheduled');
                                              
                                              return (
                                                  <div 
                                                    key={idx} 
                                                    onClick={() => setActiveSession(item)}
                                                    className={`p-3 rounded-2xl cursor-pointer active:scale-95 transition-all relative overflow-hidden shadow-sm ${
                                                        isCompleted ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 
                                                        item.isDoubleBooked ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600' :
                                                        status === 'missed' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700' :
                                                        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    }`}
                                                  >
                                                      <h3 className="font-black text-sm">{item.clientName}</h3>
                                                      <p className="text-[10px] font-bold opacity-70 uppercase tracking-wide flex items-center gap-1 mt-0.5"><Clock size={10}/> {item.session.time}</p>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  ) : (
                                      <div className="h-full w-full rounded-2xl border-2 border-dashed border-transparent group-hover:border-gray-100 dark:group-hover:border-white/5 transition-colors"></div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderWeekView = () => {
    const morningHours = Array.from({ length: 7 }, (_, i) => 5 + i); // 5 to 11
    const eveningHours = Array.from({ length: 5 }, (_, i) => 17 + i); // 17 to 21

    const GridSection = ({ title, hours, colorClass }: { title: string, hours: number[], colorClass: string }) => (
        <div className="mb-6 animate-slideUp">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>{title}
            </h3>
            
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto no-scrollbar">
                <div className="min-w-[700px]">
                    <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="p-3 text-[9px] font-bold text-gray-300 uppercase text-center self-center sticky left-0 bg-gray-50 dark:bg-[#1C1C1E] z-10">Time</div>
                        {weekDays.map(day => {
                            const isDayToday = isToday(day);
                            return (
                                <div key={day.toString()} className={`py-3 text-center border-r border-gray-100 dark:border-white/5 last:border-0 ${isDayToday ? 'bg-blue-50/30' : ''}`}>
                                    <span className={`text-[9px] font-black uppercase block ${isDayToday ? 'text-blue-600' : 'text-gray-400'}`}>{format(day, 'EEE')}</span>
                                    <span className={`text-xs font-bold ${isDayToday ? 'text-blue-600' : 'text-black dark:text-white'}`}>{format(day, 'd')}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] group min-h-[70px]">
                                <div className="sticky left-0 z-10 bg-white dark:bg-[#1C1C1E] border-r border-gray-100 dark:border-white/5 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-gray-400">{hour > 12 ? (hour - 12) : hour}</span>
                                </div>
                                {weekDays.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const sessions = allSessions.filter(s => s.session.date === dateStr && s.startHour === hour);
                                    return (
                                        <div key={day.toString()} className="relative border-r border-gray-100 dark:border-white/5 last:border-0 p-1 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                            {sessions.map((s, idx) => {
                                                 const isCompleted = s.session.status === 'completed' || s.session.completed;
                                                 const status = s.session.status || (isCompleted ? 'completed' : 'scheduled');
                                                 
                                                 const style = status === 'completed' ? 'bg-green-500 text-white' : 
                                                               status === 'missed' ? 'bg-orange-500 text-white' :
                                                               status === 'cancelled' ? 'bg-red-500 text-white opacity-50' :
                                                               'bg-black dark:bg-white text-white dark:text-black';
                                                 return (
                                                     <div key={idx} onClick={() => setActiveSession(s)} className={`p-1.5 rounded-lg cursor-pointer ${style} shadow-sm text-[9px] font-bold truncate mb-1 active:scale-95 transition-transform`}>
                                                         {s.clientName.split(' ')[0]}
                                                     </div>
                                                 );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="mt-4 pb-32 px-1">
            <GridSection title="Morning Slots" hours={morningHours} colorClass="bg-orange-400" />
            <GridSection title="Evening Slots" hours={eveningHours} colorClass="bg-indigo-500" />
        </div>
    );
  };

  const renderListView = () => {
      const grouped: Record<string, typeof allSessions> = {};
      allSessions.forEach(s => {
          if (!grouped[s.session.date]) grouped[s.session.date] = [];
          grouped[s.session.date].push(s);
      });
      const dates = Object.keys(grouped).sort();

      return (
          <div className="space-y-6 animate-slideUp pb-24">
              {dates.map(date => (
                  <div key={date}>
                      <div className="sticky top-0 bg-[#F2F2F7]/90 dark:bg-black/90 backdrop-blur-md z-10 py-3 mb-2 flex items-center gap-3">
                          <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">{format(new Date(date), 'EEEE, MMM do')}</h3>
                          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1"></div>
                      </div>
                      <div className="space-y-3">
                          {grouped[date].map((item, idx) => (
                              <div key={idx} onClick={() => setActiveSession(item)} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex gap-4 cursor-pointer active:scale-[0.99] transition">
                                  <div className="w-16 flex flex-col items-center justify-center border-r border-gray-100 dark:border-white/5 pr-4">
                                      <span className="text-xl font-black text-black dark:text-white">{item.session.time.split('-')[0]}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-black dark:text-white text-lg">{item.clientName}</h4>
                                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Personal Training</p>
                                  </div>
                                  <div className="flex items-center">
                                      {item.session.status === 'completed' || item.session.completed
                                        ? <CheckCircle2 className="text-green-500" size={24}/> 
                                        : item.session.status === 'missed' ? <AlertCircle className="text-orange-500" size={24}/>
                                        : item.session.status === 'cancelled' ? <X className="text-red-500" size={24}/>
                                        : <div className="w-4 h-4 rounded-full border-[3px] border-gray-300 dark:border-gray-600" />
                                      }
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
              {dates.length === 0 && <div className="text-center py-20 text-gray-400 font-medium">No sessions found matching filters.</div>}
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="pt-2 px-1 mb-6">
         <div className="flex justify-between items-end mb-6">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Calendar</p>
                <h1 className="text-[34px] font-black text-black dark:text-white tracking-tight leading-none">Schedule</h1>
             </div>
             
             <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                 <button onClick={() => setViewMode('day')} className={`p-2 rounded-lg transition-all ${viewMode === 'day' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}><CalendarDays size={18}/></button>
                 <button onClick={() => setViewMode('week')} className={`p-2 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`}><List size={18}/></button>
             </div>
         </div>

         {/* Stats Bar */}
         {weekStats && (
             <div className="grid grid-cols-3 gap-3 mb-6 animate-slideUp">
                 <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Revenue</p>
                     <p className="text-lg font-black text-green-500">${weekStats.revenue}</p>
                 </div>
                 <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Count</p>
                     <p className="text-lg font-black text-blue-500">{weekStats.count}</p>
                 </div>
                 <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Done</p>
                     <p className="text-lg font-black text-purple-500">{weekStats.completion}%</p>
                 </div>
             </div>
         )}

         {/* Week Control */}
         <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-4">
            <button onClick={() => { setCurrentWeekStart(subWeeks(currentWeekStart, 1)); setSelectedDate(subWeeks(selectedDate, 1)); }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-400"><ChevronLeft size={20}/></button>
            <div className="text-center cursor-pointer" onClick={() => { setCurrentWeekStart(startOfWeek(new Date(), {weekStartsOn: 1})); setSelectedDate(new Date()); }}>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">This Week</span>
                <span className="text-sm font-bold text-black dark:text-white">{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}</span>
            </div>
            <button onClick={() => { setCurrentWeekStart(addWeeks(currentWeekStart, 1)); setSelectedDate(addWeeks(selectedDate, 1)); }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-400"><ChevronRight size={20}/></button>
         </div>

         {/* Filters Row */}
         <div className="flex flex-col sm:flex-row gap-3">
             {/* Client Selector */}
             {!viewingClient && (
                <div className="relative flex-1 group">
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full appearance-none bg-white dark:bg-[#1C1C1E] text-black dark:text-white py-3 pl-4 pr-10 rounded-2xl text-xs font-bold shadow-sm outline-none border border-gray-100 dark:border-white/5 transition-all focus:border-blue-500">
                        <option value="all">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
             )}
             
             {/* Status Filter */}
             <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <Filter size={14} />
                </div>
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)} 
                    className="w-full appearance-none bg-white dark:bg-[#1C1C1E] text-black dark:text-white py-3 pl-10 pr-10 rounded-2xl text-xs font-bold shadow-sm outline-none border border-gray-100 dark:border-white/5 transition-all focus:border-blue-500 uppercase"
                >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
             </div>

             {/* Legacy History Toggle (Only visible if 'All' is selected to prevent logic confusion) */}
             {statusFilter === 'all' && (
                 <button onClick={() => setShowHistory(!showHistory)} className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border shrink-0 ${showHistory ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-gray-100 dark:border-white/5'}`}>
                     {showHistory ? 'History: On' : 'History: Off'}
                 </button>
             )}
         </div>
       </div>

       <div className="flex-1 overflow-y-auto px-1 no-scrollbar">
           {viewMode === 'day' && renderDayView()}
           {viewMode === 'week' && renderWeekView()}
           {viewMode === 'list' && renderListView()}
       </div>

       {/* Session Detail Modal */}
       {activeSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-fadeIn">
             <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[40px] shadow-2xl animate-scaleIn overflow-hidden">
                <div className="relative h-24 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex justify-end">
                    <button onClick={() => setActiveSession(null)} className="p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition backdrop-blur-md"><X size={20}/></button>
                </div>
                <div className="px-8 pb-8 -mt-10">
                    <div className="bg-white dark:bg-[#2C2C2E] w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-lg mb-4 mx-auto">
                        {viewingClient ? '💪' : '📅'}
                    </div>
                    
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-black dark:text-white mb-1">{activeSession.clientName}</h2>
                        <div className="flex items-center justify-center gap-2">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full">{format(new Date(activeSession.session.date), 'EEE, MMM do')}</span>
                             <span className="text-xs font-bold text-blue-500 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">{activeSession.session.time}</span>
                        </div>
                    </div>

                    {!viewingClient && (
                        <div className="space-y-3">
                            {isCompleting ? (
                                <div className="space-y-4 animate-fadeIn bg-gray-50 dark:bg-white/5 p-4 rounded-3xl">
                                    <h3 className="text-center font-black text-sm uppercase text-gray-400">Session Report</h3>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Intensity Level</label>
                                        <input type="range" min="1" max="10" step="1" value={sessionIntensity} onChange={(e) => setSessionIntensity(parseInt(e.target.value))} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer" />
                                        <div className="flex justify-between text-[9px] font-bold text-gray-400 mt-1"><span>Light</span><span>Intense</span></div>
                                    </div>
                                    <textarea value={sessionFeedback} onChange={(e) => setSessionFeedback(e.target.value)} placeholder="Notes..." className="w-full bg-white dark:bg-black/20 p-3 rounded-xl text-sm outline-none resize-none h-20" />
                                    <button onClick={() => updateStatus('completed', { intensity: sessionIntensity, feedback: sessionFeedback })} className="w-full py-3 rounded-xl bg-green-500 text-white font-bold shadow-lg shadow-green-500/20">Finish</button>
                                </div>
                            ) : isHandlingMissed ? (
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-3xl animate-fadeIn">
                                    <h3 className="text-center font-black text-sm uppercase text-orange-500 mb-4 flex items-center justify-center gap-2">
                                        <AlertCircle size={16} /> Session Missed?
                                    </h3>
                                    
                                    {!isRescheduling ? (
                                        <div className="space-y-3">
                                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2 font-medium">Would you like to reschedule this session?</p>
                                            <button onClick={() => setIsRescheduling(true)} className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition">Yes, Reschedule</button>
                                            <button onClick={() => updateStatus('missed')} className="w-full py-3 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-300 font-bold active:scale-95 transition">No, Just Mark Missed</button>
                                            <button onClick={() => setIsHandlingMissed(false)} className="w-full py-2 text-xs text-gray-400 font-bold hover:text-black dark:hover:text-white transition">Back</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 animate-fadeIn">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">New Date</label>
                                                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-white dark:bg-black/20 p-3 rounded-xl text-sm font-bold outline-none text-black dark:text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">New Time</label>
                                                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-white dark:bg-black/20 p-3 rounded-xl text-sm font-bold outline-none text-black dark:text-white" />
                                            </div>

                                            <button onClick={handleReschedule} className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 mt-2 active:scale-95 transition">Confirm New Time</button>
                                            <button onClick={() => setIsRescheduling(false)} className="w-full py-2 text-xs text-gray-400 font-bold hover:text-black dark:hover:text-white transition">Cancel</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                <button onClick={() => setIsCompleting(true)} className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg active:scale-95 transition">Mark Complete</button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIsHandlingMissed(true)} className="py-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-bold text-xs uppercase hover:bg-orange-100 transition">Missed</button>
                                    <button onClick={() => updateStatus('cancelled')} className="py-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 transition">Cancel</button>
                                </div>
                                </>
                            )}
                        </div>
                    )}
                    {viewingClient && (
                         <div className="text-center text-gray-400 text-xs font-medium">
                             Get ready! Your coach will mark this complete after the session.
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
