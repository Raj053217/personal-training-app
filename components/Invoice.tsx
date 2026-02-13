import React, { useState } from 'react';
import { Client } from '../types';
import { format } from 'date-fns';
import { X, Download, Loader2 } from 'lucide-react';

interface InvoiceProps {
  client: Client;
  onClose: () => void;
  currency: string;
}

const Invoice: React.FC<InvoiceProps> = ({ client, onClose, currency }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    const element = document.getElementById('printable-invoice-area');
    
    if (!element) {
        setIsDownloading(false);
        return;
    }

    const opt = {
      margin: 0.3,
      filename: `Invoice_${client.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: 'avoid-all' }
    };

    // @ts-ignore - html2pdf is loaded via CDN in index.html
    if (window.html2pdf) {
        // @ts-ignore
        window.html2pdf().set(opt).from(element).save().then(() => {
            setIsDownloading(false);
        }).catch((err: any) => {
            console.error(err);
            setIsDownloading(false);
            alert("Error generating PDF. Please try again.");
        });
    } else {
        alert("PDF generator not loaded. Please check your internet connection.");
        setIsDownloading(false);
    }
  };

  const invoiceNumber = `INV-${client.id.slice(0, 6).toUpperCase()}-${format(new Date(), 'MMdd')}`;
  const dueAmount = client.totalFee - client.paidAmount;

  // Sort sessions by date
  const sortedSessions = [...client.sessions].sort((a, b) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  return (
    <>
    <div id="invoice-modal-root" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div id="invoice-container" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl h-[95vh] sm:h-auto overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-2xl">
          <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
            >
              <X size={24} />
          </button>
          <span className="font-semibold text-gray-700">Invoice Preview</span>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-blue-600 font-medium text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span className="hidden sm:inline">{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div id="invoice-content" className="flex-1 overflow-y-auto bg-white text-gray-900">
          
          {/* Printable Area Wrapper */}
          <div id="printable-invoice-area" className="p-6 bg-white text-gray-900 max-w-[800px] mx-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-0.5">INVOICE</h1>
                  <p className="text-gray-500 text-xs">#{invoiceNumber}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">Bill To</h3>
                  <p className="font-bold text-sm text-gray-900">{client.name}</p>
                  {client.email && <p className="text-gray-500 text-xs">{client.email}</p>}
                  {client.phone && <p className="text-gray-500 text-xs">{client.phone}</p>}
                </div>
                <div className="text-right">
                  <h3 className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">From</h3>
                  <p className="font-bold text-sm text-gray-900">FitwithRj</p>
                  <p className="text-gray-500 text-xs">Personal Training</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border rounded-lg border-gray-100 mb-6 overflow-hidden">
                 <div className="grid grid-cols-3 bg-gray-50 p-2 text-[10px] font-semibold text-gray-500 uppercase">
                    <div className="col-span-2">Description</div>
                    <div className="text-right">Amount</div>
                 </div>
                 <div className="p-3 flex justify-between items-center border-t border-gray-100">
                    <div className="col-span-2">
                       <p className="font-medium text-sm text-gray-900">Personal Training Package</p>
                       
                       {/* Recurring Details */}
                       {client.paymentPlan && client.paymentPlan.enabled ? (
                         <div className="mt-0.5 mb-0.5">
                            <p className="text-xs font-semibold text-blue-600">
                              Recurring Plan: {currency}{client.paymentPlan.amount.toFixed(2)} / {client.paymentPlan.frequency}
                            </p>
                         </div>
                       ) : (
                         <p className="text-xs text-gray-500">{client.sessions.length} Sessions Plan</p>
                       )}
                       
                       <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(client.startDate), 'MMM dd')} - {format(new Date(client.expiryDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="text-right font-medium text-sm text-gray-900">
                      {currency}{client.totalFee.toFixed(2)}
                    </div>
                 </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-full sm:w-1/2 space-y-1.5">
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Subtotal</span>
                    <span>{currency}{client.totalFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Paid</span>
                    <span>-{currency}{client.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-1.5 flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-900">Total Due</span>
                    <span className="font-bold text-lg text-blue-600">{currency}{dueAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Session List */}
              {sortedSessions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[10px] font-bold text-gray-900 mb-2 uppercase tracking-wider">Session Details</h3>
                  <div className="border rounded-lg border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Time</th>
                          <th className="p-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedSessions.map((session, index) => {
                          const status = session.status || (session.completed ? 'completed' : 'scheduled');
                          return (
                            <tr key={session.id} className="hover:bg-gray-50/50">
                              <td className="p-2 text-gray-400 text-[10px]">{index + 1}</td>
                              <td className="p-2 text-gray-900">{format(new Date(session.date), 'EEE, MMM dd, yy')}</td>
                              <td className="p-2 text-gray-600">{session.time}</td>
                              <td className="p-2 text-right">
                                 <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
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
              
              <div className="mt-8 text-center text-[10px] text-gray-400">
                <p className="font-semibold text-gray-500 mb-0.5">FitwithRj</p>
                <p>Live long Stay strong</p>
              </div>
          </div>
        </div>

        {/* Mobile Action Button */}
        <div className="p-4 border-t border-gray-100 sm:hidden bg-white safe-bottom">
           <button 
             onClick={handleDownload}
             disabled={isDownloading}
             className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-70"
           >
             {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
             {isDownloading ? 'Generating...' : 'Download PDF'}
           </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Invoice;