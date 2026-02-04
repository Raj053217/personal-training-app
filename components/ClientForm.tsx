import React, { useState } from 'react';
import { Client, Session } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isBefore, addWeeks, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Repeat } from 'lucide-react';

interface ClientFormProps {
  onSave: (client: Client) => void;
  onCancel: () => void;
  initialData?: Client;
  currency: string;
}

// Extracted InputGroup to fix type errors
interface InputGroupProps {
  label: string;
  children?: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <label className="text-[16px] font-medium text-gray-900 dark:text-white min-w-[100px]">{label}</label>
    <div className="flex-1 text-right">
      {children}
    </div>
  </div>
);

const ClientForm: React.FC<ClientFormProps> = ({ onSave, onCancel, initialData, currency }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || format(new Date(), 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [defaultTime, setDefaultTime] = useState(initialData?.defaultTimeSlot || '10:00');
  const [totalFee, setTotalFee] = useState(initialData?.totalFee.toString() || '0');
  const [paidAmount, setPaidAmount] = useState(initialData?.paidAmount.toString() || '0');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  const [selectedSessions, setSelectedSessions] = useState<Session[]>(initialData?.sessions || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isRecurringMode, setIsRecurringMode] = useState(false);

  // Generate calendar days
  const calendarStart = startOfMonth(currentMonth);
  const calendarEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Padding days for grid
  const startDayOfWeek = getDay(calendarStart); // 0 = Sun
  const paddingDays = Array(startDayOfWeek).fill(null);

  const toggleSession = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingSession = selectedSessions.find(s => s.date === dateStr);
    
    if (existingSession) {
      // Remove specific session
      setSelectedSessions(selectedSessions.filter(s => s.date !== dateStr));
    } else {
      // Add session(s)
      const sessionsToAdd: Session[] = [];
      const endDateObj = new Date(expiryDate);
      
      let currentDate = date;
      
      // If recurring is enabled, loop until expiry date
      if (isRecurringMode) {
         while (isBefore(currentDate, endDateObj) || isSameDay(currentDate, endDateObj)) {
            const currentStr = format(currentDate, 'yyyy-MM-dd');
            // Check if already exists to avoid dupes
            if (!selectedSessions.find(s => s.date === currentStr)) {
               sessionsToAdd.push({
                 id: uuidv4(),
                 date: currentStr,
                 time: defaultTime,
                 completed: false
               });
            }
            currentDate = addWeeks(currentDate, 1);
         }
      } else {
         // Single session
         sessionsToAdd.push({
            id: uuidv4(),
            date: dateStr,
            time: defaultTime,
            completed: false
         });
      }

      setSelectedSessions([...selectedSessions, ...sessionsToAdd]);
    }
  };

  const handleSave = () => {
    // Basic validation
    if (!name) return alert('Name is required');

    const newClient: Client = {
      id: initialData?.id || uuidv4(),
      name,
      email,
      phone,
      startDate,
      expiryDate,
      defaultTimeSlot: defaultTime,
      totalFee: parseFloat(totalFee),
      paidAmount: parseFloat(paidAmount),
      sessions: selectedSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      notes,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };
    onSave(newClient);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-24 animate-slideUp">
      
      {/* iOS Modal Header */}
      <div className="sticky top-0 z-10 bg-[#F2F2F7]/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-4 h-14">
        <button onClick={onCancel} className="text-[17px] text-blue-500">Cancel</button>
        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white">{initialData ? 'Edit Client' : 'New Client'}</h2>
        <button onClick={handleSave} className="text-[17px] font-bold text-blue-500">Done</button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        
        {/* Contact Section */}
        <div>
           <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pl-4">Contact Info</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-xl px-4 shadow-sm">
             <InputGroup label="Name">
               <input 
                 type="text" value={name} onChange={e => setName(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 font-medium"
                 placeholder="Required"
               />
             </InputGroup>
             <InputGroup label="Email">
               <input 
                 type="email" value={email} onChange={e => setEmail(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-blue-500 placeholder-gray-400"
                 placeholder="Optional"
               />
             </InputGroup>
             <InputGroup label="Phone">
               <input 
                 type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-blue-500 placeholder-gray-400"
                 placeholder="Optional"
               />
             </InputGroup>
           </div>
        </div>

        {/* Plan Section */}
        <div>
           <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pl-4">Plan Details</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-xl px-4 shadow-sm">
             <InputGroup label="Start">
               <input 
                 type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-gray-500 dark:text-gray-300 font-medium"
               />
             </InputGroup>
             <InputGroup label="Ends">
               <input 
                 type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-gray-500 dark:text-gray-300 font-medium"
               />
             </InputGroup>
             <InputGroup label="Time Slot">
               <input 
                 type="time" value={defaultTime} onChange={e => setDefaultTime(e.target.value)}
                 className="w-full text-right bg-transparent outline-none text-gray-500 dark:text-gray-300 font-medium"
               />
             </InputGroup>
           </div>
        </div>

        {/* Finance Section */}
        <div>
           <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pl-4">Finance</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-xl px-4 shadow-sm">
             <InputGroup label="Total Fee">
               <div className="flex justify-end items-center gap-1">
                 <span className="text-gray-400">{currency}</span>
                 <input 
                   type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)}
                   className="w-24 text-right bg-transparent outline-none text-gray-900 dark:text-white font-medium"
                 />
               </div>
             </InputGroup>
             <InputGroup label="Paid">
               <div className="flex justify-end items-center gap-1">
                 <span className="text-gray-400">{currency}</span>
                 <input 
                   type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                   className="w-24 text-right bg-transparent outline-none text-gray-900 dark:text-white font-medium"
                 />
               </div>
             </InputGroup>
           </div>
           <p className="text-[13px] text-gray-400 mt-2 pl-4 text-right">
             Balance Due: <span className={(parseFloat(totalFee) - parseFloat(paidAmount)) > 0 ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>{currency}{(parseFloat(totalFee) - parseFloat(paidAmount)).toFixed(2)}</span>
           </p>
        </div>

        {/* Notes */}
        <div>
           <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 pl-4">Notes</h3>
           <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 shadow-sm">
             <textarea 
                value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-transparent outline-none text-[16px] text-gray-900 dark:text-white h-24 resize-none font-medium"
                placeholder="Add client notes..."
              />
           </div>
        </div>

        {/* Session Calendar */}
        <div>
           <div className="flex justify-between items-end px-4 mb-2">
              <h3 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Sessions</h3>
              <button 
                onClick={() => setIsRecurringMode(!isRecurringMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isRecurringMode ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
              >
                <Repeat size={14} />
                <span>Repeat Weekly</span>
              </button>
           </div>

           <div className="bg-white dark:bg-[#1C1C1E] rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                   <ChevronLeft size={24} />
                 </button>
                 <span className="font-semibold text-gray-900 dark:text-white text-lg">{format(currentMonth, 'MMMM yyyy')}</span>
                 <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
                   <ChevronRight size={24} />
                 </button>
              </div>

              <div className="grid grid-cols-7 gap-y-6 text-center">
                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                   <div key={d} className="text-[12px] font-bold text-gray-400 uppercase">{d}</div>
                 ))}
                 
                 {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                 
                 {days.map(day => {
                   const isSelected = selectedSessions.some(s => s.date === format(day, 'yyyy-MM-dd'));
                   const isPast = isBefore(day, new Date()) && !isSameDay(day, new Date());
                   
                   return (
                     <div key={day.toString()} className="flex justify-center">
                       <button
                         type="button"
                         onClick={() => toggleSession(day)}
                         className={`
                           w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-medium transition-all
                           ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
                           ${isPast && !isSelected ? 'opacity-30' : ''}
                         `}
                       >
                         {format(day, 'd')}
                       </button>
                     </div>
                   )
                 })}
              </div>
              <p className="text-center text-xs font-medium text-gray-400 mt-6 bg-gray-50 dark:bg-[#252525] py-3 rounded-lg">
                {selectedSessions.length} sessions selected • Default time: {defaultTime}
              </p>
              {isRecurringMode && (
                 <p className="text-center text-[10px] text-blue-500 mt-2">
                    Tapping a date selects it for every week until {expiryDate}
                 </p>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default ClientForm;