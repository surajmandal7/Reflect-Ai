import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/config';
import { JournalEntry, Conversation, Message, Goal, InsightReport, UserProfile } from '../types';

// Storage Key Prefix for resilient offline synchronization
const LOCAL_PREFIX = 'reflect_ai_';

function getLocalKey(uid: string, entity: string): string {
  return `${LOCAL_PREFIX}${uid}_${entity}`;
}

function cleanPayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Local storage fallback helpers
function readLocal<T>(uid: string, entity: string): T[] {
  try {
    const raw = localStorage.getItem(getLocalKey(uid, entity));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Local read error:', e);
    return [];
  }
}

function writeLocal<T>(uid: string, entity: string, items: T[]): void {
  try {
    localStorage.setItem(getLocalKey(uid, entity), JSON.stringify(items));
  } catch (e) {
    console.error('Local write error:', e);
  }
}

// ==================== JOURNAL ENTRIES ====================

export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const path = `users/${userId}/entries`;

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'entries');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const entries: JournalEntry[] = [];
      snapshot.forEach((d) => {
        entries.push(d.data() as JournalEntry);
      });
      // Sync local backup
      writeLocal(userId, 'entries', entries);
      return entries;
    }
  } catch (error) {
    console.warn('Firestore fetch entries error, falling back to local cache:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e) {
      // Return cached local entries
    }
  }

  // Fallback to local
  return readLocal<JournalEntry>(userId, 'entries').sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getJournalEntryById(userId: string, entryId: string): Promise<JournalEntry | null> {
  if (!userId || !entryId) return null;
  const path = `users/${userId}/entries/${entryId}`;

  try {
    if (db) {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as JournalEntry;
      }
    }
  } catch (error) {
    console.warn('Firestore get entry error:', error);
  }

  const locals = readLocal<JournalEntry>(userId, 'entries');
  return locals.find((e) => e.id === entryId) || null;
}

