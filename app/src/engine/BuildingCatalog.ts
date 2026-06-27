export type BuildingType = 'Coop' | 'Barn' | 'Furnace' | 'Loom';

export type BuildingDefinition = {
  id: string;
  name: string;
  type: BuildingType;
  priceCoins: number;
  priceWood: number;
  priceStone: number;
  colWidth: number;
  colHeight: number;
};

export const BUILDING_CATALOG: Record<string, BuildingDefinition> = {
  'rpg_coop': {
    id: 'rpg_coop',
    name: 'Chicken Coop',
    type: 'Coop',
    priceCoins: 4000,
    priceWood: 300,
    priceStone: 100,
    colWidth: 6,
    colHeight: 3
  },
  'rpg_barn': {
    id: 'rpg_barn',
    name: 'Barn',
    type: 'Barn',
    priceCoins: 6000,
    priceWood: 350,
    priceStone: 150,
    colWidth: 7,
    colHeight: 4
  },
  'rpg_furnace': {
    id: 'rpg_furnace',
    name: 'Furnace',
    type: 'Furnace',
    priceCoins: 250,
    priceWood: 0,
    priceStone: 20,
    colWidth: 1,
    colHeight: 1
  }
};

export function getBuildingDef(id: string): BuildingDefinition | null {
  return BUILDING_CATALOG[id] || null;
}
