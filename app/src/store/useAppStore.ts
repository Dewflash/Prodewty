import { create } from 'zustand';
import type { RPGState } from '../db/rpg';
import type { ActivityLog } from '../db/logs';
import type { DBCategory } from '../db/categories';
import type { Habit } from '../db/habits';

type AppState = {
  categories: DBCategory[];
  habits: Habit[];
  rpgState: RPGState | null;
  recentLogs: ActivityLog[];
  setCategories: (categories: DBCategory[]) => void;
  setHabits: (habits: Habit[]) => void;
  setRPGState: (state: RPGState) => void;
  setRecentLogs: (logs: ActivityLog[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  categories: [],
  habits: [],
  rpgState: null,
  recentLogs: [],
  setCategories: (categories) => set({ categories }),
  setHabits: (habits) => set({ habits }),
  setRPGState: (rpgState) => set({ rpgState }),
  setRecentLogs: (recentLogs) => set({ recentLogs }),
}));
