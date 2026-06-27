import { StatBonus } from './EquipmentCatalog';

export type CombatStats = {
  attack: number;
  defense: number;
  critChance: number;
  maxHp: number;
};

// Calculate total stats by combining base RPG stats and equipment bonuses
export function calculateTotalStats(
  baseAttack: number,
  baseDefense: number,
  baseCritChance: number,
  baseMaxHp: number,
  equipmentBonuses: StatBonus[]
): CombatStats {
  const stats: CombatStats = {
    attack: baseAttack,
    defense: baseDefense,
    critChance: baseCritChance,
    maxHp: baseMaxHp,
  };

  for (const bonus of equipmentBonuses) {
    if (bonus.attack) stats.attack += bonus.attack;
    if (bonus.defense) stats.defense += bonus.defense;
    if (bonus.critChance) stats.critChance += bonus.critChance;
    if (bonus.maxHp) stats.maxHp += bonus.maxHp;
  }

  // Cap crit chance at 100%
  stats.critChance = Math.min(1.0, Math.max(0.0, stats.critChance));

  return stats;
}

export type DamageResult = {
  damage: number;
  isCrit: boolean;
};

// Calculate damage dealt by the player to an enemy
export function calculatePlayerDamage(playerStats: CombatStats, enemyDefense: number = 0): DamageResult {
  const isCrit = Math.random() < playerStats.critChance;
  const critMultiplier = isCrit ? 2.0 : 1.0;
  
  // Base damage is attack * crit multiplier, reduced by enemy defense
  let damage = Math.floor(playerStats.attack * critMultiplier) - enemyDefense;
  
  // Minimum damage is 1
  damage = Math.max(1, damage);

  return { damage, isCrit };
}

// Calculate damage taken by the player from an enemy
export function calculateEnemyDamage(enemyAttack: number, playerStats: CombatStats): number {
  // Damage is enemy attack reduced by player defense
  let damage = enemyAttack - playerStats.defense;
  
  // Minimum damage is 1
  damage = Math.max(1, damage);
  
  return damage;
}
