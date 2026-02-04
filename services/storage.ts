import { Client } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

const STORAGE_KEY = 'pt_manage_pro_data';

// --- Local Storage (Offline/Guest) ---

export const saveClients = (clients: Client[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  } catch (e) {
    console.error("Failed to save data locally", e);
  }
};

export const loadClients = (): Client[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load data locally", e);
  }
  return [];
};

export const getInitialData = (): Client[] => {
  const existing = loadClients();
  if (existing.length > 0) return existing;
  return [];
};

// --- Cloud Storage (Firestore) ---

export const saveClientsToCloud = async (userId: string, clients: Client[]) => {
    if (!db) return;
    try {
        await setDoc(doc(db, "users", userId), {
            clients: clients,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        console.log("Synced to cloud");
    } catch (e) {
        console.error("Failed to sync to cloud", e);
    }
};

export const loadClientsFromCloud = async (userId: string): Promise<Client[] | null> => {
    if (!db) return null;
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data().clients as Client[];
        }
    } catch (e) {
        console.error("Failed to load from cloud", e);
    }
    return null;
};
