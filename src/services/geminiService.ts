import { AIMode, DailyPrompt, InsightReport } from '../types';

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
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        mode,
        contextText,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.text) {
            onChunk(parsed.text);
          }
          if (parsed.done) {
            onDone(parsed.model);
            return;
          }
        } catch (e) {
          // JSON parse skip
        }
      }
    }

    onDone();
  } catch (error: any) {
    if (signal?.aborted) {
      onDone();
      return;
    }
    onError(error?.message || 'Failed to connect to Gemini reflection server.');
  }
}

export async function requestJournalAction(params: {
  actionType: 'summarize' | 'reflect' | 'brainstorm' | 'find_themes' | 'action_plan';
  entryTitle: string;
  entryContent: string;
  additionalContext?: string;
}): Promise<{ result: string; extractedGoal?: { goalTitle: string; tasks: string[] }; modelUsed?: string }> {
  const response = await fetch('/api/gemini/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to perform journal action.');
  }

  return response.json();
}

export async function requestPeriodicInsights(params: {
  periodType: 'weekly' | 'monthly';
  periodLabel: string;
  entries: { title: string; content: string; date?: string }[];
}): Promise<Omit<InsightReport, 'id' | 'userId' | 'createdAt'>> {
  const response = await fetch('/api/gemini/insights/periodic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate periodic reflection.');
  }

  return response.json();
}

export async function requestDailyPrompt(params?: {
  recentThemes?: string[];
  mood?: string;
}): Promise<DailyPrompt> {
  try {
    const response = await fetch('/api/gemini/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch prompt');
    }

    return response.json();
  } catch (e) {
    return {
      prompt: 'What was the most meaningful lesson or realization you had today?',
      category: 'Growth',
      hint: 'Reflect on how this shapes your perspective moving forward.',
    };
  }
}

export async function extractGoalsFromText(text: string): Promise<{
  goals: { title: string; description?: string; tasks: string[] }[];
}> {
  const response = await fetch('/api/gemini/goals/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to extract goals');
  }

  return response.json();
}
