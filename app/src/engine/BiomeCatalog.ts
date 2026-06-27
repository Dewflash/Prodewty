export type BiomeHazard = {
  type: string;
  weight: number;
  damage: number;
};

export type BiomeLoot = {
  itemId: string;
  weight: number;
  minQty: number;
  maxQty: number;
};

export type BiomeEnemy = {
  defId: string;
  weight: number;
  minFloor: number;
};

export type BiomeDefinition = {
  biomeType: string;
  name: string;
  description: string;
  tilesetName: string; // The asset pack used for rendering
  baseDifficulty: number;
  roomsPerFloor: number;
  bossFloor: number;
  hazards: BiomeHazard[];
  lootTable: BiomeLoot[];
  enemyTable: BiomeEnemy[];
};

export const BIOME_CATALOG: Record<string, BiomeDefinition> = {
  dungeon: {
    biomeType: 'dungeon',
    name: 'Standard Dungeon',
    description: 'The basic dungeon, filled with simple enemies and common loot.',
    tilesetName: 'dungeon',
    baseDifficulty: 1,
    roomsPerFloor: 5,
    bossFloor: 10,
    hazards: [
      { type: 'spike_trap', weight: 10, damage: 10 }
    ],
    lootTable: [
      { itemId: 'rpg_leaves', weight: 50, minQty: 1, maxQty: 5 },
      { itemId: 'rpg_wood', weight: 30, minQty: 1, maxQty: 3 },
      { itemId: 'rpg_water_drops', weight: 20, minQty: 1, maxQty: 2 },
    ],
    enemyTable: [
      { defId: 'dungeon_orc', weight: 100, minFloor: 1 },
      { defId: 'dungeon_orc_brute', weight: 30, minFloor: 3 },
      { defId: 'dungeon_orc_chieftain', weight: 5, minFloor: 10 },
    ]
  },
  cave: {
    biomeType: 'cave',
    name: 'Overgrown Cave',
    description: 'A dark and damp cave with rare minerals.',
    tilesetName: 'cave',
    baseDifficulty: 3,
    roomsPerFloor: 7,
    bossFloor: 15,
    hazards: [
      { type: 'falling_rock', weight: 20, damage: 15 },
      { type: 'poison_spores', weight: 15, damage: 5 } // DoT later
    ],
    lootTable: [
      { itemId: 'rpg_stone', weight: 60, minQty: 2, maxQty: 6 },
      { itemId: 'rpg_coal', weight: 30, minQty: 1, maxQty: 3 },
      { itemId: 'rpg_crystal_shards', weight: 10, minQty: 1, maxQty: 2 },
    ],
    enemyTable: [
      // We will add slime or skeleton enemy defs later
      { defId: 'dungeon_orc_brute', weight: 100, minFloor: 1 },
    ]
  },
  temple: {
    biomeType: 'temple',
    name: 'Ancient Temple Ruins',
    description: 'A perilous ruin full of traps and treasure.',
    tilesetName: 'temple',
    baseDifficulty: 5,
    roomsPerFloor: 10,
    bossFloor: 20,
    hazards: [
      { type: 'blade_trap', weight: 30, damage: 25 },
      { type: 'fire_bowl', weight: 20, damage: 20 }
    ],
    lootTable: [
      { itemId: 'rpg_gold_bar', weight: 10, minQty: 1, maxQty: 1 },
      { itemId: 'rpg_iron_bar', weight: 30, minQty: 1, maxQty: 2 },
      { itemId: 'rpg_crystal_shards', weight: 60, minQty: 2, maxQty: 5 },
    ],
    enemyTable: [
      { defId: 'dungeon_orc_chieftain', weight: 100, minFloor: 1 },
    ]
  }
};

export function getBiomeDef(biomeType: string): BiomeDefinition | null {
  return BIOME_CATALOG[biomeType] || null;
}
