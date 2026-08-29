import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Clock,
  ArrowRight,
  BookOpen,
  Calendar,
  X,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Goal, GoalTask } from '../types';
import { getGoals, saveGoal, deleteGoal } from '../services/storageService';

interface GoalsPageProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'all'>('in_progress');

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTasks, setNewTasks] = useState<string[]>(['']);
  const [targetDate, setTargetDate] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetched = await getGoals(user.uid);
      setGoals(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleToggleTask = async (goal: Goal, taskId: string) => {
    if (!user) return;
    const updatedTasks = goal.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    const allCompleted = updatedTasks.length > 0 && updatedTasks.every((t) => t.completed);
    const updatedGoal: Goal = {
      ...goal,
      tasks: updatedTasks,
      status: allCompleted ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString(),
    };

    await saveGoal(user.uid, updatedGoal);
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updatedGoal : g)));
    showToast(allCompleted ? 'Goal completed! 🎉' : 'Task updated', 'success');
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    if (window.confirm('Delete this goal and its tasks?')) {
      await deleteGoal(user.uid, goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      showToast('Goal deleted', 'info');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    const validTasks: GoalTask[] = newTasks
      .filter((t) => t.trim())
      .map((t, idx) => ({ id: `t_${Date.now()}_${idx}`, text: t.trim(), completed: false }));

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      userId: user.uid,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      status: 'in_progress',
      targetDate: targetDate || undefined,
      tasks: validTasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveGoal(user.uid, newGoal);
    setGoals((prev) => [newGoal, ...prev]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewTasks(['']);
    setTargetDate('');
    showToast('New goal created!', 'success');
  };

  const filteredGoals = goals.filter((g) => {
    if (activeTab === 'in_progress') return g.status !== 'completed';
    if (activeTab === 'completed') return g.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Goals & Action Items
          </h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Transform reflections into achievable milestones and track your progress
          </p>
        </div>

        <button
          id="create-goal-modal-btn"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-stone-800 pb-3">
        <button
          id="goals-tab-in-progress"
          onClick={() => setActiveTab('in_progress')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'in_progress'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
          }`}
        >
          In Progress ({goals.filter((g) => g.status !== 'completed').length})
        </button>

        <button
          id="goals-tab-completed"
          onClick={() => setActiveTab('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
          }`}
        >
          Completed ({goals.filter((g) => g.status === 'completed').length})
        </button>

        <button
          id="goals-tab-all"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
          }`}
        >
          All Goals ({goals.length})
        </button>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-100/60 dark:bg-stone-900/60 border border-dashed border-stone-300 dark:border-stone-800">
          <Target className="w-8 h-8 mx-auto text-stone-400 mb-3" />
          <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-100">
            No goals in this view.
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Extract goals from your reflections or create one manually to build momentum.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const completedCount = goal.tasks.filter((t) => t.completed).length;
            const progressPct =
              goal.tasks.length > 0 ? Math.round((completedCount / goal.tasks.length) * 100) : 0;

            return (
              <div
                key={goal.id}
                className="p-6 rounded-3xl bg-stone-100/80 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            goal.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                        {goal.targetDate && (
                          <span className="text-[11px] text-stone-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                        {goal.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 text-stone-400 hover:text-rose-500 transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {goal.description && (
                    <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  {goal.tasks.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-stone-500">
                        <span>Milestones Completed</span>
                        <span>
                          {completedCount}/{goal.tasks.length} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progressPct === 100 ? 'bg-emerald-500' : 'bg-stone-900 dark:bg-stone-100'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Subtask Checklists */}
                  <div className="mt-4 space-y-2">
                    {goal.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleToggleTask(goal, task.id)}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left text-xs transition-colors ${
                          task.completed
                            ? 'bg-stone-200/50 dark:bg-stone-800/40 text-stone-400 line-through'
                            : 'bg-stone-200/80 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 hover:bg-stone-300/80'
                        }`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <span>{task.text}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source link if extracted from reflection */}
                {goal.sourceEntryId && (
                  <div className="pt-3 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[11px]">
                    <span className="text-stone-400">Extracted from journal reflection</span>
                    <button
                      onClick={() => onNavigate('journal_edit', goal.sourceEntryId)}
                      className="text-stone-800 dark:text-stone-200 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View Source</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                Create New Goal
              </h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Goal Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master React Performance & Clean Architecture"
                  className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Why is this meaningful to you?"
                  className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Actionable Checklist Tasks</label>
                <div className="space-y-2">
                  {newTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={t}
                        onChange={(e) => {
                          const updated = [...newTasks];
                          updated[idx] = e.target.value;
                          setNewTasks(updated);
                        }}
                        placeholder={`Subtask ${idx + 1}...`}
                        className="flex-1 p-2 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 focus:outline-hidden"
                      />
                      {newTasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewTasks(newTasks.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewTasks([...newTasks, ''])}
                    className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add another task</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-semibold"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
