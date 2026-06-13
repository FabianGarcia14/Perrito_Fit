// ─── Perrito Fit – Type Definitions ──────────────────────────────────────────

// ── User ──────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string; // ISO-8601 timestamp
  goals: Goals;
}

export interface Goals {
  calories: number;
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  water: number;    // glasses
}

// Keep NutritionGoals as alias for backward compatibility
export type NutritionGoals = Goals;

// ── Meals ─────────────────────────────────────────────
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  macros: Macros;
  time: string;       // ISO-8601 timestamp
  type: MealType;
}

// Keep MealEntry as alias for backward compatibility
export type MealEntry = Meal & {
  userId?: string;
  foodName?: string;
  date?: string;
};

// ── Daily Log ─────────────────────────────────────────
export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterIntake: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  totals: DailyTotals;
  currentWeight?: number;
  meals: Meal[];
}

// Keep DailySummary as alias for backward compatibility
export type DailySummary = DailyLog;

// ── Water ─────────────────────────────────────────────
export interface WaterEntry {
  id: string;
  userId: string;
  glasses: number;
  date: string; // YYYY-MM-DD
}

// ── Weight ────────────────────────────────────────────
export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

// ── Mascot ────────────────────────────────────────────
export type MascotState =
  | 'sleeping'
  | 'happy'
  | 'eating'
  | 'drinking'
  | 'celebrating'
  | 'encouraging';

// Keep MascotMood as alias for backward compatibility
export type MascotMood = MascotState;

// ── USDA API ──────────────────────────────────────────
export interface USDAFoodResult {
  fdcId: number;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Navigation ────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  AddMeal: undefined;
  History: undefined;
  Settings: undefined;
};
