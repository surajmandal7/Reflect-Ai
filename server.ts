import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Mandatory Top-Level Middleware (Body Parsers before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY is not set in environment.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIClient;
}

// 2. Resilient Model Fallback Ladder
const MODEL_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Helper: Strip undefined recursively from payloads
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Helper: Run generation across the fallback ladder
async function generateContentWithFallback(
  params: {
    systemInstruction?: string;
    contents: any;
    config?: any;
  }
) {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          ...params.config,
        },
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      console.warn(`Model ${model} failed: ${err?.message || err}. Trying next fallback...`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || lastError}`);
}

// AI Mode System Prompts
function getSystemPromptForMode(mode: string, contextSummary?: string): string {
  const baseRules = `You are ReflectAI, an empathetic, intellectually rigorous, and gentle personal reflection companion.
Your purpose is to help the user explore their thoughts, understand patterns in their life, and convert reflection into clarity and action.
IMPORTANT GUIDELINES:
1. You are a reflection partner, NOT a therapist, psychiatrist, or medical doctor. Never offer clinical diagnoses or medical advice.
2. Use respectful, thoughtful phrasing such as "I noticed...", "You might be feeling...", "One pattern that stands out is...".
3. Maintain high emotional intelligence, active listening, and calm warmth.
4. Keep formatting clean, elegant, and readable. Use Markdown headings, bullet points, and bold text. When constructing action plans or structured advice, use distinctive section headings like:
   - "### 🎯 Goal" for primary objectives
   - "### 🚀 Phases" for milestones/phases
   - "### ✅ Action Steps" for concrete tasks
   - "### ✨ Next Step" for the immediate next action`;

  const contextAddendum = contextSummary
    ? `\n\nUSER'S AUTHORIZED CONTEXT FOR THIS SESSION:\n"""\n${contextSummary}\n"""\nUse this context respectfully to inform your reflections.`
    : '';

  switch (mode) {
    case 'summarize':
      return `${baseRules}\nMODE: SUMMARIZE.\nProvide a clear, structured summary of the user's reflection. Format cleanly with:\n- ### 💡 Core Themes\n- ### 🌿 Emotional Reflections\n- ### ✨ Key Takeaways${contextAddendum}`;
    case 'brainstorm':
      return `${baseRules}\nMODE: BRAINSTORM.\nHelp the user expand possibilities! Offer 4-6 diverse, creative perspectives, unexpected angles, and potential avenues to explore with clean headings and bullet points.${contextAddendum}`;
    case 'challenge':
      return `${baseRules}\nMODE: CHALLENGE ME.\nAct as a kind, constructive devil's advocate. Gently question unexamined assumptions, highlight cognitive blind spots or binary thinking, and invite the user to look at situations from the opposite perspective.\nInclude: ### 🔍 Questions to Consider and ### 🛡️ Blind Spots to Examine.${contextAddendum}`;
    case 'action_plan':
      return `${baseRules}\nMODE: ACTION PLAN.\nTranslate the user's thoughts and aspirations into a concrete, prioritized roadmap.\nFormat with clear sections:\n### 🎯 Goal\n[Clear, empowering goal statement]\n\n### 🚀 Phases\n[Phase 1, Phase 2 roadmap breakdown]\n\n### ✅ Action Steps\n- [ ] Concrete step 1\n- [ ] Concrete step 2\n- [ ] Concrete step 3\n\n### ✨ Next Step\n[Single immediate, low-friction next action for today]${contextAddendum}`;
    case 'coach':
      return `${baseRules}\nMODE: COACH.\nUse the Socratic method. Rather than giving instant answers, ask 2-3 deep, clarifying questions that guide the user to unlock their own answers and self-realization.${contextAddendum}`;
    case 'find_patterns':
      return `${baseRules}\nMODE: FIND PATTERNS.\nCarefully analyze recurring topics, emotional trajectories, recurring dilemmas, and personal growth markers across the user's writing with structured takeaway cards.${contextAddendum}`;
    case 'reflect':
    default:
      return `${baseRules}\nMODE: REFLECT.\nProvide thoughtful, mindful reflection on the user's words. Validate their feelings, synthesize underlying motivations, and offer gentle food for thought with clear spacing.${contextAddendum}`;
  }
}

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Multi-Turn Gemini Chat (Streaming & Non-Streaming)
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const { messages = [], mode = 'reflect', contextText = '', stream = false } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and must not be empty.' });
    }

    const systemInstruction = getSystemPromptForMode(mode, contextText);

    // Format messages for @google/genai
    // Transform role 'model'/'assistant' -> 'model', 'user' -> 'user'
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    if (stream) {
      // SSE Streaming support
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const ai = getGenAI();
      let streamSuccess = false;

      for (const model of MODEL_LADDER) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              res.write(`data: ${JSON.stringify({ text: chunkText, model })}\n\n`);
            }
          }

          res.write(`data: ${JSON.stringify({ done: true, model })}\n\n`);
          res.end();
          streamSuccess = true;
          break;
        } catch (streamErr: any) {
          console.warn(`Streaming failed on model ${model}: ${streamErr?.message}`);
        }
      }

      if (!streamSuccess) {
        res.write(`data: ${JSON.stringify({ error: 'All streaming models failed. Please try again.' })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming fallback
    const result = await generateContentWithFallback({
      systemInstruction,
      contents,
      config: { temperature: 0.7 },
    });

    const replyText = result.response.text || 'I have reflected on your thoughts.';
    return res.json({
      text: replyText,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: 'An error occurred while generating AI response. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// 2. Journal Quick Action Endpoint (Summarize, Reflect, Brainstorm, Action Plan, Themes)
app.post('/api/gemini/action', async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const { actionType = 'reflect', entryTitle = '', entryContent = '', additionalContext = '' } = payload;

    if (!entryContent && !entryTitle) {
      return res.status(400).json({ error: 'Entry content is required.' });
    }

    let prompt = '';
    let systemInstruction = `You are ReflectAI, an expert mindful personal reflection assistant. Output high-quality markdown response formatted for direct display.`;

    if (actionType === 'summarize') {
      systemInstruction += `\nCreate a clear, concise summary with:
### 💡 Core Themes
### 🌿 Key Takeaways`;
      prompt = `Please provide a thoughtful, elegant summary of this journal entry:\n\nTitle: ${entryTitle}\nContent:\n${entryContent}`;
    } else if (actionType === 'action_plan') {
      systemInstruction += `\nExtract actionable goals and concrete subtasks from this reflection.
Structure your visible markdown with clean, beautiful sections:
### 🎯 Goal
[Clear statement of the primary goal]

### 🚀 Phases
[Phase 1, Phase 2 milestones]

### ✅ Action Steps
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### ✨ Next Step
[Immediate next single focus for today]

Also provide a machine-readable JSON block at the end with structure:
\`\`\`json
{
  "goalTitle": "Primary goal title",
  "tasks": ["Task 1", "Task 2", "Task 3"]
}
\`\`\``;
      prompt = `Convert the following personal reflection into a clear, structured action plan with immediate and secondary next steps:\n\nTitle: ${entryTitle}\nContent:\n${entryContent}`;
    } else if (actionType === 'find_themes') {
      systemInstruction += `\nIdentify key psychological, lifestyle, career, or emotional themes with bullet points. Also return 3-5 tags.`;
      prompt = `Analyze this reflection and identify recurring themes, dominant emotions, and key values expressed:\n\nTitle: ${entryTitle}\nContent:\n${entryContent}`;
    } else if (actionType === 'brainstorm') {
      systemInstruction += `\nBrainstorm fresh perspectives, creative possibilities, and paths forward with structured headings and bullet points.`;
      prompt = `Brainstorm creative ideas and alternate paths based on this reflection:\n\nTitle: ${entryTitle}\nContent:\n${entryContent}`;
    } else {
      systemInstruction += `\nReflect empathetically on the entry with thoughtful sections and paragraphs.`;
      prompt = `Please reflect deeply on what I wrote:\n\nTitle: ${entryTitle}\nContent:\n${entryContent}`;
    }

    if (additionalContext) {
      prompt += `\n\nAdditional Historical Context:\n${additionalContext}`;
    }

    const result = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7 },
    });

    const responseText = result.response.text || '';

    // Extract JSON if present for action plan
    let extractedGoal: any = null;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        extractedGoal = JSON.parse(jsonMatch[1]);
      } catch (e) {
        // Ignored
      }
    }

    return res.json({
      result: responseText,
      extractedGoal,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Action endpoint error:', error);
    return res.status(500).json({ error: 'Failed to process journal action. Please try again.' });
  }
});

