import React, { useState, useEffect } from 'react';
import {
  PenLine,
  MessageSquare,
  Sparkles,
  Target,
  Flame,
  BookOpen,
  FileText,
  Clock,
  Star,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { JournalEntry, Goal, DailyPrompt } from '../types';
import { getJournalEntries, getGoals, calculateStats, saveJournalEntry } from '../services/storageService';
import { requestDailyPrompt } from '../services/geminiService';

interface DashboardPageProps {
  onNavigate: (tab: string, param?: string) => void;
  onUsePrompt: (promptText: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onUsePrompt,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt>({
    prompt: 'What was the most important thing you learned about yourself today?',
    category: 'Mindset',
    hint: 'Reflect on a moment where you felt challenged or deeply engaged.',
  });
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSkipped, setPromptSkipped] = useState(false);

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedEntries, fetchedGoals] = await Promise.all([
        getJournalEntries(user.uid),
        getGoals(user.uid),
      ]);
      setEntries(fetchedEntries);
      setGoals(fetchedGoals);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleFetchAnotherPrompt = async () => {
    setPromptLoading(true);
    try {
      const recentTags = (Array.from(new Set(entries.flatMap((e) => e.tags))) as string[]).slice(0, 5);
      const newPrompt = await requestDailyPrompt({ recentThemes: recentTags });
      setDailyPrompt(newPrompt);
      setPromptSkipped(false);
      showToast('Generated a fresh reflection prompt.', 'info');
    } catch (e) {
      showToast('Using default reflection prompt.', 'info');
    } finally {
      setPromptLoading(false);
    }
  };

  const handleToggleFavorite = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const updated = { ...entry, isFavorite: !entry.isFavorite, updatedAt: new Date().toISOString() };
    await saveJournalEntry(user.uid, updated);
    setEntries((prev) => prev.map((item) => (item.id === entry.id ? updated : item)));
    showToast(updated.isFavorite ? 'Added to favorites' : 'Removed from favorites', 'success');
  };

  const stats = calculateStats(entries, goals);
  const recentEntries = entries.filter((e) => !e.isArchived).slice(0, 3);

  // Derive dynamic AI Insight summary from recent themes
  const getDynamicObservation = () => {
    if (entries.length === 0) {
      return 'Start writing your first reflections to allow Gemini to identify recurring themes and growth patterns.';
    }
    const tags = entries.flatMap((e) => e.tags);
    if (tags.includes('career') || tags.includes('growth')) {
      return "You've been thinking frequently about productivity, intentional learning, and long-term career clarity.";
    }
    if (tags.includes('gratitude') || tags.includes('mindfulness')) {
      return 'I noticed a positive trend toward mindfulness, appreciating quiet moments, and sensory grounding.';
    }
    return `You have logged ${entries.length} reflections. Your recurring themes focus on personal growth and purposeful daily routines.`;
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Friend'}
          </h1>
          <p className="mt-1 text-stone-600 dark:text-stone-400 text-sm sm:text-base">
            What would you like to reflect on today?
          </p>
        </div>

        {/* Primary CTA */}
        <button
          id="dashboard-new-journal-btn"
          onClick={() => onNavigate('journal_new')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 font-semibold text-sm shadow-sm transition-all"
        >
          <PenLine className="w-4 h-4" />
          <span>Write Reflection</span>
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <button
          id="quick-action-new-journal"
          onClick={() => onNavigate('journal_new')}
          className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 group-hover:scale-105 transition-transform mb-3">
            <PenLine className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">New Journal</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Capture private thoughts</p>
        </button>

        <button
          id="quick-action-talk-gemini"
          onClick={() => onNavigate('conversations')}
          className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-700 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 flex items-center justify-center text-amber-900 dark:text-amber-200 group-hover:scale-105 transition-transform mb-3">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Talk to Gemini</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Multi-turn AI reflection</p>
        </button>

        <button
          id="quick-action-daily-reflection"
          onClick={() => {
            if (dailyPrompt?.prompt) {
              onUsePrompt(dailyPrompt.prompt);
            } else {
              onNavigate('journal_new');
            }
          }}
          className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 group-hover:scale-105 transition-transform mb-3">
            <Lightbulb className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Daily Reflection</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Guided introspection</p>
        </button>

        <button
          id="quick-action-view-insights"
          onClick={() => onNavigate('insights')}
          className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 group-hover:scale-105 transition-transform mb-3">
            <Target className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">View Insights</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Weekly & monthly review</p>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Entries</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {stats.totalEntries}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Reflections recorded</p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Writing Streak
            </span>
            <Flame className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-amber-700 dark:text-amber-300">
            {stats.writingStreak} {stats.writingStreak === 1 ? 'day' : 'days'}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Keep the momentum going</p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Words Written</span>
            <FileText className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {stats.wordsWritten.toLocaleString()}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Total volume of thoughts</p>
        </div>

        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Goals</span>
            <Target className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {stats.activeGoals}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">In progress & queued</p>
        </div>
      </div>

      {/* Daily Prompt & AI Insight Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Reflection Prompt Card */}
        {!promptSkipped && (
          <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-stone-900/90 border border-amber-200/80 dark:border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-950 text-amber-900 dark:text-amber-300">
                    {dailyPrompt.category || 'Daily Prompt'}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">Guided Reflection</span>
                </div>
                <button
                  onClick={handleFetchAnotherPrompt}
                  disabled={promptLoading}
                  className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${promptLoading ? 'animate-spin' : ''}`} />
                  <span>Generate Another</span>
                </button>
              </div>

              <h2 className="mt-4 font-serif text-lg sm:text-xl font-medium text-stone-900 dark:text-stone-100 leading-snug">
                "{dailyPrompt.prompt}"
              </h2>

              {dailyPrompt.hint && (
                <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 italic">
                  {dailyPrompt.hint}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-amber-200/60 dark:border-stone-800">
              <button
                id="use-daily-prompt-btn"
                onClick={() => onUsePrompt(dailyPrompt.prompt)}
                className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-amber-50 dark:bg-amber-100 dark:hover:bg-amber-200 dark:text-amber-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Use Prompt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPromptSkipped(true)}
                className="px-3 py-2 rounded-xl text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 text-xs font-medium transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* AI Insight Card */}
        <div className="p-6 rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  AI Pattern Observation
                </span>
              </div>
              <span className="text-[11px] text-stone-400">Non-Diagnostic Suggestion</span>
            </div>

            <p className="mt-4 text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-normal">
              "{getDynamicObservation()}"
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Observation based on {entries.length} reflections
            </span>
            <button
              onClick={() => onNavigate('insights')}
              className="text-xs font-semibold text-stone-900 dark:text-stone-100 hover:underline flex items-center gap-1"
            >
              <span>Explore Full Patterns</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Journal Entries Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
              Recent Reflections
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Your latest private journal entries
            </p>
          </div>

          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1"
          >
            <span>View All ({entries.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          /* Empty State as mandated */
          <div className="p-8 sm:p-12 rounded-2xl bg-stone-100/60 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-800 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-stone-400 mb-3" />
            <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-100">
              No reflections yet.
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Start with whatever is on your mind.
            </p>
            <button
              id="empty-state-write-first-btn"
              onClick={() => onNavigate('journal_new')}
              className="mt-5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold inline-flex items-center gap-2"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write your first reflection</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onNavigate('journal_edit', entry.id)}
                className="p-5 rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      onClick={(e) => handleToggleFavorite(entry, e)}
                      className={`p-1 rounded-md transition-colors ${
                        entry.isFavorite ? 'text-amber-500' : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors line-clamp-1">
                    {entry.title}
                  </h3>

                  <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {entry.content}
                  </p>

                  {entry.aiSummary && (
                    <div className="mt-3 p-2.5 rounded-xl bg-stone-200/50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
                      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>AI Summary</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 line-clamp-2 italic">
                        {entry.aiSummary}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                    {entry.tags.length > 2 && (
                      <span className="text-[10px] text-stone-400 self-center">
                        +{entry.tags.length - 2}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400">{entry.wordCount} words</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
