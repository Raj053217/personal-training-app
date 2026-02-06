import React, { useRef, useState, useEffect } from 'react';
import { Moon, Sun, DollarSign, ChevronRight, Smartphone, Upload, Download, Bell, LogOut, User, RotateCcw, RotateCw } from 'lucide-react';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  currency: string;
  setCurrency: (currency: string) => void;
  onRestore: (data: Client[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isDarkMode, toggleTheme, currency, setCurrency, onRestore, undo, redo, canUndo, canRedo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(stored === 'true');
  }, []);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        new Notification("Notifications Enabled", { body: "You will now receive reminders 15 minutes before sessions." });
      } else {
        alert("Notifications permission denied.");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    }
  };

  const handleBackup = () => {
    const dataStr = localStorage.getItem('pt_manage_pro_data');
    if (!dataStr || dataStr === '[]') return alert('No data to backup.');
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FitwithRj_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.every(item => item.id && item.name)) {
             if (window.confirm('Restore backup? This overwrites current data.')) onRestore(json);
        } else {
          alert('Invalid backup file.');
        }
      } catch (err) { alert('Failed to parse file.'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };
  
  const SettingItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick,
    isToggle = false,
    toggleValue = false,
    iconColor = "bg-ios-blue",
    customContent,
    disabled = false
  }: { 
    icon: any, 
    label: string, 
    value?: string | React.ReactNode, 
    onClick?: () => void,
    isToggle?: boolean,
    toggleValue?: boolean,
    iconColor?: string,
    customContent?: React.ReactNode,
    disabled?: boolean
  }) => (
    <div 
      onClick={!isToggle && !disabled ? onClick : undefined}
      className={`flex items-center justify-between p-3.5 pl-4 bg-ios-card-light dark:bg-ios-card-dark transition-colors ${!disabled ? 'active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-[7px] ${iconColor} flex items-center justify-center text-white`}>
          <Icon size={16} />
        </div>
        <span className="text-[17px] text-black dark:text-white">{label}</span>
      </div>
      
      <div className="flex items-center gap-2 pr-1">
        {customContent ? customContent : isToggle ? (
          <button 
             onClick={onClick}
             className={`w-[51px] h-[31px] rounded-full transition-colors relative ${toggleValue ? 'bg-ios-green' : 'bg-[#E9E9EA] dark:bg-[#39393D]'}`}
          >
            <div className={`absolute top-0.5 w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform ${toggleValue ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
          </button>
        ) : (
          <>
            <span className="text-[17px] text-ios-gray">{value}</span>
            <ChevronRight size={16} className="text-ios-gray3" />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      
       {/* Large Title Header */}
       <div className="pt-2 px-1">
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Settings</h1>
      </div>

      {/* Account Section (New) */}
      <div>
         <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide mb-2 px-4">Account</h3>
         <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
            {user ? (
               <SettingItem 
                 icon={User} 
                 label="Logged in as"
                 value={
                    <div className="flex items-center gap-2">
                       <span className="text-sm truncate max-w-[120px]">{user.displayName || user.email}</span>
                       <button onClick={logout} className="text-ios-red font-medium text-sm bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">Sign Out</button>
                    </div>
                 }
                 iconColor="bg-ios-blue"
                 customContent={
                     <div className="flex items-center gap-2">
                       {user.photoURL && <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />}
                       <span className="text-[15px] text-ios-gray hidden sm:inline">{user.email}</span>
                       <button onClick={logout} className="text-ios-red font-medium text-[15px] ml-2">Sign Out</button>
                    </div>
                 }
               />
            ) : (
               <div 
                 onClick={login}
                 className="flex items-center justify-between p-3.5 pl-4 bg-ios-card-light dark:bg-ios-card-dark active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] cursor-pointer transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className={`w-7 h-7 rounded-[7px] bg-white border flex items-center justify-center text-white overflow-hidden`}>
                     <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                     </svg>
                   </div>
                   <span className="text-[17px] text-ios-blue font-medium">Sign in with Google</span>
                 </div>
                 <ChevronRight size={16} className="text-ios-gray3" />
               </div>
            )}
         </div>
         <p className="px-4 mt-2 text-[13px] text-ios-gray">
            {user ? "Your data is backed up to the cloud." : "Sign in to sync your data across devices."}
         </p>
      </div>
      
      {/* Edit History */}
      <div>
         <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide mb-2 px-4">Edit History</h3>
         <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
            <SettingItem 
              icon={RotateCcw} 
              label="Undo Last Change" 
              onClick={undo}
              disabled={!canUndo}
              iconColor={canUndo ? "bg-ios-orange" : "bg-gray-400"}
              value={canUndo ? "" : "Nothing to undo"}
            />
            <SettingItem 
              icon={RotateCw} 
              label="Redo Change" 
              onClick={redo}
              disabled={!canRedo}
              iconColor={canRedo ? "bg-ios-orange" : "bg-gray-400"}
              value={canRedo ? "" : "Nothing to redo"}
            />
         </div>
      </div>

      {/* Group 1 */}
      <div>
        <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
          <SettingItem 
            icon={isDarkMode ? Moon : Sun} 
            label="Dark Mode" 
            isToggle={true}
            toggleValue={isDarkMode}
            onClick={toggleTheme}
            iconColor="bg-gray-800"
          />
           <SettingItem 
            icon={Bell} 
            label="Notifications" 
            isToggle={true}
            toggleValue={notificationsEnabled}
            onClick={toggleNotifications}
            iconColor="bg-ios-red"
          />
          <SettingItem 
            icon={DollarSign} 
            label="Currency" 
            value={currency === '₹' ? 'INR' : 'USD'}
            onClick={() => setCurrency(currency === '₹' ? '$' : '₹')}
            iconColor="bg-ios-green"
          />
        </div>
        <p className="px-4 mt-2 text-[13px] text-ios-gray">Notifications send reminders 15 minutes before sessions.</p>
      </div>

      {/* Group 2 */}
      <div>
        <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
          <SettingItem 
            icon={Download} 
            label="Backup Data" 
            onClick={handleBackup}
            iconColor="bg-ios-blue"
          />
           <SettingItem 
            icon={Upload} 
            label="Restore Data" 
            onClick={handleRestoreClick}
            iconColor="bg-ios-blue"
          />
        </div>
        <p className="px-4 mt-2 text-[13px] text-ios-gray">Export your data to JSON for safekeeping.</p>
      </div>

      {/* Group 3 */}
      <div>
        <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
          <SettingItem 
            icon={Smartphone} 
            label="Version" 
            value="2.2.0"
            onClick={() => {}}
            iconColor="bg-gray-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;