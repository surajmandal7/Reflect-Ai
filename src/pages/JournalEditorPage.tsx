import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Sparkles,
  Star,
  Pin,
  Archive,
  Trash2,
  Tag as TagIcon,
  Smile,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Plus,
  Target,
  ListTodo,
  Bot,
  RefreshCw,
  Copy,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { JournalEntry, AIContextOptions } from '../types';
import {
  getJournalEntryById,
  saveJournalEntry,
  deleteJournalEntry,
  saveGoal,
  getJournalEntries,
} from '../services/storageService';
import { requestJournalAction } from '../services/geminiService';
import { GeminiResponseRenderer } from '../components/GeminiResponseRenderer';

interface JournalEditorPageProps {
  entryId?: string;
  initialPrompt?: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const JournalEditorPage: React.FC<JournalEditorPageProps> = ({
  entryId,
  initialPrompt,
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [mood, setMood] = useState<string>('thoughtful');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());

  // Status state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string>(entryId || `entry_${Date.now()}`);

  // AI Actions State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiActionType, setAiActionType] = useState<string | null>(null);
  const [extractedGoal, setExtractedGoal] = useState<{ goalTitle: string; tasks: string[] } | null>(null);
  const [goalSaved, setGoalSaved] = useState(false);

  // AI Context Selector state
  const [showContextOptions, setShowContextOptions] = useState(false);
  const [contextOptions, setContextOptions] = useState<AIContextOptions>({
    includeCurrentEntry: true,
    includeRecentEntries: true,
    includeOlderEntries: false,
    includeGoals: false,
    includeArchived: false,
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const moods = [
    { id: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
    { id: 'grateful', label: 'Grateful', emoji: '🙏' },
    { id: 'inspired', label: 'Inspired', emoji: '✨' },
    { id: 'calm', label: 'Calm', emoji: '🌿' },
    { id: 'energized', label: 'Energized', emoji: '⚡' },
    { id: 'anxious', label: 'Anxious', emoji: '🌧️' },
    { id: 'tired', label: 'Tired', emoji: '🌙' },
  ];

  // Load existing entry or initialize with initial prompt
  useEffect(() => {
    async function init() {
      if (!user) return;

      if (entryId) {
        const existing = await getJournalEntryById(user.uid, entryId);
        if (existing) {
          setActiveId(existing.id);
          setTitle(existing.title);
          setContent(existing.content);
          setTags(existing.tags || []);
          setMood(existing.mood || 'thoughtful');
          setIsFavorite(existing.isFavorite);
          setIsPinned(existing.isPinned);
          setIsArchived(existing.isArchived);
          setAiSummary(existing.aiSummary);
          setCreatedAt(existing.createdAt);
        }
      } else if (initialPrompt) {
        setTitle(initialPrompt.slice(0, 50) + (initialPrompt.length > 50 ? '...' : ''));
        setContent(`Prompt: "${initialPrompt}"\n\n`);
      }

      setHasLoaded(true);
    }

    init();
  }, [entryId, initialPrompt, user]);

  // Unsaved changes beforeunload prevention
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Word and Char calculations
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;

  // Auto-Save Trigger
  const triggerAutoSave = (updatedData?: Partial<JournalEntry>) => {
    if (!hasLoaded || !user) return;

    setSaveStatus('saving');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const entryToSave: JournalEntry = {
          id: activeId,
          userId: user.uid,
          title: title.trim() || 'Untitled Reflection',
          content,
          tags,
          mood,
          isFavorite,
          isPinned,
          isArchived,
          wordCount,
          characterCount,
          aiSummary,
          createdAt,
          updatedAt: new Date().toISOString(),
          ...updatedData,
        };

        await saveJournalEntry(user.uid, entryToSave);
        setSaveStatus('saved');
      } catch (e) {
        console.error('Auto save failed:', e);
        setSaveStatus('unsaved');
      }
    }, 1200);
  };

  const handleTextChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus('unsaved');
    triggerAutoSave({ content: newContent, wordCount: newContent.trim() ? newContent.trim().split(/\s+/).length : 0 });
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus('unsaved');
    triggerAutoSave({ title: newTitle });
  };

