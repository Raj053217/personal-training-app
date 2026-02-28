import React, { useState, useMemo } from 'react';
import { Client, NavPage, Session, DietMeal } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, YAxis, LineChart, Line } from 'recharts';
import { DollarSign, ChevronRight, TrendingUp, Clock, Bell, X, BarChart3, Trophy, Target, PlayCircle, CheckCircle2, AlertTriangle, RefreshCcw, PieChart as PieIcon, CalendarDays, Sun, Moon, Link, Utensils, Zap, Users, ArrowUpRight, Check, Sparkles, Loader2, Scale, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { format, addDays, subMonths, isSameDay, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, parse, differenceInMinutes, isBefore, isAfter, getDay, parseISO } from 'date-fns';
import { generateBusinessInsight } from '../services/gemini';
import { useAuth } from '../contexts/AuthContext';

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
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const Widget: React.FC<WidgetProps> = ({ children, onClick, className = "", title, subtitle, icon: Icon, iconColor = "text-ios-blue", headerAction, gradient = false, collapsible = false, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
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
      <div className="flex justify-between items-start mb-4 relative z-10" onClick={collapsible ? (e) => { e.stopPropagation(); setIsOpen(!isOpen); } : undefined}>
          <div className="flex items-center gap-3 cursor-pointer">
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
          <div className="flex items-center gap-2">
            {headerAction}
            {collapsible && (
                <button className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className={gradient ? 'text-white' : 'text-gray-400'} />
                </button>
            )}
          </div>
      </div>
      )}
      <div className={`relative z-10 transition-all duration-500 ease-in-out overflow-hidden ${collapsible ? (isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0') : ''}`}>
          {children}
      </div>
    </div>
  );
};

interface DashboardProps {
  clients: Client[];
  navigateTo: (page: NavPage) => void;
  currency: string;
  viewingClient?: Client;
}

