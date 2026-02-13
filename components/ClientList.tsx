
import React, { useState } from 'react';
import { Client } from '../types';
import { Search, Download, Trash2, ChevronRight, Plus, RefreshCcw, AlertTriangle, CheckCircle2, Info, MoreHorizontal } from 'lucide-react';
import Invoice from './Invoice';
import { isBefore, differenceInDays, parseISO, isAfter, isSameDay } from 'date-fns';

interface ClientListProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  currency: string;
}

type ClientStatus = 'Expired' | 'Expiring Soon' | 'Needs Follow-up' | 'Active';

const ClientList: React.FC<ClientListProps> = ({ clients, onEdit, onDelete, onAdd, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceClient, setInvoiceClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getGradient = (name: string) => {
     const gradients = [
       'from-blue-500 to-cyan-500', 
       'from-purple-500 to-pink-500', 
       'from-orange-400 to-red-500', 
       'from-emerald-400 to-green-600',
       'from-indigo-500 to-purple-600'
     ];
     return gradients[name.length % gradients.length];
  };

  const getClientStatusData = (client: Client): { status: ClientStatus; color: string; bg: string; icon: any } => {
    const today = new Date();
    const expiry = parseISO(client.expiryDate);
    const isExpired = isBefore(expiry, today);
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    const missedSessions = client.sessions.some(s => s.status === 'missed');
    const futureSessions = client.sessions.some(s => {
      const sDate = parseISO(s.date);
      return (isAfter(sDate, today) || isSameDay(sDate, today)) && s.status !== 'cancelled' && s.status !== 'completed';
    });

    if (isExpired) return { status: 'Expired', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', icon: RefreshCcw };
    if (daysUntilExpiry <= 7) return { status: 'Expiring Soon', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: AlertTriangle };
    if (missedSessions || (!futureSessions && !isExpired)) return { status: 'Needs Follow-up', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Info };
    return { status: 'Active', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 };
  };

  return (
    <div className="space-y-0 animate-fadeIn min-h-screen">
      <div className="pt-2 px-1 mb-6 flex justify-between items-end">
         <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Directory</p>
            <h1 className="text-[34px] font-black text-black dark:text-white leading-tight">Clients</h1>
         </div>
         <button onClick={onAdd} className="w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg active:scale-90 transition mb-1">
           <Plus size={24} />
         </button>
      </div>

      <div className="px-0 mb-6 sticky top-2 z-30">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-2xl outline-none placeholder-gray-400 text-sm font-medium shadow-sm border border-gray-100 dark:border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className="space-y-3 pb-24">
          {filteredClients.map((client, index) => {
             const due = client.totalFee - client.paidAmount;
             const completedSessions = client.sessions.filter(s => s.status === 'completed' || s.completed).length;
             const totalSessions = client.sessions.length;
             const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
             
             const statusData = getClientStatusData(client);
             const StatusIcon = statusData.icon;

             return (
              <div 
                key={client.id} 
                onClick={() => onEdit(client)} 
                className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer active:scale-[0.98] transition-all animate-slideUp"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(client.name)} flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0`}>
                  {getInitials(client.name)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-black dark:text-white text-lg truncate">{client.name}</h3>
                        {due > 0 && (
                            <span className="text-[10px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                Due {currency}{due}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                         <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${statusData.bg} ${statusData.color}`}>
                             <StatusIcon size={10} strokeWidth={3} />
                             <span className="text-[10px] font-bold uppercase tracking-wide">{statusData.status}</span>
                         </div>
                    </div>
                    
                    {/* Session Progress Bar */}
                    <div className="mt-3 flex items-center gap-2">
                         <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                style={{ width: `${progress}%` }} 
                             />
                         </div>
                         <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                             {completedSessions}/{totalSessions} Done
                         </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setInvoiceClient(client); }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition flex items-center justify-center">
                        <Download size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this client?')) onDelete(client.id); }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center">
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
             );
          })}
        </div>
      ) : (
        <div className="text-center py-24 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
          <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Search size={24} />
          </div>
          <p className="text-gray-400 font-medium">No clients found</p>
          <button onClick={onAdd} className="mt-4 text-black dark:text-white font-black text-sm uppercase tracking-wide hover:underline">Add New Client</button>
        </div>
      )}

      {invoiceClient && <Invoice client={invoiceClient} onClose={() => setInvoiceClient(null)} currency={currency} />}
    </div>
  );
};

export default ClientList;
