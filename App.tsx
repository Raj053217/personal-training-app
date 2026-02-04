import React, { useState, useEffect } from 'react';
import { Client, NavPage } from './types';
import { saveClients, getInitialData, saveClientsToCloud, loadClientsFromCloud } from './services/storage';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon, Plus, Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<NavPage>(NavPage.DASHBOARD);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState('₹');

  // Theme & Currency Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  // Theme Side Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  // Data Loading Logic
  useEffect(() => {
    const initData = async () => {
        setDataLoading(true);
        if (user) {
            // Logged in: Try fetching from cloud
            const cloudData = await loadClientsFromCloud(user.uid);
            if (cloudData) {
                setClients(cloudData);
            } else {
                // First time login or empty cloud: Use local data and sync it up
                const localData = getInitialData();
                setClients(localData);
                if (localData.length > 0) {
                    await saveClientsToCloud(user.uid, localData);
                }
            }
        } else {
            // Guest: Load from local storage
            setClients(getInitialData());
        }
        setDataLoading(false);
    };

    if (!authLoading) {
        initData();
    }
  }, [user, authLoading]);

  // Data Saving Logic
  useEffect(() => {
    // We only save if we are not in the initial loading state
    if (!dataLoading && !authLoading) {
        // Always save to local storage as backup/offline cache
        saveClients(clients);
        
        // If logged in, sync to cloud
        if (user) {
            saveClientsToCloud(user.uid, clients);
        }
    }
  }, [clients, user, dataLoading, authLoading]);

  // Push Notifications Checker
  useEffect(() => {
    const checkNotifications = () => {
      const enabled = localStorage.getItem('notifications_enabled') === 'true';
      if (!enabled || Notification.permission !== 'granted') return;
      const now = new Date();
      clients.forEach(client => {
        client.sessions.forEach(session => {
           if (session.completed || session.status === 'cancelled' || session.status === 'missed') return;
           const sessionTime = new Date(`${session.date}T${session.time}`);
           const diffMins = (sessionTime.getTime() - now.getTime()) / (1000 * 60);
           if (diffMins >= 14 && diffMins < 15) {
              new Notification(`Upcoming Session: ${client.name}`, { body: `Starts at ${session.time}` });
           }
        });
      });
    };
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [clients]);

  const handleSaveClient = (client: Client) => {
    if (editingClient) setClients(clients.map(c => c.id === client.id ? client : c));
    else setClients([...clients, client]);
    setEditingClient(undefined);
    setCurrentPage(NavPage.CLIENTS);
  };

  const startAdd = () => {
    setEditingClient(undefined);
    setCurrentPage(NavPage.ADD_CLIENT);
  };

  const TabButton = ({ page, icon: Icon, label }: { page: NavPage, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
        currentPage === page ? 'text-ios-blue' : 'text-ios-gray'
      }`}
    >
      <Icon size={26} strokeWidth={currentPage === page ? 2.5 : 2} />
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  );

  if (authLoading || dataLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black text-ios-gray">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm font-medium">Syncing...</p>
          </div>
      );
  }

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-ios-blue selection:text-white`}>
      
      {/* Main Content Area */}
      <main className={`w-full max-w-2xl mx-auto pb-24 px-4 safe-top pt-8 safe-bottom min-h-screen`}>
        {currentPage === NavPage.DASHBOARD && <Dashboard clients={clients} navigateTo={setCurrentPage} currency={currency} />}
        {currentPage === NavPage.CLIENTS && <ClientList clients={clients} onEdit={(c) => { setEditingClient(c); setCurrentPage(NavPage.ADD_CLIENT); }} onDelete={(id) => setClients(clients.filter(c => c.id !== id))} onAdd={startAdd} currency={currency} />}
        {currentPage === NavPage.SCHEDULE && <Schedule clients={clients} onUpdateClient={handleSaveClient} />}
        {currentPage === NavPage.SETTINGS && <Settings isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} currency={currency} setCurrency={setCurrency} onRestore={(d) => { setClients(d); saveClients(d); alert('Restored'); }} />}
        
        {currentPage === NavPage.ADD_CLIENT && (
          <ClientForm 
            onSave={handleSaveClient} 
            onCancel={() => setCurrentPage(NavPage.CLIENTS)} 
            initialData={editingClient} 
            currency={currency} 
          />
        )}
      </main>

      {/* iOS Translucent Tab Bar */}
      {currentPage !== NavPage.ADD_CLIENT && (
        <nav className="fixed bottom-0 w-full z-40 ios-blur border-t border-ios-separator-light/50 dark:border-ios-separator-dark/50 pb-safe safe-bottom no-print">
          <div className="flex justify-around items-center h-[50px] max-w-2xl mx-auto pt-1">
            <TabButton page={NavPage.DASHBOARD} icon={LayoutDashboard} label="Summary" />
            <TabButton page={NavPage.SCHEDULE} icon={Calendar} label="Schedule" />
            <TabButton page={NavPage.CLIENTS} icon={Users} label="Clients" />
            <TabButton page={NavPage.SETTINGS} icon={SettingsIcon} label="Settings" />
          </div>
        </nav>
      )}
    </div>
  );
};

export default App;
