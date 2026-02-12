import React, { createContext, useContext, useState } from "react";

// Mock User Types
export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always logged in as Coach for personal use by default
  const [user, setUser] = useState<User | null>({ 
      uid: 'local-coach', 
      displayName: 'Coach', 
      email: 'coach@local',
      photoURL: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = async () => {
      setLoading(true);
      setTimeout(() => {
          setUser({ 
              uid: 'local-coach', 
              displayName: 'Coach', 
              email: 'coach@local',
              photoURL: '' 
          });
          setLoading(false);
      }, 500);
  };

  const loginWithCode = async (code: string) => {
      setLoading(true);
      setTimeout(() => {
          if (code.length === 5) {
              // Mock success for any 5 digit code
              setUser({
                  uid: 'client-user',
                  displayName: 'Client User',
                  email: 'client@local',
                  photoURL: ''
              });
              setError(null);
          } else {
              setError("Invalid code");
          }
          setLoading(false);
      }, 500);
  };

  const guestLogin = async () => {
      setLoading(true);
      setTimeout(() => {
          setUser({ 
              uid: 'guest-coach', 
              displayName: 'Guest Coach', 
              email: 'guest@local',
              photoURL: '' 
          });
          setLoading(false);
      }, 500);
  };

  const logout = async () => {
      setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        error,
        login, 
        loginWithCode,
        guestLogin,
        logout,
        clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
