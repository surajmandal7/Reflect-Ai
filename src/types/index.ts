export type AIMode =
  | 'reflect'
  | 'summarize'
  | 'brainstorm'
  | 'challenge'
  | 'action_plan'
  | 'coach'
  | 'find_patterns';

export interface AIModeConfig {
  id: AIMode;
  label: string;
  description: string;
  iconName: string;
  tagline: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultAiMode?: AIMode;
  dailyPromptsEnabled?: boolean;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  wordCount: number;
  characterCount: number;
  aiSummary?: string;
  aiKeyThemes?: string[];
  aiActionItems?: string[];
  mood?: 'calm' | 'inspired' | 'grateful' | 'thoughtful' | 'anxious' | 'energized' | 'tired' | string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  mode?: AIMode;
  timestamp: string;
  isEdited?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: AIMode;
  lastMessageAt: string;
  messageCount: number;
  linkedEntryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalTask {
  id: string;
  text: string;
  completed: boolean;
}

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'archived';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  tasks: GoalTask[];
  sourceEntryId?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsightReport {
  id: string;
  userId: string;
  periodType: 'weekly' | 'monthly' | 'custom';
  periodLabel: string;
  title: string;
  summary: string;
  keyThemes: string[];
  themes?: string[];
  whatWentWell: string[];
  challenges: string[];
  goalsMentioned?: string[];
  suggestedNextSteps: string[];
  actionableTakeaways?: string[];
  createdAt: string;
}

export type InsightReview = InsightReport;

export interface AIContextOptions {
  includeCurrentEntry: boolean;
  includeRecentEntries: boolean;
  includeOlderEntries: boolean;
  includeGoals: boolean;
  includeArchived: boolean;
}

export interface DailyPrompt {
  id?: string;
  prompt: string;
  category: string;
  hint?: string;
}
