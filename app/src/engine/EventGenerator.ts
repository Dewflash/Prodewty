import { getCurrentSeason, Season } from './TimeEngine';

export type TownEvent = {
  name: string;
  season: Season;
  dayOfSeason: number; // 1 to 7 since we use 7 days per season
  overrideRow: number;
  overrideCol: number;
};

export const TOWN_EVENTS: TownEvent[] = [
  { name: 'Egg Festival', season: 'spring', dayOfSeason: 3, overrideRow: 10, overrideCol: 10 },
  { name: 'Luau', season: 'summer', dayOfSeason: 5, overrideRow: 15, overrideCol: 5 },
  { name: 'Spirit\'s Eve', season: 'autumn', dayOfSeason: 6, overrideRow: 8, overrideCol: 18 },
  { name: 'Feast of the Winter Star', season: 'winter', dayOfSeason: 7, overrideRow: 12, overrideCol: 12 }
];

export function getActiveEvent(currentDayOfSeason: number): TownEvent | null {
  const season = getCurrentSeason();
  
  for (const event of TOWN_EVENTS) {
    if (event.season === season && event.dayOfSeason === currentDayOfSeason) {
      return event;
    }
  }
  
  return null;
}
