
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Session, SessionStatus } from '../types';
import { format, addDays, startOfWeek, isToday, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, ChevronDown, CheckCircle2, CalendarDays, AlertCircle, Filter, AlertTriangle, ArrowRight, GripHorizontal, Download, ExternalLink } from 'lucide-react';

interface ScheduleProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  viewingClient?: Client;
}

const Schedule: React.FC<ScheduleProps> = ({ clients, onUpdateClient, viewingClient }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(viewingClient ? viewingClient.id : 'all');
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'missed' | 'cancelled'>('all');
  
  const [activeSession, setActiveSession] = useState<{ session: Session; clientName: string; clientId: string; client: Client } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ clientId: string; sessionId: string } | null>(null);
  const [showSyncOptions, setShowSyncOptions] = useState(false);

  // Modal States
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isHandlingMissed, setIsHandlingMissed] = useState(false);

  const [sessionIntensity, setSessionIntensity] = useState(7);
  const [sessionFeedback, setSessionFeedback] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isStatsExpanded, setIsStatsExpanded] = useState(true);

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
         if (statusFilter !== 'all' && effectiveStatus !== statusFilter) {
             return;
         }

         // 2. History Filter (Legacy toggle)
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

  const monthStats = useMemo(() => {
      if (viewingClient) return null;
      let totalRevenue = 0;
      let totalSessions = 0;
      let completedCount = 0;
      let remainingCount = 0;

      // Calculate stats for the currently selected MONTH
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      clients.forEach(c => {
          const sessionRate = c.totalFee / (c.sessions.length || 1);
          c.sessions.forEach(s => {
              const d = new Date(s.date);
              if (d >= monthStart && d <= monthEnd && s.status !== 'cancelled') {
                  totalSessions++;
                  if (s.status === 'completed' || s.completed) {
                      completedCount++;
                      totalRevenue += sessionRate; // Revenue is realized on completion (or could be upfront, but user asked for revenue in schedule)
                  } else {
                      remainingCount++;
                  }
              }
          });
      });

      return {
          revenue: Math.round(totalRevenue),
          total: totalSessions,
          completed: completedCount,
          remaining: remainingCount
      };
  }, [clients, selectedDate, viewingClient]);
  
  const updateStatus = (status: SessionStatus, extraData?: { intensity?: number, feedback?: string }) => {
    if (!activeSession) return;
    
    // Always find the freshest client object from props
    const client = clients.find(c => c.id === activeSession.clientId);
    if (client) {
        const updatedSessions = client.sessions.map(s => s.id === activeSession.session.id ? { 
          ...s, 
          status: status, 
          completed: status === 'completed', 
          intensity: extraData?.intensity, 
          feedback: extraData?.feedback
        } : s);

        onUpdateClient({ ...client, sessions: updatedSessions });
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

  // --- Drag and Drop Handlers ---
  
  const handleDragStart = (e: React.DragEvent, clientId: string, sessionId: string) => {
    if (viewingClient) return; // Clients cannot reschedule via drag
    e.dataTransfer.effectAllowed = 'move';
    // We store data in state + dataTransfer for compatibility
    setDraggedItem({ clientId, sessionId });
    e.dataTransfer.setData('application/json', JSON.stringify({ clientId, sessionId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (viewingClient) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDate = (e: React.DragEvent, targetDate: Date) => {
    if (viewingClient) return;
    e.preventDefault();
    
    try {
        const data = e.dataTransfer.getData('application/json');
        const { clientId, sessionId } = data ? JSON.parse(data) : draggedItem;
        
        if (!clientId || !sessionId) return;

        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        const dateStr = format(targetDate, 'yyyy-MM-dd');

        // Optimistic update check to avoid unnecessary re-renders
        const session = client.sessions.find(s => s.id === sessionId);
        if (session && session.date === dateStr) return;

        const updatedSessions = client.sessions.map(s => {
            if (s.id === sessionId) {
                return { ...s, date: dateStr, status: 'scheduled' as SessionStatus, completed: false };
            }
            return s;
        });

        onUpdateClient({ ...client, sessions: updatedSessions });
        setDraggedItem(null);
    } catch (err) {
        console.error("Drop failed", err);
    }
  };

  const handleDropOnTime = (e: React.DragEvent, targetHour: number) => {
    if (viewingClient) return;
    e.preventDefault();

    try {
        const data = e.dataTransfer.getData('application/json');
        const { clientId, sessionId } = data ? JSON.parse(data) : draggedItem;
        
        if (!clientId || !sessionId) return;

        const client = clients.find(c => c.id === clientId);
        if (!client) return;

        // Format hour to HH:00
        const timeStr = `${targetHour.toString().padStart(2, '0')}:00`;

        const updatedSessions = client.sessions.map(s => {
            if (s.id === sessionId) {
                return { ...s, time: timeStr, status: 'scheduled' as SessionStatus, completed: false };
            }
            return s;
        });

        onUpdateClient({ ...client, sessions: updatedSessions });
        setDraggedItem(null);
    } catch (err) {
        console.error("Drop failed", err);
    }
  };

  // --- Navigation Handlers ---
  const handlePrev = () => {
    if (viewMode === 'month') {
        setSelectedDate(subMonths(selectedDate, 1));
    } else {
        setSelectedDate(addDays(selectedDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
        setSelectedDate(addMonths(selectedDate, 1));
    } else {
        setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleReset = () => {
      const now = new Date();
      setSelectedDate(now);
  };

  // --- Calendar Sync Helpers ---
  const generateICS = (singleSession?: { session: Session; clientName: string }) => {
      const sessionsToExport = singleSession 
          ? [singleSession] 
          : allSessions.filter(s => {
              const d = new Date(s.session.date + 'T' + s.session.time);
              return d >= new Date(); // Only future sessions
          });

      if (sessionsToExport.length === 0) {
          alert("No upcoming sessions to export.");
          return;
      }

      let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FitWithRj//Schedule//EN\n";

      sessionsToExport.forEach(item => {
          const start = new Date(item.session.date + 'T' + item.session.time);
          const end = new Date(start.getTime() + 60 * 60 * 1000); // Assume 1 hour duration
          
          const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

          icsContent += "BEGIN:VEVENT\n";
          icsContent += `UID:${item.session.id}@fitwithrj.com\n`;
          icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
          icsContent += `DTSTART:${formatDate(start)}\n`;
          icsContent += `DTEND:${formatDate(end)}\n`;
          icsContent += `SUMMARY:Training with ${item.clientName}\n`;
          icsContent += `DESCRIPTION:FitWithRj Training Session\\nIntensity: ${item.session.intensity || 'N/A'}\n`;
          icsContent += "END:VEVENT\n";
      });

      icsContent += "END:VCALENDAR";

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', singleSession ? 'session.ics' : 'schedule.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowSyncOptions(false);
  };

  const addToGoogleCalendar = (session: Session, clientName: string) => {
      const start = new Date(session.date + 'T' + session.time);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      
      const formatGCal = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Training with ${clientName}`)}&dates=${formatGCal(start)}/${formatGCal(end)}&details=${encodeURIComponent("FitWithRj Training Session")}&sf=true&output=xml`;
      
      window.open(url, '_blank');
  };

  const renderMonthView = () => {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const calendarDays = [];
      let day = startDate;
      while (day <= endDate) {
          calendarDays.push(day);
          day = addDays(day, 1);
      }

      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      return (
          <div className="animate-slideUp pb-24 px-1">
             <div className="grid grid-cols-7 mb-2">
                 {daysOfWeek.map(d => (
                     <div key={d} className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center py-2">{d}</div>
                 ))}
             </div>
             <div className="grid grid-cols-7 gap-1">
                 {calendarDays.map((d, i) => {
                     const dateStr = format(d, 'yyyy-MM-dd');
                     const daySessions = allSessions.filter(s => s.session.date === dateStr);
                     const isCurrentMonth = isSameMonth(d, monthStart);
                     const isTodayDate = isToday(d);
                     const isSelected = isSameDay(d, selectedDate);

                     return (
                         <div 
                             key={i}
                             onClick={() => { setSelectedDate(d); setViewMode('day'); }}
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDropOnDate(e, d)}
                             className={`min-h-[80px] p-1.5 rounded-xl border flex flex-col relative cursor-pointer transition-all 
                                 ${isCurrentMonth ? 'bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 hover:bg-blue-50/50 dark:hover:bg-white/10' : 'bg-gray-50/50 dark:bg-white/[0.02] border-transparent opacity-40'}
                                 ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}
                             `}
                         >
                             <span className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isTodayDate ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                                 {format(d, 'd')}
                             </span>
                             
                             <div className="flex flex-col gap-1 overflow-hidden">
                                 {daySessions.slice(0, 3).map((s, idx) => {
                                      const status = s.session.status || (s.session.completed ? 'completed' : 'scheduled');
                                      let colorClass = 'bg-blue-500';
                                      if (status === 'completed') colorClass = 'bg-green-500';
                                      else if (status === 'missed') colorClass = 'bg-red-500'; // Red for distinct missed
                                      else if (status === 'cancelled') colorClass = 'bg-gray-300 dark:bg-gray-600';

                                      return (
                                          <div 
                                            key={idx} 
                                            draggable={!viewingClient}
                                            onDragStart={(e) => handleDragStart(e, s.clientId, s.session.id)}
                                            className={`h-1.5 w-full rounded-full ${colorClass} ${!viewingClient ? 'cursor-move' : ''}`} 
                                            title={`${s.clientName} - ${s.session.time}`}
                                          />
                                      );
                                 })}
                                 {daySessions.length > 3 && (
                                     <span className="text-[8px] font-bold text-gray-400">+{daySessions.length - 3}</span>
                                 )}
                             </div>
                         </div>
                     );
                 })}
             </div>
          </div>
      );
  };

  const renderDayView = () => {
      // Configured to show Morning (5-11) and Evening (17-21), skipping 12-16
      const morningHours = Array.from({ length: 7 }, (_, i) => 5 + i); // 5, 6, 7, 8, 9, 10, 11
      const eveningHours = Array.from({ length: 5 }, (_, i) => 17 + i); // 17 (5pm), 18, 19, 20, 21
      
      const hours = [...morningHours, ...eveningHours];
      
      const sessionsToday = allSessions.filter(s => s.session.date === format(selectedDate, 'yyyy-MM-dd'));

      return (
          <div className="space-y-4 animate-slideUp pb-24">
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-white/5 relative">
                  {hours.map((hour, index) => {
                      const hourSessions = sessionsToday.filter(s => s.startHour === hour);
                      // Check for gap (if previous hour was 11 and current is 17)
                      const isGap = index > 0 && hour - hours[index - 1] > 1;

                      return (
                          <React.Fragment key={hour}>
                              {isGap && (
                                  <div className="flex items-center gap-4 py-4 opacity-30">
                                      <div className="w-10 text-right"></div>
                                      <div className="flex-1 border-t-2 border-dashed border-gray-300 dark:border-white/20 relative">
                                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F2F2F7] dark:bg-black px-2 text-[10px] font-bold text-gray-400 uppercase">Midday Break</span>
                                      </div>
                                  </div>
                              )}
                              <div 
                                className="flex gap-4 min-h-[80px] group transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnTime(e, hour)}
                              >
                                  <div className="w-10 text-right pt-0.5">
                                      <span className="text-[10px] font-bold text-gray-400">{hour > 12 ? `${hour-12} PM` : `${hour} AM`}</span>
                                  </div>
                                  <div className="flex-1 border-l-2 border-gray-100 dark:border-white/5 pl-4 pb-4 relative">
                                      {hourSessions.length > 0 ? (
                                          <div className="grid grid-cols-1 gap-2">
                                              {hourSessions.map((item, idx) => {
                                                  const isCompleted = item.session.status === 'completed' || item.session.completed;
                                                  const status = item.session.status || (isCompleted ? 'completed' : 'scheduled');
                                                  
                                                  let containerClass = '';
                                                  let Icon = Clock;
                                                  
                                                  if (status === 'cancelled') {
                                                      containerClass = 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10';
                                                      Icon = X;
                                                  } else if (status === 'missed') {
                                                      // Visual Distinction for Missed
                                                      containerClass = 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-700 dark:text-red-400';
                                                      Icon = AlertTriangle;
                                                  } else if (status === 'completed') {
                                                      containerClass = 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30';
                                                      Icon = CheckCircle2;
                                                  } else if (item.isDoubleBooked) {
                                                      containerClass = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 ring-1 ring-red-500';
                                                      Icon = AlertCircle;
                                                  } else {
                                                      containerClass = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30';
                                                      Icon = Clock;
                                                  }

                                                  return (
                                                      <div 
                                                        key={idx} 
                                                        onClick={() => setActiveSession(item)}
                                                        draggable={!viewingClient}
                                                        onDragStart={(e) => handleDragStart(e, item.clientId, item.session.id)}
                                                        className={`p-3 rounded-2xl active:scale-95 transition-all relative overflow-hidden shadow-sm border ${containerClass} ${status !== 'missed' ? 'border-l-0' : ''} ${!viewingClient ? 'cursor-move hover:shadow-md' : 'cursor-pointer'}`}
                                                      >
                                                          <div className="flex justify-between items-start">
                                                              <h3 className={`font-black text-sm ${status === 'cancelled' ? 'line-through' : ''}`}>{item.clientName}</h3>
                                                              {!viewingClient && (
                                                                <div className="opacity-0 group-hover:opacity-50 absolute right-2 top-2">
                                                                    <GripHorizontal size={14} />
                                                                </div>
                                                              )}
                                                              <Icon size={14} strokeWidth={2.5} className="opacity-70"/>
                                                          </div>
                                                          <p className="text-[10px] font-bold opacity-70 uppercase tracking-wide flex items-center gap-1 mt-1">{item.session.time}</p>
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                      ) : (
                                          // Available Slot Visual
                                          <div className="h-full w-full rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-center transition-colors group-hover:border-blue-200 dark:group-hover:border-blue-900/30">
                                               <span className="text-[10px] font-bold text-gray-300 dark:text-white/20 group-hover:text-blue-400 transition-colors">
                                                   Drop to move here
                                               </span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </React.Fragment>
                      );
                  })}
              </div>
          </div>
      );
  };

  // ... (existing render logic)

  return (
    <div className="h-full flex flex-col animate-fadeIn">
       <div className="pt-2 px-1 mb-6">
         <div className="flex justify-between items-end mb-6">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Calendar</p>
                <h1 className="text-[34px] font-black text-black dark:text-white tracking-tight leading-none">Schedule</h1>
             </div>
             
             <div className="flex gap-2">
                 <div className="relative">
                    <button 
                        onClick={() => setShowSyncOptions(!showSyncOptions)}
                        className="bg-white dark:bg-[#1C1C1E] text-black dark:text-white p-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-2"
                        title="Sync Calendar"
                    >
                        <Download size={18} />
                        <span className="text-xs font-bold hidden sm:inline">Sync</span>
                    </button>
                    {showSyncOptions && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSyncOptions(false)}></div>
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 z-20 p-2 animate-scaleIn origin-top-right">
                            <button onClick={() => generateICS()} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold flex items-center gap-2">
                                <CalendarIcon size={14} /> Export All (.ics)
                            </button>
                            <div className="px-3 py-2 text-[10px] text-gray-400 font-medium leading-tight">
                                Import this file into Apple Calendar, Outlook, or Google Calendar.
                            </div>
                        </div>
                        </>
                    )}
                 </div>

                 <div className="flex bg-gray-200 dark:bg-white/10 p-1 rounded-xl">
                     <button onClick={() => setViewMode('day')} className={`p-2 rounded-lg transition-all ${viewMode === 'day' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`} title="Day View"><CalendarDays size={18}/></button>
                     <button onClick={() => setViewMode('month')} className={`p-2 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-black dark:text-white' : 'text-gray-500'}`} title="Month View"><CalendarIcon size={18}/></button>
                 </div>
             </div>
         </div>

         {/* ... (existing stats bar) ... */}
         {monthStats && (
             <div className="mb-6">
                 <button 
                    onClick={() => setIsStatsExpanded(!isStatsExpanded)} 
                    className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 hover:text-black dark:hover:text-white transition-colors"
                 >
                    <span>{format(selectedDate, 'MMMM')} Summary</span>
                    {isStatsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 </button>

                 {isStatsExpanded && (
                    <div className="grid grid-cols-3 gap-3 animate-slideUp">
                        <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Est. Revenue</p>
                            <p className="text-lg font-black text-green-500">Rs. {monthStats.revenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Completed</p>
                            <p className="text-lg font-black text-blue-500">{monthStats.completed} <span className="text-xs text-gray-400 font-bold">/ {monthStats.total}</span></p>
                        </div>
                        <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Remaining</p>
                            <p className="text-lg font-black text-purple-500">{monthStats.remaining}</p>
                        </div>
                    </div>
                 )}
             </div>
         )}

         {/* Unified Navigation Control */}
         <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-4">
            <button onClick={handlePrev} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-400"><ChevronLeft size={20}/></button>
            <div className="text-center cursor-pointer" onClick={handleReset}>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">
                    {viewMode === 'month' ? 'This Month' : 'Today'}
                </span>
                <span className="text-sm font-bold text-black dark:text-white">
                    {viewMode === 'month' ? format(selectedDate, 'MMMM yyyy') : format(selectedDate, 'EEEE, MMM do')}
                </span>
            </div>
            <button onClick={handleNext} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition text-gray-400"><ChevronRight size={20}/></button>
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
           {viewMode === 'month' && renderMonthView()}
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
                            ) : isRescheduling ? (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-3xl animate-fadeIn">
                                    <h3 className="text-center font-black text-sm uppercase text-blue-500 mb-4 flex items-center justify-center gap-2">
                                        <CalendarDays size={16} /> Reschedule
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">New Date</label>
                                            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-white dark:bg-black/20 p-3 rounded-xl text-sm font-bold outline-none text-black dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">New Time</label>
                                            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-white dark:bg-black/20 p-3 rounded-xl text-sm font-bold outline-none text-black dark:text-white" />
                                        </div>

                                        <button onClick={handleReschedule} className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 mt-2 active:scale-95 transition">Confirm</button>
                                        <button onClick={() => setIsRescheduling(false)} className="w-full py-2 text-xs text-gray-400 font-bold hover:text-black dark:hover:text-white transition">Cancel</button>
                                    </div>
                                </div>
                            ) : isHandlingMissed ? (
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-3xl animate-fadeIn">
                                    <h3 className="text-center font-black text-sm uppercase text-orange-500 mb-4 flex items-center justify-center gap-2">
                                        <AlertCircle size={16} /> Session Missed?
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-2 font-medium">Mark as missed? This will track it in history.</p>
                                        <button onClick={() => updateStatus('missed')} className="w-full py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 active:scale-95 transition">Yes, Mark Missed</button>
                                        <button onClick={() => setIsHandlingMissed(false)} className="w-full py-2 text-xs text-gray-400 font-bold hover:text-black dark:hover:text-white transition">Back</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                <button onClick={() => setIsCompleting(true)} className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg active:scale-95 transition">Mark Complete</button>
                                <button onClick={() => setIsRescheduling(true)} className="w-full py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold text-xs uppercase hover:bg-blue-100 transition">Reschedule</button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIsHandlingMissed(true)} className="py-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-bold text-xs uppercase hover:bg-orange-100 transition">Missed</button>
                                    <button onClick={() => updateStatus('cancelled')} className="py-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 transition">Cancel</button>
                                </div>
                                
                                {/* Calendar Actions */}
                                <div className="pt-4 mt-2 border-t border-gray-100 dark:border-white/5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">Add to Calendar</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => addToGoogleCalendar(activeSession.session, activeSession.clientName)}
                                            className="flex-1 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 font-bold text-[10px] uppercase hover:bg-blue-100 transition flex items-center justify-center gap-1"
                                        >
                                            <ExternalLink size={12} /> Google
                                        </button>
                                        <button 
                                            onClick={() => generateICS({ session: activeSession.session, clientName: activeSession.clientName })}
                                            className="flex-1 py-2 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 font-bold text-[10px] uppercase hover:bg-gray-100 transition flex items-center justify-center gap-1"
                                        >
                                            <Download size={12} /> .ICS
                                        </button>
                                    </div>
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
