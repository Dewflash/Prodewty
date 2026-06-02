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
  const base = input.categories.reduce((s, c) => s + c.weight * 10, 0) || 20;
  const durBonus = input.duration_mins ? Math.floor(input.duration_mins / 30) * 8 : 0;
  const habitBonus = input.completed_habit_weights.reduce((s, w) => s + w * 5, 0);
  const moodMult = input.mood_rating ? 0.8 + ((input.mood_rating - 1) / 9) * 0.4 : 1.0;
  const energyMult = input.energy_rating ? 0.9 + ((input.energy_rating - 1) / 9) * 0.2 : 1.0;
  const prodMult = input.productivity_rating ? 0.95 + ((input.productivity_rating - 1) / 9) * 0.1 : 1.0;
  const raw = (base + durBonus + habitBonus) * moodMult * energyMult * prodMult;
  return Math.max(Math.floor(input.log_type === 'weekly' ? raw * 1.5 : raw), 5);
}

export function xpRequiredForLevel(level: number): number {
  return 500 + (level - 1) * 250;
}

export function titleForLevel(level: number): string {
  const t: [number, string][] = [
    [100, 'Shadow Monarch'], [75, 'Grandmaster'], [50, 'Master'],
    [35, 'Expert'], [20, 'Adept'], [10, 'Journeyman'], [5, 'Apprentice'], [1, 'Unranked'],
  ];
  return t.find(([n]) => level >= n)?.[1] ?? 'Unranked';
}

// Maps activity category to the 7-stat it primarily raises (auto-increment layer)
// str=Strength agi=Agility foc=Focus wis=Wisdom spr=Spirituality per=Perception sta=Stamina
export const CATEGORY_TO_STAT: Record<string, string> = {
  workout:  'str',
  coding:   'foc',
  reading:  'wis',
  study:    'wis',
  admin:    'agi',
  journal:  'spr',
  devotion: 'spr',
};

// Legacy — kept for any remaining references; maps to the DB column name
export const CATEGORY_TO_ATTRIBUTE: Record<string, 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience'> = {
  workout: 'strength', coding: 'focus', reading: 'wisdom',
  study: 'wisdom', admin: 'agility', journal: 'resilience', devotion: 'resilience',
};
