
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Helper to get config from local storage
const getStoredConfig = () => {
    try {
        const stored = localStorage.getItem('firebase_config');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("Failed to parse stored firebase config", e);
    }
    return null;
};

// Default configuration provided by user
const envConfig = {
  apiKey: "AIzaSyAZZk1tIqA3x1k3F0MehC4sqK7ne4ciE-Y",
  authDomain: "gen-lang-client-0731055714.firebaseapp.com",
  projectId: "gen-lang-client-0731055714",
  storageBucket: "gen-lang-client-0731055714.firebasestorage.app",
  messagingSenderId: "446871761352",
  appId: "1:446871761352:web:83aba80e661e762ad150fd",
  measurementId: "G-VBMR92HGBK"
};

// Determine active config
const firebaseConfig = getStoredConfig() || envConfig;

// Check if configured (not using placeholder)
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && !!firebaseConfig.apiKey;

let app;
let auth;
let db;
let googleProvider;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
    } catch (error) {
        console.warn("Firebase initialization error:", error);
    }
} else {
    console.log("Firebase not configured. App running in Offline/Demo mode.");
}

// Configuration helpers
export const configureFirebase = (config: any) => {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    window.location.reload();
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem('firebase_config');
    window.location.reload();
};

export { auth, db, googleProvider, isFirebaseConfigured };
