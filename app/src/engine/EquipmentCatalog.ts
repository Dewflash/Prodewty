export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'tool';

export type StatBonus = {
  attack?: number;
  defense?: number;
  critChance?: number; // 0.0 to 1.0
  maxHp?: number;
};

export type EquipmentDefinition = {
  itemId: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
  stats: StatBonus;
};

export const EQUIPMENT_CATALOG: Record<string, EquipmentDefinition> = {
  // Weapons
  Wood_sword: {
    itemId: 'Wood_sword',
    name: 'Wooden Sword',
    slot: 'weapon',
    description: 'A basic training sword. Better than using your fists.',
    stats: { attack: 3, critChance: 0.02 },
  },
  Iron_sword: {
    itemId: 'Iron_sword',
    name: 'Iron Sword',
    slot: 'weapon',
    description: 'A sturdy iron blade, sharp and reliable.',
    stats: { attack: 8, critChance: 0.05 },
  },
  Gold_sword: {
    itemId: 'Gold_sword',
    name: 'Golden Sword',
    slot: 'weapon',
    description: 'A flashy sword that hits surprisingly hard.',
    stats: { attack: 12, critChance: 0.1 },
  },

  // Armor
  Leather_armor: {
    itemId: 'Leather_armor',
    name: 'Leather Armor',
    slot: 'armor',
    description: 'Basic protection against bites and scrapes.',
    stats: { defense: 2, maxHp: 10 },
  },
  Iron_armor: {
    itemId: 'Iron_armor',
    name: 'Iron Armor',
    slot: 'armor',
    description: 'Heavy but offers solid protection.',
    stats: { defense: 6, maxHp: 25 },
  },

  // Accessories
  Ring_of_vitality: {
    itemId: 'Ring_of_vitality',
    name: 'Ring of Vitality',
    slot: 'accessory',
    description: 'A magical ring that boosts your health.',
    stats: { maxHp: 50 },
  },
  Amulet_of_striking: {
    itemId: 'Amulet_of_striking',
    name: 'Amulet of Striking',
    slot: 'accessory',
    description: 'Increases your chance to land a critical hit.',
    stats: { critChance: 0.15 },
  },

  // Tools — equip-slot entries so they go through the same persisted
  // player_equipment mechanism as weapon/armor/accessory. Gameplay effect
  // (energy cost, tier) lives in ToolCatalog.ts, not here.
  rpg_axe_basic: {
    itemId: 'rpg_axe_basic',
    name: 'Axe',
    slot: 'tool',
    description: 'Chop trees for wood.',
    stats: {},
  },
  rpg_pickaxe_basic: {
    itemId: 'rpg_pickaxe_basic',
    name: 'Pickaxe',
    slot: 'tool',
    description: 'Mine Rock Veins for Stone and Coal.',
    stats: {},
  },
  rpg_hoe_basic: {
    itemId: 'rpg_hoe_basic',
    name: 'Hoe',
    slot: 'tool',
    description: 'Till soil so it can be planted.',
    stats: {},
  },
  rpg_watering_can_basic: {
    itemId: 'rpg_watering_can_basic',
    name: 'Watering Can',
    slot: 'tool',
    description: 'Water a planted crop.',
    stats: {},
  },
  rpg_rake_basic: {
    itemId: 'rpg_rake_basic',
    name: 'Rake',
    slot: 'tool',
    description: 'Clears grass into sandy land.',
    stats: {},
  },
  rpg_shovel_basic: {
    itemId: 'rpg_shovel_basic',
    name: 'Shovel',
    slot: 'tool',
    description: 'Dig grass into a river channel.',
    stats: {},
  },
};

export function getEquipmentDef(itemId: string): EquipmentDefinition | null {
  return EQUIPMENT_CATALOG[itemId] || null;
}
