// Two-phase XP formula. Phase 1 ≤ 30 mins: exponential decay curve.
// Phase 2 > 30 mins: flat rate per minute based on weight.
export function sessionXP(durationMins: number, weight: number): number {
  const w = Math.max(1, Math.min(20, weight));
  const a = 3.5 + 0.04 * w;
  const phase1 = (a / 0.1) * (1 - Math.exp(-0.1 * Math.min(durationMins, 30)));
  if (durationMins <= 30) return Math.max(1, Math.floor(phase1));
  const flatRate = 0.4 * Math.exp(0.08 * w) - 0.4;
  return Math.max(1, Math.floor(phase1 + flatRate * (durationMins - 30)));
}

export type XPInput = {
  categories: { name: string; weight: number }[];
  mood_rating?: number | null;
  energy_rating?: number | null;
  productivity_rating?: number | null;
  duration_mins?: number | null;
  completed_habit_weights: number[];
  log_type: 'daily' | 'weekly';
};

export function calculateXP(input: XPInput): number {
  const dur = input.duration_mins ?? 20;
  const cat = input.categories[0];
  const baseXP = cat ? sessionXP(dur, cat.weight) : sessionXP(dur, 5);
  const moodMult   = input.mood_rating         ? 0.95 + ((input.mood_rating   - 1) / 9) * 0.10 : 1.0;
  const energyMult = input.energy_rating       ? 0.95 + ((input.energy_rating - 1) / 9) * 0.10 : 1.0;
  const prodMult   = input.productivity_rating ? 0.95 + ((input.productivity_rating - 1) / 9) * 0.10 : 1.0;
  // Habit bonus is flat — added after session multipliers per doc §8.2
  const habitBonus = input.completed_habit_weights.reduce((s, w) => s + w * 3, 0);
  const raw = baseXP * moodMult * energyMult * prodMult;
  // Weekly 1.5× removed — weekly boost is now a stored 7-day 1.05× applied at award time in logs.ts
  return Math.max(1, Math.floor(raw + habitBonus));
}

// XP required to clear level N. Formula: (7.5 × N + 435), rounded up to nearest 10.
export function xpRequiredForLevel(level: number): number {
  return Math.max(10, Math.ceil((7.5 * level + 435) / 10) * 10);
}

export function titleForLevel(level: number): string {
  const t: [number, string][] = [
    [100, 'Shadow Monarch'], [75, 'Grandmaster'], [50, 'Master'],
    [35, 'Expert'], [20, 'Adept'], [10, 'Journeyman'], [5, 'Apprentice'], [1, 'Unranked'],
  ];
  return t.find(([n]) => level >= n)?.[1] ?? 'Unranked';
}

// Maps activity category to the 7-stat it primarily raises (auto-increment layer)
// str=Strength agi=Agility foc=Focus wis=Wisdom spr=Spirituality per=Perception sta=Resilience (displayed; DB key remains sta_stat/sta)
export const CATEGORY_TO_STAT: Record<string, string> = {
  workout:  'str',
  coding:   'foc',
  reading:  'wis',
  study:    'wis',
  news:     'wis',
  admin:    'agi',
  journal:  'spr',
  devotion: 'spr',
  guitar:   'spr',
  meditate: 'spr',
};

// Legacy — kept for any remaining references; maps to the DB column name
export const CATEGORY_TO_ATTRIBUTE: Record<string, 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience'> = {
  workout: 'strength', coding: 'focus', reading: 'wisdom',
  study: 'wisdom', news: 'wisdom', admin: 'agility',
  journal: 'resilience', devotion: 'resilience', guitar: 'resilience', meditate: 'resilience',
};
