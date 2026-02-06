import React, { useState } from 'react';
import { Client } from '../types';
import { Search, Download, Trash2, ChevronRight, Plus, RefreshCcw, AlertTriangle, CheckCircle2, CircleDot, Info } from 'lucide-react';
import Invoice from './Invoice';
import { isBefore, differenceInDays, parseISO, isAfter } from 'date-fns';

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
     const gradients = ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-green-400 to-green-600', 'from-orange-400 to-orange-600', 'from-pink-400 to-pink-600'];
     return gradients[name.length % gradients.length];
  };

  const getClientStatusData = (client: Client): { status: ClientStatus; color: string; icon: any } => {
    const today = new Date();
    const expiry = parseISO(client.expiryDate);
    const isExpired = isBefore(expiry, today);
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    const missedSessions = client.sessions.some(s => s.status === 'missed');
    const futureSessions = client.sessions.some(s => {
      const sDate = parseISO(s.date);
      return (isAfter(sDate, today) || isSameDay(sDate, today)) && s.status !== 'cancelled' && s.status !== 'completed';
    });

    if (isExpired) {
      return { status: 'Expired', color: 'bg-red-500', icon: RefreshCcw };
    }
    if (daysUntilExpiry <= 7) {
      return { status: 'Expiring Soon', color: 'bg-orange-500', icon: AlertTriangle };
    }
    if (missedSessions || (!futureSessions && !isExpired)) {
      return { status: 'Needs Follow-up', color: 'bg-ios-blue', icon: Info };
    }
    return { status: 'Active', color: 'bg-ios-green', icon: CheckCircle2 };
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  return (
    <div className="space-y-0 animate-fadeIn min-h-screen">
      <div className="pt-2 px-1 mb-4 flex justify-between items-end">
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Clients</h1>
         <button onClick={onAdd} className="w-9 h-9 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-md active:scale-90 transition mb-2">
           <Plus size={22} />
         </button>
      </div>

      <div className="px-0 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray" size={16} />
          <input 
            type="text" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#767680]/15 dark:bg-[#767680]/25 text-black dark:text-white rounded-[10px] outline-none placeholder-ios-gray text-[17px] focus:bg-[#767680]/20 transition-colors"
          />
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className="bg-ios-card-light dark:bg-ios-card-dark rounded-xl overflow-hidden shadow-sm">
          {filteredClients.map((client, index) => {
             const due = client.totalFee - client.paidAmount;
             const isLast = index === filteredClients.length - 1;
             const completedSessions = client.sessions.filter(s => s.status === 'completed' || s.completed).length;
             const totalSessions = client.sessions.length;
             
             const statusData = getClientStatusData(client);
             const StatusIcon = statusData.icon;

             return (
              <div key={client.id} onClick={() => onEdit(client)} className={`flex items-center p-4 pl-4 cursor-pointer active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] transition-colors relative`}>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGradient(client.name)} flex items-center justify-center text-white font-semibold text-lg shadow-sm mr-4 shrink-0`}>
                  {getInitials(client.name)}
                </div>

                <div className={`flex-1 flex justify-between items-center py-1 ${!isLast ? 'border-b border-ios-separator-light dark:border-ios-separator-dark pb-5 mb-[-20px]' : ''}`}>
                   <div className="flex-1 min-w-0 mr-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black dark:text-white text-[17px] truncate">{client.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`${statusData.color} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm`}>
                             <StatusIcon size={9} strokeWidth={3} />
                             {statusData.status}
                          </span>
                          <div className="text-[13px] text-ios-gray flex items-center gap-1.5">
                             <span>{completedSessions}/{totalSessions} sessions</span>
                             {due > 0 ? <span className="text-ios-red font-bold">Due {currency}{due}</span> : <span className="text-ios-green font-bold">Paid</span>}
                          </div>
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); setInvoiceClient(client); }} className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center active:scale-90 transition-transform border border-blue-100 dark:border-blue-900/50">
                         <Download size={16} />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this client?')) onDelete(client.id); }} className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center active:scale-90 transition-transform border border-red-100 dark:border-red-900/50">
                         <Trash2 size={16} />
                       </button>
                       <ChevronRight size={18} className="text-ios-gray3" />
                   </div>
                </div>
              </div>
             );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-ios-gray text-[17px]">No clients found</p>
          <button onClick={onAdd} className="mt-4 text-ios-blue text-[17px] font-medium">Add Client</button>
        </div>
      )}

      {invoiceClient && <Invoice client={invoiceClient} onClose={() => setInvoiceClient(null)} currency={currency} />}
    </div>
  );
};

export default ClientList;