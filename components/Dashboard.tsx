
import React, { useState, useMemo } from 'react';
import { Client, NavPage, Session, DietMeal } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, YAxis } from 'recharts';
import { DollarSign, ChevronRight, TrendingUp, Clock, Bell, X, BarChart3, Trophy, Target, PlayCircle, CheckCircle2, AlertTriangle, RefreshCcw, PieChart as PieIcon, CalendarDays, Sun, Moon, Link, Utensils, Zap, Users } from 'lucide-react';
import { format, addDays, subMonths, isSameDay, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, parse, differenceInMinutes, isBefore, isAfter, getDay } from 'date-fns';

interface WidgetProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: any;
  iconColor?: string;
  headerAction?: React.ReactNode;
  gradient?: boolean;
}

const Widget: React.FC<WidgetProps> = ({ children, onClick, className = "", title, subtitle, icon: Icon, iconColor = "text-ios-blue", headerAction, gradient = false }) => (
  <div 
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-[32px] p-6 transition-all duration-300
      ${gradient 
        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-glow' 
        : 'bg-white dark:bg-[#1C1C1E] shadow-ios dark:shadow-none border border-gray-100 dark:border-white/5'
      }
      ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
      ${className}
    `}
  >
    {(title || Icon) && (
    <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
            {Icon && (
                <div className={`p-2.5 rounded-2xl ${gradient ? 'bg-white/20 text-white' : `${iconColor.replace('text-', 'bg-').replace('500', '50')} ${iconColor} dark:bg-white/10 dark:text-white`}`}>
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            )}
            <div>
                {title && <h3 className={`text-[17px] font-bold tracking-tight ${gradient ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{title}</h3>}
                {subtitle && <p className={`text-[11px] font-bold uppercase tracking-wider ${gradient ? 'text-blue-200' : 'text-gray-400'}`}>{subtitle}</p>}
            </div>
        </div>
        {headerAction}
    </div>
    )}
    <div className="relative z-10">
        {children}
    </div>
  </div>
);

interface DashboardProps {
  clients: Client[];
  navigateTo: (page: NavPage) => void;
  currency: string;
  viewingClient?: Client;
}

