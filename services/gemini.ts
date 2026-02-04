import { GoogleGenAI } from "@google/genai";
import { Client } from '../types';

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

export const generateBusinessInsight = async (clients: Client[]): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "Please configure your API Key to receive business insights.";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = getAnonymousStats(clients);
    
    const prompt = `
      Act as a high-performance business coach for a Personal Trainer.
      Here are the current business stats:
      - Active Clients: ${stats.activeClients}
      - Total Revenue (Lifetime): $${stats.totalRevenue}
      - Outstanding/Due Fees: $${stats.outstanding}
      - Total Sessions Booked: ${stats.totalSessions}

      Provide a short, motivating, and strategic paragraph (max 100 words) on how to improve this business. 
      Focus on either client retention, collecting fees, or filling the schedule based on the numbers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI service. Please check your connection.";
  }
};

export const generateClientNoteSummary = async (notes: string): Promise<string> => {
    try {
        if (!process.env.API_KEY) return "API Key missing.";
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
