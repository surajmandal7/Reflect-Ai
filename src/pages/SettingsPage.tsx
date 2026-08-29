import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  Download,
  LogOut,
  Bell,
  Check,
  Lock,
  Database,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { AIMode } from '../types';
import { getJournalEntries } from '../services/storageService';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateUserPreferences } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [defaultAiMode, setDefaultAiMode] = useState<AIMode>(user?.defaultAiMode || 'reflect');
  const [dailyPrompts, setDailyPrompts] = useState<boolean>(user?.dailyPromptsEnabled !== false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserPreferences({
        displayName,
        defaultAiMode,
        dailyPromptsEnabled: dailyPrompts,
      });
      showToast('Settings saved successfully.', 'success');
    } catch (e) {
      showToast('Failed to update settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportAll = async (format: 'json' | 'markdown') => {
    if (!user) return;
    const entries = await getJournalEntries(user.uid);
    if (entries.length === 0) {
      showToast('No reflections found to export.', 'info');
      return;
    }

    let fileContent = '';
    let mimeType = 'text/plain';
    let fileName = `reflect_ai_full_backup_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      fileContent = JSON.stringify(entries, null, 2);
      mimeType = 'application/json';
      fileName += '.json';
    } else {
      fileContent = entries
        .map(
          (e) =>
            `# ${e.title}\n*Date: ${new Date(e.createdAt).toLocaleString()} | Mood: ${e.mood || 'N/A'}*\n*Tags: ${e.tags.join(', ')}*\n\n${e.content}\n\n---\n`
        )
        .join('\n\n');
      mimeType = 'text/markdown';
      fileName += '.md';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Full backup downloaded as ${format.toUpperCase()}`, 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
          Settings & Account
        </h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Manage your reflection preferences, privacy configurations, and data exports
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>Profile Information</span>
          </h2>

          <div className="flex items-center gap-4 pt-2">
            <img
              src={
                user?.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.displayName || 'User'
                )}&background=333&color=fff`
              }
              alt="Avatar"
              className="w-16 h-16 rounded-full border border-stone-300 dark:border-stone-700 object-cover"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {user?.displayName || 'Authenticated User'}
              </p>
              <p className="text-xs text-stone-500 font-mono">{user?.email || 'No email provided'}</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Google Verified Tenant</span>
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-semibold block mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Appearance & Theme */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>Appearance & Theme</span>
          </h2>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              id="theme-light-btn"
              onClick={() => setTheme('light')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'light'
                  ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-xs'
                  : 'bg-stone-50 dark:bg-stone-950 border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </button>

            <button
              type="button"
              id="theme-dark-btn"
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-stone-100 text-stone-900 border-stone-100 shadow-xs'
                  : 'bg-stone-50 dark:bg-stone-950 border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              id="theme-system-btn"
              onClick={() => setTheme('system')}
              className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
                theme === 'system'
                  ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-200'
                  : 'bg-stone-50 dark:bg-stone-950 border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>System Match</span>
            </button>
          </div>
        </div>

        {/* AI Reflection Defaults */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Interaction Preferences</span>
          </h2>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Default AI Reflection Mode</label>
              <select
                value={defaultAiMode}
                onChange={(e: any) => setDefaultAiMode(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
              >
                <option value="reflect">Reflect (Mindful & empathetic mirror)</option>
                <option value="summarize">Summarize (Concise takeaways)</option>
                <option value="brainstorm">Brainstorm (Creative exploration)</option>
                <option value="challenge">Challenge Me (Question assumptions)</option>
                <option value="action_plan">Action Plan (Prioritized milestones)</option>
                <option value="coach">Coach (Socratic inquiry questions)</option>
                <option value="find_patterns">Find Patterns (Thematic connections)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dailyPrompts}
                onChange={(e) => setDailyPrompts(e.target.checked)}
                className="rounded text-stone-900"
              />
              <span className="font-medium">Enable daily guided reflection prompts on dashboard</span>
            </label>
          </div>
        </div>

        <button
          id="settings-save-btn"
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold text-xs shadow-xs hover:opacity-90 transition-opacity"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      {/* Privacy & Tenant Isolation Status */}
      <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-3">
        <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Security & Privacy Architecture</span>
        </h2>
        <div className="p-3 rounded-2xl bg-stone-200/50 dark:bg-stone-800/50 text-xs space-y-2 text-stone-700 dark:text-stone-300">
          <p>
            &bull; <strong>Tenant Isolation:</strong> Firestore rules enforce{' '}
            <code className="text-[11px] font-mono bg-stone-300/60 dark:bg-stone-700 px-1 py-0.5 rounded">
              request.auth.uid == userId
            </code>{' '}
            for all read/write paths.
          </p>
          <p>
            &bull; <strong>Server-Side Proxy:</strong> All Gemini API requests execute via secure
            Express endpoints with zero API keys exposed in client bundles.
          </p>
          <p>
            &bull; <strong>Non-Diagnostic:</strong> ReflectAI is an introspective space for personal
            growth and does not offer medical or psychological diagnosis.
          </p>
        </div>
      </div>

      {/* Data Export & Danger Zone */}
      <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
        <h2 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>Data Portability & Account</span>
        </h2>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => handleExportAll('json')}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All JSON</span>
          </button>

          <button
            onClick={() => handleExportAll('markdown')}
            className="px-3.5 py-2 rounded-xl bg-stone-200/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-stone-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All Markdown</span>
          </button>

          <button
            id="settings-logout-btn"
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of ReflectAI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
