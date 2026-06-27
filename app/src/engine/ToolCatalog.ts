export type ToolTier = 'Basic' | 'Copper' | 'Iron' | 'Gold';
export type ToolType = 'Axe' | 'Pickaxe' | 'WateringCan' | 'Hoe' | 'Sword' | 'FishingRod';

export type ToolDefinition = {
  itemId: string;
  type: ToolType;
  tier: ToolTier;
  energyCost: number;
  damage?: number; // for sword or tools used as weapons
  areaOfEffect?: number; // for watering can / hoe
  upgradeCostCoins: number;
  upgradeRequiredItemId?: string;
  upgradeRequiredQuantity?: number;
};

export const TOOL_CATALOG: Record<string, ToolDefinition> = {
  'rpg_axe_basic': { itemId: 'rpg_axe_basic', type: 'Axe', tier: 'Basic', energyCost: 2, upgradeCostCoins: 0 },
  'rpg_axe_copper': { itemId: 'rpg_axe_copper', type: 'Axe', tier: 'Copper', energyCost: 1.5, upgradeCostCoins: 2000, upgradeRequiredItemId: 'rpg_copper_bar', upgradeRequiredQuantity: 5 },
  'rpg_axe_iron': { itemId: 'rpg_axe_iron', type: 'Axe', tier: 'Iron', energyCost: 1, upgradeCostCoins: 5000, upgradeRequiredItemId: 'rpg_iron_bar', upgradeRequiredQuantity: 5 },
  
  'rpg_pickaxe_basic': { itemId: 'rpg_pickaxe_basic', type: 'Pickaxe', tier: 'Basic', energyCost: 2, upgradeCostCoins: 0 },
  'rpg_pickaxe_copper': { itemId: 'rpg_pickaxe_copper', type: 'Pickaxe', tier: 'Copper', energyCost: 1.5, upgradeCostCoins: 2000, upgradeRequiredItemId: 'rpg_copper_bar', upgradeRequiredQuantity: 5 },
  
  'rpg_sword_basic': { itemId: 'rpg_sword_basic', type: 'Sword', tier: 'Basic', energyCost: 1, damage: 3, upgradeCostCoins: 0 },
  'rpg_sword_copper': { itemId: 'rpg_sword_copper', type: 'Sword', tier: 'Copper', energyCost: 1, damage: 6, upgradeCostCoins: 2000, upgradeRequiredItemId: 'rpg_copper_bar', upgradeRequiredQuantity: 5 },

  'rpg_bamboo_pole': { itemId: 'rpg_bamboo_pole', type: 'FishingRod', tier: 'Basic', energyCost: 2, upgradeCostCoins: 0 },
  'rpg_fiberglass_rod': { itemId: 'rpg_fiberglass_rod', type: 'FishingRod', tier: 'Copper', energyCost: 2, upgradeCostCoins: 1800 },
};

export function getToolDef(itemId: string): ToolDefinition | null {
  return TOOL_CATALOG[itemId] || null;
}
