// ─── Perrito Fit – Firebase Configuration ────────────────────────────────────

import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported from firebase/auth/react-native
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyA0ALAFBGBx1T_G3c2FcZAYYExoKfxB2h4",
  authDomain: "perrito-fit.firebaseapp.com",
  projectId: "perrito-fit",
  storageBucket: "perrito-fit.firebasestorage.app",
  messagingSenderId: "467593143794",
  appId: "1:467593143794:web:eb435794021a9fd863376b",
  measurementId: "G-JYSK74064L"
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
