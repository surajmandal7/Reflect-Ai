import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Star,
  Pin,
  Archive,
  Trash2,
  Download,
  Calendar,
  Clock,
  Tag,
  CheckSquare,
  Square,
  ArrowUpDown,
  Sparkles,
  ChevronRight,
  PenLine,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { JournalEntry } from '../types';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry } from '../services/storageService';
import { ConfirmModal } from '../components/ConfirmModal';

interface HistoryPageProps {
  initialSearch?: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  initialSearch = '',
  onNavigate,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'pinned' | 'archived'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'words'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getJournalEntries(user.uid);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Extract all unique tags
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || [])));

  // Filter & Sort entries
  const filteredEntries = entries.filter((entry) => {
    // Tab filter
    if (filterType === 'favorites' && !entry.isFavorite) return false;
    if (filterType === 'pinned' && !entry.isPinned) return false;
    if (filterType === 'archived' && !entry.isArchived) return false;
    if (filterType !== 'archived' && entry.isArchived) return false;

    // Tag filter
    if (selectedTag && !entry.tags?.includes(selectedTag)) return false;

    // Search query
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchTitle = entry.title.toLowerCase().includes(query);
      const matchContent = entry.content.toLowerCase().includes(query);
      const matchSummary = entry.aiSummary?.toLowerCase().includes(query) || false;
      const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(query)) || false;
      if (!matchTitle && !matchContent && !matchSummary && !matchTags) return false;
    }

    return true;
  });

  // Sort
  filteredEntries.sort((a, b) => {
    // Pinned always on top if sorting newest
    if (sortBy === 'newest') {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'words') {
      return b.wordCount - a.wordCount;
    }
    return 0;
  });

  const handleToggleFavorite = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const updated = { ...entry, isFavorite: !entry.isFavorite, updatedAt: new Date().toISOString() };
    await saveJournalEntry(user.uid, updated);
    setEntries((prev) => prev.map((item) => (item.id === entry.id ? updated : item)));
    showToast(updated.isFavorite ? 'Marked as favorite' : 'Removed from favorites', 'success');
  };

  const handleTogglePin = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const updated = { ...entry, isPinned: !entry.isPinned, updatedAt: new Date().toISOString() };
    await saveJournalEntry(user.uid, updated);
    setEntries((prev) => prev.map((item) => (item.id === entry.id ? updated : item)));
    showToast(updated.isPinned ? 'Pinned to top' : 'Unpinned', 'info');
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map((e) => e.id));
    }
  };

  // Bulk Actions
  const handleBulkArchive = async () => {
    if (!user || selectedIds.length === 0) return;
    const isCurrentlyArchived = filterType === 'archived';
    for (const id of selectedIds) {
      const entry = entries.find((e) => e.id === id);
      if (entry) {
        await saveJournalEntry(user.uid, {
          ...entry,
          isArchived: !isCurrentlyArchived,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    await loadData();
    setSelectedIds([]);
    showToast(isCurrentlyArchived ? 'Restored selected entries' : 'Archived selected entries', 'info');
  };

  const handleBulkDelete = () => {
    if (!user || selectedIds.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (!user || selectedIds.length === 0) return;
    setShowBulkDeleteModal(false);
    try {
      for (const id of selectedIds) {
        await deleteJournalEntry(user.uid, id);
      }
      await loadData();
      setSelectedIds([]);
      showToast('Selected entries deleted', 'info');
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      showToast('Failed to delete entries.', 'error');
    }
  };

  // Export JSON or Markdown
  const handleExportData = (format: 'json' | 'markdown') => {
    const toExport = selectedIds.length > 0 ? entries.filter((e) => selectedIds.includes(e.id)) : entries;

    if (toExport.length === 0) {
      showToast('No entries to export.', 'info');
      return;
    }

    let fileContent = '';
    let mimeType = 'text/plain';
    let fileName = `reflect_ai_export_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      fileContent = JSON.stringify(toExport, null, 2);
      mimeType = 'application/json';
      fileName += '.json';
    } else {
      fileContent = toExport
        .map(
          (e) =>
            `# ${e.title}\n*Date: ${new Date(e.createdAt).toLocaleString()} | Mood: ${e.mood || 'N/A'} | Words: ${
              e.wordCount
            }*\n*Tags: ${e.tags.join(', ')}*\n\n${e.content}\n\n${
              e.aiSummary ? `> **AI Summary**: ${e.aiSummary}\n\n` : ''
            }---\n`
        )
        .join('\n\n');
      mimeType = 'text/markdown';
      fileName += '.md';
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${toExport.length} reflections as ${format.toUpperCase()}`, 'success');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Reflection History
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Browse, search, and manage all your past journal reflections
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <button
            id="export-markdown-btn"
            onClick={() => handleExportData('markdown')}
            className="px-3 py-2 rounded-xl bg-stone-200/70 dark:bg-stone-800/80 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </button>

          <button
            id="history-new-reflection-btn"
            onClick={() => onNavigate('journal_new')}
            className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="p-4 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="history-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, title, summary, or thoughts..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-300/70 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              id="history-sort-select"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-300/70 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="words">Most Words</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="filter-all-btn"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              All Active ({entries.filter((e) => !e.isArchived).length})
            </button>

            <button
              id="filter-favorites-btn"
              onClick={() => setFilterType('favorites')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'favorites'
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400 fill-current" />
              <span>Favorites</span>
            </button>

            <button
              id="filter-pinned-btn"
              onClick={() => setFilterType('pinned')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'pinned'
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </button>

            <button
              id="filter-archived-btn"
              onClick={() => setFilterType('archived')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'archived'
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>Archived ({entries.filter((e) => e.isArchived).length})</span>
            </button>
          </div>

          {/* Tags list */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1">
              <span className="text-[11px] text-stone-400">Tags:</span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-2 py-0.5 rounded-md bg-stone-300 dark:bg-stone-700 text-[10px] font-semibold"
                >
                  Clear Tag
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                    selectedTag === tag
                      ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Action Controls */}
        {filteredEntries.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-stone-800 text-xs text-stone-500">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
            >
              {selectedIds.length === filteredEntries.length && filteredEntries.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>Select All ({selectedIds.length} chosen)</span>
            </button>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkArchive}
                  className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 font-medium"
                >
                  {filterType === 'archived' ? 'Restore Selected' : 'Archive Selected'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-medium"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-100/60 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-800">
          <Calendar className="w-8 h-8 mx-auto text-stone-400 mb-3" />
          <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-100">
            No reflections match your filters.
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Try adjusting your search query or switching active filter tabs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isSelected = selectedIds.includes(entry.id);

            return (
              <div
                key={entry.id}
                onClick={() => onNavigate('journal_edit', entry.id)}
                className={`p-5 rounded-2xl bg-stone-100/90 dark:bg-stone-900/90 border transition-all cursor-pointer group flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isSelected
                    ? 'border-amber-500 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-stone-200/80 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Select Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelect(entry.id, e)}
                    className="mt-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-600 fill-amber-100 dark:fill-amber-950" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.isPinned && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-[10px] font-bold flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                        {entry.title}
                      </h3>
                      {entry.mood && (
                        <span className="text-xs text-stone-500 bg-stone-200/60 dark:bg-stone-800/60 px-2 py-0.5 rounded-md capitalize">
                          {entry.mood}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed max-w-3xl">
                      {entry.content}
                    </p>

                    {entry.aiSummary && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 bg-stone-200/40 dark:bg-stone-800/50 p-2 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="line-clamp-1 italic text-[11px]">{entry.aiSummary}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>&bull;</span>
                      <span>{entry.wordCount} words</span>

                      {entry.tags.length > 0 && (
                        <>
                          <span>&bull;</span>
                          <div className="flex items-center gap-1">
                            {entry.tags.map((t) => (
                              <span key={t} className="text-stone-500 dark:text-stone-400">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Side Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-center">
                  <button
                    onClick={(e) => handleToggleFavorite(entry, e)}
                    className={`p-2 rounded-xl transition-colors ${
                      entry.isFavorite ? 'text-amber-500' : 'text-stone-400 hover:text-stone-600'
                    }`}
                    title={entry.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={(e) => handleTogglePin(entry, e)}
                    className={`p-2 rounded-xl transition-colors ${
                      entry.isPinned ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600'
                    }`}
                    title={entry.isPinned ? 'Unpin' : 'Pin to Top'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Selected Reflections?"
        description={`This will permanently delete ${selectedIds.length} selected reflection(s). This action cannot be undone.`}
        confirmLabel={`Delete (${selectedIds.length})`}
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />
    </div>
  );
};
