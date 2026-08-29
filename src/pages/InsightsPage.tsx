import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  BrainCircuit,
  TrendingUp,
  Smile,
  Target,
  RefreshCw,
  Clock,
  ArrowRight,
  BookOpen,
  Award,
  Layers,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { JournalEntry, InsightReview } from '../types';
import { getJournalEntries, getInsights, saveInsight } from '../services/storageService';
import { requestPeriodicInsights } from '../services/geminiService';

export const InsightsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [insights, setInsights] = useState<InsightReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPeriod, setGeneratingPeriod] = useState<'weekly' | 'monthly' | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedEntries, fetchedInsights] = await Promise.all([
        getJournalEntries(user.uid),
        getInsights(user.uid),
      ]);
      setEntries(fetchedEntries);
      setInsights(fetchedInsights);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Compute mood distribution
  const moodCounts = entries.reduce<Record<string, number>>((acc, entry) => {
    const m = entry.mood || 'thoughtful';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  // Compute top themes
  const tagCounts = entries.flatMap((e) => e.tags).reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6);

  const handleGenerateReview = async (period: 'weekly' | 'monthly') => {
    if (!user) return;
    if (entries.length === 0) {
      showToast('Write a few journal entries first to generate period reviews.', 'info');
      return;
    }

    setGeneratingPeriod(period);
    try {
      const formattedEntries = entries.slice(0, 15).map((e) => ({
        title: e.title,
        content: e.content,
        date: e.createdAt,
        mood: e.mood,
        tags: e.tags,
      }));

      const review = await requestPeriodicInsights({
        periodType: period,
        periodLabel: period === 'weekly' ? 'Past 7 Days' : 'Past 30 Days',
        entries: formattedEntries,
      });

      const fullInsight: InsightReview = {
        ...review,
        id: `insight_${period}_${Date.now()}`,
        userId: user.uid,
        periodType: period,
        periodLabel: period === 'weekly' ? 'Past 7 Days' : 'Past 30 Days',
        themes: review.keyThemes,
        actionableTakeaways: review.suggestedNextSteps,
        createdAt: new Date().toISOString(),
      };

      await saveInsight(user.uid, fullInsight);
      setInsights((prev) => [fullInsight, ...prev.filter((i) => i.periodType !== period)]);
      showToast(`Generated fresh ${period} reflection review!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to generate review.', 'error');
    } finally {
      setGeneratingPeriod(null);
    }
  };

  const latestWeekly = insights.find((i) => i.periodType === 'weekly');
  const latestMonthly = insights.find((i) => i.periodType === 'monthly');

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Insights & Reflection Review
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Synthesized patterns, emotional trends, and weekly reviews powered by Gemini
          </p>
        </div>

        {/* Generate Actions */}
        <div className="flex items-center gap-2">
          <button
            id="generate-weekly-review-btn"
            onClick={() => handleGenerateReview('weekly')}
            disabled={generatingPeriod !== null}
            className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generatingPeriod === 'weekly' ? 'animate-spin' : ''}`} />
            <span>Generate Weekly Review</span>
          </button>

          <button
            id="generate-monthly-review-btn"
            onClick={() => handleGenerateReview('monthly')}
            disabled={generatingPeriod !== null}
            className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/60 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generatingPeriod === 'monthly' ? 'animate-spin' : ''}`} />
            <span>Monthly Synthesis</span>
          </button>
        </div>
      </div>

      {/* High-Level Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reflection Volume */}
        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">Reflection Volume</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {entries.length} reflections
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Across {Object.keys(tagCounts).length} unique themes
          </p>
        </div>

        {/* Top Focus Theme */}
        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-500">Top Theme</span>
            <BrainCircuit className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 capitalize">
            {topTags[0] ? `#${topTags[0][0]}` : 'Exploration'}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Mentioned {topTags[0] ? topTags[0][1] : 0} times in journals
          </p>
        </div>

        {/* Primary Mindset */}
        <div className="p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">Primary Mood</span>
            <Smile className="w-4 h-4" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 capitalize">
            {Object.entries(moodCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'Thoughtful'}
          </p>
          <p className="text-xs text-stone-500 mt-1">Reflects grounding & self-inquiry</p>
        </div>
      </div>

      {/* Mood & Recurring Themes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Distribution */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                Emotional & Mood Distribution
              </h3>
            </div>
            <span className="text-xs text-stone-400">Self-Reported</span>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(moodCounts).map(([mood, count]) => {
              const numCount = Number(count);
              const pct = entries.length > 0 ? Math.round((numCount / entries.length) * 100) : 0;
              return (
                <div key={mood} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="capitalize text-stone-800 dark:text-stone-200">{mood}</span>
                    <span className="text-stone-500 font-mono">
                      {numCount} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full bg-stone-800 dark:bg-stone-200 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recurring Themes List */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                Recurring Concepts & Tags
              </h3>
            </div>
            <span className="text-xs text-stone-400">Extracted Topics</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {topTags.map(([tag, count]) => (
              <div
                key={tag}
                className="p-3 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 border border-stone-300/50 dark:border-stone-700/50 flex items-center justify-between"
              >
                <span className="text-xs font-medium text-stone-900 dark:text-stone-100">#{tag}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-300 dark:bg-stone-700 font-bold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Periodic AI Review Cards */}
      <div className="space-y-6">
        <h2 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Structured Periodic Syntheses
        </h2>

        {/* Weekly Review Card */}
        {latestWeekly && (
          <div className="p-6 sm:p-8 rounded-3xl bg-amber-50/70 dark:bg-stone-900/90 border border-amber-200/80 dark:border-stone-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-amber-200/60 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 flex items-center justify-center text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Weekly Reflection Review
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Synthesized from your recent reflections
                  </p>
                </div>
              </div>

              <span className="text-xs text-stone-400 font-mono">
                {new Date(latestWeekly.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Period Summary
              </h4>
              <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                {latestWeekly.summary}
              </p>
            </div>

            {/* Recurring Themes */}
            {latestWeekly.themes && latestWeekly.themes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Identified Themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {latestWeekly.themes.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-xs font-medium text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Takeaways */}
            {latestWeekly.actionableTakeaways && latestWeekly.actionableTakeaways.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Actionable Insights & Recommendations
                </h4>
                <div className="space-y-2">
                  {latestWeekly.actionableTakeaways.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-start gap-2.5 text-xs text-stone-800 dark:text-stone-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Monthly Review Card */}
        {latestMonthly && (
          <div className="p-6 sm:p-8 rounded-3xl bg-amber-100/40 dark:bg-stone-900/90 border border-amber-300/70 dark:border-amber-900/50 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-amber-200/60 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-300/80 dark:bg-amber-900/60 flex items-center justify-center text-amber-950 dark:text-amber-200">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                    Monthly Synthesis & Macro Patterns
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Synthesized from your past 30 days of reflections
                  </p>
                </div>
              </div>

              <span className="text-xs text-stone-400 font-mono">
                {new Date(latestMonthly.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Monthly Journey Summary
              </h4>
              <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                {latestMonthly.summary}
              </p>
            </div>

            {/* Recurring Themes */}
            {latestMonthly.themes && latestMonthly.themes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Core Themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {latestMonthly.themes.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-amber-200/60 dark:bg-amber-950 text-xs font-medium text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Takeaways */}
            {latestMonthly.actionableTakeaways && latestMonthly.actionableTakeaways.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Strategic Next Steps & Growth Horizons
                </h4>
                <div className="space-y-2">
                  {latestMonthly.actionableTakeaways.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-start gap-2.5 text-xs text-stone-800 dark:text-stone-200 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!latestWeekly && !latestMonthly && (
          <div className="p-8 rounded-3xl bg-stone-100/60 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-800 text-center">
            <Sparkles className="w-6 h-6 mx-auto text-amber-500 mb-2" />
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
              No Periodic Reviews Generated Yet
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Click "Generate Weekly Review" or "Monthly Synthesis" above to have Gemini synthesize your reflections into actionable patterns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
