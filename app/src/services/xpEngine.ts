const BASE_XP: Record<string, number> = {
  workout: 75,
  coding: 60,
  reading: 50,
  study: 55,
  admin: 20,
  journal: 30,
  devotion: 40,
};

const MOOD_MULTIPLIER: Record<number, number> = {
  1: 1.25, 2: 1.15, 3: 1.05, 4: 1.0, 5: 1.0,
  6: 1.0,  7: 0.98, 8: 0.97, 9: 0.96, 10: 0.95,
};

export const CATEGORY_TO_ATTRIBUTE: Record<string, 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience'> = {
  workout:  'strength',
  coding:   'focus',
  reading:  'wisdom',
  study:    'wisdom',
  admin:    'agility',
  journal:  'resilience',
  devotion: 'wisdom',
};

export function calculateXP(category: string, moodRating: number, durationMins?: number): number {
  const base = BASE_XP[category.toLowerCase()] ?? 30;
  const moodMult = MOOD_MULTIPLIER[moodRating] ?? 1.0;
  const durationBonus = ((durationMins ?? 0) / 60) * 15;
  return Math.round((base + durationBonus) * moodMult);
}

export function xpRequiredForLevel(level: number): number {
  return 500 + (level - 1) * 250;
}

export function titleForLevel(level: number): string {
  const thresholds: [number, string][] = [
    [100, 'Shadow Monarch'],
    [75,  'Grandmaster'],
    [50,  'Master'],
    [35,  'Expert'],
    [20,  'Adept'],
    [10,  'Journeyman'],
    [5,   'Apprentice'],
    [1,   'Unranked'],
  ];
  return thresholds.find(([t]) => level >= t)?.[1] ?? 'Unranked';
}
