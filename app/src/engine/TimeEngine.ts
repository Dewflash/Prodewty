export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// Configuration for mapping real world time to game time
const GAME_DAY_MS = 24 * 60 * 60 * 1000; // 1 real day = 1 game day for now (could be shortened)
const DAYS_PER_SEASON = 7; // 1 real week = 1 game season

export function getCurrentSeason(): Season {
  const now = new Date();
  
  // Define an arbitrary epoch for season 0, e.g. start of the year
  const epoch = new Date(now.getFullYear(), 0, 1);
  const diffTime = Math.abs(now.getTime() - epoch.getTime());
  const diffDays = Math.floor(diffTime / GAME_DAY_MS);
  
  const seasonIndex = Math.floor(diffDays / DAYS_PER_SEASON) % 4;
  
  switch (seasonIndex) {
    case 0: return 'spring';
    case 1: return 'summer';
    case 2: return 'autumn';
    case 3: return 'winter';
    default: return 'spring';
  }
}

export function getDaysRemainingInSeason(): number {
  const now = new Date();
  const epoch = new Date(now.getFullYear(), 0, 1);
  const diffTime = Math.abs(now.getTime() - epoch.getTime());
  const diffDays = Math.floor(diffTime / GAME_DAY_MS);
  
  return DAYS_PER_SEASON - (diffDays % DAYS_PER_SEASON);
}

// Convert real world date to game time of day (e.g. 0-23 hours)
export function getGameHour(): number {
  const now = new Date();
  return now.getHours(); // Currently 1:1 with real time
}
