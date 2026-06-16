// ─── Chenna Fit – Type Definitions ──────────────────────────────────────────

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
  water: number;    // oz
  sodium?: number;       // mg
  cholesterol?: number;   // mg
  sugars?: number;        // g
  fiber?: number;         // g
  weight?: number;        // lbs
  fastingHours?: number;  // hours
  fastingStartTime?: string; // HH:mm format (e.g. '20:00')
}

// Keep NutritionGoals as alias for backward compatibility
export type NutritionGoals = Goals;

// ── Meals ─────────────────────────────────────────────
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  sodium?: number;       // mg
  cholesterol?: number;   // mg
  sugars?: number;        // g
  fiber?: number;         // g
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  macros: Macros;
  time: string;       // ISO-8601 timestamp
  type: MealType;
  quantity?: number;
  unit?: string;
  baseNutrition?: {
    quantity: number;
    calories: number;
    macros: Macros;
  };
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
  sodium?: number;
  cholesterol?: number;
  sugars?: number;
  fiber?: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  totals: DailyTotals;
  currentWeight?: number;
  meals: Meal[];
  medicationsTaken?: boolean;
  creatineTaken?: boolean;
  fastingStart?: string; // ISO-8601 timestamp
  fastingEnd?: string;   // ISO-8601 timestamp
}

// Keep DailySummary as alias for backward compatibility
export type DailySummary = DailyLog;

// ── Water ─────────────────────────────────────────────
export interface WaterEntry {
  id: string;
  userId: string;
  oz: number;
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

// ── Food Search API ───────────────────────────────────
export interface FoodSearchResult {
  fdcId: number | string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium?: number;
  cholesterol?: number;
  sugars?: number;
  fiber?: number;
  source?: 'usda' | 'openfoodfacts';
  brand?: string;
  servingQuantity?: number;
}

// Keep USDAFoodResult as alias for backward compatibility
export type USDAFoodResult = FoodSearchResult;

export interface RecentMealCombo {
  comboId: string;
  meal: Meal;
  mealType: MealType;
  lastUsed: string;
}

// ── Open Food Facts ───────────────────────────────────────
export interface OpenFoodFactsResult {
  barcode: string;
  name: string;
  brand?: string;
  servingSize?: string;
  servingQuantity?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium?: number;
  cholesterol?: number;
  sugars?: number;
  fiber?: number;
  imageUrl?: string;
}

// ── Navigation ────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  AddMeal: { scannedProduct?: OpenFoodFactsResult, editMeal?: Meal, editDate?: string, copyMeal?: Meal } | undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  BarcodeScanner: undefined;
};
