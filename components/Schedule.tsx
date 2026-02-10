
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, isSameDay, addDays, startOfWeek, addWeeks, subWeeks, isToday, parse, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Filter, ChevronDown, Flame, FileText, LayoutGrid, List, Plus, ArrowRight, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface ScheduleProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  // Optional client view mode
  viewingClient?: Client;
}

const Schedule: React.FC<ScheduleProps> = ({ clients, onUpdateClient, viewingClient }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false); // Default false: Hide completed
  const [selectedClientId, setSelectedClientId] = useState<string>(viewingClient ? viewingClient.id : 'all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [sessionIntensity, setSessionIntensity] = useState(7);
  const [sessionFeedback, setSessionFeedback] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // New state for highlighting available slots
  const [highlightPattern, setHighlightPattern] = useState<'3-day' | '4-day' | null>(null);

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
      // If in Client Mode, only show that client's sessions
      if (viewingClient && client.id !== viewingClient.id) return;

      client.sessions.forEach(session => {
        all.push({ session, clientName: client.name, clientId: client.id });
      });
    });
    return all.sort((a, b) => a.session.time.localeCompare(b.session.time));
  }, [clients, viewingClient]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  
  // --- Smart Opening Logic ---
  const smartOpenings = useMemo(() => {
    // Hide smart suggestions in Client Mode
    if (viewingClient) return { fourDayOptions: [], threeDayOptions: [] };

    const morningHours = Array.from({ length: 7 }, (_, i) => 5 + i); // 5-11
    const eveningHours = Array.from({ length: 4 }, (_, i) => 17 + i); // 17-20
    const workingHours = [...morningHours, ...eveningHours];
    
    // 1. Map availability by Hour
    const hourMap: Record<number, Date[]> = {};

    workingHours.forEach(hour => {
        hourMap[hour] = [];
        weekDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            // Check if ANY session exists in this hour
            const isBusy = allSessions.some(s => {
                const sDate = s.session.date;
                const sHour = parseInt(s.session.time.split(':')[0]);
                // Simple collision detection: if same date and hour, it's busy
                return sDate === dateStr && sHour === hour && s.session.status !== 'cancelled';
            });
            if (!isBusy) {
                hourMap[hour].push(day);
            }
        });
    });

    // 2. Group into 4-day and 3-day patterns
    const fourDayOptions: { hour: number, days: Date[] }[] = [];
    const threeDayOptions: { hour: number, days: Date[] }[] = [];

    Object.entries(hourMap).forEach(([hourStr, days]) => {
        const hour = parseInt(hourStr);
        if (days.length >= 4) {
            fourDayOptions.push({ hour, days: days.slice(0, 4) }); // Take first 4 for simplicity
        } else if (days.length === 3) {
            threeDayOptions.push({ hour, days });
        }
    });

    return { fourDayOptions, threeDayOptions };
  }, [allSessions, weekDays, viewingClient]);
  
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

  // Filtering Logic: Hide completed/cancelled unless showHistory is true
  const isSessionVisible = (s: Session) => {
      // viewingClient logic is handled in allSessions, but selectedClientId filter is extra
      if (!viewingClient && selectedClientId !== 'all') {
           const client = clients.find(c => c.id === selectedClientId);
           if (!client || !client.sessions.find(cs => cs.id === s.id)) return false;
      }

      if (showHistory) return true; // Show all
      
      // Default: Hide completed and cancelled
      return s.status !== 'completed' && !s.completed && s.status !== 'cancelled';
  };

  const renderGridView = () => {
    const morningHours = Array.from({ length: 7 }, (_, i) => 5 + i); // 5 to 11
    const eveningHours = Array.from({ length: 4 }, (_, i) => 17 + i); // 17 to 20

    // Helper to check if a specific cell should be highlighted
    const checkHighlight = (day: Date, hour: number) => {
        if (!highlightPattern || viewingClient) return false;
        const options = highlightPattern === '4-day' ? smartOpenings.fourDayOptions : smartOpenings.threeDayOptions;
        return options.some(opt => opt.hour === hour && opt.days.some(d => isSameDay(d, day)));
    };

    const GridSection = ({ title, hours, colorClass }: { title: string, hours: number[], colorClass: string }) => (
        <div className="mb-8 animate-slideUp">
            <div className="flex items-center justify-between mb-4 px-2">
                 <h3 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colorClass} shadow-sm`}></span>
                    {title}
                </h3>
            </div>
            
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 overflow-x-auto overflow-y-hidden no-scrollbar relative">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="p-4 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest text-center self-center sticky left-0 bg-gray-50/90 dark:bg-[#1C1C1E]/95 backdrop-blur-sm z-20 border-r border-gray-100 dark:border-white/5">
                            Time
                        </div>
                        {weekDays.map(day => {
                            const isDayToday = isToday(day);
                            return (
                                <div key={day.toString()} className={`py-4 px-2 text-center border-r border-gray-100 dark:border-white/5 last:border-0 relative group transition-colors ${isDayToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${isDayToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                        {format(day, 'EEE')}
                                    </span>
                                    <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[14px] font-black ${isDayToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-900 dark:text-white'}`}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] group/row min-h-[85px]">
                                {/* Time Label (Sticky Left) */}
                                <div className="relative sticky left-0 z-10 bg-white dark:bg-[#1C1C1E] border-r border-gray-100 dark:border-white/5 flex items-center justify-center p-2">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{format(new Date().setHours(hour, 0), 'h a')}</span>
                                </div>

                                {/* Cells */}
                                {weekDays.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const sessions = allSessions.filter(s => {
                                        const h = parseInt(s.session.time.split(':')[0]);
                                        return s.session.date === dateStr && h === hour && isSessionVisible(s.session);
                                    });
                                    const isDayToday = isToday(day);
                                    const isHighlighted = checkHighlight(day, hour);
                                    
                                    return (
                                        <div key={day.toString()} className={`relative border-r border-gray-100 dark:border-white/5 last:border-0 p-1.5 transition-colors ${isHighlighted ? 'bg-green-50/20 dark:bg-green-900/5' : (isDayToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]')}`}>
                                            <div className="h-full flex flex-col gap-1.5 justify-center">
                                                {sessions.map((s, idx) => {
                                                    const isCompleted = s.session.status === 'completed';
                                                    const isCancelled = s.session.status === 'cancelled';
                                                    const isMissed = s.session.status === 'missed';
                                                    
                                                    let cardStyle = "bg-blue-500 text-white shadow-md shadow-blue-500/20 dark:bg-blue-600 dark:border-blue-500/50";
                                                    if (isCompleted) cardStyle = "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 dark:bg-emerald-600";
                                                    if (isCancelled) cardStyle = "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500";
                                                    if (isMissed) cardStyle = "bg-orange-500 text-white shadow-md shadow-orange-500/20";

                                                    return (
                                                        <div key={idx} onClick={() => setActiveSession(s)} className={`p-2.5 rounded-2xl cursor-pointer border border-transparent active:scale-95 transition-all ${cardStyle} relative group/card`}>
                                                            <p className="text-[10px] font-black truncate leading-tight">{s.clientName}</p>
                                                        </div>
                                                    )
                                                })}
                                                
                                                {!viewingClient && sessions.length === 0 && (
                                                    <div className={`w-full h-full rounded-2xl border border-dashed flex items-center justify-center cursor-pointer transition-all ${
                                                        isHighlighted 
                                                            ? 'border-green-300 bg-green-50/80 opacity-100 dark:border-green-500/50 dark:bg-green-500/20 shadow-sm' 
                                                            : 'border-gray-200 dark:border-white/10 opacity-0 group-hover/row:opacity-100 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}>
                                                        {isHighlighted ? <Sparkles size={14} className="text-green-600 dark:text-green-400 animate-pulse" /> : <Plus size={14} className="text-gray-300 dark:text-gray-600" />}
                                                    </div>
                                                )}
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
        <div className="mt-4 pb-32 px-1">
            <GridSection title="Morning (5:15 - 11 AM)" hours={morningHours} colorClass="bg-orange-500" />
            <GridSection title="Evening (5:30 - 7:45 PM)" hours={eveningHours} colorClass="bg-indigo-500" />
            
            {/* Smart Opening Suggestions - Text Fallback / Info */}
            {!viewingClient && !highlightPattern && (
                <div className="mt-10 mb-12">
                <h3 className="text-[13px] font-black text-black dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2 px-2">
                    <Sparkles size={16} className="text-yellow-500" />
                    Slot Suggestions
                </h3>

                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div onClick={() => setHighlightPattern('4-day')} className="cursor-pointer bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 active:scale-95 transition-transform hover:border-green-200 dark:hover:border-green-900/50 group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                                    <Clock size={16} strokeWidth={3} />
                                </div>
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">High Freq</span>
                            </div>
                            <p className="text-2xl font-black text-black dark:text-white">{smartOpenings.fourDayOptions.length}</p>
                            <p className="text-[10px] font-bold text-gray-400">4-Day Slots</p>
                        </div>

                        <div onClick={() => setHighlightPattern('3-day')} className="cursor-pointer bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/10 active:scale-95 transition-transform hover:border-blue-200 dark:hover:border-blue-900/50 group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                    <CalendarIcon size={16} strokeWidth={3} />
                                </div>
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Standard</span>
                            </div>
                            <p className="text-2xl font-black text-black dark:text-white">{smartOpenings.threeDayOptions.length}</p>
                            <p className="text-[10px] font-bold text-gray-400">3-Day Slots</p>
                        </div>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="pt-2 px-1 mb-2 flex justify-between items-center">
         <h1 className="text-[34px] font-black text-black dark:text-white tracking-tight">Schedule</h1>
         
         <div className="flex items-center gap-3">
             {/* Week Navigation */}
             <div className="flex items-center bg-gray-100 dark:bg-[#1C1C1E] border dark:border-white/5 rounded-xl p-0.5">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-white dark:hover:bg-[#2C2C2E] rounded-lg transition-colors text-gray-500 dark:text-gray-400">
                    <ChevronLeft size={18} />
                </button>
                <span className="text-[10px] font-black uppercase w-20 text-center text-gray-500 dark:text-gray-400">
                    {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'd')}
                </span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-white dark:hover:bg-[#2C2C2E] rounded-lg transition-colors text-gray-500 dark:text-gray-400">
                    <ChevronRight size={18} />
                </button>
             </div>

             <div className="bg-gray-100 dark:bg-[#1C1C1E] border dark:border-white/5 p-0.5 rounded-xl flex">
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400'}`}><List size={20}/></button>
                 <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-blue-500 dark:text-blue-400' : 'text-gray-400'}`}><LayoutGrid size={20}/></button>
             </div>
         </div>
       </div>

       <div className="px-1 mb-4 flex flex-col gap-3">
          <div className="flex gap-3">
              {!viewingClient && (
                <div className="relative flex-1">
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full appearance-none bg-ios-card-light dark:bg-[#1C1C1E] text-black dark:text-white py-2.5 pl-4 pr-10 rounded-2xl text-sm font-bold shadow-sm outline-none border border-transparent dark:border-white/5 focus:border-ios-blue transition-all">
                        <option value="all">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              )}
              <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm border border-transparent dark:border-white/5 ${showHistory ? 'bg-ios-blue text-white' : 'bg-ios-card-light dark:bg-[#1C1C1E] text-ios-gray'} ${viewingClient ? 'w-full justify-center' : ''}`}>
                 <Filter size={14} /> {showHistory ? 'History' : 'To-Do'}
              </button>
          </div>

          {!viewingClient && (
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0 mr-1">Find Openings:</span>
                 <button 
                    onClick={() => setHighlightPattern(highlightPattern === '4-day' ? null : '4-day')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${highlightPattern === '4-day' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50 shadow-sm' : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-gray-100 dark:border-white/10'}`}
                 >
                    {highlightPattern === '4-day' && <CheckCircle2 size={10} />}
                    4-Day Slots
                 </button>
                 <button 
                    onClick={() => setHighlightPattern(highlightPattern === '3-day' ? null : '3-day')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${highlightPattern === '3-day' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50 shadow-sm' : 'bg-white dark:bg-[#1C1C1E] text-gray-400 border-gray-100 dark:border-white/10'}`}
                 >
                    {highlightPattern === '3-day' && <CheckCircle2 size={10} />}
                    3-Day Slots
                 </button>
             </div>
          )}
       </div>

       <div className="flex-1 space-y-3">
         {viewMode === 'grid' ? renderGridView() : (
             <div className="mt-4 px-1 pb-24 space-y-4">
                 {/* In List Mode, showing selected Date which defaults to today. Ideally List Mode should also scroll or show range, but keeping simple for now */}
                 <div className="flex justify-between items-center px-2 mb-2">
                    <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft className="text-gray-400"/></button>
                    <span className="font-black text-lg text-black dark:text-white">{format(selectedDate, 'EEEE, MMM do')}</span>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="text-gray-400"/></button>
                 </div>
                 
                 {allSessions.filter(s => isSameDay(new Date(s.session.date), selectedDate) && isSessionVisible(s.session)).length === 0 && (
                     <div className="text-center py-10 text-gray-400 italic text-sm">No active sessions for this day.</div>
                 )}

                 {allSessions.filter(s => isSameDay(new Date(s.session.date), selectedDate) && isSessionVisible(s.session)).map((item) => (
                   <div key={item.session.id} onClick={() => setActiveSession(item)} className="flex gap-4 cursor-pointer animate-slideUp">
                      <div className="w-16 text-right font-black">
                          <span className="text-sm text-black dark:text-white block">{item.session.time.split('-')[0]}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>
                      </div>
                      <div className={`flex-1 p-4 rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-sm border border-gray-100 dark:border-white/5 border-l-8 ${item.session.status === 'completed' ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                          <h3 className="text-lg font-black text-black dark:text-white">{item.clientName}</h3>
                          <p className="text-xs text-gray-400 font-bold">Personal Training Session</p>
                      </div>
                   </div>
                 ))}
             </div>
         )}
       </div>

       {activeSession && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
             <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-slideUp border border-transparent dark:border-white/10">
                <div className="p-8 border-b border-gray-50 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <span className="font-black text-2xl block text-black dark:text-white uppercase tracking-tight">{activeSession.clientName}</span>
                      <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{activeSession.session.time}</span>
                    </div>
                    <button onClick={() => setActiveSession(null)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={24}/></button>
                </div>
                
                {/* Simplified Details for Client Mode */}
                {viewingClient ? (
                    <div className="p-8 space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                             <p className="text-blue-600 dark:text-blue-400 font-bold text-center">Session Confirmed</p>
                        </div>
                        <p className="text-center text-gray-500 text-sm">To reschedule, please contact your coach directly.</p>
                        <button onClick={() => setActiveSession(null)} className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/10 font-bold text-black dark:text-white">Close</button>
                    </div>
                ) : (
                    /* Full Controls for Admin */
                    <div className="p-8 space-y-3">
                        {isCompleting ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Intensity (RPE)</label>
                                    <input type="range" min="1" max="10" step="1" value={sessionIntensity} onChange={(e) => setSessionIntensity(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    <div className="flex justify-between text-[10px] font-black mt-2 text-gray-500"><span>EASY</span><span>MODERATE</span><span>HARD</span></div>
                                </div>
                                <textarea value={sessionFeedback} onChange={(e) => setSessionFeedback(e.target.value)} placeholder="Notes for Raj..." className="w-full bg-gray-50 dark:bg-black/20 rounded-3xl p-5 text-sm outline-none h-32 resize-none text-black dark:text-white placeholder-gray-500" />
                                <button onClick={() => updateStatus('completed', { intensity: sessionIntensity, feedback: sessionFeedback })} className="w-full py-5 rounded-3xl bg-green-500 text-white font-black text-lg active:scale-95 transition">COMPLETE</button>
                            </div>
                        ) : isRescheduling ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">New Date</label>
                                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-black dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">New Time</label>
                                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-black dark:text-white" />
                                </div>
                                <button onClick={handleReschedule} className="w-full py-5 rounded-3xl bg-blue-500 text-white font-black text-lg active:scale-95 transition flex items-center justify-center gap-2">
                                    <RefreshCw size={20} /> UPDATE SCHEDULE
                                </button>
                                <button onClick={() => setIsRescheduling(false)} className="w-full py-3 text-gray-400 font-bold text-xs uppercase hover:text-white transition-colors">Cancel</button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsCompleting(true)} className="w-full py-5 rounded-3xl bg-green-500 text-white font-black text-lg active:scale-95 transition shadow-lg shadow-green-500/20">FINISH SESSION</button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIsRescheduling(true)} className="py-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black text-sm active:scale-95 transition hover:bg-blue-100 dark:hover:bg-blue-900/30">RESCHEDULE</button>
                                    <button onClick={() => updateStatus('missed')} className="py-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-black text-sm active:scale-95 transition hover:bg-orange-100 dark:hover:bg-orange-900/30">MISSED</button>
                                </div>
                                
                                <button onClick={() => updateStatus('cancelled')} className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black text-sm active:scale-95 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white">CANCEL SESSION</button>
                            </>
                        )}
                    </div>
                )}
             </div>
          </div>
       )}
    </div>
  );
};

export default Schedule;
