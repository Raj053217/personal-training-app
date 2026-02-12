
// Offline Mode - Firebase Disabled
export const auth = null;
export const db = null;
export const googleProvider = null;
export const isFirebaseConfigured = false;

export const configureFirebase = (config: any) => {
    // Mock implementation that accepts config
    console.log("Firebase configured with", config);
};
export const clearFirebaseConfig = () => {};
