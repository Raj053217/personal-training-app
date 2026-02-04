export type SessionStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';

export interface Session {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm format
  completed: boolean;
  status?: SessionStatus;
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
  sessions: Session[];
  notes: string;
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
  SCHEDULE = 'SCHEDULE',
  SETTINGS = 'SETTINGS',
}

export type BusinessInsight = {
  text: string;
  timestamp: number;
};