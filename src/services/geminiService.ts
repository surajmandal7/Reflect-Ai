import { GoogleGenAI } from '@google/genai';
import { AIMode, DailyPrompt, InsightReport } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface ChatMessageParam {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export interface StreamChatParams {
  messages: ChatMessageParam[];
  mode: AIMode;
  contextText?: string;
  onChunk: (chunk: string) => void;
  onDone: (modelUsed?: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamGeminiChat({
  messages,
  mode,
  contextText,
  onChunk,
  onDone,
  onError,
  signal,
}: StreamChatParams): Promise<void> {
  try {
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const response = await ai.models.generateContentStream({
      model: 'gemini-1.5-flash',
      contents: contextText ? `Context: ${contextText}\n\n${prompt}` : prompt,
    });

    for await (const chunk of response) {
      if (signal?.aborted) break;
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
    onDone('gemini-1.5-flash');
  } catch (error: any) {
    if (signal?.aborted) {
      onDone();
      return;
    }
    onError(error?.message || 'Failed to connect to Gemini AI.');
  }
}

export async function requestJournalAction(params: {
  actionType: 'summarize' | 'reflect' | 'brainstorm' | 'find_themes' | 'action_plan';
  entryTitle: string;
  entryContent: string;
  additionalContext?: string;
}): Promise<{ result: string; extractedGoal?: { goalTitle: string; tasks: string[] }; modelUsed?: string }> {
  const prompt = `Action: ${params.actionType}\nTitle: ${params.entryTitle}\nContent: ${params.entryContent}`;
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
  });
  return { result: response.text || '', modelUsed: 'gemini-1.5-flash' };
}

export async function requestPeriodicInsights(params: {
  periodType: 'weekly' | 'monthly';
  periodLabel: string;
  entries: { title: string; content: string; date?: string }[];
}): Promise<Omit<InsightReport, 'id' | 'userId' | 'createdAt'>> {
  const prompt = `Generate ${params.periodType} insight report for entries: ${JSON.stringify(params.entries)}`;
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
  });
  return {
    periodType: params.periodType,
    periodLabel: params.periodLabel,
    summary: response.text || '',
    keyThemes: [],
    growthAreas: [],
    recommendedAction: '',
  };
}

export async function requestDailyPrompt(): Promise<DailyPrompt> {
  return {
    prompt: 'What was the most meaningful lesson or realization you had today?',
    category: 'Growth',
    hint: 'Reflect on how this shapes your perspective moving forward.',
  };
}

export async function extractGoalsFromText(text: string): Promise<{
  goals: { title: string; description?: string; tasks: string[] }[];
}> {
  return { goals: [] };
}
