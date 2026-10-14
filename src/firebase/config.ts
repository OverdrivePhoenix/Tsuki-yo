import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Standard Firebase Client Config (supports VITE_ environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeSampleKeyForLocalDevAndDemo1234",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "prefetch-campus.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "prefetch-campus",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "prefetch-campus.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:abcdef123456"
};

// Initialize or reuse Firebase App instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
