import { create } from 'zustand';
import type { RPGState } from '../db/rpg';
import type { ActivityLog } from '../db/logs';

export type Category = {
  id: string;
  label: string;
  attribute: 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience';
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'workout',  label: 'Workout',  attribute: 'strength' },
  { id: 'coding',   label: 'Coding',   attribute: 'focus' },
  { id: 'reading',  label: 'Reading',  attribute: 'wisdom' },
  { id: 'study',    label: 'Study',    attribute: 'wisdom' },
  { id: 'admin',    label: 'Admin',    attribute: 'agility' },
  { id: 'journal',  label: 'Journal',  attribute: 'resilience' },
  { id: 'devotion', label: 'Devotion', attribute: 'wisdom' },
];

type AppState = {
  categories: Category[];
  rpgState: RPGState | null;
  recentLogs: ActivityLog[];
  addCategory: (category: Category) => void;
  setRPGState: (state: RPGState) => void;
  setRecentLogs: (logs: ActivityLog[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  categories: DEFAULT_CATEGORIES,
  rpgState: null,
  recentLogs: [],
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  setRPGState: (rpgState) => set({ rpgState }),
  setRecentLogs: (recentLogs) => set({ recentLogs }),
}));
