// ─── Chenna Fit – Zustand Store ──────────────────────────────────────────────

import { create } from 'zustand';
import type { UserProfile, DailyLog, MascotState } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

interface ChennaStore {
  // ── State ────────────────────────────────────────────────────────────────
  user: UserProfile | null;
  dailyLog: DailyLog | null;
  isLoading: boolean;
  selectedDate: string;

  // ── Actions ──────────────────────────────────────────────────────────────
  setUser: (user: UserProfile | null) => void;
  setDailyLog: (log: DailyLog | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedDate: (date: string) => void;

  // ── Computed ─────────────────────────────────────────────────────────────
  /** Derive the mascot animation state from current progress vs. goals. */
  getMascotState: () => MascotState;
}

export const useStore = create<ChennaStore>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────
  user: null,
  dailyLog: null,
  isLoading: false,
  selectedDate: getLocalDateString(),

  // ── Setters ────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),
  setDailyLog: (dailyLog) => set({ dailyLog }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  // ── Mascot state logic ─────────────────────────────────────────────────
  getMascotState: (): MascotState => {
    const { user, dailyLog } = get();

    // No data yet → mascot is sleeping
    if (!user || !dailyLog || !user.goals || !dailyLog.totals) {
      return 'sleeping' as const;
    }

    const { goals } = user;
    const { totals } = dailyLog;

    // Calculate progress ratios (0 → 1+)
    const calRatio = goals.calories > 0 ? totals.calories / goals.calories : 0;
    const proteinRatio = goals.protein > 0 ? totals.protein / goals.protein : 0;
    const carbsRatio = goals.carbs > 0 ? totals.carbs / goals.carbs : 0;
    const fatRatio = goals.fat > 0 ? totals.fat / goals.fat : 0;
    const waterRatio = goals.water > 0 ? totals.waterIntake / goals.water : 0;

    const macroAvg = (proteinRatio + carbsRatio + fatRatio) / 3;

    // 🎉 Hit all goals → celebrating
    if (calRatio >= 0.9 && macroAvg >= 0.9 && waterRatio >= 0.9) {
      return 'celebrating' as const;
    }

    // 💧 Just drank water (water ahead of food progress)
    if (waterRatio > calRatio + 0.15 && waterRatio >= 0.4) {
      return 'drinking' as const;
    }

    // 🍽 Actively eating (decent calorie progress, macros building)
    if (calRatio >= 0.3 && calRatio < 0.9) {
      return 'eating' as const;
    }

    // 💪 Some progress but needs encouragement
    if (calRatio > 0 || waterRatio > 0) {
      return calRatio < 0.3 ? ('encouraging' as const) : ('happy' as const);
    }

    // 😴 Nothing logged yet today
    return 'sleeping' as const;
  },
}));
