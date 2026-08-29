import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let isFirebaseConfigured = false;

try {
  const env = (import.meta as any).env || {};
  const firebaseConfig = {
    apiKey: firebaseConfigJson.apiKey || env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForReflectAIAppletStudio',
    authDomain: firebaseConfigJson.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || 'reflect-ai-studio.firebaseapp.com',
    projectId: firebaseConfigJson.projectId || env.VITE_FIREBASE_PROJECT_ID || 'reflect-ai-studio',
    storageBucket: firebaseConfigJson.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || 'reflect-ai-studio.appspot.com',
    messagingSenderId: firebaseConfigJson.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '398297773338',
    appId: firebaseConfigJson.appId || env.VITE_FIREBASE_APP_ID || '1:398297773338:web:reflectaistudio',
  };

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  
  const databaseId = firebaseConfigJson.firestoreDatabaseId;
  if (databaseId && databaseId !== '(default)') {
    db = getFirestore(app, databaseId);
  } else {
    db = getFirestore(app);
  }

  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  isFirebaseConfigured = true;

  // Test server connection as per guidelines
  if (db) {
    getDocFromServer(doc(db, 'test', 'connection')).catch((err) => {
      // Offline/unprovisioned fallback note
      if (err instanceof Error && err.message.includes('the client is offline')) {
        console.info('Firestore client running in resilient local/offline cache mode.');
      }
    });
  }
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo:
        currentAuth?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { app, auth, db, googleProvider, isFirebaseConfigured };