export const Dashboard: React.FC<DashboardProps> = ({ clients, navigateTo, currency, viewingClient }) => {
  const { logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
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

  // --- Active Clients Stats ---
  const activeClientsCount = useMemo(() => {
    if (viewingClient) return 0;
    return clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        return isAfter(expiry, now) || isSameDay(expiry, now);
    }).length;
  }, [clients, viewingClient, now]);

  // --- Financial Stats (Enhanced) ---
  const financialStats = useMemo(() => {
      if (viewingClient) return { total: 0, weekly: 0, monthly: 0, pending: 0, monthlyGraph: [], currentMonth: 0, lastMonth: 0, growth: 0, breakdown: [] };
      
      let total = 0;
      let weekly = 0;
      let monthlyTotal = 0;
      let pending = 0;
      const monthlyGraph: Record<string, number> = {};
      const breakdownObj = { 'Monthly': 0, 'Weekly': 0, 'Packages': 0 };
      
      // Initialize months for current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), i, 1);
          monthlyGraph[format(d, 'MMM')] = 0;
      }

      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);

      clients.forEach(c => {
          const paid = c.paidAmount || 0;
          
          // Only count towards total if within current year (approximate based on start date for now, ideally transaction date)
          if (c.startDate) {
              const d = new Date(c.startDate);
              
              // Weekly Earning
              if (d >= startOfCurrentWeek && d <= endOfCurrentWeek) {
                  weekly += paid;
              }

              // Monthly Earning
              if (d >= startOfCurrentMonth && d <= endOfCurrentMonth) {
                  monthlyTotal += paid;
              }

              if (d.getFullYear() === now.getFullYear()) {
                  total += paid;
                  
                  // Breakdown by type
                  if (c.paymentPlan?.frequency === 'monthly') breakdownObj['Monthly'] += paid;
                  else if (c.paymentPlan?.frequency === 'weekly') breakdownObj['Weekly'] += paid;
                  else breakdownObj['Packages'] += paid;

                  const key = format(d, 'MMM');
                  if (monthlyGraph[key] !== undefined) {
                      monthlyGraph[key] += paid;
                  }
              }
          }
          
          pending += (c.totalFee || 0) - paid;
      });

      const monthlyData = Object.entries(monthlyGraph).map(([name, value]) => ({ name, value }));
      
      // Calculate Growth
      const currentMonthKey = format(now, 'MMM');
      const lastMonthKey = format(subMonths(now, 1), 'MMM');
      const currentMonth = monthlyGraph[currentMonthKey] || 0;
      const lastMonth = monthlyGraph[lastMonthKey] || 0;
      const growth = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;

      const breakdown = [
          { name: 'Monthly', value: breakdownObj['Monthly'], color: '#3B82F6' }, // Blue
          { name: 'Weekly', value: breakdownObj['Weekly'], color: '#8B5CF6' },  // Purple
          { name: 'Packages', value: breakdownObj['Packages'], color: '#10B981' } // Emerald
      ].filter(b => b.value > 0);

      return { total, weekly, monthly: monthlyTotal, pending, monthlyGraph: monthlyData, currentMonth, lastMonth, growth, breakdown };
  }, [clients, viewingClient, now]);

  // --- Upcoming Sessions Stats ---
  const upcomingSessionsCount = useMemo(() => {
      if (viewingClient) return 0;
      let count = 0;
      clients.forEach(c => {
          c.sessions.forEach(s => {
              const sDate = parseISO(s.date);
              const isFuture = isAfter(sDate, now) || isSameDay(sDate, now);
              if (isFuture && s.status !== 'cancelled' && s.status !== 'completed' && !s.completed) {
                  count++;
              }
          });
      });
      return count;
  }, [clients, viewingClient, now]);

  // --- Relevant Sessions (For Today's Mission) ---
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
      const todaySessions: Session[] = [];
      clients.forEach(c => c.sessions.forEach(s => {
          if(isToday(new Date(s.date))) todaySessions.push(s);
      }));
      const total = todaySessions.length;
      const completed = todaySessions.filter(s => s.status === 'completed').length;
      return { total, completed };
  }, [clients]);

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
  
  // --- Weight History Data (Client Only) ---
  const weightData = useMemo(() => {
      if (!viewingClient || !viewingClient.weightHistory) return [];
      return viewingClient.weightHistory.slice(-10).map(w => ({ date: format(new Date(w.date), 'MM/dd'), weight: w.weight }));
  }, [viewingClient]);

  // --- Recent Activity ---
  const recentActivity = useMemo(() => {
      if (viewingClient) return [];
      const activity: { clientName: string; action: string; time: string; date: Date; icon: any; color: string }[] = [];
      
      clients.forEach(c => {
          // Completed Sessions
          c.sessions.forEach(s => {
              if (s.status === 'completed' || s.completed) {
                  activity.push({
                      clientName: c.name,
                      action: 'completed a session',
                      time: format(new Date(s.date + 'T' + s.time), 'MMM d, h:mm a'),
                      date: new Date(s.date + 'T' + s.time),
                      icon: CheckCircle2,
                      color: 'bg-green-100 text-green-600'
                  });
              }
          });
          
          // New Client Join
          if (c.startDate) {
               activity.push({
                   clientName: c.name,
                   action: 'joined FitWithRj',
                   time: format(new Date(c.startDate), 'MMM d'),
                   date: new Date(c.startDate),
                   icon: Users,
                   color: 'bg-blue-100 text-blue-600'
               });
          }
      });

      return activity.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [clients, viewingClient]);

  // Notification Handling
  const notifications = useMemo(() => {
      if (viewingClient) return [];
      const notifs: { id: string; title: string; text: string; icon: any; color: string }[] = [];
      
      // Renewal alerts
      expiringClients.forEach(c => {
          notifs.push({
              id: `renew-${c.id}`,
              title: "Renewal Due",
              text: `${c.name}'s package expires soon.`,
              icon: RefreshCcw,
              color: 'text-orange-500 bg-orange-50'
          });
      });

      // Upcoming session alerts (next 24h)
      relevantSessions.forEach(rs => {
         if (!rs.session.completed && rs.session.status !== 'cancelled') {
             notifs.push({
                 id: `sess-${rs.session.id}`,
                 title: "Upcoming Session",
                 text: `${rs.client.name} at ${rs.session.time}`,
                 icon: Clock,
                 color: 'text-blue-500 bg-blue-50'
             });
         }
      });

      return notifs;
  }, [expiringClients, relevantSessions, viewingClient]);

  const unreadCount = notifications.filter(n => !readNotificationIds.includes(n.id)).length;

  const handleMarkRead = () => {
    const ids = notifications.map(n => n.id);
    setReadNotificationIds([...readNotificationIds, ...ids]);
  };

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const result = await generateBusinessInsight(clients, currency);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-6 relative">
      {/* Header & Quick Actions */}
      <div className="pt-2 px-1 relative z-50">
         <div className="flex justify-between items-start mb-6">
             <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{greeting}, {viewingClient ? viewingClient.name.split(' ')[0] : 'Coach'}</p>
                <h1 className="text-[32px] font-black text-black dark:text-white leading-tight tracking-tight">
                    {viewingClient ? 'Your Dashboard' : 'Overview'}
                </h1>
                <p className="text-sm font-medium text-gray-400 mt-1">{format(now, 'EEEE, MMMM do, yyyy')}</p>
             </div>
             {viewingClient ? (
                <button 
                    onClick={logout}
                    className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 flex items-center justify-center shadow-sm border border-red-100 dark:border-red-900/30 active:scale-95 transition"
                    title="Log Out"
                >
                    <LogOut size={20} />
                </button>
             ) : (
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigateTo(NavPage.ADD_CLIENT)}
                        className="w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg active:scale-95 transition"
                    >
                        <Users size={20} />
                    </button>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)} 
                        className={`relative w-12 h-12 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center justify-center transition-all ${showNotifications ? 'bg-blue-600 text-white' : 'bg-white dark:bg-[#1C1C1E] text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        <Bell size={22} />
                        {unreadCount > 0 && !showNotifications && <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-[#1C1C1E] rounded-full animate-pulse"></span>}
                    </button>
                    {/* Notification Dropdown (Existing code) */}
                    {showNotifications && (
                        <>
                        <div className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" onClick={() => setShowNotifications(false)}></div>
                        <div className="absolute right-0 top-14 w-80 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 z-50 p-2 animate-scaleIn origin-top-right">
                            <div className="flex justify-between items-center p-3 mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-black dark:text-white">Notifications</span>
                                    {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">{unreadCount} New</span>}
                                 </div>
                                 {unreadCount > 0 && (
                                     <button onClick={handleMarkRead} className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 hover:text-blue-600">
                                        <Check size={12}/> Mark read
                                     </button>
                                 )}
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {notifications.length > 0 ? notifications.map(n => {
                                    const isRead = readNotificationIds.includes(n.id);
                                    return (
                                        <div key={n.id} className={`flex gap-3 p-3 rounded-2xl transition ${isRead ? 'opacity-50 grayscale-[0.5]' : 'hover:bg-gray-50 dark:hover:bg-white/5 bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.color}`}>
                                                <n.icon size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-black dark:text-white">{n.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{n.text}</p>
                                            </div>
                                            {!isRead && <div className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2"></div>}
                                        </div>
                                    );
                                }) : (
                                    <div className="py-8 text-center text-gray-400">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-bold">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                    )}
                </div>
             )}
         </div>
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

              {/* Progress Chart */}
              {weightData.length > 0 && (
                  <Widget title="Progress" subtitle="Weight History" icon={Scale} iconColor="text-blue-500">
                      <div className="h-[150px] w-full mt-2 -ml-2">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={weightData}>
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }} 
                                  />
                                  <Line type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, fill: '#3B82F6'}} />
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                  </Widget>
              )}

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
          {/* Quick Stats Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Clients</p>
                        <p className="text-2xl font-black text-black dark:text-white tracking-tight">{clients.length}</p>
                    </div>
                </div>
                <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Sessions Done</p>
                        <p className="text-2xl font-black text-black dark:text-white tracking-tight">{sessionStatusData.find(d => d.name === 'Done')?.value || 0}</p>
                    </div>
                </div>

          {/* Today's Mission (Collapsible) */}
          <Widget 
            className="col-span-1 md:col-span-2 lg:col-span-2" 
            title="Today's Mission" 
            subtitle="Daily Schedule"
            icon={Target} 
            iconColor="text-blue-500"
            collapsible={true}
            defaultOpen={false}
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
              <div className="mt-4 relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-white/10">
                  {relevantSessions.length > 0 ? relevantSessions.map((item, idx) => {
                      const isCompleted = item.session.status === 'completed';
                      const isNext = !isCompleted && idx === 0; // Simplified logic for visual "next"
                      return (
                          <div key={idx} className="relative pl-8 group">
                              {/* Timeline Dot */}
                              <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 z-10 transition-colors ${isCompleted ? 'bg-green-500 border-green-500' : isNext ? 'bg-blue-500 border-blue-500 animate-pulse' : 'bg-white dark:bg-[#1C1C1E] border-gray-300 dark:border-gray-600'}`}></div>
                              
                              <div className={`flex items-center justify-between p-3 rounded-2xl transition-all ${isNext ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                  <div>
                                      <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isNext ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                                          {item.session.time}
                                      </p>
                                      <h4 className={`font-bold text-sm ${isCompleted ? 'text-gray-400 line-through' : 'text-black dark:text-white'}`}>
                                          {item.client.name}
                                      </h4>
                                  </div>
                                  {isCompleted ? (
                                      <div className="text-green-500 bg-green-50 dark:bg-green-900/20 p-1.5 rounded-full">
                                          <Check size={14} strokeWidth={3} />
                                      </div>
                                  ) : (
                                      <div className={`p-1.5 rounded-full ${isNext ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                          <ChevronRight size={14} />
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  }) : (
                      <div className="pl-8 py-4 text-gray-400 text-sm font-medium italic">
                          No sessions scheduled for today. Enjoy your free time! ☕
                      </div>
                  )}
              </div>
          </Widget>

            {/* Widget: Financial Overview (Minimalist) */}
            <Widget className="col-span-1 md:col-span-2 lg:col-span-2" title="Financial Overview" subtitle="Revenue Snapshot" icon={DollarSign} iconColor="text-green-500" collapsible={true} defaultOpen={true}>
                <div className="mt-4 grid grid-cols-3 gap-3">
                    {/* Weekly */}
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Weekly</p>
                        <p className="text-lg font-black text-black dark:text-white tracking-tight">{currency}{financialStats.weekly.toLocaleString()}</p>
                    </div>
                    {/* Monthly */}
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly</p>
                        <div className="flex flex-col">
                            <p className="text-lg font-black text-black dark:text-white tracking-tight">{currency}{financialStats.monthly.toLocaleString()}</p>
                            {financialStats.growth !== 0 && (
                                <span className={`text-[9px] font-bold w-fit px-1.5 py-0.5 rounded mt-1 ${financialStats.growth >= 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30'}`}>
                                    {financialStats.growth > 0 ? '+' : ''}{Math.round(financialStats.growth)}%
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Total (YTD) */}
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total (YTD)</p>
                        <p className="text-lg font-black text-black dark:text-white tracking-tight">{currency}{financialStats.total.toLocaleString()}</p>
                    </div>
                </div>
                
                {/* Outstanding (Secondary) */}
                 <div className="mt-4 flex justify-between items-center px-1">
                    <p className="text-xs font-medium text-gray-400">Outstanding Revenue</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{currency}{financialStats.pending.toLocaleString()}</p>
                 </div>

                {/* Revenue Breakdown */}
                {financialStats.breakdown.length > 0 && (
                    <div className="mt-4">
                        <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-2">
                            {financialStats.breakdown.map((item, idx) => (
                                <div key={idx} className="h-full" style={{ width: `${(item.value / financialStats.total) * 100}%`, backgroundColor: item.color }} title={`${item.name}: ${currency}${item.value}`} />
                            ))}
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {financialStats.breakdown.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-medium text-gray-500">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Collapsible Chart Section */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialStats.monthlyGraph}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px', padding: '8px 12px' }}
                                    formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#22C55E" 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Widget>

            {/* Widget: Active Clients */}
            <Widget className="col-span-1 md:col-span-1 lg:col-span-1" title="Active Clients" subtitle="Current" icon={Users} iconColor="text-indigo-500" onClick={() => navigateTo(NavPage.CLIENTS)}>
                <div className="mt-2">
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-black text-black dark:text-white">{activeClientsCount}</span>
                        <div className="flex items-center text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                            <ArrowUpRight size={10} /> Active
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${clients.length > 0 ? (activeClientsCount / clients.length) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Total registered: {clients.length}</p>
                </div>
            </Widget>

            {/* Widget: Upcoming Sessions */}
            <Widget className="col-span-1 md:col-span-1 lg:col-span-1" title="Upcoming" subtitle="Future Bookings" icon={CalendarDays} iconColor="text-purple-500" onClick={() => navigateTo(NavPage.SCHEDULE)}>
                <div className="mt-2">
                    <span className="text-3xl font-black text-black dark:text-white">{upcomingSessionsCount}</span>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-3/4"></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Sessions scheduled</p>
                </div>
            </Widget>

            {/* Widget: Renewals (Collapsible) */}
            <Widget className="col-span-1 md:col-span-2 lg:col-span-2" title="Renewals & Alerts" subtitle="Action Needed" icon={RefreshCcw} iconColor="text-red-500" collapsible={true} defaultOpen={expiringClients.length > 0}>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {expiringClients.length > 0 ? expiringClients.slice(0, 4).map(c => {
                        const expiry = new Date(c.expiryDate);
                        const isPast = isBefore(expiry, now);
                        return (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold text-xs">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-black dark:text-white">{c.name}</p>
                                        <p className="text-[10px] text-red-500 font-medium">
                                            {isPast ? 'Expired' : 'Expiring soon'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-red-600 bg-white dark:bg-black/20 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/20">
                                    {isPast ? format(expiry, 'MMM dd') : `${differenceInDays(expiry, now)} days`}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 py-4 flex items-center justify-center gap-2 text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                            <CheckCircle2 size={16} />
                            <p className="text-xs font-medium">All memberships are healthy.</p>
                        </div>
                    )}
                </div>
            </Widget>

            {/* Widget: Recent Activity */}
            <Widget className="col-span-1 md:col-span-2 lg:col-span-2" title="Recent Activity" subtitle="Latest Updates" icon={Sparkles} iconColor="text-yellow-500" collapsible={true}>
                <div className="mt-2 space-y-2">
                    {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${item.color.replace('text-', 'bg-').replace('600', '100')} ${item.color.split(' ')[1]}`}>
                                <item.icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-black dark:text-white truncate">
                                    {item.clientName} <span className="font-medium text-gray-500 dark:text-gray-400 text-xs">{item.action}</span>
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">{item.time}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-8 text-center text-gray-400 text-xs font-medium italic">No recent activity to show.</div>
                    )}
                </div>
            </Widget>

            {/* Chart: Activity */}
            <Widget className="col-span-1 md:col-span-2 lg:col-span-4 min-h-[240px]" title="Weekly Activity" icon={BarChart3} iconColor="text-blue-500">
                <div className="mt-4 h-[160px] w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyActivityData}>
                        <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.6}/>
                            </linearGradient>
                        </defs>
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
                        <Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={24} fill="url(#colorBar)">
                            {weeklyActivityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.count > 0 ? 'url(#colorBar)' : '#F3F4F6'} className="dark:fill-white/10" />
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