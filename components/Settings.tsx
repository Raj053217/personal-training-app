
import React, { useRef, useState, useEffect } from 'react';
import { Moon, Sun, DollarSign, ChevronRight, Smartphone, HardDrive, Bell, Monitor, LogOut } from 'lucide-react';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadTemplates, loadFoodLibrary, saveTemplates, saveFoodLibrary } from '../services/storage';

interface SettingsProps {
  clients?: Client[];
  isDarkMode: boolean;
  toggleTheme: () => void;
  currency: string;
  setCurrency: (currency: string) => void;
  layoutMode: 'mobile' | 'desktop';
  setLayoutMode: (mode: 'mobile' | 'desktop') => void;
  onRestore: (data: Client[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onEnterClientMode?: (client: Client) => void;
}

const Settings: React.FC<SettingsProps> = ({ clients = [], isDarkMode, toggleTheme, currency, setCurrency, layoutMode, setLayoutMode, onRestore }) => {
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
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

  const handleEnhancedBackup = () => {
    const templatesData = loadTemplates();
    const foodData = loadFoodLibrary();

    const backupPayload = {
      meta: {
        app: 'FitwithRj',
        version: '3.0',
        date: new Date().toISOString(),
      },
      clients: clients,
      templates: templatesData,
      foodLibrary: foodData
    };

    const dataStr = JSON.stringify(backupPayload, null, 2);
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

  const handleEnhancedRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (window.confirm('Restoring will overwrite current Clients, Plans, and Food Library. Continue?')) {
            if (Array.isArray(json)) {
                onRestore(json);
                alert("Clients restored successfully.");
            } else if (json.meta && (json.meta.app === 'FitwithRj' || json.clients)) {
                if (json.clients) onRestore(json.clients);
                if (json.templates) saveTemplates(json.templates);
                if (json.foodLibrary) saveFoodLibrary(json.foodLibrary);
                alert("Full system restored successfully!");
            } else {
                alert("Invalid backup file format.");
            }
        }
      } catch (err) { 
          alert('Failed to parse backup file.'); 
          console.error(err);
      }
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
  }: { 
    icon: any, 
    label: string, 
    value?: string | React.ReactNode, 
    onClick?: () => void,
    isToggle?: boolean,
    toggleValue?: boolean,
    iconColor?: string,
  }) => (
    <div 
      onClick={!isToggle ? onClick : undefined}
      className={`flex items-center justify-between p-3.5 pl-4 bg-ios-card-light dark:bg-ios-card-dark transition-colors active:bg-[#E5E5EA] dark:active:bg-[#2C2C2E] cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-[7px] ${iconColor} flex items-center justify-center text-white`}>
          <Icon size={16} />
        </div>
        <span className="text-[17px] text-black dark:text-white">{label}</span>
      </div>
      
      <div className="flex items-center gap-2 pr-1">
        {isToggle ? (
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
      <input type="file" ref={fileInputRef} onChange={handleEnhancedRestore} accept=".json" className="hidden" />
      
       {/* Large Title Header */}
       <div className="pt-2 px-1">
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Settings</h1>
      </div>

      {/* Preferences Group */}
      <div>
        <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide mb-2 px-4">Preferences</h3>
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
           <SettingItem 
            icon={Monitor} 
            label="Desktop View" 
            isToggle={true}
            toggleValue={layoutMode === 'desktop'}
            onClick={() => setLayoutMode(layoutMode === 'desktop' ? 'mobile' : 'desktop')}
            iconColor="bg-purple-500"
          />
        </div>
      </div>

      {/* Data Management Group */}
      <div>
        <h3 className="text-[13px] font-semibold text-ios-gray uppercase tracking-wide mb-2 px-4">Data Management</h3>
        <div className="bg-ios-card-light dark:bg-ios-card-dark rounded-[10px] overflow-hidden shadow-sm p-4 space-y-4">
            <div className="flex gap-4">
                <button onClick={handleEnhancedBackup} className="flex-1 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 transition border border-gray-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                        <HardDrive size={20} />
                    </div>
                    <span className="text-sm font-bold text-black dark:text-white">Backup</span>
                </button>

                <button onClick={handleRestoreClick} className="flex-1 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 transition border border-gray-100 dark:border-white/5">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                        <HardDrive size={20} />
                    </div>
                    <span className="text-sm font-bold text-black dark:text-white">Restore</span>
                </button>
            </div>
        </div>
      </div>

      {/* App Info */}
      <div>
        <div className="rounded-[10px] overflow-hidden shadow-sm divide-y divide-ios-separator-light dark:divide-ios-separator-dark">
          <SettingItem 
            icon={Smartphone} 
            label="Version" 
            value="3.0.0 (Personal)"
            onClick={() => {}}
            iconColor="bg-gray-500"
          />
          <SettingItem 
            icon={LogOut} 
            label="Log Out" 
            value=""
            onClick={logout}
            iconColor="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
