
import { Client, PlanTemplate, FoodItem } from '../types';
import { db } from './firebase';
import { doc, setDoc, getDoc } from "firebase/firestore";

const STORAGE_KEY = 'pt_manage_pro_data';
const TEMPLATE_KEY = 'pt_manage_pro_templates';
const FOOD_LIBRARY_KEY = 'pt_manage_pro_food_library';

// --- Local Storage (Clients) ---

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

// --- Local Storage (Templates) ---

export const saveTemplates = (templates: PlanTemplate[]) => {
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to save templates", e);
  }
};

export const loadTemplates = (): PlanTemplate[] => {
  try {
    const data = localStorage.getItem(TEMPLATE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load templates", e);
  }
  return [];
};

// --- Local Storage (Food Library) ---

export const saveFoodLibrary = (foods: FoodItem[]) => {
  try {
    localStorage.setItem(FOOD_LIBRARY_KEY, JSON.stringify(foods));
  } catch (e) {
    console.error("Failed to save food library", e);
  }
};

export const loadFoodLibrary = (): FoodItem[] => {
  try {
    const data = localStorage.getItem(FOOD_LIBRARY_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load food library", e);
  }
  return [];
};

// --- Cloud Storage (Firestore) ---

// Helper: Save email->coach mapping so clients can login
export const saveClientMapping = async (email: string, coachId: string) => {
  if (!db || !email) return;
  try {
      // Use email as doc ID for easy lookup (lowercase to normalize)
      await setDoc(doc(db, "client_mappings", email.toLowerCase().trim()), {
          coachId: coachId,
          email: email.toLowerCase().trim()
      });
  } catch (e) {
      console.error("Failed to save mapping", e);
  }
};

// Helper: Check if a logged in user is a client of someone
export const getCoachIdForClient = async (email: string): Promise<string | null> => {
    if (!db || !email) return null;
    try {
        const docSnap = await getDoc(doc(db, "client_mappings", email.toLowerCase().trim()));
        if (docSnap.exists()) {
            return docSnap.data().coachId;
        }
    } catch (e) {
        console.error("Failed to lookup client mapping", e);
    }
    return null;
}

// Admin: Saves ALL clients
export const saveClientsToCloud = async (userId: string, clients: Client[]) => {
    if (!db) return;
    try {
        await setDoc(doc(db, "users", userId), {
            clients: clients,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        // Update mappings
        clients.forEach(c => {
            if (c.email) {
                saveClientMapping(c.email, userId);
            }
        });
        console.log("Synced to cloud");
    } catch (e) {
        console.error("Failed to sync to cloud", e);
    }
};

// Client: Updates ONLY their own record safely
export const updateClientInCloud = async (coachId: string, updatedClient: Client) => {
    if (!db) return;
    try {
        const docRef = doc(db, "users", coachId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const clients = data.clients as Client[];
            // Find and replace the specific client
            const newClients = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
            
            await setDoc(docRef, { clients: newClients }, { merge: true });
            console.log("Client updated safely in cloud");
        }
    } catch (e) {
        console.error("Failed to update single client", e);
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
