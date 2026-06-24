import {Platform} from 'react-native';

// Minimal theme subset the editor/toolbar need. Replace values to match your
// other project's palette/fonts — the editor only reads these tokens.
const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const sansFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

export const theme = {
  colors: {
    parchment: '#FAF7F2',
    ink: '#1A1815',
    ink2: '#6B6560',
    cedar: '#B8794A',
    cedarWash: 'rgba(184, 121, 74, 0.14)',
    sage: '#6B8E5A',
    gold: '#B08A3E',
    border: 'rgba(107, 101, 96, 0.2)',
    danger: '#B84A3B',
    shield: '#2A2521',
  },
  fonts: {
    serif: serifFont,
    sans: sansFont,
  },
};
