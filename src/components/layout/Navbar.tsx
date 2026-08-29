import React, { useState } from 'react';
import {
  Menu,
  Search,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Check,
  Shield,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onNavigate: (tab: string, param?: string) => void;
  onQuickSearch: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileSidebar,
  onNavigate,
  onQuickSearch,
}) => {
  const { isDark, setTheme, theme } = useTheme();
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onQuickSearch(searchValue.trim());
      onNavigate('history');
    }
  };

  const toggleTheme = () => {
    if (theme === 'dark' || (theme === 'system' && isDark)) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-30 h-16 bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800/70 px-4 md:px-8 flex items-center justify-between gap-4"
    >
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-72 md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            id="global-search-input"
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search reflections or concepts..."
            className="w-full pl-9 pr-4 py-1.5 text-xs md:text-sm rounded-xl bg-stone-200/50 dark:bg-stone-900 border border-stone-300/60 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-600 transition-all"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Gemini Chat Action */}
        <button
          id="quick-gemini-chat-btn"
          onClick={() => onNavigate('conversations')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-200 text-xs font-semibold border border-amber-300/60 dark:border-amber-800/50 transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden md:inline">Talk to Gemini</span>
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-toggle-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setNotificationsRead(true);
            }}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {!notificationsRead && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-stone-50 dark:ring-stone-950" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200 dark:border-stone-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Notifications</span>
                <span className="text-[11px] text-stone-400">Mindful Alerts</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-100">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Daily Prompt Ready</span>
                  </div>
                  <p className="mt-1 text-stone-600 dark:text-stone-300 text-[11px]">
                    "What was the most meaningful lesson or realization you had today?"
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-100">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Private Tenant Encrypted</span>
                  </div>
                  <p className="mt-1 text-stone-600 dark:text-stone-300 text-[11px]">
                    Your journal entries are isolated to your authenticated Google account.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 pl-1 group"
        >
          <img
            src={
              user?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.displayName || 'User'
              )}&background=333&color=fff`
            }
            alt="User avatar"
            className="w-8 h-8 rounded-full border border-stone-300 dark:border-stone-700 object-cover group-hover:ring-2 group-hover:ring-stone-400 dark:group-hover:ring-stone-600 transition-all"
          />
        </button>
      </div>
    </header>
  );
};
