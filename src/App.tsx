import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { JournalEditorPage } from './pages/JournalEditorPage';
import { HistoryPage } from './pages/HistoryPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { InsightsPage } from './pages/InsightsPage';
import { GoalsPage } from './pages/GoalsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeParam, setActiveParam] = useState<string | undefined>(undefined);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    setActiveParam(param);
    if (tab !== 'journal_new') {
      setInitialPrompt(undefined);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUsePrompt = (promptText: string) => {
    setInitialPrompt(promptText);
    setCurrentTab('journal_new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSearch = (query: string) => {
    setQuickSearchQuery(query);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 flex items-center justify-center font-bold text-xl animate-pulse">
          R
        </div>
        <p className="font-serif text-sm font-semibold text-stone-600 dark:text-stone-400">
          ReflectAI &bull; Preparing Your Private Space...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main App Container */}
      <div className="lg:pl-72 flex flex-col flex-1 min-w-0">
        {/* Top Sticky Navbar */}
        <Navbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
          onQuickSearch={handleQuickSearch}
        />

        {/* View Switcher Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage onNavigate={handleNavigate} onUsePrompt={handleUsePrompt} />
          )}

          {currentTab === 'journal_new' && (
            <JournalEditorPage
              key={`new_${initialPrompt || 'fresh'}`}
              initialPrompt={initialPrompt}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'journal_edit' && (
            <JournalEditorPage
              key={`edit_${activeParam}`}
              entryId={activeParam}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'history' && (
            <HistoryPage initialSearch={quickSearchQuery} onNavigate={handleNavigate} />
          )}

          {currentTab === 'conversations' && <ConversationsPage />}

          {currentTab === 'insights' && <InsightsPage />}

          {currentTab === 'goals' && <GoalsPage onNavigate={handleNavigate} />}

          {currentTab === 'calendar' && <CalendarPage onNavigate={handleNavigate} />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
