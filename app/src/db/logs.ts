import { db } from './schema';
import { calculateXP } from '../services/xpEngine';
import { applyXP } from './rpg';

export type ActivityLog = {
  id: number;
  created_at: string;
  category: string;
  description: string | null;
  duration_mins: number | null;
  mood_rating: number;
  xp_awarded: number;
};

export type CreateLogInput = {
  category: string;
  mood_rating: number;
  description?: string;
  duration_mins?: number;
};

export type CreateLogResult = {
  xp_awarded: number;
  level_up: boolean;
};

export function createLog(input: CreateLogInput): CreateLogResult {
  const xp = calculateXP(input.category, input.mood_rating, input.duration_mins);

  db.runSync(
    `INSERT INTO activity_logs (category, description, duration_mins, mood_rating, xp_awarded)
     VALUES (?, ?, ?, ?, ?)`,
    input.category,
    input.description ?? null,
    input.duration_mins ?? null,
    input.mood_rating,
    xp,
  );

  const { levelUp } = applyXP(xp, input.category);
  return { xp_awarded: xp, level_up: levelUp };
}

export function getLogs(): ActivityLog[] {
  return db.getAllSync<ActivityLog>(
    'SELECT * FROM activity_logs ORDER BY created_at DESC',
  );
}
