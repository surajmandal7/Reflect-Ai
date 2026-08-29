import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/config';
import { UserProfile, AIMode } from '../types';
import { saveJournalEntry, getJournalEntries, saveGoal } from '../services/storageService';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'reflect_ai_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize sample data for first-time users
  const seedInitialDataIfNew = async (uid: string, name: string) => {
    const existing = await getJournalEntries(uid);
    if (existing.length === 0) {
      const now = new Date();
      const sampleEntry1 = {
        id: 'entry_sample_1',
        userId: uid,
        title: 'Reflections on Learning and Career Growth',
        content: `Today I took time to look at where my energy has been going over the past several weeks.\n\nI noticed that when I am building and creating—whether it's learning modern web systems or structuring complex ideas—I feel in a state of high flow. However, I often get overwhelmed trying to do too many things simultaneously.\n\nMy goal for this month is to narrow down my focus: double down on building end-to-end applications, stay consistent with daily journaling, and prioritize sleep.\n\nKey thoughts:\n1. Focus on one major technical domain at a time.\n2. Dedicate 45 minutes every morning to deep work before opening communication channels.\n3. Remember that small daily steps compound into massive progress.`,
        tags: ['career', 'focus', 'growth', 'productivity'],
        isFavorite: true,
        isPinned: true,
        isArchived: false,
        wordCount: 118,
        characterCount: 712,
        aiSummary: 'Reflected on building momentum through focused deep work, avoiding multitasking overwhelm, and setting intentional morning routines for compounding progress.',
        aiKeyThemes: ['Career Evolution', 'Deep Focus', 'Overcoming Overwhelm', 'Daily Compounding'],
        aiActionItems: [
          'Designate 45 minutes of distraction-free morning deep work',
          'Choose one primary focus project for the month',
          'Track evening sleep routines consistently'
        ],
        mood: 'inspired',
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      };

      const sampleEntry2 = {
        id: 'entry_sample_2',
        userId: uid,
        title: 'Gratitude for Quiet Moments & Clarity',
        content: `Woke up early and went for a long walk in the morning crisp air.\n\nSometimes taking a step back from screens and information overload is the single best decision for clarity. I realized I don't need to have every answer figured out right now. Showing up with curiosity, being present with friends and family, and practicing gratitude for today is enough.`,
        tags: ['gratitude', 'mindfulness', 'clarity'],
        isFavorite: false,
        isPinned: false,
        isArchived: false,
        wordCount: 62,
        characterCount: 390,
        aiSummary: 'A gentle reminder on stepping back from sensory overload, embracing present-moment gratitude, and letting go of the need to control the future.',
        aiKeyThemes: ['Mindfulness', 'Presence', 'Clarity', 'Gratitude'],
        aiActionItems: ['Maintain a 20-minute tech-free morning walk routine'],
        mood: 'grateful',
        createdAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
      };

      await saveJournalEntry(uid, sampleEntry1);
      await saveJournalEntry(uid, sampleEntry2);

      // Seed initial goal
      await saveGoal(uid, {
        id: 'goal_sample_1',
        userId: uid,
        title: 'Establish a Consistent Morning Deep Work Routine',
        description: 'Spend the first 45 minutes of each workday focused purely on top-priority creation without digital distractions.',
        status: 'in_progress',
        tasks: [
          { id: 't1', text: 'Set phone to Do Not Disturb before going to bed', completed: true },
          { id: 't2', text: 'Identify the single most critical task the night before', completed: true },
          { id: 't3', text: 'Complete 5 consecutive days of 45-minute deep focus sessions', completed: false }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  };

  useEffect(() => {
    // Check local stored session first
    const savedLocal = localStorage.getItem(LOCAL_USER_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        setUser(parsed);
      } catch (e) {}
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const userProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Reflective Mind',
          photoURL: currentUser.photoURL,
          theme: 'system',
          defaultAiMode: 'reflect',
          dailyPromptsEnabled: true,
          createdAt: new Date().toISOString(),
        };
        setUser(userProfile);
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userProfile));
        await seedInitialDataIfNew(currentUser.uid, userProfile.displayName || 'Friend');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (auth && googleProvider) {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          const profile: UserProfile = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || 'Reflective Thinker',
            photoURL: result.user.photoURL,
            theme: 'system',
            defaultAiMode: 'reflect',
            dailyPromptsEnabled: true,
          };
          setUser(profile);
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
          await seedInitialDataIfNew(result.user.uid, profile.displayName || 'Friend');
        }
      } else {
        throw new Error('Firebase Auth not initialized.');
      }
    } catch (err: any) {
      console.warn('Google sign-in popup notice (enabling guest/demo fallback if sandbox popup is blocked):', err);
      // If popup was blocked or sandbox environment prevents popup, seamlessly provide guest session
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        !isFirebaseConfigured
      ) {
        await signInAsDemoUser();
      } else {
        setError(err.message || 'Failed to complete Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemoUser = async () => {
    setLoading(true);
    const demoProfile: UserProfile = {
      uid: 'user_reflect_coder_prod',
      email: 'developercoders517@gmail.com',
      displayName: 'Alex Rivers',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      theme: 'system',
      defaultAiMode: 'reflect',
      dailyPromptsEnabled: true,
      createdAt: new Date().toISOString(),
    };
    setUser(demoProfile);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoProfile));
    await seedInitialDataIfNew(demoProfile.uid, demoProfile.displayName || 'Alex');
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.error('Sign out error:', e);
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(LOCAL_USER_KEY);
    setLoading(false);
  };

  const updateUserPreferences = async (prefs: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...prefs };
    setUser(updated);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        signInWithGoogle,
        signInAsDemoUser,
        logout,
        updateUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
