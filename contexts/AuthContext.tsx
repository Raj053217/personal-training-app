
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getCoachIdForClient } from "../services/storage";

export type UserRole = 'admin' | 'client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  coachId: string | null; // If role is client, this is their coach's ID
  login: () => Promise<void>;
  logout: () => Promise<void>;
  guestLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('admin');
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
        // Check for persisted demo user
        const demoUser = localStorage.getItem('demo_auth_user');
        if (demoUser) {
            setUser(JSON.parse(demoUser));
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
          // Check if this user is a client mapping
          if (currentUser.email) {
              const mappedCoachId = await getCoachIdForClient(currentUser.email);
              if (mappedCoachId) {
                  setRole('client');
                  setCoachId(mappedCoachId);
              } else {
                  setRole('admin');
                  setCoachId(currentUser.uid);
              }
          }
          setUser(currentUser);
      } else {
          setUser(null);
          setRole('admin');
          setCoachId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    // 1. Handle Demo Mode (No API Keys)
    if (!isFirebaseConfigured) {
        guestLogin();
        return;
    }

    // 2. Handle Real Firebase Auth
    if (!auth || !googleProvider) {
        alert("Firebase config missing in services/firebase.ts");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Check console for details.");
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
  };

  const logout = async () => {
    if (!isFirebaseConfigured) {
        localStorage.removeItem('demo_auth_user');
        setUser(null);
        return;
    }
    if(auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, coachId, login, logout, guestLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
