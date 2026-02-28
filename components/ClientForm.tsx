import React, { useState, useEffect } from 'react';
import { Client, Session, PaymentFrequency, WeightEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isBefore, addWeeks, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Repeat, ArrowRight, User, DollarSign, Calendar as CalendarIcon, RefreshCcw, ChevronDown, ChevronUp, Key } from 'lucide-react';

interface ClientFormProps {
  onSave: (client: Client) => void;
  onCancel: () => void;
  initialData?: Client;
  currency: string;
}

interface InputGroupProps {
  label: string;
  children?: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, children }) => (
  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-white/5 last:border-0">
    <label className="text-[15px] font-medium text-gray-900 dark:text-white min-w-[100px]">{label}</label>
    <div className="flex-1 text-right">{children}</div>
  </div>
);

interface CollapsibleSectionProps {
  title: string;
  icon: any;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  children 
}) => (
  <div className="bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300">
      <button 
        onClick={onToggle}
        type="button" 
        className={`w-full flex justify-between items-center p-5 ${isOpen ? 'bg-gray-50/50 dark:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
      >
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isOpen ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
                  <Icon size={20} />
              </div>
              <span className={`font-black text-lg uppercase tracking-tight ${isOpen ? 'text-black dark:text-white' : 'text-gray-500'}`}>
                  {title}
              </span>
          </div>
          {isOpen ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
      </button>
      
      {isOpen && (
          <div className="p-5 border-t border-gray-100 dark:border-white/5 animate-fadeIn">
              {children}
          </div>
      )}
  </div>
);

const ClientForm: React.FC<ClientFormProps> = ({ onSave, onCancel, initialData, currency }) => {
  // Section Visibility State
  const [openSections, setOpenSections] = useState({
    profile: true,
    finance: false,
    schedule: false
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Core Data
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [accessCode, setAccessCode] = useState(initialData?.accessCode || Math.floor(10000 + Math.random() * 90000).toString());
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(initialData?.weightHistory || []);

  // Finance & Schedule
  const [startDate, setStartDate] = useState(initialData?.startDate || format(new Date(), 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  
  const getInitialTimes = () => {
     if (initialData?.defaultTimeSlot?.includes('-')) {
         const [s, e] = initialData.defaultTimeSlot.split('-');
         return { start: s, end: e };
     }
     return { start: initialData?.defaultTimeSlot || '10:00', end: '11:00' };
  };

  const [startTime, setStartTime] = useState(getInitialTimes().start);
  const [endTime, setEndTime] = useState(getInitialTimes().end);
  const [totalFee, setTotalFee] = useState(initialData?.totalFee.toString() || '0');
  const [paidAmount, setPaidAmount] = useState(initialData?.paidAmount.toString() || '0');
  const [recurringEnabled, setRecurringEnabled] = useState(initialData?.paymentPlan?.enabled || false);
  const [recurringFreq, setRecurringFreq] = useState<PaymentFrequency>(initialData?.paymentPlan?.frequency || 'monthly');
  const [recurringAmount, setRecurringAmount] = useState(initialData?.paymentPlan?.amount.toString() || '0');
  const [recurringCount, setRecurringCount] = useState(initialData?.paymentPlan?.count.toString() || '1');

  const [selectedSessions, setSelectedSessions] = useState<Session[]>(initialData?.sessions || []);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isRecurringMode, setIsRecurringMode] = useState(false);

  useEffect(() => {
    if (recurringEnabled) {
      setTotalFee(((parseFloat(recurringAmount) || 0) * (parseInt(recurringCount) || 0)).toString());
    }
  }, [recurringEnabled, recurringAmount, recurringCount]);

  const handleRenewPackage = () => {
      if (!window.confirm("Renewing will archive current sessions and reset billing. Start a new cycle?")) return;
      const lastExpiry = new Date(expiryDate);
      const newStart = isBefore(lastExpiry, new Date()) ? format(new Date(), 'yyyy-MM-dd') : format(lastExpiry, 'yyyy-MM-dd');
      const newExpiry = format(addMonths(parse(newStart, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
      setStartDate(newStart);
      setExpiryDate(newExpiry);
      setPaidAmount('0');
      if (window.confirm("Would you like to clear the old session calendar to start fresh?")) setSelectedSessions([]);
      
      // Auto open finance and schedule for the new cycle setup
      setOpenSections({ profile: false, finance: true, schedule: true });
      alert("Renewal prepared. Set your fee and schedule sessions.");
  };

  const toggleSession = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = selectedSessions.find(s => s.date === dateStr);
    const timeSlot = `${startTime}-${endTime}`;
    if (existing) {
      setSelectedSessions(selectedSessions.filter(s => s.date !== dateStr));
    } else {
      let sessionsToAdd: Session[] = [];
      if (isRecurringMode) {
         let current = date;
         const endObj = new Date(expiryDate);
         while (isBefore(current, endObj) || isSameDay(current, endObj)) {
            const str = format(current, 'yyyy-MM-dd');
            if (!selectedSessions.find(s => s.date === str)) sessionsToAdd.push({ id: uuidv4(), date: str, time: timeSlot, completed: false });
            current = addWeeks(current, 1);
         }
      } else {
         sessionsToAdd.push({ id: uuidv4(), date: dateStr, time: timeSlot, completed: false });
      }
      setSelectedSessions([...selectedSessions, ...sessionsToAdd]);
    }
  };

  const handleSave = () => {
    if (!name) return alert('Name required');
    const timeSlot = `${startTime}-${endTime}`;
    const newClient: Client = {
      id: initialData?.id || uuidv4(),
      name, 
      email: email.trim(), 
      phone, 
      accessCode: accessCode.trim() || '00000',
      startDate, expiryDate, defaultTimeSlot: timeSlot,
      totalFee: parseFloat(totalFee), paidAmount: parseFloat(paidAmount),
      paymentPlan: recurringEnabled ? { enabled: true, frequency: recurringFreq, amount: parseFloat(recurringAmount), count: parseInt(recurringCount) } : undefined,
      sessions: selectedSessions.map(s => ({ ...s, time: timeSlot })).sort((a,b) => a.date.localeCompare(b.date)),
      notes, 
      dietPlan: initialData?.dietPlan, 
      workoutRoutine: initialData?.workoutRoutine, 
      weightHistory, 
      createdAt: initialData?.createdAt || new Date().toISOString()
    };
    onSave(newClient);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-safe animate-slideUp">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F2F2F7]/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-4 h-16">
        <button onClick={onCancel} className="text-[17px] text-blue-500 font-medium">Cancel</button>
        <h2 className="text-[17px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{initialData ? 'Manage Client' : 'New Client'}</h2>
        <button onClick={handleSave} className="text-[17px] font-bold text-blue-500">Done</button>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto pb-32 pt-6">
        {initialData && (
            <button onClick={handleRenewPackage} className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 mb-2">
                <RefreshCcw size={18} /> Renew Package Cycle
            </button>
        )}

        {/* Profile Section */}
        <CollapsibleSection 
          title="Profile Details" 
          icon={User}
          isOpen={openSections.profile}
          onToggle={() => toggleSection('profile')}
        >
            <div className="space-y-4">
                <div className="rounded-2xl px-2">
                    <InputGroup label="Name"><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-right bg-transparent outline-none text-black dark:text-white font-bold" placeholder="Full Name"/></InputGroup>
                    <InputGroup label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-right bg-transparent outline-none text-blue-500" placeholder="Optional"/></InputGroup>
                    <InputGroup label="Phone"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-right bg-transparent outline-none text-blue-500" placeholder="Optional"/></InputGroup>
                    <InputGroup label="Login Code"><div className="flex items-center justify-end gap-2"><Key size={14} className="text-gray-400"/><input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} maxLength={5} className="w-20 text-right bg-transparent outline-none font-mono font-bold text-black dark:text-white" placeholder="00000"/></div></InputGroup>
                </div>
                
                <div className="bg-gray-50 dark:bg-black/20 rounded-2xl p-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Health Notes</h3>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-transparent outline-none text-[15px] text-gray-900 dark:text-white h-24 resize-none leading-relaxed" placeholder="Injuries, goals, etc..."/>
                </div>
            </div>
        </CollapsibleSection>

        {/* Finance Section */}
        <CollapsibleSection 
          title="Financials" 
          icon={DollarSign}
          isOpen={openSections.finance}
          onToggle={() => toggleSection('finance')}
        >
             <div className="space-y-4">
                <div className="rounded-2xl px-2">
                    <InputGroup label="Recurring?"><button onClick={() => setRecurringEnabled(!recurringEnabled)} className={`w-[51px] h-[31px] rounded-full transition-colors relative ${recurringEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`absolute top-0.5 w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform ${recurringEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}/></button></InputGroup>
                    {recurringEnabled && (
                        <>
                        <InputGroup label="Frequency"><select value={recurringFreq} onChange={(e) => setRecurringFreq(e.target.value as PaymentFrequency)} className="bg-transparent text-right font-bold outline-none text-black dark:text-white"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></InputGroup>
                        <InputGroup label="Rate"><div className="flex justify-end items-center gap-1 font-bold text-black dark:text-white"><span>{currency}</span><input type="number" value={recurringAmount} onChange={e => setRecurringAmount(e.target.value)} className="w-20 text-right bg-transparent outline-none"/></div></InputGroup>
                        <InputGroup label="Payments"><input type="number" value={recurringCount} onChange={e => setRecurringCount(e.target.value)} className="w-20 text-right bg-transparent outline-none font-bold text-black dark:text-white"/></InputGroup>
                        </>
                    )}
                    <InputGroup label="Total Fee"><div className="flex justify-end items-center gap-1 font-bold text-black dark:text-white"><span>{currency}</span><input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} disabled={recurringEnabled} className="w-24 text-right bg-transparent outline-none"/></div></InputGroup>
                    <InputGroup label="Paid Amount"><div className="flex justify-end items-center gap-1 font-bold text-green-500"><span>{currency}</span><input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-24 text-right bg-transparent outline-none"/></div></InputGroup>
                </div>
             </div>
        </CollapsibleSection>

        {/* Schedule Section */}
        <CollapsibleSection 
          title="Session Schedule" 
          icon={CalendarIcon}
          isOpen={openSections.schedule}
          onToggle={() => toggleSection('schedule')}
        >
            <div className="space-y-6">
                <div className="rounded-2xl px-2">
                    <InputGroup label="Start"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-right font-bold text-black dark:text-white"/></InputGroup>
                    <InputGroup label="Expiry"><input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-transparent text-right font-bold text-black dark:text-white"/></InputGroup>
                    <InputGroup label="Time Slot"><div className="flex justify-end items-center gap-1 font-bold text-black dark:text-white"><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-transparent"/><ArrowRight size={14}/><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-transparent"/></div></InputGroup>
                </div>
                
                {/* Calendar Picker */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-3xl p-5">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-full transition"><ChevronLeft size={20}/></button>
                        <span className="font-black uppercase tracking-tight text-lg text-black dark:text-white">{format(currentMonth, 'MMMM yyyy')}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-full transition"><ChevronRight size={20}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-4 text-center mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-[10px] font-black text-gray-400">{d}</div>)}
                        {Array(getDay(startOfMonth(currentMonth))).fill(null).map((_, i) => <div key={i}/>)}
                        {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map(day => {
                            const isSelected = selectedSessions.some(s => s.date === format(day, 'yyyy-MM-dd'));
                            return (
                                <button key={day.toString()} type="button" onClick={() => toggleSession(day)} className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                        <button onClick={() => setIsRecurringMode(!isRecurringMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isRecurringMode ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}><Repeat size={14}/> Auto-repeat</button>
                        <span className="text-xs font-bold text-gray-400">{selectedSessions.length} sessions</span>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default ClientForm;