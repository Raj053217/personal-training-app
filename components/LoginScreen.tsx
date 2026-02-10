
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login, guestLogin, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-black p-6">
      <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[40px] shadow-xl p-8 text-center animate-slideUp">
         <div className="w-20 h-20 bg-black dark:bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg transform rotate-3">
            <span className="text-4xl">💪</span>
         </div>
         
         <h1 className="text-3xl font-black text-black dark:text-white mb-2 tracking-tight">FitwithRj</h1>
         <p className="text-gray-500 font-medium mb-8 text-sm">Personal Training Management</p>
         
         <div className="space-y-3">
             <button 
                onClick={login}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
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
         
         <p className="mt-8 text-[10px] text-gray-400">
            Clients: Log in with the email linked to your profile to access your plan.
         </p>
      </div>
    </div>
  );
};

export default LoginScreen;
