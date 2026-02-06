
import { GoogleGenAI } from "@google/genai";
import { Client } from '../types';

interface ScheduleContext {
  utilizationRate: number;
  morningOpenings: number;
  eveningOpenings: number;
  busiestDay: string;
  freeHoursNext7Days: number;
  avgSessionDuration: number;
}

// Helper to calculate anonymous stats to send to AI
const getAnonymousStats = (clients: Client[]) => {
  const now = new Date();
  const activeClients = clients.filter(c => new Date(c.expiryDate) >= now).length;
  const totalRevenue = clients.reduce((acc, c) => acc + c.totalFee, 0);
  const outstanding = clients.reduce((acc, c) => acc + (c.totalFee - c.paidAmount), 0);
  const totalSessions = clients.reduce((acc, c) => acc + c.sessions.length, 0);
  
  return {
    activeClients,
    totalRevenue,
    outstanding,
    totalSessions,
    clientCount: clients.length
  };
};

/**
 * Generates high-level business insights based on client data and scheduling context.
 * Uses gemini-3-pro-preview as this involves complex reasoning and analysis.
 */
export const generateBusinessInsight = async (clients: Client[], scheduleContext?: ScheduleContext): Promise<string> => {
  try {
    // Initialization using aistudio guidelines: named parameter and environment variable
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = getAnonymousStats(clients);
    
    let prompt = `
      Act as an expert Personal Training Business & Productivity Coach.
      Analyze the following business data and provide specific, actionable advice (max 120 words).

      FINANCIAL HEALTH:
      - Active Clients: ${stats.activeClients}
      - Total Revenue: $${stats.totalRevenue}
      - Outstanding Fees: $${stats.outstanding}
    `;

    if (scheduleContext) {
      prompt += `
      
      SCHEDULE & CAPACITY (Next 7 Days):
      - Weekly Utilization: ${scheduleContext.utilizationRate}% full.
      - Total Free Hours: ${scheduleContext.freeHoursNext7Days.toFixed(1)} hours available.
      - Morning Gaps (Slots): ${scheduleContext.morningOpenings} available.
      - Evening Gaps (Slots): ${scheduleContext.eveningOpenings} available.
      - Busiest Day: ${scheduleContext.busiestDay}.
      - Avg Session Length: ${scheduleContext.avgSessionDuration} mins.

      CRITICAL TASK:
      Based on the SCHEDULE data, tell me exactly:
      1. How many more clients I can realistically take on right now?
      2. Suggestions on how to structure the timing (e.g., "Focus on filling Mon/Wed mornings").
      3. If utilization is high (>80%), suggest a price increase or group sessions.
      4. If utilization is low (<40%), suggest a specific promo based on the time of day (Morning/Evening) that is empty.
      `;
    } else {
      prompt += `
      Focus on general retention and revenue collection strategies.
      `;
    }

    // Using gemini-3-pro-preview for complex reasoning task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    // Accessing .text property directly as per guidelines
    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service. Please check your connection.";
  }
};

/**
 * Summarizes client notes into key points.
 * Uses gemini-3-flash-preview as summarization is a basic text task.
 */
export const generateClientNoteSummary = async (notes: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `Summarize these personal training client notes into 3 key bullet points for quick review before a session:\n\n${notes}`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "No summary available.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Error summarizing notes.";
    }
}