// 3. Periodic Insights Generator (Weekly / Monthly Reflection)
app.post('/api/gemini/insights/periodic', async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const { periodType = 'weekly', periodLabel = 'This Week', entries = [] } = payload;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one journal entry is required to generate periodic insights.' });
    }

    const compiledEntries = entries
      .slice(0, 30)
      .map((e: any, idx: number) => `Entry #${idx + 1} (${e.date || 'Recent'})\nTitle: ${e.title}\nContent: ${e.content}\n---`)
      .join('\n\n');

    const systemInstruction = `You are ReflectAI's deep reflection analyst.
Analyze the user's journal entries from the ${periodType} period (${periodLabel}) and construct a comprehensive, thoughtful review.
Strict Guidelines:
- Non-diagnostic language only ("I noticed...", "A noticeable theme is...").
- Be encouraging, balanced, and insightful.
- Output a valid JSON response matching this schema:
{
  "title": "${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Reflection: ${periodLabel}",
  "summary": "2-3 paragraph synthesis of the period's journey",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "whatWentWell": ["Win 1", "Win 2", "Win 3"],
  "challenges": ["Challenge/Dilemma 1", "Challenge 2"],
  "goalsMentioned": ["Goal 1", "Goal 2"],
  "suggestedNextSteps": ["Next step 1", "Next step 2", "Next step 3"]
}`;

    const prompt = `Here are the journal entries for ${periodLabel}:\n\n${compiledEntries}\n\nPlease generate the JSON reflection.`;

    const result = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(result.response.text || '{}');
    } catch (e) {
      jsonResponse = {
        title: `${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Reflection`,
        summary: result.response.text || 'Unable to format summary.',
        keyThemes: ['Growth', 'Reflection'],
        whatWentWell: ['Consistent journaling'],
        challenges: ['Balancing priorities'],
        goalsMentioned: [],
        suggestedNextSteps: ['Continue daily mindfulness'],
      };
    }

    return res.json(stripUndefined(jsonResponse));
  } catch (error: any) {
    console.error('Periodic insights error:', error);
    return res.status(500).json({ error: 'Failed to generate periodic reflection.' });
  }
});

