// ─── Perrito Fit – Firestore Service ──────────────────────────────────────────

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UserProfile,
  Goals,
  DailyLog,
  DailyTotals,
  Meal,
} from '../types';

// ────────────────────────────── User Profile ─────────────────────────────────

/**
 * Fetch the user profile document from `users/{uid}`.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/**
 * Partially update the user's goals map.
 */
export async function updateUserGoals(
  uid: string,
  goals: Partial<Goals>,
): Promise<void> {
  // Build a flat update map so Firestore merges individual keys
  const updateMap: Record<string, number> = {};
  for (const [key, value] of Object.entries(goals)) {
    if (value !== undefined) {
      updateMap[`goals.${key}`] = value;
    }
  }
  await updateDoc(doc(db, 'users', uid), updateMap);
}

// ──────────────────────────── Daily Log Helpers ──────────────────────────────

/** Firestore path helper: `users/{uid}/dailyLogs/{date}` */
function dailyLogRef(uid: string, date: string) {
  return doc(db, 'users', uid, 'dailyLogs', date);
}

/** Empty totals used when creating a brand-new daily log. */
const EMPTY_TOTALS: DailyTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  waterIntake: 0,
};

// ─────────────────────────────── Daily Logs ──────────────────────────────────

/**
 * Get the daily log for the given date (`YYYY-MM-DD`).
 */
export async function getDailyLog(
  uid: string,
  date: string,
): Promise<DailyLog | null> {
  const snap = await getDoc(dailyLogRef(uid, date));
  return snap.exists() ? (snap.data() as DailyLog) : null;
}

/**
 * Create or merge a daily log document.
 */
export async function saveDailyLog(
  uid: string,
  date: string,
  data: Partial<DailyLog>,
): Promise<void> {
  await setDoc(dailyLogRef(uid, date), { date, ...data }, { merge: true });
}

/**
 * Append a meal to the daily log and update running totals.
 * If no log exists for the day it will be created automatically.
 */
export async function addMealToLog(
  uid: string,
  date: string,
  meal: Meal,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First meal of the day – bootstrap the document
    const newLog: DailyLog = {
      date,
      meals: [meal],
      totals: {
        calories: meal.calories,
        protein: meal.macros.protein,
        carbs: meal.macros.carbs,
        fat: meal.macros.fat,
        waterIntake: 0,
      },
    };
    await setDoc(ref, newLog);
  } else {
    // Append meal and increment totals atomically
    await updateDoc(ref, {
      meals: arrayUnion(meal),
      'totals.calories': increment(meal.calories),
      'totals.protein': increment(meal.macros.protein),
      'totals.carbs': increment(meal.macros.carbs),
      'totals.fat': increment(meal.macros.fat),
    });
  }
}

/**
 * Add glasses of water to the daily log.
 * Creates the document if it doesn't exist yet.
 */
export async function addWater(
  uid: string,
  date: string,
  glasses: number,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS, waterIntake: glasses },
    };
    await setDoc(ref, newLog);
  } else {
    await updateDoc(ref, {
      'totals.waterIntake': increment(glasses),
    });
  }
}

/**
 * Set or update the current weight for a given day.
 */
export async function updateWeight(
  uid: string,
  date: string,
  weight: number,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS },
      currentWeight: weight,
    };
    await setDoc(ref, newLog);
  } else {
    await updateDoc(ref, { currentWeight: weight });
  }
}

// ──────────────────────────── Weekly Summary ─────────────────────────────────

/**
 * Fetch up to 7 daily logs starting from `startDate` (inclusive).
 * Returns logs sorted by date ascending.
 */
export async function getWeeklyLogs(
  uid: string,
  startDate: string,
): Promise<DailyLog[]> {
  // Compute the end date (startDate + 6 days)
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endDate = end.toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const logsRef = collection(db, 'users', uid, 'dailyLogs');
  const q = query(
    logsRef,
    where('date', '>=', startDate),
    where('date', '<=', endDate),
  );

  const snapshot = await getDocs(q);
  const logs: DailyLog[] = [];
  snapshot.forEach((docSnap) => {
    logs.push(docSnap.data() as DailyLog);
  });

  // Sort ascending by date string (ISO format sorts lexicographically)
  logs.sort((a, b) => a.date.localeCompare(b.date));

  return logs;
}
