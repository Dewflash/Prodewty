// Rarity system constants — single source of truth.
// suitup.tsx re-exports these for backward compat; new code should import from here directly.

export type Rarity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Chromatic';

export const RARITY_COLOR: Record<Rarity, string> = {
  E:         '#5C3317',
  D:         '#4B5563',
  C:         '#A2A680',
  B:         '#22C55E',
  A:         '#3B82F6',
  S:         '#6D28D9',
  SS:        '#A855F7',
  SSS:       '#EF4444',
  Chromatic: '#FFD700',
};

export const RARITY_BG: Record<Rarity, string> = {
  E:         'rgba(92,51,23,0.12)',
  D:         'rgba(75,85,99,0.10)',
  C:         'rgba(162,166,128,0.10)',
  B:         'rgba(34,197,94,0.08)',
  A:         'rgba(59,130,246,0.08)',
  S:         'rgba(109,40,217,0.08)',
  SS:        'rgba(168,85,247,0.08)',
  SSS:       'rgba(239,68,68,0.08)',
  Chromatic: '#CD7F32',
};

// Chromatic is presented to the user as "Legendary"
export function rarityLabel(r: Rarity): string {
  return r === 'Chromatic' ? 'Legendary' : r;
}
