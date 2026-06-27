import { db } from './schema';
import { getRPGState } from './rpg';
import { calculateTotalStats, calculatePlayerDamage, calculateEnemyDamage } from '../engine/CombatEngine';
import { getEquipmentDef } from '../engine/EquipmentCatalog';
import { consumeFood } from './food';

export type CombatState = {
  zoneId: number;
  enemyId: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyAttack: number;
  enemyDefense: number;
  isPlayerTurn: boolean;
};

// Start a combat encounter
export function startCombat(zoneId: number, enemyId: string, enemyMaxHp: number, enemyAttack: number, enemyDefense: number): boolean {
  try {
    // We would typically have an active_combats table, but for a single-player game, 
    // a simplified approach is to store the current combat state globally or tied to the zone.
    // For this backend simulation, we will add it to a temporary JSON field in zone_progress.
    
    const combatState: CombatState = {
      zoneId,
      enemyId,
      enemyHp: enemyMaxHp,
      enemyMaxHp,
      enemyAttack,
      enemyDefense,
      isPlayerTurn: true
    };
    
    db.runSync(
      `UPDATE zone_progress SET combat_state = ? WHERE zone_id = ?`,
      JSON.stringify(combatState), zoneId
    );
    
    return true;
  } catch (e) {
    console.warn('Failed to start combat', e);
    return false;
  }
}

// Get the current combat state for a zone
export function getCombatState(zoneId: number): CombatState | null {
  try {
    const row = db.getFirstSync<{ combat_state: string | null }>(
      'SELECT combat_state FROM zone_progress WHERE zone_id = ?',
      zoneId
    );
    
    if (!row || !row.combat_state) return null;
    return JSON.parse(row.combat_state);
  } catch {
    return null;
  }
}

// Clear the combat state (when won or fled)
function clearCombat(zoneId: number) {
  db.runSync(`UPDATE zone_progress SET combat_state = NULL WHERE zone_id = ?`, zoneId);
}

// Player attacks the enemy
export function attackEnemy(zoneId: number): { status: 'won' | 'ongoing' | 'lost' | 'error', damageDealt: number, damageTaken: number, isCrit: boolean } {
  const combat = getCombatState(zoneId);
  if (!combat || !combat.isPlayerTurn) return { status: 'error', damageDealt: 0, damageTaken: 0, isCrit: false };

  try {
    db.execSync('BEGIN TRANSACTION');

    const rpg = getRPGState();
    
    // Get player equipment stats
    const equipmentRows = db.getAllSync<{ item_id: string }>('SELECT item_id FROM player_equipment WHERE item_id IS NOT NULL');
    const bonuses = equipmentRows.map(r => getEquipmentDef(r.item_id)?.stats).filter(Boolean) as any;
    
    // Hardcode base stats for this example, in reality fetch from rpg_state
    const playerStats = calculateTotalStats((rpg as any).base_attack || 5, (rpg as any).base_defense || 3, (rpg as any).crit_chance || 0.05, (rpg as any).hp_max, bonuses);
    
    // Player attacks
    const { damage, isCrit } = calculatePlayerDamage(playerStats, combat.enemyDefense);
    combat.enemyHp -= damage;

    if (combat.enemyHp <= 0) {
      // Enemy defeated
      clearCombat(zoneId);
      db.runSync('UPDATE zone_progress SET enemies_killed = enemies_killed + 1 WHERE zone_id = ?', zoneId);
      db.execSync('COMMIT');
      return { status: 'won', damageDealt: damage, damageTaken: 0, isCrit };
    }

    // Enemy attacks back
    const damageTaken = calculateEnemyDamage(combat.enemyAttack, playerStats);
    
    db.runSync('UPDATE rpg_state SET hp = MAX(0, hp - ?) WHERE id = 1', damageTaken);
    
    // Update combat state
    db.runSync('UPDATE zone_progress SET combat_state = ? WHERE zone_id = ?', JSON.stringify(combat), zoneId);

    // Check player death
    const newHp = db.getFirstSync<{ hp: number }>('SELECT hp FROM rpg_state WHERE id = 1')?.hp || 0;
    if (newHp <= 0) {
      clearCombat(zoneId);
      db.runSync('UPDATE exploration_zones SET status = ? WHERE id = ?', 'failed', zoneId);
      db.execSync('COMMIT');
      return { status: 'lost', damageDealt: damage, damageTaken, isCrit };
    }

    db.execSync('COMMIT');
    return { status: 'ongoing', damageDealt: damage, damageTaken, isCrit };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Combat error', e);
    return { status: 'error', damageDealt: 0, damageTaken: 0, isCrit: false };
  }
}

// Player uses an item in combat
export function useCombatItem(zoneId: number, itemId: string): boolean {
  const combat = getCombatState(zoneId);
  if (!combat || !combat.isPlayerTurn) return false;
  
  // For now, using an item does not consume a turn, allowing immediate follow-up attack
  // If it should consume a turn, we would trigger enemy attack here
  const result = consumeFood(itemId);
  return result === 'ok';
}

// Player attempts to flee
export function fleeCombat(zoneId: number): boolean {
  const combat = getCombatState(zoneId);
  if (!combat) return false;

  // Simple flee logic: 70% chance to succeed
  if (Math.random() < 0.7) {
    clearCombat(zoneId);
    return true;
  } else {
    // Enemy gets a free hit if flee fails
    try {
      db.execSync('BEGIN TRANSACTION');
      
      const rpg = getRPGState();
      const equipmentRows = db.getAllSync<{ item_id: string }>('SELECT item_id FROM player_equipment WHERE item_id IS NOT NULL');
      const bonuses = equipmentRows.map(r => getEquipmentDef(r.item_id)?.stats).filter(Boolean) as any;
      const playerStats = calculateTotalStats((rpg as any).base_attack || 5, (rpg as any).base_defense || 3, (rpg as any).crit_chance || 0.05, (rpg as any).hp_max, bonuses);
      
      const damageTaken = calculateEnemyDamage(combat.enemyAttack, playerStats);
      db.runSync('UPDATE rpg_state SET hp = MAX(0, hp - ?) WHERE id = 1', damageTaken);
      
      db.execSync('COMMIT');
      return false;
    } catch {
      try { db.execSync('ROLLBACK'); } catch {}
      return false;
    }
  }
}
