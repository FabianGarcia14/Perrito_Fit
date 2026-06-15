// ─── Perrito Fit – Auth Service ───────────────────────────────────────────────

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { Goals, UserProfile } from '../types';

/** Default nutritional & hydration goals for new users */
const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  water: 64,
  sodium: 2300,
  cholesterol: 300,
  sugars: 50,
  fiber: 28,
  weight: 150,
  fastingHours: 14,
  fastingStartTime: '20:00',
};

/**
 * Register a new user.
 * Creates a Firebase Auth account and stores the initial profile in Firestore.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<UserProfile> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  // Set the display name on the Auth profile
  await updateProfile(user, { displayName: name });

  // Create the Firestore user document with default goals
  const profile: UserProfile = {
    uid: user.uid,
    email,
    displayName: name,
    goals: DEFAULT_GOALS,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), profile);
  return profile;
}

/**
 * Sign in an existing user with email & password.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<UserProfile> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return fetchUserProfile(credential.user);
}

/**
 * Fetch the Firestore profile for a Firebase Auth user.
 * Creates a default profile if one doesn't exist yet.
 */
export async function fetchUserProfile(user: User): Promise<UserProfile> {
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  // Fallback – create profile on the fly
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? 'User',
    createdAt: new Date().toISOString(),
    goals: DEFAULT_GOALS,
  };
  await setDoc(doc(db, 'users', user.uid), profile);
  return profile;
}

/**
 * Update nutrition goals.
 */
export async function updateGoals(
  uid: string,
  goals: Goals,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), { goals }, { merge: true });
}

/**
 * Sign the current user out.
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Return the currently authenticated user (or null).
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Change the user's password safely by re-authenticating first.
 */
export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No authenticated user');

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
