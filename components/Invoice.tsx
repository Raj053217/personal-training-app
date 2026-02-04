import React from 'react';
import { Client } from '../types';
import { format } from 'date-fns';
import { X, Printer, Download } from 'lucide-react';

interface InvoiceProps {
  client: Client;
  onClose: () => void;
  currency: string;
}

const Invoice: React.FC<InvoiceProps> = ({ client, onClose, currency }) => {
  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${client.id.slice(0, 6).toUpperCase()}-${format(new Date(), 'MMdd')}`;
  const dueAmount = client.totalFee - client.paidAmount;

  // Sort sessions by date
  const sortedSessions = [...client.sessions].sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  // Calculate Service Breakdown
  const totalSessions = client.sessions.length;
  const completedSessionsCount = client.sessions.filter(s => s.status === 'completed' || s.completed).length;
  const ratePerSession = totalSessions > 0 ? client.totalFee / totalSessions : 0;
  const valueRendered = completedSessionsCount * ratePerSession;

  return (
    <>
    <style>{`
      @media print {
        @page { margin: 0; }
        body { background-color: white !important; -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        /* Hide everything else */
        body > *:not(#invoice-modal-root) { display: none !important; }
        /* Force modal to be visible and static */
        #invoice-modal-root { 
          position: absolute !important; 
          top: 0 !important; 
          left: 0 !important; 
          width: 100% !important; 
          height: auto !important; 
          z-index: 9999 !important; 
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #invoice-container {
           box-shadow: none !important;
           max-width: none !important;
           width: 100% !important;
           height: auto !important;
           border-radius: 0 !important;
           overflow: visible !important;
        }
        #invoice-content {
          padding: 20px 40px !important;
          overflow: visible !important;
        }
      }
    `}</style>
    
    <div id="invoice-modal-root" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div id="invoice-container" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl h-[95vh] sm:h-auto overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b no-print bg-gray-50 rounded-t-2xl">
          <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
            >
              <X size={24} />
          </button>
          <span className="font-semibold text-gray-700">Invoice Preview</span>
          <button
            onClick={handlePrint}
            className="text-blue-600 font-medium text-sm flex items-center gap-1"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div id="invoice-content" className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-900">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">INVOICE</h1>
              <p className="text-gray-500 text-sm">#{invoiceNumber}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </div>

          <div className="flex justify-between mb-10">
            <div>
              <h3 className="text-xs uppercase text-gray-400 font-semibold mb-1">Bill To</h3>
              <p className="font-bold text-lg">{client.name}</p>
              {client.email && <p className="text-gray-500">{client.email}</p>}
              {client.phone && <p className="text-gray-500">{client.phone}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-xs uppercase text-gray-400 font-semibold mb-1">From</h3>
              <p className="font-bold text-lg">FitwithRj</p>
              <p className="text-gray-500">Personal Training</p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border rounded-lg border-gray-100 mb-8 overflow-hidden">
             <div className="grid grid-cols-3 bg-gray-50 p-3 text-xs font-semibold text-gray-500 uppercase">
                <div className="col-span-2">Description</div>
                <div className="text-right">Amount</div>
             </div>
             <div className="p-4 flex justify-between items-center border-t border-gray-100">
                <div className="col-span-2">
                   <p className="font-medium">Personal Training Package</p>
                   <p className="text-sm text-gray-500">{client.sessions.length} Sessions Plan</p>
                   <p className="text-xs text-gray-400 mt-1">{format(new Date(client.startDate), 'MMM dd')} - {format(new Date(client.expiryDate), 'MMM dd, yyyy')}</p>
                </div>
                <div className="text-right font-medium">
                  {currency}{client.totalFee.toFixed(2)}
                </div>
             </div>
          </div>

          {/* Service Consumption Breakdown */}
          <div className="mb-8">
             <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Service Breakdown (Usage)</h3>
             <div className="border rounded-lg border-gray-100 overflow-hidden">
                <div className="grid grid-cols-4 bg-gray-50 p-3 text-xs font-semibold text-gray-500 uppercase">
                   <div className="col-span-2">Service Type</div>
                   <div className="text-center">Qty Completed</div>
                   <div className="text-right">Est. Value</div>
                </div>
                <div className="p-4 grid grid-cols-4 items-center border-t border-gray-100 text-sm">
                   <div className="col-span-2">
                      <p className="font-medium text-gray-900">Completed Sessions</p>
                      <p className="text-xs text-gray-500">Based on avg. rate of {currency}{ratePerSession.toFixed(2)}/session</p>
                   </div>
                   <div className="text-center text-gray-600 font-medium">
                      {completedSessionsCount} <span className="text-gray-400 text-xs">/ {totalSessions}</span>
                   </div>
                   <div className="text-right font-medium text-gray-900">
                     {currency}{valueRendered.toFixed(2)}
                   </div>
                </div>
             </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <div className="w-full sm:w-1/2 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Package)</span>
                <span>{currency}{client.totalFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span>-{currency}{client.paidAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-lg">Total Due</span>
                <span className="font-bold text-2xl text-blue-600">{currency}{dueAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Detailed Session List */}
          {sortedSessions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Session Details</h3>
              <div className="border rounded-lg border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Time</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedSessions.map((session, index) => {
                      const status = session.status || (session.completed ? 'completed' : 'scheduled');
                      return (
                        <tr key={session.id} className="hover:bg-gray-50/50">
                          <td className="p-3 text-gray-400 text-xs">{index + 1}</td>
                          <td className="p-3 text-gray-900">{format(new Date(session.date), 'MMM dd, yyyy')}</td>
                          <td className="p-3 text-gray-600">{session.time}</td>
                          <td className="p-3 text-right">
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                              ${status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                              ${status === 'scheduled' ? 'bg-blue-100 text-blue-700' : ''}
                              ${status === 'missed' ? 'bg-orange-100 text-orange-700' : ''}
                              ${status === 'cancelled' ? 'bg-red-100 text-red-700 line-through' : ''}
                             `}>
                               {status}
                             </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-12 text-center text-xs text-gray-400">
            <p className="font-semibold text-gray-500 mb-1">FitwithRj</p>
            <p>Live long Stay strong</p>
            <p>Thank you for your business.</p>
          </div>
        </div>

        {/* Mobile Action Button */}
        <div className="p-4 border-t border-gray-100 sm:hidden bg-white safe-bottom no-print">
           <button 
             onClick={handlePrint}
             className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
           >
             <Download size={20} />
             Download PDF
           </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Invoice;