import { db } from './schema';

export type Habit = {
  id: number;
  name: string;
  weight: number;
  is_active: number;
  created_at: string;
};

export function getHabits(): Habit[] {
  return db.getAllSync<Habit>(
    'SELECT * FROM habits WHERE is_active = 1 ORDER BY id ASC',
  );
}

export function addHabit(name: string, weight: number): void {
  db.runSync('INSERT INTO habits (name, weight) VALUES (?, ?)', name.trim(), weight);
}
