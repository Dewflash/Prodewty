// Shared constants for the 3 health stat bars.
// Single source of truth — import here instead of redefining in each component.

import { colors } from '../theme/colors';

export type StatKey = 'emotional' | 'physical' | 'mental';

export const STAT_ICON: Record<StatKey, string> = {
  emotional: 'activity',
  physical:  'zap',
  mental:    'cpu',
};

export const STAT_COLOR: Record<StatKey, string> = {
  emotional: colors.statEmotional, // #F87171
  physical:  colors.statPhysical,  // #2563EB
  mental:    colors.statMental,    // #D97706
};

export const STAT_LABEL: Record<StatKey, string> = {
  emotional: 'Emotional',
  physical:  'Physical',
  mental:    'Mental',
};
