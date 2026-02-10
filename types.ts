

export type SessionStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';

export interface Session {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm format
  completed: boolean;
  status?: SessionStatus;
  // V4.0 Features - Feedback Loop
  intensity?: number; // 1-10 RPE (Rate of Perceived Exertion)
  feedback?: string;
}

export type PaymentFrequency = 'weekly' | 'monthly';

export interface PaymentPlan {
  enabled: boolean;
  frequency: PaymentFrequency;
  amount: number;
  count: number; // Duration: Number of payments
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

// --- New Structured Plan Types ---

export interface DietItem {
  id: string;
  food: string;
  portion: string;
  calories?: string;
  protein?: string; // New: Protein in grams
  carbs?: string;   // New: Carbs in grams
  fats?: string;    // New: Fats in grams
}

export interface DietMeal {
  id: string;
  name: string; // e.g., "Breakfast", "Snack"
  time?: string;
  items: DietItem[];
  notes?: string; // New: Preparation instructions or notes
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest?: string; // New: Rest time (e.g., "60s")
  rpe?: string;  // New: Target RPE (e.g., "8")
  notes?: string;
  equipmentNeeded?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g., "Monday", "Push Day"
  exercises: WorkoutExercise[];
  notes?: string; // New: Warm-up or day-specific notes
}

export interface PlanTemplate {
  id: string;
  name: string;
  type: 'diet' | 'workout';
  data: DietMeal[] | WorkoutDay[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  defaultTimeSlot: string;
  totalFee: number;
  paidAmount: number;
  paymentPlan?: PaymentPlan;
  sessions: Session[];
  notes: string;
  // V3.0 Features - Legacy string support + New Structures
  dietPlan?: string | DietMeal[]; 
  workoutRoutine?: string | WorkoutDay[];
  weightHistory?: WeightEntry[];
  createdAt: string;
}

export interface BusinessStats {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  outstandingRevenue: number;
  upcomingSessions: number;
}

export enum NavPage {
  DASHBOARD = 'DASHBOARD',
  CLIENTS = 'CLIENTS',
  ADD_CLIENT = 'ADD_CLIENT',
  PLANS = 'PLANS',
  SCHEDULE = 'SCHEDULE',
  SETTINGS = 'SETTINGS',
}

export type BusinessInsight = {
  text: string;
  timestamp: number;
};