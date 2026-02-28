
import { GoogleGenAI } from "@google/genai";
import { Client } from '../types';

interface ScheduleContext {
  utilizationRate?: number;
  morningOpenings?: number;
  eveningOpenings?: number;
  busiestDay?: string;
  freeHoursNext7Days?: number;
  avgSessionDuration?: number;
}

export const generateBusinessInsight = async (clients: Client[], currency: string = '$'): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 1. Prepare Data Summary
    const now = new Date();
    const activeClients = clients.filter(c => new Date(c.expiryDate) >= now).length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const expiringSoon = clients.filter(c => {
        const expiry = new Date(c.expiryDate);
        const diff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 7;
    }).length;
    const totalSessions = clients.reduce((sum, c) => sum + c.sessions.length, 0);
    const completedSessions = clients.reduce((sum, c) => sum + c.sessions.filter(s => s.completed || s.status === 'completed').length, 0);
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // 2. Construct Prompt
    const prompt = `
      You are an expert fitness business consultant for a Personal Trainer app. Analyze this anonymous business data:
      
      - Total Clients: ${clients.length}
      - Active Clients: ${activeClients}
      - Clients Expiring in 7 days: ${expiringSoon}
      - Total Revenue: ${currency}${totalRevenue}
      - Session Completion Rate: ${completionRate}%
      
      Provide exactly 3 short, high-impact, actionable tips (bullet points) to help the trainer grow their business, improve retention, or increase revenue based on these specific numbers.
      Format plain text with emojis. Be encouraging but direct. Do not include introductory text.
    `;

    // 3. Call API
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No insights generated.";

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "AI service is currently unavailable. Please check your API key configuration.";
  }
};

export const generateClientNoteSummary = async (notes: string): Promise<string> => {
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Summarize these client notes into 3 key health/fitness bullet points:\n${notes}`,
      });
      return response.text || "";
  } catch (e) {
      return "";
  }
}
