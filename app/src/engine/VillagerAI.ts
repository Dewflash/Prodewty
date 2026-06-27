import { getGameHour } from './TimeEngine';

export type VillagerSchedule = {
  hourStart: number;
  hourEnd: number;
  activity: string;
  targetBuildingType: string | null;
  targetRow: number;
  targetCol: number;
};

// Map of villager type to their daily schedule
export const VILLAGER_SCHEDULES: Record<string, VillagerSchedule[]> = {
  'blacksmith': [
    { hourStart: 0, hourEnd: 7, activity: 'sleeping', targetBuildingType: 'Villager_house_1', targetRow: 5, targetCol: 5 },
    { hourStart: 8, hourEnd: 17, activity: 'working', targetBuildingType: 'Blacksmith_hut', targetRow: 10, targetCol: 10 },
    { hourStart: 18, hourEnd: 23, activity: 'relaxing', targetBuildingType: null, targetRow: 15, targetCol: 15 }, // E.g., wandering the town square
  ],
  'explorer': [
    { hourStart: 0, hourEnd: 5, activity: 'sleeping', targetBuildingType: 'Explorer_tent', targetRow: 2, targetCol: 2 },
    { hourStart: 6, hourEnd: 20, activity: 'exploring', targetBuildingType: null, targetRow: 20, targetCol: 20 }, // Exploring outer bounds
    { hourStart: 21, hourEnd: 23, activity: 'relaxing', targetBuildingType: 'Explorer_tent', targetRow: 2, targetCol: 2 },
  ]
};

export function getCurrentSchedule(villagerType: string): VillagerSchedule | null {
  const schedules = VILLAGER_SCHEDULES[villagerType];
  if (!schedules) return null;

  const currentHour = getGameHour();
  
  for (const schedule of schedules) {
    if (currentHour >= schedule.hourStart && currentHour <= schedule.hourEnd) {
      return schedule;
    }
  }
  
  return null;
}
