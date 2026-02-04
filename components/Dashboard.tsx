import React from 'react';
import { Client, BusinessStats, NavPage } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Users, DollarSign, Calendar as CalendarIcon, ChevronRight, TrendingUp } from 'lucide-react';

interface WidgetProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  icon?: any;
  iconColor?: string;
}

const Widget: React.FC<WidgetProps> = ({ children, onClick, className = "", title, icon: Icon, iconColor = "text-ios-blue" }) => (
  <div 
    onClick={onClick}
    className={`bg-ios-card-light dark:bg-ios-card-dark rounded-[20px] p-4 shadow-ios relative overflow-hidden transition-transform active:scale-[0.98] ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {(title || Icon) && (
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={18} className={`${iconColor}`} />}
        {title && <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide">{title}</h3>}
      </div>
    )}
    {children}
  </div>
);

interface DashboardProps {
  clients: Client[];
  navigateTo: (page: NavPage) => void;
  currency: string;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, navigateTo, currency }) => {
  
  const stats: BusinessStats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => new Date(c.expiryDate) >= new Date()).length,
    totalRevenue: clients.reduce((acc, c) => acc + c.totalFee, 0),
    outstandingRevenue: clients.reduce((acc, c) => acc + (c.totalFee - c.paidAmount), 0),
    upcomingSessions: clients.reduce((acc, c) => {
      return acc + c.sessions.filter(s => new Date(s.date) >= new Date()).length;
    }, 0),
  };

  const collectionRate = stats.totalRevenue > 0 ? Math.round(((stats.totalRevenue - stats.outstandingRevenue) / stats.totalRevenue) * 100) : 0;
  
  // Prepare simple trend data (mocked slightly for visual if not enough data)
  const chartData = clients.slice(0, 7).map(c => ({
    name: c.name.split(' ')[0],
    value: c.totalFee
  }));

  return (
    <div className="space-y-5 animate-fadeIn pb-6">
      
      {/* Large Title Header */}
      <div className="pt-2 px-1">
         <p className="text-sm font-semibold text-ios-gray uppercase tracking-wider mb-0.5">Summary</p>
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Dashboard</h1>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Widget - Large */}
        <Widget className="col-span-2" title="Total Revenue" icon={DollarSign} iconColor="text-ios-green">
           <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white">{currency}{stats.totalRevenue.toLocaleString()}</h2>
                <p className="text-sm text-ios-gray mt-1 font-medium">{collectionRate}% collected</p>
              </div>
              <div className="h-12 w-24 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{v:0}, {v:30}, {v:20}, {v:50}, {v:40}, {v:80}, {v:60}]}>
                    <Area type="monotone" dataKey="v" stroke="#34C759" fill="#34C759" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </Widget>

        {/* Active Clients */}
        <Widget onClick={() => navigateTo(NavPage.CLIENTS)} title="Active Clients" icon={Users} iconColor="text-ios-blue">
          <div className="flex flex-col justify-between h-20">
             <h3 className="text-3xl font-bold text-black dark:text-white">{stats.activeClients}</h3>
             <div className="flex items-center text-xs font-medium text-ios-gray">
                <span>Total: {stats.totalClients}</span>
                <ChevronRight size={14} className="ml-auto opacity-50" />
             </div>
          </div>
        </Widget>

        {/* Upcoming */}
        <Widget onClick={() => navigateTo(NavPage.SCHEDULE)} title="Upcoming" icon={CalendarIcon} iconColor="text-ios-red">
          <div className="flex flex-col justify-between h-20">
             <h3 className="text-3xl font-bold text-black dark:text-white">{stats.upcomingSessions}</h3>
             <div className="flex items-center text-xs font-medium text-ios-gray">
                <span>View Schedule</span>
                <ChevronRight size={14} className="ml-auto opacity-50" />
             </div>
          </div>
        </Widget>
      </div>

      {/* Top Clients Chart Widget */}
      <Widget title="Top Clients" icon={TrendingUp} iconColor="text-ios-orange" className="min-h-[250px]">
         <div className="mt-4 h-[180px] w-full">
            {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                   <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 11, fill: '#8E8E93'}} 
                     dy={10}
                   />
                   <Tooltip 
                     cursor={{fill: 'transparent'}}
                     contentStyle={{ 
                       borderRadius: '12px', 
                       border: 'none', 
                       backgroundColor: 'rgba(28, 28, 30, 0.9)',
                       color: '#fff',
                       backdropFilter: 'blur(10px)',
                       padding: '8px 12px'
                     }} 
                     itemStyle={{ color: '#fff' }}
                     formatter={(value: number) => [`${currency}${value}`, '']}
                   />
                   <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={28}>
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill="#007AFF" />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-ios-gray text-sm">
                 No data available
               </div>
            )}
         </div>
      </Widget>

      {/* Quick Actions / Inset Grouped List Look */}
      <div className="pt-2">
        <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide mb-2 px-4">Quick Actions</h3>
        <div className="bg-ios-card-light dark:bg-ios-card-dark rounded-xl overflow-hidden shadow-sm">
           <div 
             onClick={() => navigateTo(NavPage.ADD_CLIENT)}
             className="flex items-center justify-between p-4 border-b border-ios-separator-light dark:border-ios-separator-dark last:border-0 cursor-pointer active:bg-gray-100 dark:active:bg-[#2C2C2E]"
           >
             <span className="text-[17px] text-ios-blue font-medium">Add New Client</span>
             <ChevronRight size={16} className="text-ios-gray3" />
           </div>
           <div 
             onClick={() => navigateTo(NavPage.SCHEDULE)}
             className="flex items-center justify-between p-4 cursor-pointer active:bg-gray-100 dark:active:bg-[#2C2C2E]"
           >
             <span className="text-[17px] text-ios-blue font-medium">Manage Schedule</span>
             <ChevronRight size={16} className="text-ios-gray3" />
           </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;