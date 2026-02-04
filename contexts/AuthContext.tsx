import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    // 1. Handle Demo Mode (No API Keys)
    if (!isFirebaseConfigured) {
        const demoUser: any = {
            uid: "demo-user-123",
            displayName: "Demo User",
            email: "demo@fitwithrj.com",
            photoURL: "https://ui-avatars.com/api/?name=Demo+User&background=007AFF&color=fff",
            emailVerified: true
        };
        localStorage.setItem('demo_auth_user', JSON.stringify(demoUser));
        setUser(demoUser);
        alert("Demo Mode: Firebase is not configured with a real API key yet. You are logged in as a Demo User. Data will save locally but will not sync to the cloud.");
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

  const logout = async () => {
    if (!isFirebaseConfigured) {
        localStorage.removeItem('demo_auth_user');
        setUser(null);
        return;
    }
    if(auth) await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};