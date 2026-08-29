import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PenLine,
  Star,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { JournalEntry } from '../types';
import { getJournalEntries } from '../services/storageService';

interface CalendarPageProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const data = await getJournalEntries(user.uid);
      setEntries(data);
    }
    loadData();
  }, [user]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Group entries by date YYYY-MM-DD
  const entriesByDate = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const d = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(entry);
    return acc;
  }, {});

  const selectedDateEntries = entriesByDate[selectedDate] || [];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Reflection Calendar
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            View your writing consistency and revisit past days of introspection
          </p>
        </div>

        <button
          onClick={() => onNavigate('journal_new')}
          className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
        >
          <PenLine className="w-3.5 h-3.5" />
          <span>Write Reflection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Matrix Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-stone-800">
            <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
              {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-400 py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-20 rounded-2xl opacity-20" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEntries = entriesByDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-14 sm:h-20 p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition-all border ${
                    isSelected
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 shadow-xs'
                      : dayEntries.length > 0
                      ? 'bg-amber-100/60 dark:bg-stone-800/90 border-amber-200 dark:border-stone-700 hover:border-amber-400'
                      : 'bg-stone-200/40 dark:bg-stone-800/30 border-transparent hover:bg-stone-200/80 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isToday && !isSelected
                          ? 'w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center'
                          : ''
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEntries.length > 0 && (
                      <span className="text-[10px] font-mono px-1 rounded-sm bg-amber-200/80 dark:bg-stone-700 text-amber-900 dark:text-stone-200">
                        {dayEntries.length}
                      </span>
                    )}
                  </div>

                  {dayEntries.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[10px] truncate opacity-80 hidden sm:inline">
                        {dayEntries[0].title}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Reflections Sidebar */}
        <div className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
          <div className="pb-3 border-b border-stone-200/60 dark:border-stone-800">
            <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
              Reflections on {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {selectedDateEntries.length} reflection(s) written
            </p>
          </div>

          {selectedDateEntries.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <CalendarIcon className="w-8 h-8 mx-auto text-stone-400" />
              <p className="text-xs text-stone-500">No reflections logged for this day.</p>
              <button
                onClick={() => onNavigate('journal_new')}
                className="px-3 py-1.5 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold"
              >
                Write for today
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {selectedDateEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onNavigate('journal_edit', entry.id)}
                  className="p-4 rounded-2xl bg-stone-200/60 dark:bg-stone-800/80 border border-stone-300/50 dark:border-stone-700/60 cursor-pointer hover:border-stone-400 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {entry.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-current" />}
                  </div>

                  <h4 className="font-serif text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {entry.title}
                  </h4>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                    {entry.content}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>{entry.wordCount} words</span>
                    <span className="text-stone-900 dark:text-stone-100 font-semibold flex items-center gap-0.5">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
