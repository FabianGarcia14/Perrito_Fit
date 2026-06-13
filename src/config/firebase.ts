// ─── Perrito Fit – Firebase Configuration ────────────────────────────────────

import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported from firebase/auth/react-native
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/** Firebase app instance */
const app = initializeApp(firebaseConfig);

/** Firebase Auth with React Native persistence (AsyncStorage) */
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

/** Cloud Firestore instance */
const db = getFirestore(app);

export { app, auth, db };
