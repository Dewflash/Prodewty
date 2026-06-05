// Rarity system constants — single source of truth.
// suitup.tsx re-exports these for backward compat; new code should import from here directly.

export type Rarity = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Chromatic';

export const RARITY_COLOR: Record<Rarity, string> = {
  E:         '#5C3317',
  D:         '#4B5563',
  C:         '#22C55E',
  B:         '#00B7B7',
  A:         '#3B82F6',
  S:         '#A855F7',
  SS:        '#EF4444',
  SSS:       '#FFD700',
  Chromatic: '#FFFFFF',
};

export const RARITY_BG: Record<Rarity, string> = {
  E:         'rgba(92,51,23,0.12)',
  D:         'rgba(75,85,99,0.10)',
  C:         'rgba(34,197,94,0.08)',
  B:         'rgba(0,183,183,0.08)',
  A:         'rgba(59,130,246,0.08)',
  S:         'rgba(168,85,247,0.08)',
  SS:        'rgba(239,68,68,0.08)',
  SSS:       'rgba(255,215,0,0.08)',
  Chromatic: 'rgba(255,255,255,0.08)',
};

// Chromatic is presented to the user as "Legendary"
export function rarityLabel(r: Rarity): string {
  return r === 'Chromatic' ? 'Legendary' : r;
}
