export type ZoneId = 'farm' | 'town' | 'forest' | 'beach' | 'mountain' | 'desert';

export type ZoneDefinition = {
  id: ZoneId;
  name: string;
  description: string;
  connections: Partial<Record<ZoneId, number>>; // Destination ZoneId -> AP Cost
};

export const ZONE_CATALOG: Record<ZoneId, ZoneDefinition> = {
  'farm': {
    id: 'farm',
    name: 'Your Farm',
    description: 'Home sweet home. Plant crops and raise animals here.',
    connections: { 'town': 2, 'forest': 2, 'mountain': 3 }
  },
  'town': {
    id: 'town',
    name: 'Pelican Town',
    description: 'The bustling center of community life.',
    connections: { 'farm': 2, 'beach': 2, 'mountain': 2 }
  },
  'forest': {
    id: 'forest',
    name: 'Cindersap Forest',
    description: 'A dense forest perfect for foraging.',
    connections: { 'farm': 2, 'beach': 3 }
  },
  'beach': {
    id: 'beach',
    name: 'The Beach',
    description: 'Listen to the waves and catch ocean fish.',
    connections: { 'town': 2, 'forest': 3 }
  },
  'mountain': {
    id: 'mountain',
    name: 'The Mountain',
    description: 'Home to the mines and a clear lake.',
    connections: { 'farm': 3, 'town': 2 }
  },
  'desert': {
    id: 'desert',
    name: 'Calico Desert',
    description: 'A harsh, arid landscape.',
    connections: { 'town': 10 } // Maybe requires a bus ticket later, but for now just high AP
  }
};

export function getZoneDef(id: string): ZoneDefinition | null {
  return ZONE_CATALOG[id as ZoneId] || null;
}
