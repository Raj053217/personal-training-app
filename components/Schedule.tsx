
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, isSameDay, addDays, startOfWeek, addWeeks, subWeeks, isToday, parse, isBefore, getDay, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Filter, ChevronDown, Flame, FileText, LayoutGrid, List, Plus, ArrowRight, RefreshCw, Sparkles, CheckCircle2, AlertCircle, DollarSign, TrendingUp, MoreHorizontal, CalendarDays } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'list'>('week');
  
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string; client: Client } | null>(null);
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

  // --- Data Aggregation ---

  const allSessions = useMemo(() => {
    const all: { session: Session; clientName: string; clientId: string; client: Client; startHour: number; isDoubleBooked?: boolean }[] = [];
    
    clients.forEach(client => {
      if (viewingClient && client.id !== viewingClient.id) return; // Client Mode Filter
      if (selectedClientId !== 'all' && client.id !== selectedClientId) return; // Admin Filter

      client.sessions.forEach(session => {
         // History Filter: if showHistory is false, hide completed/cancelled
         if (!showHistory && (session.status === 'completed' || session.status === 'cancelled' || session.completed)) {
             return;
         }

         const startHour = parseInt(session.time.split(':')[0]);
         all.push({ session, clientName: client.name, clientId: client.id, client, startHour });
      });
    });

    // Detect Double Bookings
    const timeMap: Record<string, number> = {};
    all.forEach(s => {
        const key = `${s.session.date}-${s.session.time}`;
        timeMap[key] = (timeMap[key] || 0) + 1;
    });

    return all.map(s => ({
        ...s,
        isDoubleBooked: timeMap[`${s.session.date}-${s.session.time}`] > 1 && s.session.status !== 'cancelled'
    })).sort((a, b) => a.session.time.localeCompare(b.session.time));
  }, [clients, viewingClient, selectedClientId, showHistory]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  // --- Analytics for the Week ---
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
  
  // --- Actions ---

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

  // --- Views ---

  const renderDayView = () => {
      const hours = Array.from({ length: 17 }, (_, i) => 6 + i); // 06:00 to 22:00
      const sessionsToday = allSessions.filter(s => s.session.date === format(selectedDate, 'yyyy-MM-dd'));

      return (
          <div className="space-y-4 animate-slideUp">
              {/* Day Header */}
              <div className="flex justify-between items-center px-2">
                   <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full"><ChevronLeft size={20} className="text-gray-500"/></button>
                   <div className="text-center">
                       <h2 className="text-xl font-black text-black dark:text-white">{format(selectedDate, 'EEEE')}</h2>
                       <p className="text-sm font-medium text-gray-500">{format(selectedDate, 'MMMM do, yyyy')}</p>
                   </div>
                   <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full"><ChevronRight size={20} className="text-gray-500"/></button>
              </div>

              {/* Timeline */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-white/5 relative">
                  {hours.map(hour => {
                      const hourSessions = sessionsToday.filter(s => s.startHour === hour);
                      return (
                          <div key={hour} className="flex gap-4 min-h-[80px] group">
                              <div className="w-12 text-right pt-0">
                                  <span className="text-xs font-bold text-gray-400 group-hover:text-blue-500 transition-colors">{hour > 12 ? `${hour-12} PM` : `${hour} AM`}</span>
                              </div>
                              <div className="flex-1 border-l-2 border-gray-100 dark:border-white/5 pl-4 pb-4 relative">
                                  {/* Line Marker */}
                                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors"></div>
                                  
                                  {hourSessions.length > 0 ? (
                                      <div className="grid grid-cols-1 gap-2">
                                          {hourSessions.map((item, idx) => {
                                              const isCompleted = item.session.status === 'completed';
                                              return (
                                                  <div 
                                                    key={idx} 
                                                    onClick={() => setActiveSession(item)}
                                                    className={`p-3 rounded-2xl cursor-pointer active:scale-95 transition-all relative overflow-hidden ${
                                                        isCompleted ? 'bg-green-500 text-white' : 
                                                        item.isDoubleBooked ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400' :
                                                        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                    }`}
                                                  >
                                                      <div className="flex justify-between items-start">
                                                          <div>
                                                              <h3 className="font-bold text-sm">{item.clientName}</h3>
                                                              <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium uppercase tracking-wide">
                                                                  <Clock size={10} /> {item.session.time}
                                                                  {item.isDoubleBooked && <span className="flex items-center gap-1 ml-2 font-black text-red-600 dark:text-red-400"><AlertCircle size={10}/> Conflict</span>}
                                                              </div>
                                                          </div>
                                                          {isCompleted && <CheckCircle2 size={16} />}
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  ) : (
                                      <div className="h-full w-full rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase">Available</span>
                                      </div>
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
                                    const sessions = allSessions.filter(s => s.session.date === dateStr && s.startHour === hour);
                                    const isDayToday = isToday(day);
                                    
                                    return (
                                        <div key={day.toString()} className={`relative border-r border-gray-100 dark:border-white/5 last:border-0 p-1.5 transition-colors ${isDayToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}`}>
                                            <div className="h-full flex flex-col gap-1.5 justify-center">
                                                {sessions.map((s, idx) => {
                                                    const isCompleted = s.session.status === 'completed';
                                                    const isCancelled = s.session.status === 'cancelled';
                                                    const isMissed = s.session.status === 'missed';
                                                    
                                                    let cardStyle = "bg-blue-500 text-white shadow-md shadow-blue-500/20 dark:bg-blue-600 dark:border-blue-500/50";
                                                    if (isCompleted) cardStyle = "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 dark:bg-emerald-600";
                                                    if (isCancelled) cardStyle = "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500";
                                                    if (isMissed) cardStyle = "bg-orange-500 text-white shadow-md shadow-orange-500/20";
                                                    if (s.isDoubleBooked) cardStyle = "bg-red-500 text-white shadow-md shadow-red-500/20 animate-pulse";

                                                    return (
                                                        <div key={idx} onClick={() => setActiveSession(s)} className={`p-2 rounded-xl cursor-pointer border border-transparent active:scale-95 transition-all ${cardStyle} relative group/card`}>
                                                            <p className="text-[9px] font-black truncate leading-tight">{s.clientName}</p>
                                                            {s.isDoubleBooked && <AlertCircle size={10} className="absolute top-0.5 right-0.5 text-white/80" />}
                                                        </div>
                                                    )
                                                })}
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
            <GridSection title="Morning (5 AM - 12 PM)" hours={morningHours} colorClass="bg-orange-500" />
            <GridSection title="Evening (5 PM - 9 PM)" hours={eveningHours} colorClass="bg-indigo-500" />
        </div>
    );
  };

  const renderListView = () => {
      // Group by Day
      const grouped: Record<string, typeof allSessions> = {};
      allSessions.forEach(s => {
          if (!grouped[s.session.date]) grouped[s.session.date] = [];
          grouped[s.session.date].push(s);
      });
      
      const dates = Object.keys(grouped).sort();

      return (
          <div className="space-y-6 animate-slideUp pb-24">
              {dates.length === 0 && <div className="text-center py-20 text-gray-400 italic">No sessions found for this criteria.</div>}
              {dates.map(date => (
                  <div key={date}>
                      <div className="sticky top-0 bg-[#F2F2F7]/95 dark:bg-black/95 backdrop-blur-sm z-10 py-2 mb-2 flex items-center gap-3">
                          <h3 className="text-lg font-black text-black dark:text-white">{format(new Date(date), 'EEEE, MMM do')}</h3>
                          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1"></div>
                      </div>
                      <div className="space-y-3">
                          {grouped[date].map((item, idx) => (
                              <div key={idx} onClick={() => setActiveSession(item)} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform">
                                  <div className="w-16 flex flex-col items-center justify-center border-r border-gray-100 dark:border-white/5 pr-4">
                                      <span className="text-lg font-black text-black dark:text-white">{item.session.time.split('-')[0]}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-black dark:text-white text-lg">{item.clientName}</h4>
                                      <p className="text-xs text-gray-500 font-medium">Personal Training</p>
                                      {item.isDoubleBooked && <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle size={10}/> Double Booked</span>}
                                  </div>
                                  <div className="flex items-center">
                                      {item.session.status === 'completed' ? <CheckCircle2 className="text-green-500"/> : <div className={`w-3 h-3 rounded-full ${item.session.status === 'cancelled' ? 'bg-gray-300' : 'bg-blue-500'}`} />}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       {/* Header Section */}
       <div className="pt-2 px-1 mb-6">
         <div className="flex justify-between items-end mb-4">
             <div>
                <h1 className="text-[34px] font-black text-black dark:text-white tracking-tight leading-none mb-1">Schedule</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{viewingClient ? 'My Sessions' : 'Management'}</p>
             </div>
             
             <div className="flex bg-gray-100 dark:bg-[#1C1C1E] p-1 rounded-xl">
                 <button onClick={() => setViewMode('day')} className={`p-2 rounded-lg transition-all ${viewMode === 'day' ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400'}`}><CalendarDays size={18}/></button>
                 <button onClick={() => setViewMode('week')} className={`p-2 rounded-lg transition-all ${viewMode === 'week' ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={18}/></button>
                 <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400'}`}><List size={18}/></button>
             </div>
         </div>

         {/* Stats Bar (Admin Only) */}
         {weekStats && (
             <div className="grid grid-cols-3 gap-3 mb-6 animate-slideUp">
                 <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-2xl border border-green-100 dark:border-green-900/20">
                     <p className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Est. Revenue</p>
                     <p className="text-lg font-black text-black dark:text-white flex items-center gap-1"><DollarSign size={14} className="text-green-500"/>{weekStats.revenue}</p>
                 </div>
                 <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                     <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Sessions</p>
                     <p className="text-lg font-black text-black dark:text-white flex items-center gap-1"><Flame size={14} className="text-blue-500"/>{weekStats.count}</p>
                 </div>
                 <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/20">
                     <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Completion</p>
                     <p className="text-lg font-black text-black dark:text-white flex items-center gap-1"><CheckCircle2 size={14} className="text-purple-500"/>{weekStats.completion}%</p>
                 </div>
             </div>
         )}

         {/* Controls */}
         <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1C1C1E] p-1.5 rounded-2xl border border-gray-100 dark:border-white/5">
                <button onClick={() => { setCurrentWeekStart(subWeeks(currentWeekStart, 1)); setSelectedDate(subWeeks(selectedDate, 1)); }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-[#2C2C2E] transition text-gray-500"><ChevronLeft size={20}/></button>
                <div className="text-center" onClick={() => { setCurrentWeekStart(startOfWeek(new Date(), {weekStartsOn: 1})); setSelectedDate(new Date()); }}>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-0.5">Current Week</span>
                    <span className="text-sm font-bold text-black dark:text-white">{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}</span>
                </div>
                <button onClick={() => { setCurrentWeekStart(addWeeks(currentWeekStart, 1)); setSelectedDate(addWeeks(selectedDate, 1)); }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-[#2C2C2E] transition text-gray-500"><ChevronRight size={20}/></button>
             </div>

             <div className="flex gap-2">
                 {!viewingClient && (
                    <div className="relative flex-1">
                        <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full appearance-none bg-white dark:bg-[#1C1C1E] text-black dark:text-white py-3 pl-4 pr-10 rounded-2xl text-xs font-bold shadow-sm outline-none border border-gray-100 dark:border-white/5 transition-all">
                            <option value="all">All Clients</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                 )}
                 <button onClick={() => setShowHistory(!showHistory)} className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${showHistory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#1C1C1E] text-gray-500 border-gray-100 dark:border-white/5'}`}>
                     {showHistory ? 'History ON' : 'History OFF'}
                 </button>
             </div>
         </div>
       </div>

       {/* View Rendering */}
       <div className="flex-1 overflow-y-auto px-1 no-scrollbar">
           {viewMode === 'day' && renderDayView()}
           {viewMode === 'week' && renderWeekView()}
           {viewMode === 'list' && renderListView()}
       </div>

       {/* Session Detail Modal */}
       {activeSession && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
             <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-slideUp border border-transparent dark:border-white/10">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <div>
                      <span className="font-black text-2xl block text-black dark:text-white uppercase tracking-tight">{activeSession.clientName}</span>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{activeSession.session.time}</span>
                          <span className="text-xs font-bold text-gray-400">{format(new Date(activeSession.session.date), 'MMM do')}</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveSession(null)} className="p-2 bg-white dark:bg-white/10 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-colors shadow-sm"><X size={20}/></button>
                </div>
                
                {/* Simplified Details for Client Mode */}
                {viewingClient ? (
                    <div className="p-8 space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl text-center">
                             <CheckCircle2 size={40} className="text-blue-500 mx-auto mb-2"/>
                             <p className="text-blue-600 dark:text-blue-400 font-black text-lg">Session Confirmed</p>
                             <p className="text-blue-400 dark:text-blue-300/70 text-xs mt-1">Get ready to crush your goals!</p>
                        </div>
                        <button onClick={() => setActiveSession(null)} className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/10 font-bold text-black dark:text-white">Close</button>
                    </div>
                ) : (
                    /* Full Controls for Admin */
                    <div className="p-6 space-y-3">
                        {isCompleting ? (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-wider">Intensity (RPE)</label>
                                    <input type="range" min="1" max="10" step="1" value={sessionIntensity} onChange={(e) => setSessionIntensity(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    <div className="flex justify-between text-[10px] font-black mt-2 text-gray-400"><span>EASY (1)</span><span>MODERATE (5)</span><span>MAX (10)</span></div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-wider">Coach Notes</label>
                                    <textarea value={sessionFeedback} onChange={(e) => setSessionFeedback(e.target.value)} placeholder="Performance notes, injuries, next steps..." className="w-full bg-gray-50 dark:bg-black/20 rounded-2xl p-4 text-sm outline-none h-24 resize-none text-black dark:text-white placeholder-gray-400" />
                                </div>
                                <button onClick={() => updateStatus('completed', { intensity: sessionIntensity, feedback: sessionFeedback })} className="w-full py-4 rounded-2xl bg-green-500 text-white font-black text-lg active:scale-95 transition shadow-lg shadow-green-500/20">Mark Completed</button>
                            </div>
                        ) : isRescheduling ? (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">New Date</label>
                                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-black dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">New Time</label>
                                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold text-black dark:text-white" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsRescheduling(false)} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-bold text-xs uppercase">Cancel</button>
                                    <button onClick={handleReschedule} className="flex-[2] py-4 rounded-2xl bg-blue-500 text-white font-black text-sm active:scale-95 transition flex items-center justify-center gap-2">
                                        <RefreshCw size={16} /> Update Slot
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setIsCompleting(true)} className="w-full py-4 rounded-2xl bg-green-500 text-white font-black text-lg active:scale-95 transition shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                                    <CheckCircle2 size={20}/> Complete Session
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIsRescheduling(true)} className="py-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black text-xs uppercase active:scale-95 transition hover:bg-blue-100 dark:hover:bg-blue-900/30">Reschedule</button>
                                    <button onClick={() => updateStatus('missed')} className="py-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-black text-xs uppercase active:scale-95 transition hover:bg-orange-100 dark:hover:bg-orange-900/30">Mark Missed</button>
                                </div>
                                
                                <button onClick={() => updateStatus('cancelled')} className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black text-xs uppercase active:scale-95 transition hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white">Cancel Session</button>
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
