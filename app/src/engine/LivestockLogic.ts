// Pure, dependency-free livestock math (RPG_PROGRESSION_LATTICE.md Wave 5 —
// livestock v1). Animal defs, happiness math, produce-readiness, and per-building
// capacity all live here so the shipped rules are the tested rules — no React /
// SQLite / asset imports. db/livestockState.ts persists the state and applies the
// returned values; rpg.tsx drives the interactions. Content values (animal names,
// produce mappings, buy prices) are copied from the animal object catalog
// (RpgObjectCatalog animalObjectPrice/animalProductDrop) and the verified sprite
// pack (RpgAssetRegistry RPG_ANIMAL_OBJECT_ASSETS) — never their System-A tables.
//
// Validated in LivestockLogic.test.ts by scanning the catalog/registry SOURCE
// text (like BundleCatalog.test.ts), since those modules require() PNG assets
// that plain node/tsx can't load.

// ─── Animal definitions ─────────────────────────────────────────────────────
// housing: which building role houses this animal (RpgAssetRegistry keys the
// Chick under the Coop; the larger three under the Barn — see the work order).
// objectType: the sanctuary_objects `type` (== the placeable item id in
// RPG_ANIMAL_OBJECT_CATALOG, keyed by RPG_ANIMAL_OBJECT_ASSETS[].itemId).
// produceItemId: the inventory item produced (matches animalProductDrop).
// buyPrice: coin cost (matches animalObjectPrice; all in the 140-420 band the
// work order calls out as ~200-500-ish).
// produceValue: informational base sell value of the produce (from
// RESOURCE_SELL_PRICES), surfaced for UI copy.
export type LivestockAnimalType = 'chick' | 'sheep' | 'calf' | 'piglet';
export type LivestockBuilding = 'Coop' | 'Barn';

export type LivestockAnimalDef = {
  animalType: LivestockAnimalType;
  name: string;
  objectType: string;
  housing: LivestockBuilding;
  produceItemId: string;
  produceName: string;
  buyPrice: number;
  produceValue: number;
};

export const LIVESTOCK_ANIMALS: Record<LivestockAnimalType, LivestockAnimalDef> = {
  chick: {
    animalType: 'chick',
    name: 'Chick',
    objectType: 'Farm_chick',
    housing: 'Coop',
    produceItemId: 'rpg_egg',
    produceName: 'Egg',
    buyPrice: 200,
    produceValue: 20,
  },
  sheep: {
    animalType: 'sheep',
    name: 'Sheep',
    objectType: 'Farm_sheep',
    housing: 'Barn',
    produceItemId: 'rpg_wool',
    produceName: 'Wool',
    buyPrice: 320,
    produceValue: 35,
  },
  calf: {
    animalType: 'calf',
    name: 'Calf',
    objectType: 'Farm_calf',
    housing: 'Barn',
    produceItemId: 'rpg_milk',
    produceName: 'Milk',
    buyPrice: 420,
    produceValue: 40,
  },
  piglet: {
    animalType: 'piglet',
    name: 'Piglet',
    objectType: 'Farm_piglet',
    housing: 'Barn',
    produceItemId: 'rpg_truffle',
    produceName: 'Truffle',
    buyPrice: 260,
    produceValue: 45,
  },
};

export function getLivestockDef(animalType: string): LivestockAnimalDef | null {
  return LIVESTOCK_ANIMALS[animalType as LivestockAnimalType] ?? null;
}

// Resolve an animal by its sanctuary_objects `type` (the placeable item id).
export function getLivestockDefByObjectType(objectType: string): LivestockAnimalDef | null {
  for (const def of Object.values(LIVESTOCK_ANIMALS)) {
    if (def.objectType === objectType) return def;
  }
  return null;
}

// ─── Happiness math ─────────────────────────────────────────────────────────
// Clamped 0-100. Feeding a fed-yesterday streak nudges up; a missed feed day
// decays hard; petting is a small daily top-up.
export const HAPPINESS_MIN = 0;
export const HAPPINESS_MAX = 100;
export const HAPPINESS_START = 50;

export const FEED_HAPPINESS_GAIN = 10;   // fed on a day → +10
export const MISSED_FEED_HAPPINESS_LOSS = 15; // a day passed unfed → -15
export const PET_HAPPINESS_GAIN = 5;     // petted (once/day) → +5

export function clampHappiness(value: number): number {
  return Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, Math.round(value)));
}

export function applyFeedHappiness(current: number): number {
  return clampHappiness(current + FEED_HAPPINESS_GAIN);
}

export function applyPetHappiness(current: number): number {
  return clampHappiness(current + PET_HAPPINESS_GAIN);
}

// Nightly decay for a single missed feed day (used by the overnight processor
// when the animal was NOT fed on the day that just ended).
export function applyMissedFeedHappiness(current: number): number {
  return clampHappiness(current - MISSED_FEED_HAPPINESS_LOSS);
}

// ─── Produce readiness (RPG_PROGRESSION_LATTICE.md Wave 5) ───────────────────
// An animal has produce available on a day when it was fed the PREVIOUS day and
// its happiness is at least the readiness floor. The overnight processor is the
// single writer of last_produce_day-eligibility; this pure predicate is what it
// (and any UI hint) consults.
export const PRODUCE_HAPPINESS_MIN = 30;   // fed yesterday AND happiness ≥30
export const QUALITY_HAPPINESS_MIN = 80;   // happiness ≥80 → 2× quantity
export const PRODUCE_BASE_QUANTITY = 1;
export const PRODUCE_QUALITY_QUANTITY = 2;

// True when an animal that was fed yesterday is happy enough to yield today.
export function isProduceReady(fedYesterday: boolean, happiness: number): boolean {
  return fedYesterday && happiness >= PRODUCE_HAPPINESS_MIN;
}

// Quantity yielded when produce is collected: the quality bonus doubles output
// for a well-kept (happiness ≥80) animal.
export function produceQuantity(happiness: number): number {
  return happiness >= QUALITY_HAPPINESS_MIN ? PRODUCE_QUALITY_QUANTITY : PRODUCE_BASE_QUANTITY;
}

// ─── Capacity rules (per building level) ────────────────────────────────────
// Coop lvl1 = 2 animals; Barn lvl1 = 2; either at lvl2 = 4. (Work order.)
// Level is clamped so an unexpected level ≥2 never grants runaway capacity.
export const BASE_CAPACITY = 2;
export const UPGRADED_CAPACITY = 4;

export function buildingCapacity(level: number): number {
  return level >= 2 ? UPGRADED_CAPACITY : BASE_CAPACITY;
}

// Whether another animal fits: current occupancy strictly below the level's cap.
export function hasFreeCapacity(currentCount: number, level: number): boolean {
  return currentCount < buildingCapacity(level);
}

// The animals a given building may house: the Coop takes chicks, the Barn takes
// the larger three. Used to validate a buy against the target building.
export function buildingHousesAnimal(building: LivestockBuilding, animalType: LivestockAnimalType): boolean {
  return getLivestockDef(animalType)?.housing === building;
}
