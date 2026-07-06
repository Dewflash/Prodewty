import { db } from './schema';
import { getRPGState, RPGState } from './rpg';
import { processOvernightFarming, FarmingPlot } from './farming';
import { processOvernightAnimals, RpgAnimal } from './animals';
import { resetOvernightResources } from './resources';
import { resetWeeklyGifts } from './relationships';
import { resetMinesOvernight } from './mines';
import { logicalToday } from './dayBoundary';
import { getCropForSeed } from '../engine/RpgObjectCatalog';
import { getAnimalDef } from '../engine/AnimalCatalog';
import { getComputedStats } from './game';
import { ENERGY_MAX_PER_RES } from '../engine/StatEffects';

// Sleep restores energy to the EFFECTIVE max — stored energy_max plus the
// RES-driven bonus (lattice D8), matching what the HUD shows as capacity.
function sleepEnergyBonus(): number {
  try { return Math.max(0, getComputedStats().sta) * ENERGY_MAX_PER_RES; } catch { return 0; }
}


const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export type CalendarState = {
  current_season: string;
  current_day: number;
  current_year: number;
};

export function getCalendarState(): CalendarState {
  const rpg = getRPGState() as any;
  return {
    current_season: rpg.current_season || 'spring',
    current_day: rpg.current_day || 1,
    current_year: rpg.current_year || 1
  };
}

// Moves to the next day, handling season and year rollovers
export function sleepOvernight(): 'ok' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const cal = getCalendarState();
    let newDay = cal.current_day + 1;
    let newSeason = cal.current_season;
    let newYear = cal.current_year;

    let seasonChanged = false;

    if (newDay > 28) {
      newDay = 1;
      seasonChanged = true;
      const seasonIndex = SEASONS.indexOf(cal.current_season);
      if (seasonIndex === 3) {
        newSeason = SEASONS[0];
        newYear++;
      } else {
        newSeason = SEASONS[seasonIndex + 1];
      }
    }

    db.runSync(
      'UPDATE rpg_state SET current_day = ?, current_season = ?, current_year = ?, energy = energy_max + ? WHERE id = 1',
      newDay, newSeason, newYear, sleepEnergyBonus()
    );

    db.execSync('COMMIT');

    // Run subsystem updates
    processOvernightFarming(seasonChanged ? newSeason : undefined);
    processOvernightAnimals();
    resetOvernightResources();
    resetMinesOvernight();

    if (cal.current_day === 28 || cal.current_day === 7 || cal.current_day === 14 || cal.current_day === 21) {
      // Weekly reset (simple approximation based on day multiple of 7)
      resetWeeklyGifts();
    }

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

// Reconciles offline time progress mathematically instead of looping day-by-day
export function fastForwardTime(daysPassed: number): 'ok' | 'db_error' {
  return reconcileOfflineTime(daysPassed);
}

export function reconcileOfflineTime(daysPassed: number): 'ok' | 'db_error' {
  if (daysPassed <= 0) return 'ok';

  try {
    db.execSync('BEGIN TRANSACTION');

    const cal = getCalendarState();
    const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
    let totalDays = (cal.current_year - 1) * 112 + SEASONS.indexOf(cal.current_season) * 28 + (cal.current_day - 1);
    const oldTotalDays = totalDays;
    totalDays += daysPassed;

    const newYear = Math.floor(totalDays / 112) + 1;
    const seasonDays = totalDays % 112;
    const newSeasonIndex = Math.floor(seasonDays / 28);
    const newSeason = SEASONS[newSeasonIndex];
    const newDay = (seasonDays % 28) + 1;

    const seasonChanged = cal.current_season !== newSeason;
    const today = logicalToday();

    // 1. rpg_state updates
    db.runSync(
      'UPDATE rpg_state SET current_day = ?, current_season = ?, current_year = ?, last_active_date = ?, energy = energy_max + ? WHERE id = 1',
      newDay, newSeason, newYear, today, sleepEnergyBonus()
    );

    // 2. farming_plots updates
    const plots = db.getAllSync<FarmingPlot & { crop_item_id: string | null; current_stage: number }>('SELECT *, planted_seed_id as crop_item_id, growth_stage as current_stage FROM farming_plots');
    for (const p of plots) {
      if (p.crop_item_id) {
        const def = getCropForSeed(p.crop_item_id);
        if (seasonChanged && def && !def.preferredSeasons.includes(newSeason as any)) {
          db.runSync('UPDATE farming_plots SET planted_seed_id = NULL, growth_stage = 0, is_watered = 0 WHERE id = ?', p.id);
        } else {
          const newStage = p.is_watered ? Math.min(2, p.current_stage + 1) : p.current_stage;
          db.runSync('UPDATE farming_plots SET growth_stage = ?, is_watered = 0 WHERE id = ?', newStage, p.id);
        }
      } else {
        db.runSync('UPDATE farming_plots SET is_watered = 0 WHERE id = ?', p.id);
      }
    }

    // 3. rpg_animals updates
    const animals = db.getAllSync<RpgAnimal>('SELECT * FROM rpg_animals');
    for (const animal of animals) {
      const def = getAnimalDef(animal.type);
      if (!def) continue;

      let change = 0;
      if (animal.is_fed_today) {
        change = 5 - 20 * (daysPassed - 1);
      } else {
        change = -20 * daysPassed;
      }

      const newFriendship = Math.max(0, Math.min(1000, animal.friendship_points + change));
      const newDaysOld = animal.days_old + daysPassed;
      const wasMature = animal.days_old >= def.daysToMature;
      const hasProduce = (wasMature && animal.is_fed_today) ? 1 : (animal.has_produce ? 1 : 0);

      db.runSync(
        'UPDATE rpg_animals SET days_old = ?, friendship_points = ?, is_fed_today = 0, is_petted_today = 0, has_produce = ? WHERE id = ?',
        newDaysOld, newFriendship, hasProduce, animal.id
      );
    }

    // 4. Weekly gift resets
    const weekBoundaryCrossed = Math.floor(oldTotalDays / 7) !== Math.floor(totalDays / 7);
    if (weekBoundaryCrossed) {
      db.runSync('UPDATE rpg_relationships SET gifts_given_this_week = 0');
    }

    // 5. Reset mines
    db.runSync('DELETE FROM mine_floors');
    db.runSync('DELETE FROM mine_entities');

    db.execSync('COMMIT');

    resetOvernightResources();
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}
