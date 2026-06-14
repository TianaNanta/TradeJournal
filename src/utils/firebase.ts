import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  const stored = localStorage.getItem('firebase_config');
  if (stored) {
    try {
      return JSON.parse(stored) as FirebaseConfig;
    } catch (_e) {
      return null;
    }
  }

  return null;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    if (getApps().length === 0) {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
    } else {
      app = getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
    }
    return { app, auth, db };
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    initFirebase();
  }
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please configure credentials first.');
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    initFirebase();
  }
  if (!db) {
    throw new Error('Firestore is not initialized. Please configure credentials first.');
  }
  return db;
}

export function saveFirebaseConfig(config: FirebaseConfig): boolean {
  try {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    // Re-initialize
    const result = initFirebase();
    return result !== null;
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    return false;
  }
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem('firebase_config');
  app = null;
  auth = null;
  db = null;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
