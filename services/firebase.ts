import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: REPLACE THIS WITH YOUR OWN FIREBASE CONFIG FROM THE FIREBASE CONSOLE
// 1. Go to console.firebase.google.com
// 2. Create a new project
// 3. Add a Web App
// 4. Copy the config object below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Check if the user has actually configured the keys
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase
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

export { auth, db, googleProvider, isFirebaseConfigured };