export const Dashboard: React.FC<DashboardProps> = ({ clients, navigateTo, currency, viewingClient }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const now = new Date();

  // Greeting Logic
  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const targetClients = viewingClient ? [viewingClient] : clients;

  // --- Renewal Monitoring ---
  const expiringClients = useMemo(() => {
    if (viewingClient) return [];
    return clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        const daysLeft = differenceInDays(expiry, now);
        const sessionsLeft = c.sessions.filter(s => !s.completed && s.status !== 'cancelled').length;
        return (daysLeft >= 0 && daysLeft <= 7) || (sessionsLeft <= 2 && sessionsLeft > 0) || isBefore(expiry, now);
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [clients, viewingClient]);

  // --- Capacity Stats ---
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

  // --- Active Clients Stats ---
  const activeClientsCount = useMemo(() => {
    if (viewingClient) return 0;
    return clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        return isAfter(expiry, now) || isSameDay(expiry, now);
    }).length;
  }, [clients, viewingClient, now]);

  // --- Relevant Sessions ---
  const relevantSessions = useMemo(() => {
      const sessions: { session: Session; client: Client }[] = [];
      targetClients.forEach(c => {
          c.sessions.forEach(s => {
              const sDate = new Date(s.date);
              if (viewingClient) {
                  // For Client: Today or Future
                  if (isToday(sDate) || isBefore(now, sDate)) { 
                       if (s.status !== 'completed' && s.status !== 'cancelled') {
                            sessions.push({ session: s, client: c });
                       }
                  }
              } else {
                  // For Admin: Today
                  if (isToday(sDate)) {
                      sessions.push({ session: s, client: c });
                  }
              }
          });
      });
      // Sort: closest first
      return sessions.sort((a, b) => new Date(a.session.date + 'T' + a.session.time).getTime() - new Date(b.session.date + 'T' + b.session.time).getTime());
  }, [targetClients, viewingClient]);

  const nextSession = viewingClient ? relevantSessions.filter(s => {
      const d = new Date(s.session.date + 'T' + s.session.time);
      return d > now;
  })[0] : null;

  const missionProgress = useMemo(() => {
      // For Admin Today
      const todaySessions = [];
      clients.forEach(c => c.sessions.forEach(s => {
          if(isToday(new Date(s.date))) todaySessions.push(s);
      }));
      const total = todaySessions.length;
      const completed = todaySessions.filter(s => s.status === 'completed').length;
      return { total, completed };
  }, [clients]);

  // --- Performance Stats ---
  const performanceStats = useMemo(() => {
    if (viewingClient) return { month: { hours: 0, revenue: 0 } };
    const stats = { month: { hours: 0, revenue: 0 } };
    clients.forEach(c => {
        const sessionValue = c.sessions.length > 0 ? c.totalFee / c.sessions.length : 0;
        c.sessions.forEach(s => {
            if (s.status === 'cancelled') return;
            const sDate = new Date(s.date);
            if (sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear()) {
                stats.month.revenue += sessionValue;
            }
        });
    });
    return stats;
  }, [clients, viewingClient]);

  // --- Session Status Pie ---
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
    return [
        { name: 'Done', value: completed, color: '#34C759' }, 
        { name: 'Missed', value: missed, color: '#FF9500' }, 
        { name: 'Cancelled', value: cancelled, color: '#FF3B30' },
    ].filter(d => d.value > 0);
  }, [targetClients]);

  // --- Weekly Activity Bar ---
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

  return (
    <div className="space-y-6 animate-fadeIn pb-6 relative">
      {/* Header */}
      <div className="pt-2 px-1 flex justify-between items-center relative z-20">
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{greeting}, {viewingClient ? viewingClient.name.split(' ')[0] : 'Coach'}</p>
            <h1 className="text-[32px] font-black text-black dark:text-white leading-tight tracking-tight">
                {viewingClient ? 'Your Dashboard' : 'Overview'}
            </h1>
         </div>
         {!viewingClient && (
            <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="relative w-12 h-12 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
                <Bell size={22} />
                {expiringClients.length > 0 && <span className="absolute top-3 right-3.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
         )}
      </div>

      {/* --- CLIENT MODE VIEW --- */}
      {viewingClient ? (
          <div className="space-y-6">
              {/* Hero Widget: Next Session */}
              <Widget className="col-span-2 overflow-hidden" gradient title="Up Next" icon={Clock} iconColor="text-white">
                  {nextSession ? (
                      <div className="mt-4 flex justify-between items-end relative z-10">
                          <div>
                              <h3 className="text-5xl font-black tracking-tighter mb-1">{nextSession.session.time.split('-')[0]}</h3>
                              <p className="font-semibold text-blue-100 text-lg">{format(new Date(nextSession.session.date), 'EEEE, MMM do')}</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                             <PlayCircle size={32} className="text-white" fill="currentColor" />
                          </div>
                      </div>
                  ) : (
                      <div className="py-8 text-center text-blue-100 font-medium">No upcoming sessions.</div>
                  )}
                  {/* Decorative Circle */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              </Widget>

              {/* Diet & Status Grid */}
              <div className="grid grid-cols-2 gap-4">
                   <Widget title="Diet" subtitle="Daily Target" icon={Utensils} iconColor="text-green-500" onClick={() => navigateTo(NavPage.PLANS)}>
                       <div className="mt-2">
                           <div className="flex items-baseline gap-1">
                               <span className="text-2xl font-black text-black dark:text-white">
                                   {/* Calculate approx calories if plan exists */}
                                   {(viewingClient.dietPlan as DietMeal[])?.reduce((acc, m) => acc + m.items.reduce((s, i) => s + (parseInt(i.calories||'0')||0), 0), 0) || 0}
                               </span>
                               <span className="text-xs font-bold text-gray-400">kcal</span>
                           </div>
                           <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                               <div className="h-full bg-green-500 rounded-full w-2/3"></div>
                           </div>
                       </div>
                   </Widget>
                   <Widget title="Training" subtitle="Completion" icon={Trophy} iconColor="text-orange-500" onClick={() => navigateTo(NavPage.PLANS)}>
                        <div className="mt-2">
                           <div className="flex items-baseline gap-1">
                               <span className="text-2xl font-black text-black dark:text-white">
                                   {sessionStatusData.find(d => d.name === 'Done')?.value || 0}
                               </span>
                               <span className="text-xs font-bold text-gray-400">Sessions</span>
                           </div>
                           <p className="text-[10px] text-gray-400 mt-3 font-medium">Keep pushing!</p>
                       </div>
                   </Widget>
              </div>

              {/* Program Link */}
              <button 
                onClick={() => navigateTo(NavPage.PLANS)} 
                className="w-full bg-white dark:bg-[#1C1C1E] p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-between group active:scale-[0.98] transition"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center">
                          <Zap size={24} fill="currentColor" className="opacity-80"/>
                      </div>
                      <div className="text-left">
                          <h3 className="font-bold text-black dark:text-white text-lg">My Full Program</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">View Details</p>
                      </div>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-purple-500 transition-colors" />
              </button>
          </div>
      ) : (
      /* --- ADMIN MODE VIEW --- */
      clients.length > 0 ? (
      <>
          {/* Today's Mission */}
          <Widget 
            className="col-span-2" 
            title="Today's Mission" 
            subtitle={`${format(now, 'MMMM do')}`}
            icon={Target} 
            iconColor="text-blue-500"
            onClick={() => navigateTo(NavPage.SCHEDULE)}
            headerAction={
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-full">
                    <span className="text-xs font-black text-black dark:text-white">
                        {missionProgress.completed}/{missionProgress.total}
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${missionProgress.total ? (missionProgress.completed/missionProgress.total)*100 : 0}%` }}></div>
                    </div>
                </div>
            }
          >
              <div className="mt-4 space-y-3">
                  {relevantSessions.length > 0 ? relevantSessions.map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${item.session.status === 'completed' ? 'bg-gray-50 dark:bg-white/5 opacity-60' : 'bg-gray-50 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10'}`}>
                          <div className="w-14 text-center border-r border-gray-200 dark:border-white/10 pr-4">
                              <p className="text-sm font-black text-black dark:text-white">{item.session.time.split('-')[0]}</p>
                              <p className="text-[9px] text-gray-400 font-bold uppercase">{parseInt(item.session.time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</p>
                          </div>
                          <div className="flex-1 truncate">
                              <p className="text-sm font-bold text-black dark:text-white truncate">{item.client.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Personal Training</p>
                              </div>
                          </div>
                          {item.session.status === 'completed' ? <CheckCircle2 size={20} className="text-green-500" /> : <div className="p-2 bg-white dark:bg-white/10 rounded-full shadow-sm"><ChevronRight size={14} className="text-gray-400"/></div>}
                      </div>
                  )) : <div className="py-8 text-center text-gray-400 text-sm font-medium">No sessions scheduled today.</div>}
              </div>
          </Widget>

          <div className="grid grid-cols-2 gap-4">
            {/* Active Clients */}
            <Widget title="Active Clients" subtitle="Current" icon={Users} iconColor="text-indigo-500" onClick={() => navigateTo(NavPage.CLIENTS)}>
                <div className="mt-2">
                    <span className="text-2xl font-black text-black dark:text-white">{activeClientsCount}</span>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${clients.length > 0 ? (activeClientsCount / clients.length) * 100 : 0}%` }}></div>
                    </div>
                </div>
            </Widget>

            {/* Monthly Revenue */}
            <Widget title="Revenue" subtitle="This Month" icon={DollarSign} iconColor="text-green-500">
                <div className="mt-2">
                    <span className="text-2xl font-black text-black dark:text-white">{currency}{(performanceStats.month.revenue / 1000).toFixed(1)}k</span>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (performanceStats.month.revenue / 50000) * 100)}%` }}></div>
                    </div>
                </div>
            </Widget>

            {/* Capacity */}
            <Widget title="Capacity" subtitle="Weekly Load" icon={BarChart3} iconColor="text-purple-500">
                <div className="mt-2">
                    <span className="text-2xl font-black text-black dark:text-white">{capacityStats.percentage}%</span>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${capacityStats.percentage}%` }}></div>
                    </div>
                </div>
            </Widget>

            {/* Renewals Alert */}
            <Widget title="Renewals" subtitle="Action Needed" icon={RefreshCcw} iconColor="text-red-500">
                <div className="mt-2 space-y-2">
                    {expiringClients.length > 0 ? expiringClients.slice(0, 2).map(c => {
                        const expiry = new Date(c.expiryDate);
                        const isPast = isBefore(expiry, now);
                        return (
                            <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                <span className="text-xs font-bold text-black dark:text-white truncate max-w-[80px]">{c.name.split(' ')[0]}</span>
                                <span className="text-[9px] font-bold text-red-600 uppercase">
                                    {isPast ? 'Exp' : `${differenceInDays(expiry, now)}d`}
                                </span>
                            </div>
                        );
                    }) : <p className="text-xs text-gray-400 font-medium py-2">No alerts.</p>}
                </div>
            </Widget>

            {/* Chart: Activity */}
            <Widget className="col-span-2 min-h-[240px]" title="Weekly Activity" icon={CalendarDays} iconColor="text-blue-500">
                <div className="mt-4 h-[160px] w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivityData}>
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} 
                            dy={10} 
                        />
                        <Tooltip 
                            cursor={{fill: 'transparent'}} 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} 
                        />
                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={24}>
                            {weeklyActivityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3B82F6' : '#F3F4F6'} className="dark:fill-white/10" />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </Widget>
          </div>
      </>
      ) : (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-glow animate-scaleIn text-center py-16">
              <h2 className="text-2xl font-black mb-2">Welcome to FitWithRj! 🚀</h2>
              <p className="text-blue-100 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                  Start your journey by adding your first client.
              </p>
              <button onClick={() => navigateTo(NavPage.ADD_CLIENT)} className="bg-white text-blue-600 font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-95 transition">
                  + Add New Client
              </button>
          </div>
      ))}
    </div>
  );
};
