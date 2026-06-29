import type { RpgDrop } from './RpgObjectCatalog';

// Capped at 2 enemy types for now — variety/difficulty tuning is a later
// conversation, not part of this combat-foundation pass (2026-06-30).
export type EnemyDefId = 'dungeon_orc' | 'dungeon_orc_brute';

export type EnemyDefinition = {
  defId: EnemyDefId;
  name: string;
  maxHp: number;
  atk: number;
  aggroRange: number;
  coins: number;
  drops: RpgDrop[];
  sprite: any;
  frameWidth: number;
  frameHeight: number;
  isBoss?: boolean;
};

const ORC_SPRITE = require('../../assets/game/craftpix-net-363992-free-top-down-orc-game-character-pixel-art/Tiled_files/orc3_idle_with_shadow.png');
const ORC_BRUTE_SPRITE = require('../../assets/game/craftpix-net-363992-free-top-down-orc-game-character-pixel-art/Tiled_files/orc1_idle_with_shadow.png');

export const DUNGEON_ENEMY_DEFS: Record<EnemyDefId, EnemyDefinition> = {
  dungeon_orc: {
    defId: 'dungeon_orc',
    name: 'Dungeon Orc',
    maxHp: 30,
    atk: 4,
    aggroRange: 5,
    coins: 12,
    drops: [
      { itemId: 'rpg_leaves', chance: 0.3, min: 1, max: 2 },
      { itemId: 'rpg_crystal_shards', chance: 0.25, min: 1, max: 1 },
    ],
    sprite: ORC_SPRITE,
    frameWidth: 64,
    frameHeight: 64,
  },
  dungeon_orc_brute: {
    defId: 'dungeon_orc_brute',
    name: 'Orc Brute',
    maxHp: 60,
    atk: 8,
    aggroRange: 6,
    coins: 28,
    drops: [
      { itemId: 'rpg_crystal_shards', chance: 0.45, min: 1, max: 2 },
      { itemId: 'rpg_water_drops', chance: 0.2, min: 1, max: 1 },
    ],
    sprite: ORC_BRUTE_SPRITE,
    frameWidth: 64,
    frameHeight: 64,
  },
};

export type EnemySpawn = { uid: string; defId: EnemyDefId; row: number; col: number };

export const DUNGEON_ENEMY_SPAWNS: EnemySpawn[] = [
  { uid: 'orc-1', defId: 'dungeon_orc', row: 6, col: 8 },
  { uid: 'orc-2', defId: 'dungeon_orc', row: 9, col: 4 },
  { uid: 'orc-3', defId: 'dungeon_orc', row: 12, col: 15 },
  { uid: 'orc-4', defId: 'dungeon_orc', row: 16, col: 5 },
  { uid: 'orc-5', defId: 'dungeon_orc', row: 4, col: 14 },
  { uid: 'brute-1', defId: 'dungeon_orc_brute', row: 17, col: 17 },
  { uid: 'brute-2', defId: 'dungeon_orc_brute', row: 3, col: 3 },
];
