
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertTriangle, ArrowRight, Lock, Dumbbell } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { loginWithCode, loading, error, clearError } = useAuth();
  const [accessCode, setAccessCode] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (accessCode.trim().length === 0) return;
      loginWithCode(accessCode.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      
      {/* Glass Card */}
      <div className="w-full max-w-md mx-4 bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl relative z-10 animate-scaleIn">
         
         {/* Header Section */}
         <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-red-600/30 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <Dumbbell className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">FitwithRj</h1>
            <p className="text-red-200/60 font-medium tracking-wide">ELITE PERSONAL TRAINING</p>
         </div>

         {/* Error Display */}
         {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-shake backdrop-blur-sm">
                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                <p className="text-sm font-medium text-red-200">{error}</p>
            </div>
         )}

         {/* Login Form */}
         <form onSubmit={handleLogin} className="space-y-6">
             <div className="space-y-2">
                 <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Access Code</label>
                 <div className="relative group">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-500 transition-colors">
                         <Lock size={20} />
                     </div>
                     <input 
                        type="password"
                        value={accessCode}
                        onChange={(e) => { setAccessCode(e.target.value); clearError(); }}
                        placeholder="Enter your code"
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 text-white placeholder-zinc-600 pl-12 pr-4 py-4 rounded-2xl outline-none transition-all focus:bg-black/60 focus:ring-4 focus:ring-red-500/10 font-medium tracking-wide text-lg"
                        autoFocus
                     />
                 </div>
             </div>

             <button 
                 type="submit"
                 disabled={loading || !accessCode.trim()}
                 className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
             >
                 {loading ? <Loader2 className="animate-spin" size={22} /> : (
                    <>
                        <span>ENTER</span>
                        <ArrowRight size={20} className="opacity-80" />
                    </>
                 )}
             </button>
         </form>

         {/* Footer */}
         <div className="mt-8 text-center">
             <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                 Protected Area • Authorized Personnel Only
             </p>
         </div>
      </div>
    </div>
  );
};

export default LoginScreen;
