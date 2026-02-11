
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getCoachIdForClient } from "../services/storage";

export type UserRole = 'admin' | 'client';

// The specific email granted Admin access
const ADMIN_EMAIL = "rawatrajendra669414@gmail.com";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  coachId: string | null; // If role is client, this is their coach's ID
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  guestLogin: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('client'); // Default to client for safety
  const [coachId, setCoachId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
        // Check for persisted demo user
        const demoUser = localStorage.getItem('demo_auth_user');
        if (demoUser) {
            setUser(JSON.parse(demoUser));
            setRole('admin'); // Demo user is always admin
        }
        setLoading(false);
        return;
    }

    if (!auth) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
          const userEmail = currentUser.email ? currentUser.email.toLowerCase().trim() : '';

          // 1. Strict Admin Check
          if (userEmail === ADMIN_EMAIL.toLowerCase().trim()) {
              setRole('admin');
              setCoachId(currentUser.uid);
          } 
          // 2. Everyone else is treated as a Client
          else {
              // Try to find if they are mapped to a coach
              const mappedCoachId = await getCoachIdForClient(userEmail);
              
              setRole('client');
              if (mappedCoachId) {
                  setCoachId(mappedCoachId);
              } else {
                  // If they aren't the admin and aren't mapped, they are a client with no data yet.
                  // The App.tsx will handle the "Profile not found" logic.
                  setCoachId(null);
              }
          }
          setUser(currentUser);
      } else {
          setUser(null);
          setRole('client');
          setCoachId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    setError(null);
    // 1. Handle Demo Mode (No API Keys)
    if (!isFirebaseConfigured) {
        guestLogin();
        return;
    }

    // 2. Handle Real Firebase Auth
    if (!auth || !googleProvider) {
        setError("Firebase configuration is invalid. Please check settings.");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed", err);
      // Robust check for domain error (code or message)
      if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('auth/unauthorized-domain'))) {
          const domain = window.location.hostname;
          setError(`Domain Unauthorized: ${domain}\n\nTo fix this:\n1. Go to Firebase Console > Authentication > Settings > Authorized Domains\n2. Add "${domain}" to the list.\n\nOr use Demo Mode to continue.`);
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // User closed the popup, no error needed
      } else {
          setError(err.message || "Login failed due to an unknown error.");
      }
    }
  };

  const guestLogin = () => {
      const demoUser: any = {
            uid: "demo-user-123",
            displayName: "Guest Coach",
            email: "guest@fitwithrj.com",
            photoURL: "https://ui-avatars.com/api/?name=Guest+Coach&background=007AFF&color=fff",
            emailVerified: true
      };
      localStorage.setItem('demo_auth_user', JSON.stringify(demoUser));
      setUser(demoUser);
      setRole('admin');
      setError(null);
  };

  const logout = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
        localStorage.removeItem('demo_auth_user');
        setUser(null);
        return;
    }
    if(auth) await signOut(auth);
  };
  
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, role, coachId, error, login, logout, guestLogin, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
