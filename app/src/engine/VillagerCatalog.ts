export type VillagerGiftPreference = 'love' | 'like' | 'neutral' | 'dislike' | 'hate';

export type VillagerDefinition = {
  villagerType: string;
  name: string;
  description: string;
  requiredHouseId: string; // The building required for them to spawn
  dialogue: {
    greeting: string[];
    idle: string[];
    friendship_low: string[];
    friendship_high: string[];
  };
  giftPreferences: Record<string, VillagerGiftPreference>;
};

export const VILLAGER_CATALOG: Record<string, VillagerDefinition> = {
  blacksmith: {
    villagerType: 'blacksmith',
    name: 'Brog',
    description: 'A burly orc who loves working with metals.',
    requiredHouseId: 'Blacksmith_hut',
    dialogue: {
      greeting: ['Need something forged?', 'Iron and fire, that is what matters.'],
      idle: ['This hammer is getting heavy.', 'So much ore, so little time.'],
      friendship_low: ['Hmph. What do you want?'],
      friendship_high: ['Ah, my best customer! I saved the good iron for you.'],
    },
    giftPreferences: {
      'rpg_iron_bar': 'love',
      'rpg_coal': 'like',
      'rpg_stone': 'neutral',
      'rpg_wood': 'dislike',
      'rpg_egg': 'hate',
    }
  },
  explorer: {
    villagerType: 'explorer',
    name: 'Elara',
    description: 'A nimble adventurer always looking for the next ruin.',
    requiredHouseId: 'Explorer_tent',
    dialogue: {
      greeting: ['Ready for an adventure?', 'The ruins are calling!'],
      idle: ['I wonder what lies beyond those trees...', 'Got to pack my bag.'],
      friendship_low: ['I prefer the quiet of the wild.'],
      friendship_high: ['You have the spirit of a true explorer!'],
    },
    giftPreferences: {
      'rpg_crystal_shards': 'love',
      'rpg_water_drops': 'like',
      'rpg_wood': 'neutral',
      'rpg_turnip': 'dislike',
      'rpg_stone': 'hate',
    }
  }
};

export function getVillagerDef(villagerType: string): VillagerDefinition | null {
  return VILLAGER_CATALOG[villagerType] || null;
}

export function getGiftPoints(preference: VillagerGiftPreference): number {
  switch (preference) {
    case 'love': return 50;
    case 'like': return 20;
    case 'neutral': return 5;
    case 'dislike': return -10;
    case 'hate': return -30;
  }
}
