// Biome Guardians (Phase 5) — enemies that guard a biome's high-value
// nodes. Two behaviours from the spec:
//  - 'chaser'  (Slime): wanders near its anchor, aggros and closes on the
//    player, deals contact damage. Drops Slime Gel.
//  - 'turret'  (Predator Plant): stationary, camouflaged until the player
//    nears, then fires ranged damage. Drops Fiber (for Net/Rope).
// Catalog is pure data; spawning/AI live in BiomeCombatLogic + biome.tsx.

import type { RpgDrop } from './RpgObjectCatalog';

export type GuardianBehaviour = 'chaser' | 'turret';

export type GuardianDefinition = {
  defId: string;
  name: string;
  behaviour: GuardianBehaviour;
  maxHp: number;
  atk: number;
  aggroRange: number;   // pixels — player within this range triggers aggro
  attackRange: number;  // pixels — chaser contact / turret fire range
  speedFactor: number;  // fraction of player SPEED (chasers only)
  featherIcon: string;  // placeholder art
  color: string;
  drops: RpgDrop[];
};

export const GUARDIAN_DEFS: Record<string, GuardianDefinition> = {
  forest_slime: {
    defId: 'forest_slime',
    name: 'Forest Slime',
    behaviour: 'chaser',
    maxHp: 18,
    atk: 5,
    aggroRange: 150,
    attackRange: 34,
    speedFactor: 0.8,
    featherIcon: 'droplet',
    color: '#6fbf73',
    drops: [{ itemId: 'rpg_slime_gel', chance: 1, min: 1, max: 2 }],
  },
  predator_plant: {
    defId: 'predator_plant',
    name: 'Predator Plant',
    behaviour: 'turret',
    maxHp: 26,
    atk: 7,
    aggroRange: 170,
    attackRange: 170,
    speedFactor: 0,
    featherIcon: 'feather',
    color: '#b85c8a',
    drops: [{ itemId: 'rpg_fiber', chance: 1, min: 1, max: 3 }],
  },
};

// Which guardian guards each biome, and its danger tier (1 = mild). Forest
// is the gentle intro (slimes); Mountain/Desert are tier-2 turrets. Beach
// gets slimes as a tier-1 too. Dungeon orcs are a separate existing system.
export const BIOME_GUARDIAN: Record<string, { defId: string; tier: number } | undefined> = {
  forest: { defId: 'forest_slime', tier: 1 },
  beach: { defId: 'forest_slime', tier: 1 },
  mountain: { defId: 'predator_plant', tier: 2 },
  desert: { defId: 'predator_plant', tier: 2 },
};

export function getGuardianDef(defId: string): GuardianDefinition | null {
  return GUARDIAN_DEFS[defId] ?? null;
}
