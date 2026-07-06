export type ToolTier = 'Basic' | 'Copper' | 'Iron' | 'Gold';
export type ToolType = 'Axe' | 'Pickaxe' | 'WateringCan' | 'Hoe' | 'Sword' | 'FishingRod' | 'Rake' | 'Shovel';

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

  'rpg_hoe_basic': { itemId: 'rpg_hoe_basic', type: 'Hoe', tier: 'Basic', energyCost: 2, areaOfEffect: 1, upgradeCostCoins: 0 },
  'rpg_rake_basic': { itemId: 'rpg_rake_basic', type: 'Rake', tier: 'Basic', energyCost: 2, areaOfEffect: 1, upgradeCostCoins: 0 },
  'rpg_shovel_basic': { itemId: 'rpg_shovel_basic', type: 'Shovel', tier: 'Basic', energyCost: 2, areaOfEffect: 1, upgradeCostCoins: 0 },
  'rpg_watering_can_basic': { itemId: 'rpg_watering_can_basic', type: 'WateringCan', tier: 'Basic', energyCost: 2, areaOfEffect: 1, upgradeCostCoins: 0 },
  
  'rpg_sword_basic': { itemId: 'rpg_sword_basic', type: 'Sword', tier: 'Basic', energyCost: 1, damage: 3, upgradeCostCoins: 0 },
  'rpg_sword_copper': { itemId: 'rpg_sword_copper', type: 'Sword', tier: 'Copper', energyCost: 1, damage: 6, upgradeCostCoins: 2000, upgradeRequiredItemId: 'rpg_copper_bar', upgradeRequiredQuantity: 5 },

  'rpg_bamboo_pole': { itemId: 'rpg_bamboo_pole', type: 'FishingRod', tier: 'Basic', energyCost: 2, upgradeCostCoins: 0 },
  'rpg_fiberglass_rod': { itemId: 'rpg_fiberglass_rod', type: 'FishingRod', tier: 'Copper', energyCost: 2, upgradeCostCoins: 1800 },
};

export function getToolDef(itemId: string): ToolDefinition | null {
  return TOOL_CATALOG[itemId] || null;
}

// ─── Tool-upgrade mastery gates (RPG_PROGRESSION_LATTICE.md D4) ──────────────
// Acquiring a Copper (or higher) tool requires the matching mastery at Silver
// (level ≥2 here — the first non-Bronze rung on the tool-upgrade ladder, which
// is a coarser gate than the mastery-tier ladder used for veins). Basic tools
// are ungated (they're the starter kit). Maps a ToolType → { skill, minLevel }.
// skill strings match SkillType in db/skills.ts.
export type ToolUpgradeGate = { skill: string; minLevel: number; skillDisplay: string };

export const TOOL_UPGRADE_GATES: Record<ToolType, ToolUpgradeGate> = {
  Pickaxe: { skill: 'mining', minLevel: 2, skillDisplay: 'Mining' },
  Hoe: { skill: 'farming', minLevel: 2, skillDisplay: 'Farming' },
  WateringCan: { skill: 'farming', minLevel: 2, skillDisplay: 'Farming' },
  FishingRod: { skill: 'fishing', minLevel: 2, skillDisplay: 'Fishing' },
  Sword: { skill: 'combat', minLevel: 2, skillDisplay: 'Combat' },
  Axe: { skill: 'foraging', minLevel: 2, skillDisplay: 'Foraging' },
  // Rake/Shovel have no upgrade tiers today — no gate needed.
  Rake: { skill: 'farming', minLevel: 2, skillDisplay: 'Farming' },
  Shovel: { skill: 'farming', minLevel: 2, skillDisplay: 'Farming' },
};

// Returns the upgrade gate for the tool being upgraded TO. Basic-tier targets
// are never gated (they're the starter kit, not an upgrade).
export function upgradeGateFor(toolDef: ToolDefinition): ToolUpgradeGate | null {
  if (toolDef.tier === 'Basic') return null;
  return TOOL_UPGRADE_GATES[toolDef.type] ?? null;
}
