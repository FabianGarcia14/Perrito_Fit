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
  orderBy,
  limit,
  deleteField,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  UserProfile,
  Goals,
  DailyLog,
  DailyTotals,
  Meal,
} from '../types';
import { getLocalDateString } from '../utils/dateUtils';

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
  sodium: 0,
  cholesterol: 0,
  sugars: 0,
  fiber: 0,
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
        sodium: meal.macros.sodium || 0,
        cholesterol: meal.macros.cholesterol || 0,
        sugars: meal.macros.sugars || 0,
        fiber: meal.macros.fiber || 0,
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
      'totals.sodium': increment(meal.macros.sodium || 0),
      'totals.cholesterol': increment(meal.macros.cholesterol || 0),
      'totals.sugars': increment(meal.macros.sugars || 0),
      'totals.fiber': increment(meal.macros.fiber || 0),
    });
  }
}

/**
 * Remove a meal from the daily log and recalculate totals.
 */
export async function removeMealFromLog(
  uid: string,
  date: string,
  meal: Meal,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const log = snap.data() as DailyLog;
  const updatedMeals = log.meals.filter((m) => m.id !== meal.id);

  let newCalories = 0, newProtein = 0, newCarbs = 0, newFat = 0;
  let newSodium = 0, newCholesterol = 0, newSugars = 0, newFiber = 0;

  updatedMeals.forEach((m) => {
    newCalories += m.calories;
    newProtein += m.macros.protein;
    newCarbs += m.macros.carbs;
    newFat += m.macros.fat;
    newSodium += m.macros.sodium || 0;
    newCholesterol += m.macros.cholesterol || 0;
    newSugars += m.macros.sugars || 0;
    newFiber += m.macros.fiber || 0;
  });

  await updateDoc(ref, {
    meals: updatedMeals,
    'totals.calories': newCalories,
    'totals.protein': newProtein,
    'totals.carbs': newCarbs,
    'totals.fat': newFat,
    'totals.sodium': newSodium,
    'totals.cholesterol': newCholesterol,
    'totals.sugars': newSugars,
    'totals.fiber': newFiber,
  });
}

/**
 * Edit an existing meal in the daily log and recalculate totals.
 */
export async function editMealInLog(
  uid: string,
  date: string,
  oldMeal: Meal,
  newMeal: Meal,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const log = snap.data() as DailyLog;
  const updatedMeals = log.meals.map((m) => (m.id === oldMeal.id ? newMeal : m));

  let newCalories = 0, newProtein = 0, newCarbs = 0, newFat = 0;
  let newSodium = 0, newCholesterol = 0, newSugars = 0, newFiber = 0;

  updatedMeals.forEach((m) => {
    newCalories += m.calories;
    newProtein += m.macros.protein;
    newCarbs += m.macros.carbs;
    newFat += m.macros.fat;
    newSodium += m.macros.sodium || 0;
    newCholesterol += m.macros.cholesterol || 0;
    newSugars += m.macros.sugars || 0;
    newFiber += m.macros.fiber || 0;
  });

  await updateDoc(ref, {
    meals: updatedMeals,
    'totals.calories': newCalories,
    'totals.protein': newProtein,
    'totals.carbs': newCarbs,
    'totals.fat': newFat,
    'totals.sodium': newSodium,
    'totals.cholesterol': newCholesterol,
    'totals.sugars': newSugars,
    'totals.fiber': newFiber,
  });
}

/**
 * Add oz of water to the daily log.
 * Creates the document if it doesn't exist yet.
 */
export async function addWater(
  uid: string,
  date: string,
  oz: number,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS, waterIntake: oz },
    };
    await setDoc(ref, newLog);
  } else {
    await updateDoc(ref, {
      'totals.waterIntake': increment(oz),
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

/**
 * Toggle the medications/vitamins taken status for a given day.
 */
export async function updateMedications(
  uid: string,
  date: string,
  taken: boolean,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS },
      medicationsTaken: taken,
    };
    await setDoc(ref, newLog);
  } else {
    await updateDoc(ref, { medicationsTaken: taken });
  }
}

/**
 * Toggle the creatine status for a given day.
 */
export async function updateCreatine(
  uid: string,
  date: string,
  taken: boolean,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS },
      creatineTaken: taken,
    };
    await setDoc(ref, newLog);
  } else {
    await updateDoc(ref, { creatineTaken: taken });
  }
}

/**
 * Update the fasting start and end times for a given day.
 */
export async function updateFastingTimes(
  uid: string,
  date: string,
  fastingStart: string | null,
  fastingEnd: string | null,
): Promise<void> {
  const ref = dailyLogRef(uid, date);
  const snap = await getDoc(ref);

  const updates: Partial<DailyLog> = {};
  if (fastingStart !== null) updates.fastingStart = fastingStart;
  if (fastingEnd !== null) updates.fastingEnd = fastingEnd;
  
  if (!snap.exists()) {
    const newLog: DailyLog = {
      date,
      meals: [],
      totals: { ...EMPTY_TOTALS },
      ...updates,
    };
    await setDoc(ref, newLog);
  } else {
    // If setting to null, we could use deleteField() from firestore, but
    // for our interface, just omitting it or setting it to undefined/null works if merged properly,
    // though updateDoc doesn't accept undefined. 
    // We can just construct an update object.
    const updateObj: Record<string, any> = {};
    if (fastingStart !== null) {
      updateObj.fastingStart = fastingStart === 'clear' ? deleteField() : fastingStart;
    }
    if (fastingEnd !== null) {
      updateObj.fastingEnd = fastingEnd === 'clear' ? deleteField() : fastingEnd;
    }
    
    if (Object.keys(updateObj).length > 0) {
      await updateDoc(ref, updateObj);
    }
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
  const endDate = getLocalDateString(end); // 'YYYY-MM-DD'

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

/**
 * Fetch logs between two dates (inclusive).
 * Used for monthly/yearly charts.
 */
export async function getLogsBetweenDates(
  uid: string,
  startDate: string,
  endDate: string,
): Promise<DailyLog[]> {
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

  logs.sort((a, b) => a.date.localeCompare(b.date));
  return logs;
}

/**
 * Scan past logs to find the most recently logged weight.
 */
export async function getMostRecentWeight(
  uid: string,
  beforeDate: string,
): Promise<{ weight: number; date: string } | null> {
  const logsRef = collection(db, 'users', uid, 'dailyLogs');
  // Order by date descending to find the most recent
  const q = query(
    logsRef,
    where('date', '<', beforeDate),
    orderBy('date', 'desc'),
    limit(60) // Search up to 60 days back
  );
  const snapshot = await getDocs(q);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as DailyLog;
    if (data.currentWeight !== undefined && data.currentWeight > 0) {
      return { weight: data.currentWeight, date: data.date };
    }
  }
  return null;
}
