
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Settings, Save, X, Database, AlertTriangle, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { configureFirebase, isFirebaseConfigured } from '../services/firebase';

const LoginScreen: React.FC = () => {
  const { login, guestLogin, loading, error, clearError } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [configInput, setConfigInput] = useState('');

  const handleSaveConfig = () => {
      try {
          let jsonStr = configInput.trim();
          const config = JSON.parse(jsonStr);
          
          if (!config.apiKey || !config.projectId) {
              alert("Config seems missing apiKey or projectId.");
              return;
          }

          configureFirebase(config);
      } catch (e) {
          alert("Invalid JSON format. Please ensure keys are quoted.");
      }
  };

  if (showSetup) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-6">
              <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-[40px] shadow-xl p-8 animate-slideUp">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                              <Database size={20} />
                          </div>
                          <h2 className="text-xl font-black text-black dark:text-white">Database Setup</h2>
                      </div>
                      <button onClick={() => setShowSetup(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500"><X size={20}/></button>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">
                      To enable cloud sync and authentication, paste your Firebase Project configuration JSON below.
                  </p>
                  
                  <div className="relative mb-4">
                      <textarea 
                        value={configInput} 
                        onChange={e => setConfigInput(e.target.value)} 
                        placeholder={'{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'}
                        className="w-full h-48 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 font-mono text-xs outline-none resize-none text-black dark:text-white focus:border-blue-500 transition-colors"
                      />
                  </div>

                  <button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20 active:scale-95">
                      <Save size={18} /> Save Configuration
                  </button>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-[10px] text-blue-600 dark:text-blue-400">
                      <strong>Note:</strong> Configuration is stored locally in your browser. It is not sent to any third-party server other than Google Firebase.
                  </div>
              </div>
          </div>
      );
  }

  // Broad check for domain authorization errors
  const isDomainError = error && (error.toLowerCase().includes("unauthorized") || error.toLowerCase().includes("auth/unauthorized-domain"));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-6">
      <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[40px] shadow-xl p-8 text-center animate-slideUp relative group">
         
         {/* Setup Gear - visible on hover or if not configured */}
         <button 
            onClick={() => setShowSetup(true)} 
            className={`absolute top-6 right-6 p-2 rounded-full transition-all ${!isFirebaseConfigured ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600'}`}
            title="Configure Database"
         >
             <Settings size={20} />
         </button>

         <div className="w-20 h-20 bg-black dark:bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
            <span className="text-4xl">💪</span>
         </div>
         
         <h1 className="text-3xl font-black text-black dark:text-white mb-2 tracking-tight">FitwithRj</h1>
         <p className="text-gray-500 font-medium mb-8 text-sm">Personal Training Management</p>
         
         {/* Specialized Error View for Domain Issues */}
         {isDomainError ? (
             <div className="mb-6 animate-fadeIn text-left">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                           <AlertTriangle className="text-orange-600 dark:text-orange-400" size={18} />
                           <h3 className="font-bold text-orange-800 dark:text-orange-200 text-sm">Domain Not Authorized</h3>
                      </div>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mb-3 leading-relaxed">
                          Firebase blocked the login because <strong>{window.location.hostname}</strong> is not in the authorized list.
                      </p>
                      
                      <button 
                          onClick={guestLogin} 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition active:scale-95 flex items-center justify-center gap-2"
                      >
                          Continue in Demo Mode <ArrowRight size={16}/>
                      </button>
                  </div>
                  
                  <div className="flex gap-2">
                       <button 
                          onClick={() => { clearError(); login(); }}
                          className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-bold py-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 text-xs flex items-center justify-center gap-1"
                       >
                           <RefreshCw size={14}/> Retry Login
                       </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 text-center">
                      If you are the developer, add this domain in Firebase Console &gt; Authentication &gt; Settings.
                  </p>
             </div>
         ) : (
            // Standard View
            <>
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-left animate-fadeIn flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Login Failed</h3>
                            <p className="text-xs text-red-500 dark:text-red-300 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={login}
                        disabled={loading || !isFirebaseConfigured}
                        className={`w-full text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 ${isFirebaseConfigured ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        )}
                        <span>Sign in with Google</span>
                    </button>
                    
                    {!isFirebaseConfigured && (
                        <div onClick={() => setShowSetup(true)} className="cursor-pointer text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                            Database not configured. Click the gear icon or here to setup.
                        </div>
                    )}
                    
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-white/10"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-[#1C1C1E] px-2 text-gray-400 font-bold">Or</span></div>
                    </div>

                    <button 
                        onClick={guestLogin}
                        className="w-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 font-bold py-4 rounded-2xl transition-all hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95"
                    >
                        Try Demo Mode
                    </button>
                </div>
            </>
         )}
         
         <p className="mt-8 text-[10px] text-gray-400">
            Clients: Log in with the email linked to your profile to access your plan.
         </p>
      </div>
    </div>
  );
};

export default LoginScreen;