  const handleAddTag = () => {
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean) && tags.length < 10) {
      const nextTags = [...tags, clean];
      setTags(nextTags);
      setNewTagInput('');
      triggerAutoSave({ tags: nextTags });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    triggerAutoSave({ tags: nextTags });
  };

  const handleManualSave = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const entryToSave: JournalEntry = {
        id: activeId,
        userId: user.uid,
        title: title.trim() || 'Untitled Reflection',
        content,
        tags,
        mood,
        isFavorite,
        isPinned,
        isArchived,
        wordCount,
        characterCount,
        aiSummary,
        createdAt,
        updatedAt: new Date().toISOString(),
      };
      await saveJournalEntry(user.uid, entryToSave);
      setSaveStatus('saved');
      showToast('Reflection saved successfully.', 'success');
    } catch (e) {
      setSaveStatus('unsaved');
      showToast('Failed to save reflection. Please check connection.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this reflection? This cannot be undone.')) {
      await deleteJournalEntry(user.uid, activeId);
      showToast('Reflection deleted.', 'info');
      onNavigate('history');
    }
  };

  // Run AI Action (Summarize, Reflect, Brainstorm, Find Themes, Action Plan)
  const handleRunAiAction = async (actionType: 'summarize' | 'reflect' | 'brainstorm' | 'find_themes' | 'action_plan') => {
    if (!content.trim() && !title.trim()) {
      showToast('Write a reflection first before asking Gemini.', 'info');
      return;
    }

    setAiLoading(true);
    setAiActionType(actionType);
    setAiResult(null);
    setExtractedGoal(null);
    setGoalSaved(false);

    try {
      let historicalContext = '';
      if (contextOptions.includeRecentEntries && user) {
        const recents = await getJournalEntries(user.uid);
        const filtered = recents.filter((e) => e.id !== activeId).slice(0, 3);
        historicalContext = filtered.map((e) => `[${e.title}]: ${e.aiSummary || e.content.slice(0, 150)}`).join('\n');
      }

      const res = await requestJournalAction({
        actionType,
        entryTitle: title || 'Untitled',
        entryContent: content,
        additionalContext: historicalContext,
      });

      setAiResult(res.result);

      if (actionType === 'summarize') {
        const firstPara = res.result.split('\n\n')[0].replace(/^[#*>\s]+/, '').slice(0, 300);
        setAiSummary(firstPara);
        triggerAutoSave({ aiSummary: firstPara });
      }

      if (res.extractedGoal) {
        setExtractedGoal(res.extractedGoal);
      }

      showToast(`Gemini completed ${actionType.replace('_', ' ')} reflection.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'AI generation failed. Please try again.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveExtractedGoal = async () => {
    if (!user || !extractedGoal) return;
    try {
      await saveGoal(user.uid, {
        id: `goal_${Date.now()}`,
        userId: user.uid,
        title: extractedGoal.goalTitle || title || 'Extracted Goal',
        description: `Generated from reflection: "${title || 'Untitled'}"`,
        status: 'in_progress',
        tasks: extractedGoal.tasks.map((t, idx) => ({ id: `t_${idx}`, text: t, completed: false })),
        sourceEntryId: activeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setGoalSaved(true);
      showToast('Goal & tasks saved to Goals roadmap!', 'success');
    } catch (e) {
      showToast('Failed to save goal.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Bar: Back, Status, and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            id="editor-back-btn"
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-stone-400 italic">
                <span>Unsaved changes</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Favorite Toggle */}
          <button
            id="editor-favorite-toggle"
            onClick={() => {
              setIsFavorite(!isFavorite);
              triggerAutoSave({ isFavorite: !isFavorite });
            }}
            title={isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
            className={`p-2 rounded-xl border transition-colors ${
              isFavorite
                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                : 'border-stone-200/80 dark:border-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Pin Toggle */}
          <button
            id="editor-pin-toggle"
            onClick={() => {
              setIsPinned(!isPinned);
              triggerAutoSave({ isPinned: !isPinned });
            }}
            title={isPinned ? 'Unpin' : 'Pin to Top'}
            className={`p-2 rounded-xl border transition-colors ${
              isPinned
                ? 'bg-stone-900 border-stone-900 text-stone-50 dark:bg-stone-100 dark:border-stone-100 dark:text-stone-900'
                : 'border-stone-200/80 dark:border-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Archive Toggle */}
          <button
            id="editor-archive-toggle"
            onClick={() => {
              setIsArchived(!isArchived);
              triggerAutoSave({ isArchived: !isArchived });
              showToast(isArchived ? 'Restored from archive' : 'Archived entry', 'info');
            }}
            title={isArchived ? 'Unarchive' : 'Archive'}
            className={`p-2 rounded-xl border transition-colors ${
              isArchived
                ? 'bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
                : 'border-stone-200/80 dark:border-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Archive className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          {entryId && (
            <button
              id="editor-delete-btn"
              onClick={handleDelete}
              title="Delete Reflection"
              className="p-2 rounded-xl border border-stone-200/80 dark:border-stone-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Manual Save Button */}
          <button
            id="editor-save-btn"
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Journal Canvas Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-6">
        {/* Title Input */}
        <input
          id="journal-title-input"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Title your reflection..."
          className="w-full text-2xl sm:text-3xl font-serif font-semibold bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-hidden"
        />

        {/* Metadata Strip: Mood Selector & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-4 border-b border-stone-200/60 dark:border-stone-800/80">
          {/* Mood Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5" />
              <span>Mood:</span>
            </span>
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMood(m.id);
                  triggerAutoSave({ mood: m.id });
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                  mood === m.id
                    ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                    : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Counts */}
          <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 font-mono">
            <span>{wordCount} words</span>
            <span>&bull;</span>
            <span>{characterCount} chars</span>
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-2">
          <TagIcon className="w-3.5 h-3.5 text-stone-400" />
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300"
            >
              <span>#{tag}</span>
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-rose-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Add Tag Input */}
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="+ add tag"
              className="text-xs bg-transparent border-b border-dashed border-stone-300 dark:border-stone-700 py-0.5 px-1 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-hidden focus:border-stone-500 w-20"
            />
            {newTagInput.trim() && (
              <button
                onClick={handleAddTag}
                className="p-0.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Writing Content Area */}
        <textarea
          id="journal-content-textarea"
          value={content}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Write your thoughts freely without judgment..."
          rows={14}
          className="w-full text-base sm:text-lg leading-relaxed bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-hidden resize-none font-sans font-normal"
        />
      </div>

      {/* AI Context Controls Drawer / Toggle */}
      <div className="p-4 rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>AI Context & Privacy Boundary</span>
          </div>

          <button
            onClick={() => setShowContextOptions(!showContextOptions)}
            className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 font-medium"
          >
            <span>{showContextOptions ? 'Hide Context Settings' : 'Configure Context'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showContextOptions ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showContextOptions && (
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <label className="flex items-center gap-2 text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={contextOptions.includeCurrentEntry}
                onChange={(e) =>
                  setContextOptions({ ...contextOptions, includeCurrentEntry: e.target.checked })
                }
                className="rounded text-stone-900 focus:ring-stone-400"
              />
              <span>Current journal entry</span>
            </label>

            <label className="flex items-center gap-2 text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={contextOptions.includeRecentEntries}
                onChange={(e) =>
                  setContextOptions({ ...contextOptions, includeRecentEntries: e.target.checked })
                }
                className="rounded text-stone-900 focus:ring-stone-400"
              />
              <span>Recent reflections (up to 3)</span>
            </label>

            <label className="flex items-center gap-2 text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={contextOptions.includeOlderEntries}
                onChange={(e) =>
                  setContextOptions({ ...contextOptions, includeOlderEntries: e.target.checked })
                }
                className="rounded text-stone-900 focus:ring-stone-400"
              />
              <span>Older journal history</span>
            </label>
          </div>
        )}
      </div>

      {/* AI Actions Toolbar */}
      <div className="p-6 rounded-3xl bg-amber-50/70 dark:bg-stone-900/90 border border-amber-200/80 dark:border-stone-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
              Gemini Reflection Actions
            </h3>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Select an action to deepen your perspective
          </span>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap gap-2">
          <button
            id="ai-action-reflect-btn"
            onClick={() => handleRunAiAction('reflect')}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span>Reflect</span>
          </button>

          <button
            id="ai-action-summarize-btn"
            onClick={() => handleRunAiAction('summarize')}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors"
          >
            <span>Summarize</span>
          </button>

          <button
            id="ai-action-brainstorm-btn"
            onClick={() => handleRunAiAction('brainstorm')}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors"
          >
            <span>Brainstorm Ideas</span>
          </button>

          <button
            id="ai-action-find-themes-btn"
            onClick={() => handleRunAiAction('find_themes')}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 text-xs font-semibold transition-colors"
          >
            <span>Find Themes</span>
          </button>

          <button
            id="ai-action-action-plan-btn"
            onClick={() => handleRunAiAction('action_plan')}
            disabled={aiLoading}
            className="px-3.5 py-2 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Create Action Plan</span>
          </button>

          <button
            id="ai-action-ask-gemini-chat-btn"
            onClick={() => onNavigate('conversations')}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
          >
            <Bot className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Open Multi-Turn Chat</span>
          </button>
        </div>

        {/* AI Loading Indicator */}
        {aiLoading && (
          <div className="p-6 rounded-2xl bg-stone-100 dark:bg-stone-800/80 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
              Gemini is reflecting on your journal...
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Synthesizing insights and organizing thoughts.
            </p>
          </div>
        )}

        {/* AI Output Box */}
        {aiResult && !aiLoading && (
          <div className="p-6 rounded-2xl bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {aiActionType?.replace('_', ' ')} Result
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiResult);
                  showToast('Copied AI reflection to clipboard', 'info');
                }}
                className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <div className="pt-1">
              <GeminiResponseRenderer content={aiResult} hideRawJson={true} />
            </div>

            {/* Extracted Goal Action Box */}
            {extractedGoal && (
              <div className="p-4 rounded-xl bg-amber-100/60 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Extracted Goal: {extractedGoal.goalTitle}
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    {extractedGoal.tasks?.length || 0} subtasks identified
                  </p>
                </div>

                <button
                  id="save-extracted-goal-btn"
                  onClick={handleSaveExtractedGoal}
                  disabled={goalSaved}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    goalSaved
                      ? 'bg-emerald-600 text-stone-50 cursor-default'
                      : 'bg-amber-900 text-amber-50 hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 shadow-xs'
                  }`}
                >
                  {goalSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved to Goals</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-3.5 h-3.5" />
                      <span>Save as Goal & Tasks</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
