// Region model (RPG_ARCHITECTURE_AUDIT.md, confirmed 2026-06-28): Sanctuary
// is home base, not a travel-gated zone — 'farm'/'town' folded into it.
// Expedition is the unsafe "real-world exploration" region, made of 4
// biome zones reached via energy-cost travel from Sanctuary.
export type ZoneId = 'sanctuary' | 'forest' | 'beach' | 'mountain' | 'desert';

export type ZoneDefinition = {
  id: ZoneId;
  name: string;
  description: string;
  connections: Partial<Record<ZoneId, number>>; // Destination ZoneId -> energy cost
};

export const ZONE_CATALOG: Record<ZoneId, ZoneDefinition> = {
  'sanctuary': {
    id: 'sanctuary',
    name: 'Sanctuary',
    description: 'Home base. Safe — farming, crafting, and villagers live here.',
    connections: { 'forest': 2, 'beach': 3, 'mountain': 3, 'desert': 5 },
  },
  'forest': {
    id: 'forest',
    name: 'The Forest',
    description: 'A dense forest perfect for foraging.',
    connections: { 'sanctuary': 2 },
  },
  'beach': {
    id: 'beach',
    name: 'The Beach',
    description: 'Listen to the waves and catch ocean fish.',
    connections: { 'sanctuary': 3 },
  },
  'mountain': {
    id: 'mountain',
    name: 'The Mountain',
    description: 'Home to the mines and a clear lake.',
    connections: { 'sanctuary': 3 },
  },
  'desert': {
    id: 'desert',
    name: 'The Desert',
    description: 'A harsh, arid landscape.',
    connections: { 'sanctuary': 5 },
  },
};

export function getZoneDef(id: string): ZoneDefinition | null {
  return ZONE_CATALOG[id as ZoneId] || null;
}
