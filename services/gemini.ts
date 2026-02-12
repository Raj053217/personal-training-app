
import { Client } from '../types';

interface ScheduleContext {
  utilizationRate: number;
  morningOpenings: number;
  eveningOpenings: number;
  busiestDay: string;
  freeHoursNext7Days: number;
  avgSessionDuration: number;
}

// AI Services have been disabled as per request.
// These functions are kept as stubs to prevent import errors in the rest of the app.

export const generateBusinessInsight = async (clients: Client[], scheduleContext?: ScheduleContext): Promise<string> => {
  return "AI insights are disabled.";
};

export const generateClientNoteSummary = async (notes: string): Promise<string> => {
  return "Note summarization is disabled.";
}