// 4. Daily Prompt Generator
app.post('/api/gemini/prompt', async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const { recentThemes = [], mood = '' } = payload;

    const systemInstruction = `You are a mindful journaling coach. Generate a single, deeply evocative, open-ended daily reflection question.
It should be original, inspiring, and invite deep introspection without feeling cliché.
Return JSON:
{
  "prompt": "The question here",
  "category": "Gratitude" | "Career" | "Mindset" | "Growth" | "Relationships" | "Creativity" | "Present Moment",
  "hint": "A brief 1-sentence prompt guide"
}`;

    const prompt = `Generate a fresh daily reflection prompt.${recentThemes.length > 0 ? ` Recent themes the user wrote about: ${recentThemes.join(', ')}.` : ''}${mood ? ` User's mood today: ${mood}.` : ''}`;

    const result = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.85,
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response.text || '{}');
    } catch (e) {
      parsed = {
        prompt: 'What was the most important thing you learned about yourself today?',
        category: 'Growth',
        hint: 'Focus on a subtle realization or unexpected moment.',
      };
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Prompt generator error:', error);
    return res.json({
      prompt: 'What is one thing that brought you genuine peace or clarity today?',
      category: 'Present Moment',
      hint: 'Reflect on how you felt and why it resonated.',
    });
  }
});

// 5. Goal Extraction Endpoint
app.post('/api/gemini/goals/extract', async (req: Request, res: Response) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const { text = '' } = payload;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required to extract goals.' });
    }

    const systemInstruction = `You are an executive life and career coach.
Analyze the user's reflection text and extract 1-3 actionable goals with realistic subtasks.
Return JSON:
{
  "goals": [
    {
      "title": "Concise Goal Title",
      "description": "Why this matters based on the reflection",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}`;

    const result = await generateContentWithFallback({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    let parsed;
    try {
      parsed = JSON.parse(result.response.text || '{}');
    } catch (e) {
      parsed = { goals: [] };
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Goal extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract goals.' });
  }
});

// ==================== VITE & PRODUCTION HANDLER ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflectAI Server running on port ${PORT} (0.0.0.0)`);
  });
}

startServer();
