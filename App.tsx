
import React, { useState, useEffect, ErrorInfo, Component } from 'react';
import { Client, NavPage } from './types';
import { saveClients, loadClients } from './services/storage';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import PlanManager from './components/PlanManager';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-black p-6">
           <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-md text-center">
              <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
              <h1 className="text-xl font-black text-black dark:text-white mb-2">Something went wrong</h1>
              <p className="text-sm text-gray-500 mb-6">The application encountered an unexpected error.</p>
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
                  <code className="text-[10px] text-red-500 font-mono">{this.state.error?.message}</code>
              </div>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition">
                  Reload App
              </button>
           </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { user } = useAuth(); 
  const [clients, setClients] = useState<Client[]>([]);
  const [currentPage, setCurrentPage] = useState<NavPage>(NavPage.DASHBOARD);
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
    setClients(localData || []);
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

  // Push Notifications Checker (Sessions + Backup)
  useEffect(() => {
    const checkNotifications = () => {
      const enabled = localStorage.getItem('notifications_enabled') === 'true';
      if (!enabled || Notification.permission !== 'granted') return;
      
      const now = new Date();
      const currentHour = now.getHours();
      
      // 1. Session Reminders
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

      // 2. Backup Reminders (Morning 9 AM & Evening 9 PM)
      const todayStr = now.toDateString();
      const lastBackup = localStorage.getItem('last_backup_notification');

      // Morning Reminder (9:00 - 9:59)
      if (currentHour === 9) {
          if (!lastBackup || lastBackup !== `${todayStr}_AM`) {
              new Notification("Backup Reminder 🛡️", { body: "Good morning! Don't forget to download a backup of your data in Settings." });
              localStorage.setItem('last_backup_notification', `${todayStr}_AM`);
          }
      }

      // Evening Reminder (21:00 - 21:59)
      if (currentHour === 21) {
          if (!lastBackup || lastBackup !== `${todayStr}_PM`) {
              new Notification("Backup Reminder 🛡️", { body: "End of day check! Secure your client data by downloading a backup." });
              localStorage.setItem('last_backup_notification', `${todayStr}_PM`);
          }
      }
    };
    
    // Check every minute
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

  const handleUpdateClient = (updatedClient: Client) => {
      setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  // Determine if we are in Client View (Guest or Code login)
  const isClientUser = user?.uid === 'client-user';
  // Mock logic to select a client for "Client View" if logged in as client
  const viewingClient = isClientUser ? (clients.length > 0 ? clients[0] : undefined) : undefined;

  const TabButton = ({ page, icon: Icon, label }: { page: NavPage, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
        currentPage === page ? 'text-blue-600 dark:text-blue-500' : 'text-gray-400'
      }`}
    >
      <Icon size={26} strokeWidth={currentPage === page ? 2.5 : 2} />
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="bg-[#F2F2F7] dark:bg-black min-h-screen pb-20 sm:pb-0 flex justify-center">
      <div className="w-full max-w-2xl bg-[#F2F2F7] dark:bg-black min-h-screen relative shadow-2xl flex flex-col">
          
          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
             {currentPage === NavPage.DASHBOARD && (
                 <Dashboard clients={clients} navigateTo={setCurrentPage} currency={currency} viewingClient={viewingClient} />
             )}
             
             {currentPage === NavPage.CLIENTS && !editingClient && (
                 <ClientList 
                    clients={clients} 
                    onEdit={(client) => { setEditingClient(client); setCurrentPage(NavPage.ADD_CLIENT); }} 
                    onDelete={handleDeleteClient}
                    onAdd={startAdd}
                    currency={currency}
                 />
             )}
             
             {currentPage === NavPage.ADD_CLIENT && (
                 <ClientForm 
                    onSave={handleSaveClient} 
                    onCancel={() => { setEditingClient(undefined); setCurrentPage(NavPage.CLIENTS); }}
                    initialData={editingClient}
                    currency={currency}
                 />
             )}

             {currentPage === NavPage.PLANS && (
                 <PlanManager clients={clients} onUpdateClient={handleUpdateClient} viewingClient={viewingClient} />
             )}
             
             {currentPage === NavPage.SCHEDULE && (
                 <Schedule clients={clients} onUpdateClient={handleUpdateClient} viewingClient={viewingClient} />
             )}
             
             {currentPage === NavPage.SETTINGS && (
                 <Settings 
                    clients={clients}
                    isDarkMode={isDarkMode}
                    toggleTheme={() => setIsDarkMode(!isDarkMode)}
                    currency={currency}
                    setCurrency={setCurrency}
                    onRestore={setClients}
                    undo={() => {}}
                    redo={() => {}}
                    canUndo={false}
                    canRedo={false}
                 />
             )}
          </div>

          {/* Bottom Navigation */}
          {!editingClient && !viewingClient && (
            <div className="fixed bottom-0 left-0 right-0 sm:relative bg-white dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-gray-800 h-[83px] sm:h-20 pb-5 sm:pb-0 flex justify-around items-center px-2 z-40 max-w-2xl mx-auto w-full">
               <TabButton page={NavPage.DASHBOARD} icon={LayoutDashboard} label="Overview" />
               <TabButton page={NavPage.CLIENTS} icon={Users} label="Clients" />
               <TabButton page={NavPage.SCHEDULE} icon={Calendar} label="Schedule" />
               <TabButton page={NavPage.PLANS} icon={FileText} label="Plans" />
               <TabButton page={NavPage.SETTINGS} icon={SettingsIcon} label="Settings" />
            </div>
          )}
          
          {/* Client Mode Navigation */}
          {viewingClient && (
            <div className="fixed bottom-0 left-0 right-0 sm:relative bg-white dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-gray-800 h-[83px] sm:h-20 pb-5 sm:pb-0 flex justify-around items-center px-2 z-40 max-w-2xl mx-auto w-full">
               <TabButton page={NavPage.DASHBOARD} icon={LayoutDashboard} label="Home" />
               <TabButton page={NavPage.PLANS} icon={FileText} label="My Plan" />
               <TabButton page={NavPage.SCHEDULE} icon={Calendar} label="Schedule" />
            </div>
          )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-black">
              <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
          </div>
      );
  }

  return (
    <ErrorBoundary>
      {user ? <AppContent /> : <LoginScreen />}
    </ErrorBoundary>
  );
};

export default App;
