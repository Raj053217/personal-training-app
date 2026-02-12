
import { Client, PlanTemplate, FoodItem } from '../types';

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
  return loadClients();
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
