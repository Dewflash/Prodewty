import { db } from './schema';
import { FISH_CATALOG } from '../engine/FishCatalog';
import { getRPGState } from './rpg';
import { addSkillPoints } from './skills';

// Core Fishing Mechanics

export function castLine(): 'ok' | 'no_energy' | 'db_error' {
  try {
    const rpg = getRPGState();
    if (rpg.energy < 2) return 'no_energy';

    db.execSync('BEGIN TRANSACTION');
    db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - 2) WHERE id = 1');
    db.execSync('COMMIT');

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

import { getCurrentZone } from './zones';

// Determines what fish bites based on season/time/luck (abstracted here)
export function hookFish(season: string, currentHour: number, hasBait: boolean): string | 'trash' {
  if (hasBait) {
    try {
      const baitCheck = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = "rpg_bait" AND quantity >= 1');
      if (baitCheck) {
        db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = "rpg_bait"');
      } else {
        hasBait = false;
      }
    } catch {
      hasBait = false;
    }
  }

  const currentZone = getCurrentZone();
  let possibleFish: string[] = [];

  for (const [id, def] of Object.entries(FISH_CATALOG)) {
    if (def.seasons.includes(season) && def.allowedZones.includes(currentZone)) {
      if (currentHour >= def.timeRange[0] && currentHour <= def.timeRange[1]) {
        possibleFish.push(id);
      }
    }
  }

  // If no fish fit conditions or just random chance
  if (possibleFish.length === 0 || Math.random() < 0.2) {
    return 'trash'; // 'rpg_trash', 'rpg_seaweed', etc.
  }

  // Pick a random possible fish
  // Bait could skew this towards higher difficulty/rarity fish
  return possibleFish[Math.floor(Math.random() * possibleFish.length)];
}

// Call this after the minigame on the client concludes
export function catchFish(fishId: string | 'trash', success: boolean): 'ok' | 'db_error' {
  if (!success) return 'ok'; // The fish got away, no inventory change, AP already spent

  try {
    const itemId = fishId === 'trash' ? 'rpg_trash' : fishId;

    db.execSync('BEGIN TRANSACTION');
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      itemId
    );
    db.execSync('COMMIT');

    if (fishId !== 'trash') {
      addSkillPoints('fishing', 15);
    }
    
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}
