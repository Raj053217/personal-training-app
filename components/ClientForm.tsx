import React, { useState, useEffect } from 'react';
import { Client, Session, PaymentFrequency, WeightEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isBefore, addWeeks, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Repeat, ArrowRight, User, DollarSign, Calendar as CalendarIcon, RefreshCcw } from 'lucide-react';

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
  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <label className="text-[15px] font-medium text-gray-900 dark:text-white min-w-[100px]">{label}</label>
    <div className="flex-1 text-right">{children}</div>
  </div>
);

type TabType = 'profile' | 'finance' | 'schedule';

const ClientForm: React.FC<ClientFormProps> = ({ onSave, onCancel, initialData, currency }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Core Data
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
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
      setActiveTab('finance');
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
      name, email, phone, startDate, expiryDate, defaultTimeSlot: timeSlot,
      totalFee: parseFloat(totalFee), paidAmount: parseFloat(paidAmount),
      paymentPlan: recurringEnabled ? { enabled: true, frequency: recurringFreq, amount: parseFloat(recurringAmount), count: parseInt(recurringCount) } : undefined,
      sessions: selectedSessions.map(s => ({ ...s, time: timeSlot })).sort((a,b) => a.date.localeCompare(b.date)),
      notes, 
      dietPlan: initialData?.dietPlan, // Preserve existing plans
      workoutRoutine: initialData?.workoutRoutine, // Preserve existing plans
      weightHistory, 
      createdAt: initialData?.createdAt || new Date().toISOString()
    };
    onSave(newClient);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
      <button onClick={() => setActiveTab(id)} className={`flex-1 py-3 text-[13px] font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === id ? 'border-blue-500 text-blue-500 bg-blue-50/10' : 'border-transparent text-gray-400'}`}>
        <Icon size={16} /> {label}
      </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-safe animate-slideUp">
      <div className="sticky top-0 z-20 bg-[#F2F2F7]/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-4 h-14">
        <button onClick={onCancel} className="text-[17px] text-blue-500">Cancel</button>
        <h2 className="text-[17px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{initialData ? 'Manage Client' : 'New Client'}</h2>
        <button onClick={handleSave} className="text-[17px] font-bold text-blue-500">Done</button>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] flex sticky top-14 z-10 shadow-sm">
         <TabButton id="profile" label="Profile" icon={User} />
         <TabButton id="finance" label="Finance" icon={DollarSign} />
         <TabButton id="schedule" label="Schedule" icon={CalendarIcon} />
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto pb-32">
        {initialData && activeTab === 'profile' && (
            <button onClick={handleRenewPackage} className="w-full bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
                <RefreshCcw size={18} /> Renew Package Cycle
            </button>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fadeIn space-y-6">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl px-4 shadow-sm border border-gray-100 dark:border-white/5">
                <InputGroup label="Name"><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-right bg-transparent outline-none text-black dark:text-white font-bold" placeholder="Full Name"/></InputGroup>
                <InputGroup label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-right bg-transparent outline-none text-blue-500" placeholder="Optional"/></InputGroup>
                <InputGroup label="Phone"><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-right bg-transparent outline-none text-blue-500" placeholder="Optional"/></InputGroup>
            </div>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Health Notes</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-transparent outline-none text-[15px] text-gray-900 dark:text-white h-32 resize-none leading-relaxed" placeholder="Injuries, goals, etc..."/>
            </div>
            <p className="text-center text-xs text-gray-400">Diet and Workout plans are now managed in the "Plans" tab.</p>
          </div>
        )}

        {activeTab === 'finance' && (
            <div className="animate-fadeIn space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl px-6 py-2 shadow-sm border border-gray-100 dark:border-white/5">
                    <InputGroup label="Recurring?"><button onClick={() => setRecurringEnabled(!recurringEnabled)} className={`w-[51px] h-[31px] rounded-full transition-colors relative ${recurringEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`absolute top-0.5 w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform ${recurringEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}/></button></InputGroup>
                    {recurringEnabled && (
                        <>
                        <InputGroup label="Frequency"><select value={recurringFreq} onChange={(e) => setRecurringFreq(e.target.value as PaymentFrequency)} className="bg-transparent text-right font-bold outline-none"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></InputGroup>
                        <InputGroup label="Rate"><div className="flex justify-end items-center gap-1 font-bold text-black dark:text-white"><span>{currency}</span><input type="number" value={recurringAmount} onChange={e => setRecurringAmount(e.target.value)} className="w-20 text-right bg-transparent outline-none"/></div></InputGroup>
                        <InputGroup label="Payments"><input type="number" value={recurringCount} onChange={e => setRecurringCount(e.target.value)} className="w-20 text-right bg-transparent outline-none font-bold"/></InputGroup>
                        </>
                    )}
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl px-6 py-2 shadow-sm border border-gray-100 dark:border-white/5">
                    <InputGroup label="Total Fee"><div className="flex justify-end items-center gap-1 font-bold"><span>{currency}</span><input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} disabled={recurringEnabled} className="w-24 text-right bg-transparent outline-none"/></div></InputGroup>
                    <InputGroup label="Paid Amount"><div className="flex justify-end items-center gap-1 font-bold text-green-500"><span>{currency}</span><input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-24 text-right bg-transparent outline-none"/></div></InputGroup>
                </div>
            </div>
        )}

        {activeTab === 'schedule' && (
            <div className="animate-fadeIn space-y-6">
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl px-6 py-2 shadow-sm border border-gray-100 dark:border-white/5">
                    <InputGroup label="Start"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-right font-bold"/></InputGroup>
                    <InputGroup label="Expiry"><input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-transparent text-right font-bold"/></InputGroup>
                    <InputGroup label="Time Slot"><div className="flex justify-end items-center gap-1 font-bold"><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-transparent"/><ArrowRight size={14}/><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-transparent"/></div></InputGroup>
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft/></button>
                        <span className="font-black uppercase tracking-tight text-lg">{format(currentMonth, 'MMMM yyyy')}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-4 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-[10px] font-black text-gray-400">{d}</div>)}
                        {Array(getDay(startOfMonth(currentMonth))).fill(null).map((_, i) => <div key={i}/>)}
                        {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map(day => {
                            const isSelected = selectedSessions.some(s => s.date === format(day, 'yyyy-MM-dd'));
                            return (
                                <button key={day.toString()} type="button" onClick={() => toggleSession(day)} className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black scale-110 shadow-lg' : 'text-gray-900 dark:text-white'}`}>
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-6 flex justify-between items-center bg-gray-50 dark:bg-black/40 p-3 rounded-2xl">
                        <button onClick={() => setIsRecurringMode(!isRecurringMode)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isRecurringMode ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}><Repeat size={14}/> Auto-repeat</button>
                        <span className="text-xs font-bold text-gray-400">{selectedSessions.length} sessions</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ClientForm;