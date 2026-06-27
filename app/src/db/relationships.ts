import { db } from './schema';
import { sqlNow } from '../utils/date';

// 250 points = 1 heart (max 10 hearts = 2500 points)
export const MAX_FRIENDSHIP_POINTS = 2500;
export const MAX_GIFTS_PER_WEEK = 2;

export type VillagerRelationship = {
  villager_id: string;
  friendship_points: number;
  gifts_given_this_week: number;
  last_gift_given_at: string | null;
};

// Define villager tastes
export type GiftTaste = 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';

const VILLAGER_PREFERENCES: Record<string, Record<string, GiftTaste>> = {
  'brog_blacksmith': {
    'rpg_iron_bar': 'loved',
    'rpg_stone': 'liked',
    'rpg_salad': 'neutral',
    'rpg_turnip': 'disliked',
    'rpg_wood': 'hated'
  },
  'marnie_ranch': {
    'rpg_milk': 'loved',
    'rpg_egg': 'loved',
    'rpg_salad': 'liked',
    'rpg_stone': 'disliked',
    'rpg_iron_bar': 'hated'
  }
};

const TASTE_POINTS: Record<GiftTaste, number> = {
  'loved': 80,
  'liked': 45,
  'neutral': 20,
  'disliked': -20,
  'hated': -40
};

export function getVillagerTaste(villagerId: string, itemId: string): GiftTaste {
  const prefs = VILLAGER_PREFERENCES[villagerId];
  if (!prefs) return 'neutral';
  return prefs[itemId] || 'neutral';
}

export function giveGift(villagerId: string, itemId: string): 'ok' | 'no_item' | 'limit_reached' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const inv = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= 1', itemId);
    if (!inv) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    let rel = db.getFirstSync<VillagerRelationship>('SELECT * FROM rpg_relationships WHERE villager_id = ?', villagerId);
    if (!rel) {
      db.runSync('INSERT INTO rpg_relationships (villager_id) VALUES (?)', villagerId);
      rel = { villager_id: villagerId, friendship_points: 0, gifts_given_this_week: 0, last_gift_given_at: null };
    }

    if (rel.gifts_given_this_week >= MAX_GIFTS_PER_WEEK) {
      db.execSync('ROLLBACK');
      return 'limit_reached';
    }

    // Determine points
    const taste = getVillagerTaste(villagerId, itemId);
    let points = TASTE_POINTS[taste];
    
    // Check if it's their birthday for 8x multiplier
    const { getCalendarState } = require('./time');
    const { getEventForDate } = require('../engine/Calendar');
    
    const cal = getCalendarState();
    const event = getEventForDate(cal.current_season, cal.current_day);
    if (event && event.type === 'birthday' && event.villagerId === villagerId) {
      points *= 8;
    }

    const newPoints = Math.max(0, Math.min(MAX_FRIENDSHIP_POINTS, rel.friendship_points + points));

    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?', itemId);
    
    db.runSync(
      `UPDATE rpg_relationships SET 
       friendship_points = ?, 
       gifts_given_this_week = gifts_given_this_week + 1,
       last_gift_given_at = ?
       WHERE villager_id = ?`,
      newPoints, sqlNow(), villagerId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

export function resetWeeklyGifts(): void {
  try {
    db.runSync('UPDATE rpg_relationships SET gifts_given_this_week = 0');
  } catch (e) {
    console.warn('Failed to reset weekly gifts', e);
  }
}
