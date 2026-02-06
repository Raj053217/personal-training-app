import React, { useState, useMemo } from 'react';
import { Client, NavPage, Session } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, ChevronRight, TrendingUp, Clock, Bell, X, BarChart3, Trophy, Target, PlayCircle, CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { format, addDays, subMonths, isSameDay, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, parse, differenceInMinutes, isBefore } from 'date-fns';

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
}

const Dashboard: React.FC<DashboardProps> = ({ clients, navigateTo, currency }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const now = new Date();

  // --- Renewal Monitoring ---
  const expiringClients = useMemo(() => {
    return clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        const daysLeft = differenceInDays(expiry, now);
        const sessionsLeft = c.sessions.filter(s => !s.completed && s.status !== 'cancelled').length;
        return (daysLeft >= 0 && daysLeft <= 7) || (sessionsLeft <= 2 && sessionsLeft > 0) || isBefore(expiry, now);
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [clients]);

  // --- Capacity Stats ---
  const capacityStats = useMemo(() => {
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
  }, [clients]);

  // --- Today's Mission Pipeline ---
  const todaySessions = useMemo(() => {
      const todayStr = format(now, 'yyyy-MM-dd');
      const sessions: { session: Session; client: Client }[] = [];
      clients.forEach(c => {
          c.sessions.forEach(s => {
              if (s.date === todayStr) {
                  sessions.push({ session: s, client: c });
              }
          });
      });
      return sessions.sort((a, b) => a.session.time.localeCompare(b.session.time));
  }, [clients]);

  const missionProgress = useMemo(() => {
      const total = todaySessions.length;
      const completed = todaySessions.filter(s => s.session.status === 'completed').length;
      return { total, completed };
  }, [todaySessions]);

  const performanceStats = useMemo(() => {
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
  }, [clients]);

  const topClients = useMemo(() => {
    return [...clients].sort((a, b) => b.totalFee - a.totalFee).slice(0, 5);
  }, [clients]);

  const totalRevenue = clients.reduce((acc, c) => acc + c.totalFee, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((clients.reduce((acc, c) => acc + c.paidAmount, 0) / totalRevenue) * 100) : 0;
  
  const extendedAnalytics = useMemo(() => {
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
  }, [clients]);

  return (
    <div className="space-y-5 animate-fadeIn pb-6 relative">
      <div className="pt-2 px-1 flex justify-between items-end relative z-20">
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Business Pulse</p>
            <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight tracking-tight">Welcome Raj</h1>
         </div>
         <button onClick={() => setShowNotifications(!showNotifications)} className="relative w-10 h-10 bg-white dark:bg-[#1C1C1E] rounded-full shadow-ios flex items-center justify-center text-gray-500 border border-gray-100 dark:border-gray-800">
           <Bell size={20} />
           {expiringClients.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-black rounded-full"></span>}
         </button>
      </div>

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
              {todaySessions.length > 0 ? todaySessions.map((item, idx) => (
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
        {/* Expiring Soon Widget (New) */}
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

        <Widget className="col-span-2 min-h-[220px]" title="Earnings Growth" icon={BarChart3} iconColor="bg-green-500 text-green-500">
          <div className="mt-2 h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={extendedAnalytics.monthlyHistory}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} dy={10} />
                  <Bar dataKey="revenue" radius={[6, 6, 6, 6]} barSize={28}>
                     {extendedAnalytics.monthlyHistory.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={index === 5 ? '#34C759' : '#E5E7EB'} className="dark:fill-gray-700" />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

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
    </div>
  );
};

export default Dashboard;