export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId || !entry.id) throw new Error('Invalid user or entry ID');
  const path = `users/${userId}/entries/${entry.id}`;
  const sanitized = cleanPayload(entry);

  // Optimistic local update first
  const locals = readLocal<JournalEntry>(userId, 'entries');
  const index = locals.findIndex((e) => e.id === entry.id);
  if (index >= 0) {
    locals[index] = sanitized;
  } else {
    locals.unshift(sanitized);
  }
  writeLocal(userId, 'entries', locals);

  // Firestore sync
  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'entries', entry.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      console.warn('Firestore save error:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const path = `users/${userId}/entries/${entryId}`;

  // Local remove
  const locals = readLocal<JournalEntry>(userId, 'entries').filter((e) => e.id !== entryId);
  writeLocal(userId, 'entries', locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'entries', entryId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

// ==================== CONVERSATIONS & MESSAGES ====================

export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];
  const path = `users/${userId}/conversations`;

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'conversations');
      const q = query(colRef, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const convs: Conversation[] = [];
      snap.forEach((d) => convs.push(d.data() as Conversation));
      writeLocal(userId, 'conversations', convs);
      return convs;
    }
  } catch (error) {
    console.warn('Firestore get conversations error:', error);
  }

  return readLocal<Conversation>(userId, 'conversations').sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function saveConversation(userId: string, conversation: Conversation): Promise<void> {
  if (!userId || !conversation.id) return;
  const path = `users/${userId}/conversations/${conversation.id}`;
  const sanitized = cleanPayload(conversation);

  const locals = readLocal<Conversation>(userId, 'conversations');
  const idx = locals.findIndex((c) => c.id === conversation.id);
  if (idx >= 0) {
    locals[idx] = sanitized;
  } else {
    locals.unshift(sanitized);
  }
  writeLocal(userId, 'conversations', locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'conversations', conversation.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  if (!userId || !conversationId) return;
  const path = `users/${userId}/conversations/${conversationId}`;

  const locals = readLocal<Conversation>(userId, 'conversations').filter((c) => c.id !== conversationId);
  writeLocal(userId, 'conversations', locals);

  // Clear local messages too
  try {
    localStorage.removeItem(`${LOCAL_PREFIX}${userId}_messages_${conversationId}`);
  } catch (e) {}

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'conversations', conversationId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function getConversationMessages(userId: string, conversationId: string): Promise<Message[]> {
  if (!userId || !conversationId) return [];
  const path = `users/${userId}/conversations/${conversationId}/messages`;
  const localKey = `messages_${conversationId}`;

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
      const q = query(colRef, orderBy('timestamp', 'asc'));
      const snap = await getDocs(q);
      const msgs: Message[] = [];
      snap.forEach((d) => msgs.push(d.data() as Message));
      writeLocal(userId, localKey, msgs);
      return msgs;
    }
  } catch (error) {
    console.warn('Firestore get messages error:', error);
  }

  return readLocal<Message>(userId, localKey).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function saveMessage(userId: string, conversationId: string, message: Message): Promise<void> {
  if (!userId || !conversationId || !message.id) return;
  const path = `users/${userId}/conversations/${conversationId}/messages/${message.id}`;
  const localKey = `messages_${conversationId}`;
  const sanitized = cleanPayload(message);

  const locals = readLocal<Message>(userId, localKey);
  const idx = locals.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    locals[idx] = sanitized;
  } else {
    locals.push(sanitized);
  }
  writeLocal(userId, localKey, locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'conversations', conversationId, 'messages', message.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

// ==================== GOALS ====================

export async function getGoals(userId: string): Promise<Goal[]> {
  if (!userId) return [];
  const path = `users/${userId}/goals`;

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'goals');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const goals: Goal[] = [];
      snap.forEach((d) => goals.push(d.data() as Goal));
      writeLocal(userId, 'goals', goals);
      return goals;
    }
  } catch (error) {
    console.warn('Firestore get goals error:', error);
  }

  return readLocal<Goal>(userId, 'goals').sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveGoal(userId: string, goal: Goal): Promise<void> {
  if (!userId || !goal.id) return;
  const path = `users/${userId}/goals/${goal.id}`;
  const sanitized = cleanPayload(goal);

  const locals = readLocal<Goal>(userId, 'goals');
  const idx = locals.findIndex((g) => g.id === goal.id);
  if (idx >= 0) {
    locals[idx] = sanitized;
  } else {
    locals.unshift(sanitized);
  }
  writeLocal(userId, 'goals', locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'goals', goal.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;
  const path = `users/${userId}/goals/${goalId}`;

  const locals = readLocal<Goal>(userId, 'goals').filter((g) => g.id !== goalId);
  writeLocal(userId, 'goals', locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'goals', goalId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

// ==================== INSIGHTS ====================

export async function getInsights(userId: string): Promise<InsightReport[]> {
  if (!userId) return [];
  const path = `users/${userId}/insights`;

  try {
    if (db) {
      const colRef = collection(db, 'users', userId, 'insights');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items: InsightReport[] = [];
      snap.forEach((d) => items.push(d.data() as InsightReport));
      writeLocal(userId, 'insights', items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore get insights error:', error);
  }

  return readLocal<InsightReport>(userId, 'insights').sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveInsight(userId: string, insight: InsightReport): Promise<void> {
  if (!userId || !insight.id) return;
  const path = `users/${userId}/insights/${insight.id}`;
  const sanitized = cleanPayload(insight);

  const locals = readLocal<InsightReport>(userId, 'insights');
  const idx = locals.findIndex((i) => i.id === insight.id);
  if (idx >= 0) {
    locals[idx] = sanitized;
  } else {
    locals.unshift(sanitized);
  }
  writeLocal(userId, 'insights', locals);

  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'insights', insight.id);
      await setDoc(docRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

// ==================== STATS & METRICS ====================

export function calculateWritingStreak(entries: JournalEntry[]): number {
  if (!entries.length) return 0;

  // Extract unique active dates YYYY-MM-DD
  const activeDates = new Set(
    entries.map((e) => new Date(e.createdAt).toISOString().split('T')[0])
  );

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Streak continues if logged today or yesterday
  let checkDate = new Date();
  if (!activeDates.has(todayStr)) {
    if (!activeDates.has(yesterdayStr)) {
      return 0;
    }
    checkDate = yesterday;
  }

  let streak = 0;
  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (activeDates.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateStats(entries: JournalEntry[], goals: Goal[]) {
  const activeEntries = entries.filter((e) => !e.isArchived);
  const totalWords = activeEntries.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
  const activeGoals = goals.filter((g) => g.status === 'in_progress' || g.status === 'not_started').length;
  const streak = calculateWritingStreak(activeEntries);

  return {
    totalEntries: activeEntries.length,
    writingStreak: streak,
    wordsWritten: totalWords,
    activeGoals,
  };
}

// ==================== SEMANTIC & KEYWORD SEARCH ====================

export function searchJournalEntries(entries: JournalEntry[], queryStr: string): JournalEntry[] {
  if (!queryStr || queryStr.trim() === '') return entries;

  const rawTerms = queryStr.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!rawTerms.length) return entries;

  // Career / emotion semantic expansion map
  const semanticMap: Record<string, string[]> = {
    career: ['job', 'work', 'profession', 'hiring', 'interview', 'promotion', 'resume', 'skills', 'coding', 'company', 'startup'],
    worried: ['anxious', 'stress', 'fear', 'overwhelmed', 'nervous', 'scared', 'uncertain', 'doubt'],
    gratitude: ['grateful', 'thankful', 'blessed', 'appreciation', 'joy', 'happy'],
    productivity: ['focus', 'routine', 'habits', 'goals', 'discipline', 'time', 'procrastination'],
    growth: ['learning', 'development', 'reflection', 'progress', 'mindset', 'evolution'],
    health: ['sleep', 'exercise', 'energy', 'rest', 'exhausted', 'mental', 'body'],
  };

  const expandedTerms = new Set<string>(rawTerms);
  rawTerms.forEach((term) => {
    Object.entries(semanticMap).forEach(([key, syns]) => {
      if (key === term || syns.includes(term)) {
        expandedTerms.add(key);
        syns.forEach((s) => expandedTerms.add(s));
      }
    });
  });

  const termArray = Array.from(expandedTerms);

  const scored = entries.map((entry) => {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const summaryLower = (entry.aiSummary || '').toLowerCase();
    const tagsLower = (entry.tags || []).map((t) => t.toLowerCase()).join(' ');

    termArray.forEach((t) => {
      if (titleLower.includes(t)) score += 10;
      if (tagsLower.includes(t)) score += 8;
      if (summaryLower.includes(t)) score += 5;
      if (contentLower.includes(t)) score += 2;
    });

    return { entry, score };
  });

  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.entry);
}

// ==================== DATA EXPORT ====================

export function exportUserData(
  user: UserProfile,
  entries: JournalEntry[],
  goals: Goal[],
  insights: InsightReport[],
  format: 'json' | 'markdown' | 'csv'
): void {
  const dateStr = new Date().toISOString().split('T')[0];
  let blob: Blob;
  let filename: string;

  if (format === 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      user: { email: user.email, displayName: user.displayName },
      entries,
      goals,
      insights,
    };
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    filename = `reflect_ai_export_${dateStr}.json`;
  } else if (format === 'markdown') {
    let md = `# ReflectAI Journal Export\n**Date:** ${dateStr}\n**User:** ${user.displayName || user.email}\n\n---\n\n`;

    md += `## Journal Entries (${entries.length})\n\n`;
    entries.forEach((e) => {
      md += `### ${e.title}\n*Created: ${new Date(e.createdAt).toLocaleString()} | Tags: ${e.tags.join(', ')} | Mood: ${e.mood || 'N/A'}*\n\n`;
      if (e.aiSummary) {
        md += `> **AI Summary:** ${e.aiSummary}\n\n`;
      }
      md += `${e.content}\n\n---\n\n`;
    });

    md += `## Goals (${goals.length})\n\n`;
    goals.forEach((g) => {
      md += `### [${g.status.toUpperCase()}] ${g.title}\n${g.description || ''}\n`;
      g.tasks.forEach((t) => {
        md += `- [${t.completed ? 'x' : ' '}] ${t.text}\n`;
      });
      md += `\n`;
    });

    blob = new Blob([md], { type: 'text/markdown' });
    filename = `reflect_ai_export_${dateStr}.md`;
  } else {
    // CSV format
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    let csv = 'ID,Title,Created Date,Word Count,Tags,Mood,Favorite,Archived,AI Summary,Content\n';
    entries.forEach((e) => {
      csv += `${escapeCsv(e.id)},${escapeCsv(e.title)},${escapeCsv(e.createdAt)},${e.wordCount},${escapeCsv(
        e.tags.join(';')
      )},${escapeCsv(e.mood || '')},${e.isFavorite},${e.isArchived},${escapeCsv(e.aiSummary || '')},${escapeCsv(
        e.content
      )}\n`;
    });

    blob = new Blob([csv], { type: 'text/csv' });
    filename = `reflect_ai_export_${dateStr}.csv`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== DANGEROUS ACTIONS ====================

export async function deleteAllUserData(userId: string): Promise<void> {
  if (!userId) return;

  // Clear local storage
  const keys = Object.keys(localStorage);
  keys.forEach((k) => {
    if (k.startsWith(`${LOCAL_PREFIX}${userId}`)) {
      localStorage.removeItem(k);
    }
  });

  // If connected to Firestore, delete subcollections documents
  if (db) {
    try {
      const entryDocs = await getDocs(collection(db, 'users', userId, 'entries'));
      entryDocs.forEach((d) => deleteDoc(d.ref));

      const convDocs = await getDocs(collection(db, 'users', userId, 'conversations'));
      convDocs.forEach((d) => deleteDoc(d.ref));

      const goalDocs = await getDocs(collection(db, 'users', userId, 'goals'));
      goalDocs.forEach((d) => deleteDoc(d.ref));

      const insightDocs = await getDocs(collection(db, 'users', userId, 'insights'));
      insightDocs.forEach((d) => deleteDoc(d.ref));
    } catch (e) {
      console.error('Delete all data firestore error:', e);
    }
  }
}
