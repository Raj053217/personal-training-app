
import React, { useState, useEffect } from 'react';
import { Client, NavPage } from './types';
import { saveClients, loadClients } from './services/storage';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import PlanManager from './components/PlanManager';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { user } = useAuth(); // Auth is now mocked
  const [clients, setClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState<NavPage>(NavPage.CLIENTS);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState('₹');

  // Initialization
  useEffect(() => {
    // Load Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
    
    // Load Currency
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) setCurrency(savedCurrency);

    // Load Data
    const localData = loadClients();
    setClients(localData);
  }, []);

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

  // Persist Data on Change
  useEffect(() => {
    if (clients.length >= 0) {
        saveClients(clients);
    }
  }, [clients]);

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
              new Notification(`Upcoming Session`, { body: `Starts at ${session.time}` });
           }
        });
      });
    };
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [clients]);

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    let newClients;
    
    if (exists) {
        newClients = clients.map(c => c.id === client.id ? client : c);
    } else {
        newClients = [...clients, client];
    }
    
    setClients(newClients);
    setEditingClient(undefined);
    if (currentPage === NavPage.ADD_CLIENT) {
        setCurrentPage(NavPage.CLIENTS);
    }
  };

  const handleDeleteClient = (id: string) => {
      setClients(clients.filter(c => c.id !== id));
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

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-ios-blue selection:text-white`}>
      
      {/* Main Content Area */}
      <main className={`w-full max-w-2xl mx-auto pb-24 px-4 safe-top pt-8 safe-bottom min-h-screen relative`}>
            <>
                {currentPage === NavPage.DASHBOARD && <Dashboard clients={clients} navigateTo={setCurrentPage} currency={currency} />}
                {currentPage === NavPage.CLIENTS && (
                    <ClientList 
                        clients={clients} 
                        onEdit={(c) => { setEditingClient(c); setCurrentPage(NavPage.ADD_CLIENT); }} 
                        onDelete={handleDeleteClient} 
                        onAdd={startAdd} 
                        currency={currency} 
                    />
                )}
                {currentPage === NavPage.PLANS && <PlanManager clients={clients} onUpdateClient={handleSaveClient} />}
                {currentPage === NavPage.SCHEDULE && <Schedule clients={clients} onUpdateClient={handleSaveClient} />}
                {currentPage === NavPage.SETTINGS && (
                    <Settings 
                        clients={clients} 
                        isDarkMode={isDarkMode} 
                        toggleTheme={() => setIsDarkMode(!isDarkMode)} 
                        currency={currency} 
                        setCurrency={setCurrency} 
                        onRestore={(d) => setClients(d)}
                        undo={() => {}}
                        redo={() => {}}
                        canUndo={false}
                        canRedo={false}
                    />
                )}
                {currentPage === NavPage.ADD_CLIENT && (
                    <ClientForm 
                        onSave={handleSaveClient} 
                        onCancel={() => setCurrentPage(NavPage.CLIENTS)} 
                        initialData={editingClient} 
                        currency={currency} 
                    />
                )}
            </>
      </main>

      {/* iOS Translucent Tab Bar */}
      {currentPage !== NavPage.ADD_CLIENT && (
        <nav className="fixed bottom-0 w-full z-40 ios-blur border-t border-ios-separator-light/50 dark:border-ios-separator-dark/50 pb-safe safe-bottom no-print">
          <div className="flex justify-around items-center h-[50px] max-w-2xl mx-auto pt-1">
            <TabButton page={NavPage.DASHBOARD} icon={LayoutDashboard} label="Home" />
            <TabButton page={NavPage.PLANS} icon={Users} label="Plans" />
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
