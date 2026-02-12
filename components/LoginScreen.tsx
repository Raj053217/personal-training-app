
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Settings, Save, X, Database, AlertTriangle, ArrowRight, RefreshCw, Key, User, ShieldCheck, Copy, Check } from 'lucide-react';
import { configureFirebase, isFirebaseConfigured } from '../services/firebase';

const LoginScreen: React.FC = () => {
  const { login, loginWithCode, guestLogin, loading, error, clearError } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [configInput, setConfigInput] = useState('');
  
  // Login Mode State
  const [mode, setMode] = useState<'coach' | 'client'>('coach');
  const [clientCode, setClientCode] = useState(['', '', '', '', '']);

  // Copy State for Rules
  const [copied, setCopied] = useState(false);

  const handleClientCodeChange = (index: number, value: string) => {
      if (value.length > 1) value = value.slice(0, 1);
      const newCode = [...clientCode];
      newCode[index] = value;
      setClientCode(newCode);

      // Auto-focus next input
      if (value && index < 4) {
          const nextInput = document.getElementById(`code-${index + 1}`);
          nextInput?.focus();
      }
  };

  const handleClientCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !clientCode[index] && index > 0) {
          const newCode = [...clientCode];
          newCode[index - 1] = '';
          setClientCode(newCode);
          const prevInput = document.getElementById(`code-${index - 1}`);
          prevInput?.focus();
      }
  };

  const handleClientLogin = () => {
      const code = clientCode.join('');
      if (code.length === 5) {
          loginWithCode(code);
      } else {
          alert("Please enter a valid 5-digit code.");
      }
  };

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

  const copyRules = () => {
      // Updated to Public Access for troubleshooting
      const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
      navigator.clipboard.writeText(rules);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              </div>
          </div>
      );
  }

  // Error Classification
  const isDomainError = error === 'AUTH_DOMAIN_ERROR' || (error && error.toLowerCase().includes("unauthorized-domain"));
  const isPermissionError = error === 'PERMISSION_DENIED';
  const isProviderError = error === 'AUTH_PROVIDER_MISSING';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-6">
      <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[40px] shadow-xl p-8 text-center animate-slideUp relative group">
         
         {/* Setup Gear */}
         <button 
            onClick={() => setShowSetup(true)} 
            className={`absolute top-6 right-6 p-2 rounded-full transition-all ${!isFirebaseConfigured ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600'}`}
            title="Configure Database"
         >
             <Settings size={20} />
         </button>

         {/* Logo Area */}
         <div className="w-20 h-20 bg-black dark:bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
            <span className="text-4xl">💪</span>
         </div>
         
         <h1 className="text-3xl font-black text-black dark:text-white mb-2 tracking-tight">FitwithRj</h1>
         <p className="text-gray-500 font-medium mb-8 text-sm">Personal Training Management</p>

         {/* Mode Switcher */}
         <div className="flex bg-gray-100 dark:bg-black/40 p-1.5 rounded-2xl mb-8">
             <button onClick={() => { setMode('coach'); clearError(); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'coach' ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400'}`}>
                 <ShieldCheck size={14}/> Coach
             </button>
             <button onClick={() => { setMode('client'); clearError(); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'client' ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-sm' : 'text-gray-400'}`}>
                 <User size={14}/> Client
             </button>
         </div>
         
         {/* Error Display */}
         {error && (
            <div className={`mb-6 p-4 rounded-2xl text-left animate-fadeIn flex items-start gap-3 border ${isDomainError ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/50' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50'}`}>
                <AlertTriangle className={`${isDomainError ? 'text-orange-500' : 'text-red-500'} shrink-0 mt-0.5`} size={18} />
                <div>
                    <h3 className={`text-sm font-bold mb-1 ${isDomainError ? 'text-orange-700 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isDomainError ? 'Domain Not Authorized' : 
                         isPermissionError ? 'Database Permissions Error' : 
                         isProviderError ? 'Sign-in Method Disabled' : 'Login Failed'}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isDomainError ? 'text-orange-600 dark:text-orange-300' : 'text-red-500 dark:text-red-300'}`}>
                        {isDomainError ? `Firebase blocks login from this domain (${window.location.hostname}) for security.` : 
                         isPermissionError ? "Your database rules are blocking access. See below to fix." : 
                         isProviderError ? "You must enable the 'Anonymous' or 'Google' sign-in provider in Firebase Console." : error}
                    </p>
                </div>
            </div>
         )}

         {/* Permission Fix Instructions */}
         {isPermissionError && (
             <div className="mb-6 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 text-left border border-gray-100 dark:border-white/10 animate-slideUp">
                 <p className="text-xs text-gray-500 mb-2 font-medium">1. Go to Firebase Console {'>'} Firestore Database {'>'} Rules.</p>
                 <p className="text-xs text-gray-500 mb-2 font-medium">2. Paste this rule to allow all access:</p>
                 
                 <div className="bg-black dark:bg-black/50 p-3 rounded-lg relative group border border-gray-200 dark:border-white/10">
                     <pre className="text-[10px] text-green-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                     </pre>
                     <button onClick={copyRules} className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition">
                         {copied ? <Check size={12}/> : <Copy size={12}/>}
                     </button>
                 </div>
                 <button onClick={clearError} className="w-full mt-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">Dismiss</button>
             </div>
         )}

         {mode === 'coach' ? (
             // --- COACH LOGIN ---
             <>
                {isDomainError ? (
                    <div className="animate-fadeIn space-y-3">
                        <button onClick={guestLogin} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2">
                            <span>Switch to Demo Mode</span>
                            <ArrowRight size={18} />
                        </button>
                        <p className="text-[10px] text-gray-400 pt-2">
                           To fix: Add <b>{window.location.hostname}</b> to Firebase Console {'>'} Auth {'>'} Settings {'>'} Authorized Domains.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 animate-fadeIn">
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
                                Database not configured.
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
                )}
             </>
         ) : (
             // --- CLIENT LOGIN (5 DIGIT CODE) ---
             <div className="space-y-6 animate-fadeIn">
                 <div className="text-left">
                     <label className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 block text-center">Enter Access Code</label>
                     <div className="flex justify-center gap-2 mb-6">
                         {clientCode.map((digit, idx) => (
                             <input 
                                key={idx}
                                id={`code-${idx}`}
                                type="text" 
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleClientCodeChange(idx, e.target.value)}
                                onKeyDown={(e) => handleClientCodeKeyDown(idx, e)}
                                className="w-12 h-14 bg-gray-100 dark:bg-white/5 rounded-xl text-center text-2xl font-black outline-none focus:ring-2 ring-blue-500 border border-transparent transition-all"
                             />
                         ))}
                     </div>
                 </div>

                 <button 
                     onClick={handleClientLogin}
                     disabled={loading || clientCode.join('').length !== 5}
                     className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100"
                 >
                     {loading ? <Loader2 className="animate-spin" /> : <Key size={18} />}
                     <span>Enter Client View</span>
                 </button>
                 
                 <p className="text-[10px] text-gray-400">
                     Ask your coach for your 5-digit access code.
                 </p>
             </div>
         )}
      </div>
    </div>
  );
};

export default LoginScreen;
