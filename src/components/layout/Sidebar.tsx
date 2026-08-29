import React from 'react';
import {
  LayoutDashboard,
  PenLine,
  BookOpen,
  MessageSquare,
  Sparkles,
  Target,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string, param?: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal_new', label: 'New Journal', icon: PenLine, badge: 'Write' },
    { id: 'history', label: 'History', icon: BookOpen },
    { id: 'conversations', label: 'AI Conversations', icon: MessageSquare },
    { id: 'insights', label: 'Insights & Review', icon: Sparkles },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-stone-100/95 dark:bg-stone-900/95 border-r border-stone-200/80 dark:border-stone-800/80 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-stone-200/60 dark:border-stone-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 flex items-center justify-center font-bold text-lg shadow-sm">
                R
              </div>
              <div>
                <h1 className="font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                  ReflectAI
                </h1>
                <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Private & Isolated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === 'journal_new' && currentTab === 'journal_edit');

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Mini Profile & Logout */}
        <div className="p-4 border-t border-stone-200/60 dark:border-stone-800/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-stone-200/50 dark:bg-stone-800/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={
                  user?.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.displayName || 'User'
                  )}&background=333&color=fff`
                }
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-stone-300 dark:border-stone-700 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {user?.displayName || 'Reflective Thinker'}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  {user?.email || 'Authenticated'}
                </p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-300/50 dark:hover:bg-stone-700/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
