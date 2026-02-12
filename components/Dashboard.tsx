
import React, { useState, useMemo } from 'react';
import { Client, NavPage, Session, DietMeal } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, YAxis } from 'recharts';
import { DollarSign, ChevronRight, TrendingUp, Clock, Bell, X, BarChart3, Trophy, Target, PlayCircle, CheckCircle2, AlertTriangle, RefreshCcw, PieChart as PieIcon, CalendarDays, Sun, Moon, Link, Utensils } from 'lucide-react';
import { format, addDays, subMonths, isSameDay, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, parse, differenceInMinutes, isBefore, getDay } from 'date-fns';

interface WidgetProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  icon?: any;
  iconColor?: string;
  headerAction?: React.ReactNode;
}

const Widget: React.FC<WidgetProps> = ({ children, onClick, className = "", title, icon: Icon, iconColor = "text-ios-blue", headerAction }) => (
  <div 
    onClick={onClick}
    className={`bg-ios-card-light dark:bg-ios-card-dark rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-white/5 relative transition-transform active:scale-[0.99] ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex justify-between items-center mb-4">
        {(title || Icon) && (
        <div className="flex items-center gap-2.5">
            {Icon && <div className={`p-1.5 rounded-lg ${iconColor} bg-opacity-10`}><Icon size={18} className={iconColor.replace('bg-', 'text-')} /></div>}
            {title && <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h3>}
        </div>
        )}
        {headerAction}
    </div>
    {children}
  </div>
);

interface DashboardProps {
  clients: Client[];
  navigateTo: (page: NavPage) => void;
  currency: string;
  viewingClient?: Client; // New prop for Client Mode
}

export const Dashboard: React.FC<DashboardProps> = ({ clients, navigateTo, currency, viewingClient }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const now = new Date();

  // If viewing a specific client (Client Mode), filtering is implicit because clients prop usually contains only them,
  // but we can ensure it by using viewingClient directly for stats.
  const targetClients = viewingClient ? [viewingClient] : clients;

  // --- Renewal Monitoring (Admin Only) ---
  const expiringClients = useMemo(() => {
    if (viewingClient) return [];
    return clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        const daysLeft = differenceInDays(expiry, now);
        const sessionsLeft = c.sessions.filter(s => !s.completed && s.status !== 'cancelled').length;
        return (daysLeft >= 0 && daysLeft <= 7) || (sessionsLeft <= 2 && sessionsLeft > 0) || isBefore(expiry, now);
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [clients, viewingClient]);

  // --- Capacity Stats (Admin Only) ---
  const capacityStats = useMemo(() => {
     if (viewingClient) return { bookedHours: 0, percentage: 0 };
     const WEEKLY_CAPACITY_HOURS = 48; // 8h * 6 days
     let bookedMinutes = 0;
     const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
     const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

     clients.forEach(c => {
         c.sessions.forEach(s => {
             if (s.status === 'cancelled') return;
             const sDate = new Date(s.date);
             if (sDate >= startOfCurrentWeek && sDate <= endOfCurrentWeek) {
                let duration = 60;
                if (s.time.includes('-')) {
                    const [start, end] = s.time.split('-');
                    const [sh, sm] = start.split(':').map(Number);
                    const [eh, em] = end.split(':').map(Number);
                    duration = (eh * 60 + em) - (sh * 60 + sm);
                }
                bookedMinutes += duration;
             }
         });
     });

     const bookedHours = bookedMinutes / 60;
     const percentage = Math.min(100, Math.round((bookedHours / WEEKLY_CAPACITY_HOURS) * 100));
     return { bookedHours, percentage };
  }, [clients, viewingClient]);

  // --- Today's Mission / Next Session Pipeline ---
  const relevantSessions = useMemo(() => {
      const sessions: { session: Session; client: Client }[] = [];
      targetClients.forEach(c => {
          c.sessions.forEach(s => {
              // For Admin: Show Today. For Client: Show Today and Future (Next)
              const sDate = new Date(s.date);
              if (viewingClient) {
                  if (isToday(sDate) || isBefore(now, sDate)) {
                      sessions.push({ session: s, client: c });
                  }
              } else {
                  if (isToday(sDate)) {
                      sessions.push({ session: s, client: c });
                  }
              }
          });
      });
      return sessions.sort((a, b) => new Date(a.session.date + 'T' + a.session.time).getTime() - new Date(b.session.date + 'T' + b.session.time).getTime());
  }, [targetClients, viewingClient]);

  // For Client Mode: Only take the immediate next one
  const nextSession = viewingClient ? relevantSessions.filter(s => s.session.status !== 'completed' && s.session.status !== 'cancelled')[0] : null;

  const missionProgress = useMemo(() => {
      const total = relevantSessions.length;
      const completed = relevantSessions.filter(s => s.session.status === 'completed').length;
      return { total, completed };
  }, [relevantSessions]);

  // --- Client Diet Summary (Client Mode) ---
  const dietSummary = useMemo(() => {
      if (!viewingClient || !viewingClient.dietPlan || !Array.isArray(viewingClient.dietPlan)) return null;
      const meals = viewingClient.dietPlan as DietMeal[];
      const totalCals = meals.reduce((acc, m) => acc + m.items.reduce((b, i) => b + (parseInt(i.calories || '0') || 0), 0), 0);
      const totalProt = meals.reduce((acc, m) => acc + m.items.reduce((b, i) => b + (parseInt(i.protein || '0') || 0), 0), 0);
      return { totalCals, totalProt };
  }, [viewingClient]);

  // --- Revenue / Performance Stats (Admin Only) ---
  const performanceStats = useMemo(() => {
    if (viewingClient) return { month: { hours: 0, revenue: 0 } };
    const stats = { month: { hours: 0, revenue: 0 } };
    clients.forEach(c => {
        const sessionValue = c.sessions.length > 0 ? c.totalFee / c.sessions.length : 0;
        c.sessions.forEach(s => {
            if (s.status === 'cancelled') return;
            const sDate = new Date(s.date);
            if (sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear()) {
                let duration = 1;
                if (s.time.includes('-')) {
                    const [start, end] = s.time.split('-');
                    const diff = differenceInMinutes(parse(end, 'HH:mm', now), parse(start, 'HH:mm', now));
                    if (diff > 0) duration = diff / 60;
                }
                stats.month.hours += duration;
                stats.month.revenue += sessionValue;
            }
        });
    });
    return stats;
  }, [clients, viewingClient]);

  const topClients = useMemo(() => {
    if (viewingClient) return [];
    return [...clients].sort((a, b) => b.totalFee - a.totalFee).slice(0, 5);
  }, [clients, viewingClient]);

  const totalRevenue = clients.reduce((acc, c) => acc + c.totalFee, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((clients.reduce((acc, c) => acc + c.paidAmount, 0) / totalRevenue) * 100) : 0;
  
  const extendedAnalytics = useMemo(() => {
    if (viewingClient) return { monthlyHistory: [], projectedRevenue: 0 };
    const last6Months = Array.from({length: 6}, (_, i) => {
        const d = subMonths(now, i);
        return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), revenue: 0 };
    }).reverse();

    let projectedRevenue = 0;
    clients.forEach(client => {
        const sessionValue = client.sessions.length > 0 ? client.totalFee / client.sessions.length : 0;
        client.sessions.forEach(session => {
             if (session.status === 'completed') {
                 const mStats = last6Months.find(m => m.key === format(new Date(session.date), 'yyyy-MM'));
                 if (mStats) mStats.revenue += sessionValue;
             }
             if (session.status === 'scheduled' || !session.status) {
                 const diff = differenceInDays(new Date(session.date), now);
                 if (diff >= 0 && diff <= 30) projectedRevenue += sessionValue;
             }
        });
    });
    return { monthlyHistory: last6Months, projectedRevenue };
  }, [clients, viewingClient]);

  // --- NEW ANALYTICS ---

  // 1. Session Status Distribution (Pie)
  const sessionStatusData = useMemo(() => {
    let completed = 0, cancelled = 0, missed = 0, scheduled = 0;
    targetClients.forEach(c => {
        c.sessions.forEach(s => {
            if (s.status === 'completed' || s.completed) completed++;
            else if (s.status === 'cancelled') cancelled++;
            else if (s.status === 'missed') missed++;
            else scheduled++;
        });
    });
    const total = completed + cancelled + missed + scheduled;
    // Don't show scheduled in the reliability pie, focus on outcomes
    const outcomeTotal = completed + cancelled + missed;
    return [
        { name: 'Done', value: completed, color: '#34C759' }, // Green
        { name: 'Missed', value: missed, color: '#FF9500' }, // Orange
        { name: 'Cancelled', value: cancelled, color: '#FF3B30' }, // Red
    ].filter(d => d.value > 0);
  }, [targetClients]);

  // 2. Weekly Activity (Bar)
  const weeklyActivityData = useMemo(() => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const data = days.map(d => ({ name: d, count: 0 }));
      targetClients.forEach(c => {
          c.sessions.forEach(s => {
             if (s.status !== 'cancelled') {
                 const d = new Date(s.date);
                 if (!isNaN(d.getTime())) {
                     data[getDay(d)].count++;
                 }
             }
          });
      });
      return data;
  }, [targetClients]);

  // 3. Time of Day Split
  const timeSplit = useMemo(() => {
      let morning = 0;
      let evening = 0;
      targetClients.forEach(c => {
          c.sessions.forEach(s => {
              if (s.status !== 'cancelled') {
                  const hour = parseInt(s.time.split(':')[0]);
                  if (hour < 12) morning++;
                  else evening++;
              }
          });
      });
      const total = morning + evening;
      return { 
          morning, 
          evening, 
          morningPct: total ? Math.round((morning / total) * 100) : 0,
          eveningPct: total ? Math.round((evening / total) * 100) : 0 
      };
  }, [targetClients]);

  return (
    <div className="space-y-5 animate-fadeIn pb-6 relative">
      <div className="pt-2 px-1 flex justify-between items-end relative z-20">
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{viewingClient ? 'Client Dashboard' : 'Business Pulse'}</p>
            <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight tracking-tight">
                {viewingClient ? `Hello ${viewingClient.name.split(' ')[0]}` : 'Welcome Raj'}
            </h1>
         </div>
         {!viewingClient && (
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 bg-white dark:bg-[#1C1C1E] rounded-full shadow-ios flex items-center justify-center text-gray-500 border border-gray-100 dark:border-gray-800">
                <Bell size={20} />
                {expiringClients.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-black rounded-full"></span>}
            </button>
         )}
      </div>
      
      {/* Zero State for New Admins or Unlinked Clients */}
      {!viewingClient && clients.length === 0 && (
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[24px] p-6 text-white shadow-xl animate-slideUp">
              <h2 className="text-xl font-bold mb-2">Welcome to FitWithRj! 🚀</h2>
              <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                  Start your journey by adding your first client or connecting to your trainer.
              </p>
              <div className="flex flex-col gap-3">
                  <button onClick={() => navigateTo(NavPage.ADD_CLIENT)} className="bg-white text-blue-600 font-bold py-3 rounded-xl shadow-lg active:scale-95 transition">
                      + Add New Client (For Coaches)
                  </button>
                  <button onClick={() => navigateTo(NavPage.SETTINGS)} className="bg-blue-700/50 text-white font-bold py-3 rounded-xl border border-white/20 active:scale-95 transition flex items-center justify-center gap-2">
                      <Link size={16} /> I'm a Client (Connect to Coach)
                  </button>
                  <p className="text-[10px] text-blue-200 text-center px-4">
                      If you are a client and see this screen, click "Connect to Coach" and ask your trainer for their Trainer ID.
                  </p>
              </div>
          </div>
      )}

      {/* --- CLIENT MODE VIEW --- */}
      {viewingClient ? (
          <div className="space-y-6">
              {/* Next Session Card */}
              <Widget className="col-span-2" title="Your Next Session" icon={PlayCircle} iconColor="bg-blue-500 text-blue-500">
                  {nextSession ? (
                      <div className="mt-2 p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl text-white shadow-lg shadow-blue-500/30">
                          <p className="text-blue-100 font-bold uppercase text-[10px] tracking-widest mb-1">Coming Up</p>
                          <div className="flex justify-between items-end">
                              <div>
                                  <h3 className="text-3xl font-black">{nextSession.session.time.split('-')[0]}</h3>
                                  <p className="font-medium text-blue-100">{format(new Date(nextSession.session.date), 'EEEE, MMMM do')}</p>
                              </div>
                              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                  <Clock size={20} />
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="py-6 text-center text-gray-400 text-sm italic">No upcoming sessions scheduled.</div>
                  )}
              </Widget>

              {/* Diet Summary Widget */}
              {dietSummary && dietSummary.totalCals > 0 && (
                  <Widget className="col-span-2" title="Daily Targets" icon={Utensils} iconColor="bg-green-500 text-green-500">
                      <div className="mt-2 flex justify-between items-end">
                           <div className="text-center">
                               <p className="text-2xl font-black text-black dark:text-white">{dietSummary.totalCals}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Calories</p>
                           </div>
                           <div className="text-center">
                               <p className="text-2xl font-black text-black dark:text-white">{dietSummary.totalProt}g</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Protein</p>
                           </div>
                           <button onClick={() => navigateTo(NavPage.PLANS)} className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 active:scale-95 transition">
                               View Plan
                           </button>
                      </div>
                  </Widget>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <Widget className="col-span-1" title="Attendance" icon={CheckCircle2} iconColor="bg-green-500 text-green-500">
                      <div className="h-[100px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie data={sessionStatusData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                      {sessionStatusData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-xs font-black text-gray-400">{sessionStatusData[0]?.value || 0}</span>
                          </div>
                      </div>
                  </Widget>
                  <Widget className="col-span-1" title="Status" icon={AlertTriangle} iconColor="bg-orange-500 text-orange-500">
                       <div className="mt-2">
                           <span className={`text-xl font-black ${viewingClient.totalFee - viewingClient.paidAmount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                               {viewingClient.totalFee - viewingClient.paidAmount > 0 ? 'Payment Due' : 'All Paid'}
                           </span>
                           {viewingClient.totalFee - viewingClient.paidAmount > 0 && <p className="text-xs text-gray-400 font-bold">{currency}{viewingClient.totalFee - viewingClient.paidAmount} pending</p>}
                       </div>
                  </Widget>
              </div>

              <Widget className="col-span-2" title="My Plan" icon={Target} iconColor="bg-purple-500 text-purple-500">
                  <div className="mt-2 space-y-3">
                      <button onClick={() => navigateTo(NavPage.PLANS)} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl active:scale-95 transition">
                          <span className="font-bold text-gray-700 dark:text-gray-200">View Full Program</span>
                          <ChevronRight size={16} className="text-gray-400"/>
                      </button>
                  </div>
              </Widget>
          </div>
      ) : (
      /* --- ADMIN MODE VIEW --- */
      clients.length > 0 && (
      <>
          {/* 1. Today's Agenda */}
          <Widget 
            className="col-span-2" 
            title="Today's Mission" 
            icon={PlayCircle} 
            iconColor="bg-blue-500 text-blue-500"
            onClick={() => navigateTo(NavPage.SCHEDULE)}
            headerAction={
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        {missionProgress.completed}/{missionProgress.total} Done
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                </div>
            }
          >
              <div className="mt-2 space-y-3">
                  {relevantSessions.length > 0 ? relevantSessions.map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${item.session.status === 'completed' ? 'bg-gray-50 dark:bg-white/5 opacity-50 border-transparent' : 'bg-white dark:bg-[#2C2C2E] border-gray-100 dark:border-white/5 shadow-sm'}`}>
                          <div className="w-12 text-center">
                              <p className="text-xs font-bold text-black dark:text-white">{item.session.time.split('-')[0]}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</p>
                          </div>
                          <div className="flex-1 truncate">
                              <p className="text-sm font-bold text-black dark:text-white truncate">{item.client.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium">Personal Training</p>
                          </div>
                          {item.session.status === 'completed' ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                  )) : <div className="py-6 text-center text-gray-400 text-sm italic">No sessions scheduled for today.</div>}
              </div>
          </Widget>

          <div className="grid grid-cols-2 gap-4">
            
            {/* 2. Monthly Revenue Goal */}
            <Widget className="col-span-1" title="Monthly Goal" icon={Target} iconColor="bg-red-500 text-red-500">
                <div className="mt-2">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xl font-bold text-black dark:text-white">{currency}{(performanceStats.month.revenue / 1000).toFixed(1)}k</span>
                        <span className="text-[10px] font-bold text-gray-400">50k</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (performanceStats.month.revenue / 50000) * 100)}%` }}></div>
                    </div>
                </div>
            </Widget>

            {/* 3. Capacity Usage */}
            <Widget className="col-span-1" title="Capacity" icon={Clock} iconColor="bg-yellow-500 text-yellow-500">
                <div className="mt-2">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xl font-bold text-black dark:text-white">{capacityStats.percentage}%</span>
                        <span className="text-[10px] font-bold text-gray-400">Full</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${capacityStats.percentage}%` }}></div>
                    </div>
                </div>
            </Widget>

            {/* 4. Session Reliability (Pie Chart) */}
            <Widget className="col-span-1 min-h-[160px]" title="Reliability" icon={PieIcon} iconColor="bg-purple-500 text-purple-500">
                <div className="h-[100px] w-full mt-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={sessionStatusData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value" stroke="none">
                                {sessionStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} itemStyle={{color: 'black'}} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Done</span>
                        <span className="text-lg font-black text-black dark:text-white">{sessionStatusData.find(d => d.name === 'Done')?.value || 0}</span>
                    </div>
                </div>
            </Widget>

            {/* 5. Time Split */}
            <Widget className="col-span-1 min-h-[160px]" title="Time Split" icon={Sun} iconColor="bg-orange-400 text-orange-400">
                 <div className="mt-3 space-y-4">
                     <div>
                         <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                             <div className="flex items-center gap-1"><Sun size={10}/> Morning</div>
                             <span>{timeSplit.morningPct}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${timeSplit.morningPct}%` }}></div>
                         </div>
                     </div>
                     <div>
                         <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                             <div className="flex items-center gap-1"><Moon size={10}/> Evening</div>
                             <span>{timeSplit.eveningPct}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${timeSplit.eveningPct}%` }}></div>
                         </div>
                     </div>
                 </div>
            </Widget>

            {/* 6. Renewals Alert */}
            <Widget className="col-span-2" title="Renewals Needed" icon={RefreshCcw} iconColor="bg-red-500 text-red-500">
            <div className="mt-1 space-y-2">
                {expiringClients.length > 0 ? expiringClients.slice(0, 3).map(c => {
                    const expiry = new Date(c.expiryDate);
                    const isPast = isBefore(expiry, now);
                    return (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={14} className="text-red-500" />
                                <span className="text-sm font-bold text-black dark:text-white">{c.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 uppercase">
                                {isPast ? 'Expired' : `${differenceInDays(expiry, now)}d left`}
                            </span>
                        </div>
                    );
                }) : <p className="text-xs text-gray-400 italic py-2">All client packages are healthy.</p>}
            </div>
            </Widget>
          </div>

          {/* 7. Peak Activity Days (Bar Chart) */}
          <Widget className="col-span-2 min-h-[220px]" title="Peak Activity Days" icon={CalendarDays} iconColor="bg-blue-500 text-blue-500">
            <div className="mt-2 h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivityData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={32}>
                        {weeklyActivityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#007AFF' : '#F2F2F7'} className="dark:fill-gray-800" />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
          </Widget>

          <div className="grid grid-cols-2 gap-4">
            {/* 8. Earnings History */}
            <Widget className="col-span-2 min-h-[220px]" title="Earnings Growth" icon={BarChart3} iconColor="bg-green-500 text-green-500">
                <div className="mt-2 h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={extendedAnalytics.monthlyHistory}>
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} dy={10} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                        <Bar dataKey="revenue" radius={[6, 6, 6, 6]} barSize={28}>
                            {extendedAnalytics.monthlyHistory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 5 ? '#34C759' : '#E5E7EB'} className="dark:fill-gray-700" />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </Widget>

            {/* 9. Client Leaderboard */}
            <Widget className="col-span-2" title="Client Leaderboard" icon={Trophy} iconColor="bg-yellow-500 text-yellow-500">
            <div className="mt-2 space-y-3">
                {topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                        <span className={`w-6 text-[11px] font-black ${i === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{i+1}</span>
                        <div className="flex-1">
                            <div className="flex justify-between mb-0.5">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">{c.name}</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{currency}{c.totalFee.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(c.totalFee / (topClients[0]?.totalFee || 1)) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </Widget>

            {/* 10. Lifetime Revenue Summary */}
            <Widget className="col-span-2" title="Lifetime Revenue" icon={DollarSign} iconColor="bg-green-500 text-green-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white">{currency}{totalRevenue.toLocaleString()}</h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">{collectionRate}% collected</p>
                </div>
                <div className="h-12 w-24 opacity-40">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={extendedAnalytics.monthlyHistory}>
                        <Area type="monotone" dataKey="revenue" stroke="#34C759" fill="#34C759" fillOpacity={0.2} strokeWidth={3} />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </Widget>
        </div>
      </>
      )
      )}
    </div>
  );
};
