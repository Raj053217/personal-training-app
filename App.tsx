
import React, { useState, useEffect } from 'react';
import { Client, NavPage } from './types';
import { saveClients, getInitialData, saveClientsToCloud, loadClientsFromCloud, updateClientInCloud } from './services/storage';
import { LayoutDashboard, Users, Calendar, Settings as SettingsIcon, Plus, Loader2, BookOpen, LogOut } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import PlanManager from './components/PlanManager';
import LoginScreen from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
  const { user, loading: authLoading, role, coachId, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  // Default to CLIENTS page as requested for "adding client details"
  const [currentPage, setCurrentPage] = useState<NavPage>(NavPage.CLIENTS);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState('₹');

  // Client View Mode State
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [noProfileFound, setNoProfileFound] = useState(false);

  // History State for Undo/Redo
  const [history, setHistory] = useState<Client[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Helper to update clients and push to history
  const updateClients = (newClients: Client[], addToHistory = true) => {
    setClients(newClients);
    // If in client mode, ensure activeClient state is also refreshed
    if (activeClient) {
        const updatedMe = newClients.find(c => c.id === activeClient.id);
        if (updatedMe) setActiveClient(updatedMe);
    }

    if (addToHistory) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newClients);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setClients(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setClients(history[newIndex]);
    }
  };

  // Theme & Currency Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) setCurrency(savedCurrency);
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

  // Data Loading Logic
  useEffect(() => {
    // 1. Wait for Auth to initialize
    if (authLoading) return;

    // 2. If no user, we are done loading (show login screen)
    if (!user) {
        setDataLoading(false);
        return;
    }

    const initData = async () => {
        setDataLoading(true);
        setNoProfileFound(false);
        try {
            let initialClients: Client[] = [];

            // If Client Role, but no coach mapping found, fail early
            if (role === 'client' && !coachId) {
                setNoProfileFound(true);
                setDataLoading(false);
                return;
            }

            // Determine whose data to load
            const targetUid = role === 'client' && coachId ? coachId : user.uid;
            
            const cloudData = await loadClientsFromCloud(targetUid);
            if (cloudData) {
                initialClients = cloudData;
            } else if (role === 'admin') {
                // Only admins can initialize fresh data
                const localData = getInitialData();
                initialClients = localData;
                if (localData.length > 0) {
                    await saveClientsToCloud(user.uid, localData);
                }
            }

            // If Client Role, lock the view to themselves
            if (role === 'client') {
                const myEmail = user.email?.toLowerCase().trim();
                const myData = initialClients.find(c => c.email.toLowerCase().trim() === myEmail);
                
                if (myData) {
                    setActiveClient(myData);
                    // Force dashboard view for clients
                    setCurrentPage(NavPage.DASHBOARD);
                } else {
                   // Profile not found in the coach's list
                   setNoProfileFound(true);
                   setDataLoading(false);
                   return;
                }
            } else {
                // Admin default view
                setCurrentPage(NavPage.CLIENTS);
            }
            
            setClients(initialClients);
            setHistory([initialClients]);
            setHistoryIndex(0);
        } catch (e) {
            console.error("Failed to init data", e);
        } finally {
            setDataLoading(false);
        }
    };

    initData();
  }, [user, authLoading, role, coachId]); 

  // Data Saving Logic
  useEffect(() => {
    if (!dataLoading && !authLoading && user) {
        // Admin: Full Sync
        if (role === 'admin') {
            saveClients(clients); // Local Backup
            saveClientsToCloud(user.uid, clients);
        } 
        // Client: Safe Single Update
        else if (role === 'client' && activeClient && coachId) {
            // Find the latest version of 'me' in the clients array
            const currentMe = clients.find(c => c.id === activeClient.id);
            if (currentMe) {
                updateClientInCloud(coachId, currentMe);
            }
        }
    }
  }, [clients, user, dataLoading, authLoading, role, coachId, activeClient]);

  // Push Notifications Checker
  useEffect(() => {
    const checkNotifications = () => {
      const enabled = localStorage.getItem('notifications_enabled') === 'true';
      if (!enabled || Notification.permission !== 'granted') return;
      const now = new Date();
      clients.forEach(client => {
        if (activeClient && client.id !== activeClient.id) return; // Only notify for self if client mode

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
  }, [clients, activeClient]);

  const handleSaveClient = (client: Client) => {
    const exists = clients.some(c => c.id === client.id);
    let newClients;
    
    if (exists) {
        newClients = clients.map(c => c.id === client.id ? client : c);
    } else {
        newClients = [...clients, client];
    }
    
    updateClients(newClients);
    setEditingClient(undefined);
    
    if (currentPage === NavPage.ADD_CLIENT) {
        setCurrentPage(NavPage.CLIENTS);
    }
  };

  const handleDeleteClient = (id: string) => {
      const newClients = clients.filter(c => c.id !== id);
      updateClients(newClients);
  };

  const startAdd = () => {
    setEditingClient(undefined);
    setCurrentPage(NavPage.ADD_CLIENT);
  };

  const enterClientMode = (client: Client) => {
      setActiveClient(client);
      setCurrentPage(NavPage.DASHBOARD);
  };

  const exitClientMode = () => {
      if (role === 'client') {
          if(window.confirm("Log out?")) logout();
          return;
      }
      if (window.confirm("Exit Client View?")) {
          setActiveClient(null);
          setCurrentPage(NavPage.CLIENTS);
      }
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

  // --- RENDERING ---

  if (authLoading || dataLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black text-ios-gray">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm font-medium">Loading...</p>
          </div>
      );
  }

  // If not logged in, show Login Screen
  if (!user) {
      return <LoginScreen />;
  }

  // Profile Not Found Screen
  if (noProfileFound) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-6 text-center animate-fadeIn">
            <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Users size={40} />
            </div>
            <h1 className="text-2xl font-black text-black dark:text-white mb-2 tracking-tight">Access Denied</h1>
            <p className="text-gray-500 mb-8 max-w-xs text-sm leading-relaxed">
                We couldn't find a client profile for <br/>
                <span className="font-bold text-black dark:text-white">{user.email}</span>
            </p>
            <div className="space-y-3 w-full max-w-xs">
                <button onClick={logout} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition">
                    Sign Out
                </button>
                <div className="text-[10px] text-gray-400">
                    Contact your coach to be added to the system.
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-ios-blue selection:text-white`}>
      
      {/* Main Content Area */}
      <main className={`w-full max-w-2xl mx-auto pb-24 px-4 safe-top pt-8 safe-bottom min-h-screen relative`}>
        {/* Admin Mode Components */}
        {!activeClient && (
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
                        onRestore={(d) => updateClients(d)}
                        undo={undo}
                        redo={redo}
                        canUndo={historyIndex > 0}
                        canRedo={historyIndex < history.length - 1}
                        onEnterClientMode={enterClientMode}
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
        )}

        {/* Client Mode Components (Filtered View) */}
        {activeClient && (
            <>
                 {/* Client Top Bar */}
                 <div className="flex justify-between items-center mb-6 pt-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                             {activeClient.name.charAt(0)}
                        </div>
                        <div>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{role === 'client' ? 'Welcome Back' : 'Client Mode'}</p>
                             <h2 className="text-lg font-black text-black dark:text-white leading-none">{activeClient.name}</h2>
                        </div>
                     </div>
                     <button onClick={exitClientMode} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition">
                         <LogOut size={20} />
                     </button>
                 </div>

                 {currentPage === NavPage.DASHBOARD && <Dashboard clients={[activeClient]} navigateTo={setCurrentPage} currency={currency} viewingClient={activeClient} />}
                 {currentPage === NavPage.SCHEDULE && <Schedule clients={[activeClient]} onUpdateClient={handleSaveClient} viewingClient={activeClient} />}
                 {currentPage === NavPage.PLANS && <PlanManager clients={[activeClient]} onUpdateClient={handleSaveClient} viewingClient={activeClient} />}
                 {/* Profile / Settings for Client */}
                 {currentPage === NavPage.SETTINGS && (
                      <div className="animate-fadeIn">
                          <h1 className="text-[34px] font-bold text-black dark:text-white mb-6">Profile</h1>
                          <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] shadow-sm space-y-4">
                              <div>
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                  <p className="text-lg font-bold text-black dark:text-white">{activeClient.name}</p>
                              </div>
                              <div>
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                                  <p className="text-lg font-medium text-black dark:text-white">{activeClient.email || 'N/A'}</p>
                              </div>
                              <div>
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                                  <p className="text-lg font-medium text-black dark:text-white">{activeClient.phone || 'N/A'}</p>
                              </div>
                              <div>
                                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Cycle Expiry</label>
                                  <p className="text-lg font-medium text-black dark:text-white">{activeClient.expiryDate}</p>
                              </div>
                              <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Appearance</label>
                                    <button 
                                        onClick={() => setIsDarkMode(!isDarkMode)} 
                                        className={`w-[51px] h-[31px] rounded-full transition-colors relative ${isDarkMode ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform ${isDarkMode ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                    </button>
                                 </div>
                              </div>
                          </div>
                          
                          <button onClick={logout} className="w-full mt-6 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold rounded-2xl">Sign Out</button>
                      </div>
                 )}
            </>
        )}

      </main>

      {/* iOS Translucent Tab Bar */}
      {currentPage !== NavPage.ADD_CLIENT && (
        <nav className="fixed bottom-0 w-full z-40 ios-blur border-t border-ios-separator-light/50 dark:border-ios-separator-dark/50 pb-safe safe-bottom no-print">
          <div className="flex justify-around items-center h-[50px] max-w-2xl mx-auto pt-1">
            <TabButton page={NavPage.DASHBOARD} icon={LayoutDashboard} label="Home" />
            <TabButton page={NavPage.PLANS} icon={BookOpen} label={activeClient ? "My Plan" : "Plans"} />
            <TabButton page={NavPage.SCHEDULE} icon={Calendar} label="Schedule" />
            {!activeClient && <TabButton page={NavPage.CLIENTS} icon={Users} label="Clients" />}
            <TabButton page={NavPage.SETTINGS} icon={activeClient ? Users : SettingsIcon} label={activeClient ? "Profile" : "Settings"} />
          </div>
        </nav>
      )}
    </div>
  );
};

export default App;
