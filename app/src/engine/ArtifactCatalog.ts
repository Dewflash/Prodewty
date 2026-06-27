export type ArtifactType = 'Mineral' | 'Relic';

export type ArtifactDefinition = {
  itemId: string;
  name: string;
  type: ArtifactType;
  sellPrice: number;
  description: string;
};

export const ARTIFACT_CATALOG: Record<string, ArtifactDefinition> = {
  'rpg_amethyst': { itemId: 'rpg_amethyst', name: 'Amethyst', type: 'Mineral', sellPrice: 100, description: 'A purple variant of quartz.' },
  'rpg_ruby': { itemId: 'rpg_ruby', name: 'Ruby', type: 'Mineral', sellPrice: 250, description: 'A precious stone that is sought after for its rich color.' },
  'rpg_diamond': { itemId: 'rpg_diamond', name: 'Diamond', type: 'Mineral', sellPrice: 750, description: 'A rare and valuable gem.' },
  
  'rpg_dwarvish_helm': { itemId: 'rpg_dwarvish_helm', name: 'Dwarvish Helm', type: 'Relic', sellPrice: 100, description: 'It is one of the helmets commonly worn by dwarves.' },
  'rpg_ancient_seed': { itemId: 'rpg_ancient_seed', name: 'Ancient Seed', type: 'Relic', sellPrice: 50, description: 'It is a dry old seed from some ancient plant.' }
};

export const ALL_MINERALS = ['rpg_amethyst', 'rpg_ruby', 'rpg_diamond'];
export const ALL_RELICS = ['rpg_dwarvish_helm', 'rpg_ancient_seed'];

export function getArtifactDef(itemId: string): ArtifactDefinition | null {
  return ARTIFACT_CATALOG[itemId] || null;
}
