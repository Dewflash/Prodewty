export type AnimalType = 'Chicken' | 'Cow' | 'Sheep';

export type AnimalDefinition = {
  type: AnimalType;
  buyPrice: number;
  produceItemId: string;
  produceQuantity: number;
  daysToMature: number;
  requiredBuilding: 'Coop' | 'Barn';
};

export const ANIMAL_CATALOG: Record<AnimalType, AnimalDefinition> = {
  'Chicken': {
    type: 'Chicken',
    buyPrice: 800,
    produceItemId: 'rpg_egg',
    produceQuantity: 1,
    daysToMature: 3,
    requiredBuilding: 'Coop'
  },
  'Cow': {
    type: 'Cow',
    buyPrice: 1500,
    produceItemId: 'rpg_milk',
    produceQuantity: 1,
    daysToMature: 5,
    requiredBuilding: 'Barn'
  },
  'Sheep': {
    type: 'Sheep',
    buyPrice: 2000,
    produceItemId: 'rpg_wool',
    produceQuantity: 1,
    daysToMature: 5,
    requiredBuilding: 'Barn'
  }
};

export function getAnimalDef(type: AnimalType): AnimalDefinition | null {
  return ANIMAL_CATALOG[type] || null;
}
