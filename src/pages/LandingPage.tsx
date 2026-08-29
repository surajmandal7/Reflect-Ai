import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Compass,
  ArrowRight,
  Target,
  BrainCircuit,
  MessageSquare,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signInAsDemoUser, loading, error } = useAuth();
  const { isDark, setTheme, theme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'dark' || (theme === 'system' && isDark)) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900 transition-colors duration-200">
      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 flex items-center justify-center font-bold text-xl shadow-sm">
            R
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight">ReflectAI</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="landing-theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            id="landing-signin-header-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center flex-1 flex flex-col items-center justify-center">
        {/* Privacy Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-200/70 dark:bg-stone-800/80 border border-stone-300/60 dark:border-stone-700/60 text-xs font-medium text-stone-700 dark:text-stone-300 mb-8">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Zero-Knowledge Tenant Isolation & Google Auth</span>
        </div>

        {/* Hero Copy */}
        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 max-w-4xl leading-[1.15]">
          A private space to think, reflect, and grow with AI.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-stone-600 dark:text-stone-400 max-w-2xl font-normal leading-relaxed">
          Write freely. Talk through your thoughts. Discover patterns. Turn reflection into action.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
          <button
            id="landing-google-signin-btn"
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-stone-900 text-stone-50 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-semibold text-base shadow-md transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <button
            id="landing-try-demo-btn"
            onClick={signInAsDemoUser}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-stone-200/70 dark:bg-stone-800/70 hover:bg-stone-300/70 dark:hover:bg-stone-700/70 text-stone-800 dark:text-stone-200 font-semibold text-base border border-stone-300/60 dark:border-stone-700/60 transition-all"
          >
            Explore Guest Space
          </button>
        </div>

        {error && (
          <p className="mt-4 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
            {error}
          </p>
        )}

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/70">
            <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100">Private by Design</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Every reflection and message is strictly isolated to your authenticated account with hardened Firestore security rules.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/70">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 flex items-center justify-center text-amber-800 dark:text-amber-300 mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100">Talk With Gemini</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Multi-turn streaming dialogues with adaptive reflection modes: Summarize, Brainstorm, Challenge Me, and Coach.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/70">
            <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100">Understand Your Patterns</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Discover recurring themes and emotional insights across your authorized entries with structured weekly & monthly reviews.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-stone-100/70 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800/70">
            <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-stone-100 mb-4">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-stone-900 dark:text-stone-100">Turn Thoughts Into Action</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Extract concrete goals, milestone checklists, and actionable next steps directly from your reflective journaling.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/70 dark:border-stone-800/70 py-6 text-center text-xs text-stone-500">
        <p>ReflectAI &bull; Private, Non-Diagnostic Personal Reflection Companion</p>
      </footer>
    </div>
  );
};
