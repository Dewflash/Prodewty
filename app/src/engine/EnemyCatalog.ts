export type EnemyType = 'Slime' | 'Bat' | 'Bug';

export type EnemyDefinition = {
  type: EnemyType;
  maxHealth: number;
  damage: number;
  drops: { itemId: string; chance: number; max: number }[];
  points: number;
};

export const ENEMY_CATALOG: Record<EnemyType, EnemyDefinition> = {
  'Slime': {
    type: 'Slime',
    maxHealth: 10,
    damage: 3,
    drops: [
      { itemId: 'rpg_slime', chance: 0.8, max: 2 },
      { itemId: 'rpg_sap', chance: 0.5, max: 2 }
    ],
    points: 5
  },
  'Bat': {
    type: 'Bat',
    maxHealth: 15,
    damage: 5,
    drops: [
      { itemId: 'rpg_bat_wing', chance: 0.7, max: 1 }
    ],
    points: 8
  },
  'Bug': {
    type: 'Bug',
    maxHealth: 8,
    damage: 2,
    drops: [
      { itemId: 'rpg_bug_meat', chance: 0.9, max: 2 }
    ],
    points: 3
  }
};

export function getEnemyDef(type: string): EnemyDefinition | null {
  return ENEMY_CATALOG[type as EnemyType] || null;
}
