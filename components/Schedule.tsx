import React, { useState, useEffect, useMemo } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, isSameDay, addDays, startOfWeek, addWeeks, subWeeks, isToday, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Filter, ChevronDown, Flame, FileText, LayoutGrid, List, Plus } from 'lucide-react';

interface ScheduleProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ clients, onUpdateClient }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllStatus, setShowAllStatus] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
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
      setIsRescheduling(false);
      setIsCompleting(false);
    }
  }, [activeSession]);

  const allSessions = useMemo(() => {
    const all: { session: Session; clientName: string; clientId: string }[] = [];
    clients.forEach(client => {
      client.sessions.forEach(session => {
        all.push({ session, clientName: client.name, clientId: client.id });
      });
    });
    return all.sort((a, b) => a.session.time.localeCompare(b.session.time));
  }, [clients]);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  
  const updateStatus = (status: SessionStatus, extraData?: { intensity?: number, feedback?: string }) => {
    if (!activeSession) return;
    const client = clients.find(c => c.id === activeSession.clientId);
    if (client) {
        const updated = client.sessions.map(s => s.id === activeSession.session.id ? { 
          ...s, status, completed: status === 'completed', intensity: extraData?.intensity, feedback: extraData?.feedback
        } : s);
        onUpdateClient({ ...client, sessions: updated });
        setActiveSession(null);
    }
  };

  const renderGridView = () => {
    const morningHours = Array.from({ length: 7 }, (_, i) => 5 + i); // 5 to 11
    const eveningHours = Array.from({ length: 4 }, (_, i) => 17 + i); // 17 to 20

    const GridSection = ({ title, hours, colorClass }: { title: string, hours: number[], colorClass: string }) => (
        <div className="mb-6">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`}></div>
                {title}
            </h3>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto">
                <div className="min-w-[750px]">
                    <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5">
                        <div className="p-4 text-[10px] text-gray-400 font-black border-r border-gray-50 dark:border-white/5 uppercase">Time</div>
                        {weekDays.map(day => (
                            <div key={day.toString()} className={`p-4 text-center border-r border-gray-50 dark:border-white/5 last:border-0 ${isToday(day) ? 'bg-blue-500/10' : ''}`}>
                                <p className="text-[10px] font-black text-gray-400 uppercase">{format(day, 'EEE')}</p>
                                <p className={`text-[16px] font-black ${isToday(day) ? 'text-blue-500' : 'text-black dark:text-white'}`}>{format(day, 'd')}</p>
                            </div>
                        ))}
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-[70px_repeat(7,1fr)] min-h-[70px]">
                                <div className="p-3 text-[11px] font-black text-gray-400 border-r border-gray-50 dark:border-white/5 flex flex-col items-center justify-center bg-gray-50/20 dark:bg-white/5">
                                    <span>{format(new Date().setHours(hour, 0), 'h a')}</span>
                                </div>
                                {weekDays.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const sessions = allSessions.filter(s => {
                                        const h = parseInt(s.session.time.split(':')[0]);
                                        return s.session.date === dateStr && h === hour;
                                    });
                                    return (
                                        <div key={day.toString()} className={`relative border-r border-gray-50 dark:border-white/5 p-1.5 last:border-0 ${isToday(day) ? 'bg-blue-500/5' : ''}`}>
                                            <div className="flex flex-col gap-1">
                                                {sessions.map((s, idx) => (
                                                    <div key={idx} onClick={() => setActiveSession(s)} className={`text-[9px] font-black p-2 rounded-xl truncate cursor-pointer shadow-sm border border-transparent active:scale-95 transition-all
                                                        ${s.session.status === 'completed' ? 'bg-green-500 text-white' : 
                                                          s.session.status === 'cancelled' ? 'bg-gray-100 text-gray-400 opacity-50' : 
                                                          'bg-blue-500 text-white shadow-lg shadow-blue-500/20'}
                                                    `}>{s.clientName}</div>
                                                ))}
                                                {sessions.length === 0 && <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Plus size={14} className="text-gray-200" /></div>}
                                            </div>
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
        <div className="mt-4 pb-24 px-1">
            <GridSection title="Morning (5:15 - 11 AM)" hours={morningHours} colorClass="bg-orange-500" />
            <GridSection title="Evening (5:30 - 7:45 PM)" hours={eveningHours} colorClass="bg-indigo-500" />
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="pt-2 px-1 mb-2 flex justify-between items-center">
         <h1 className="text-[34px] font-black text-black dark:text-white tracking-tight">Schedule</h1>
         <div className="bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl flex">
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-gray-400'}`}><List size={20}/></button>
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500' : 'text-gray-400'}`}><LayoutGrid size={20}/></button>
         </div>
       </div>

       <div className="px-1 mb-4 flex gap-3">
          <div className="relative flex-1">
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full appearance-none bg-ios-card-light dark:bg-ios-card-dark text-black dark:text-white py-2.5 pl-4 pr-10 rounded-2xl text-sm font-bold shadow-sm outline-none border border-transparent focus:border-ios-blue transition-all">
                  <option value="all">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button onClick={() => setShowAllStatus(!showAllStatus)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm ${showAllStatus ? 'bg-ios-blue text-white' : 'bg-ios-card-light dark:bg-ios-card-dark text-ios-gray'}`}>
             <Filter size={14} /> {showAllStatus ? 'All' : 'Active'}
          </button>
       </div>

       <div className="flex-1 space-y-3">
         {viewMode === 'grid' ? renderGridView() : (
             <div className="mt-4 px-1 pb-24 space-y-4">
                 {allSessions.filter(s => isSameDay(new Date(s.session.date), selectedDate)).map((item) => (
                   <div key={item.session.id} onClick={() => setActiveSession(item)} className="flex gap-4 cursor-pointer animate-slideUp">
                      <div className="w-16 text-right font-black">
                          <span className="text-sm text-black dark:text-white block">{item.session.time.split('-')[0]}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>
                      </div>
                      <div className={`flex-1 p-4 rounded-3xl bg-white dark:bg-ios-card-dark shadow-sm border-l-8 ${item.session.status === 'completed' ? 'border-green-500' : 'border-blue-500'}`}>
                          <h3 className="text-lg font-black text-black dark:text-white">{item.clientName}</h3>
                          <p className="text-xs text-gray-400 font-bold">Personal Training Session</p>
                      </div>
                   </div>
                 ))}
             </div>
         )}
       </div>

       {activeSession && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
             <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-slideUp">
                <div className="p-8 border-b border-gray-50 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <span className="font-black text-2xl block text-black dark:text-white uppercase tracking-tight">{activeSession.clientName}</span>
                      <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{activeSession.session.time}</span>
                    </div>
                    <button onClick={() => setActiveSession(null)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-400"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-3">
                    {isCompleting ? (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Intensity (RPE)</label>
                                <input type="range" min="1" max="10" step="1" value={sessionIntensity} onChange={(e) => setSessionIntensity(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                <div className="flex justify-between text-[10px] font-black mt-2 text-gray-500"><span>EASY</span><span>MODERATE</span><span>HARD</span></div>
                            </div>
                            <textarea value={sessionFeedback} onChange={(e) => setSessionFeedback(e.target.value)} placeholder="Notes for Raj..." className="w-full bg-gray-50 dark:bg-black/40 rounded-3xl p-5 text-sm outline-none h-32 resize-none" />
                            <button onClick={() => updateStatus('completed', { intensity: sessionIntensity, feedback: sessionFeedback })} className="w-full py-5 rounded-3xl bg-green-500 text-white font-black text-lg active:scale-95 transition">COMPLETE</button>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setIsCompleting(true)} className="w-full py-5 rounded-3xl bg-green-500 text-white font-black text-lg active:scale-95 transition">FINISH SESSION</button>
                            <button onClick={() => updateStatus('missed')} className="w-full py-5 rounded-3xl bg-orange-500 text-white font-black text-lg active:scale-95 transition">MARK AS MISSED</button>
                            <button onClick={() => updateStatus('cancelled')} className="w-full py-5 rounded-3xl bg-red-500 text-white font-black text-lg active:scale-95 transition">CANCEL</button>
                        </>
                    )}
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default Schedule;