// Shared question-rendering primitives — used by both the onboarding wizard
// (app/onboarding.tsx) and the Quest Preferences edit form (app/quest-preferences.tsx)
// so the same Q1-Q8 question bank looks and behaves identically in both places.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.chip, selected && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipTxt, selected && s.chipTxtOn]}>{label}</Text>
    </Pressable>
  );
}

export function OptionRow({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.optionRow, selected && s.optionRowOn]} onPress={onPress}>
      <View style={[s.radio, selected && s.radioOn]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.optionLabel, selected && s.optionLabelOn]}>{label}</Text>
        {hint && <Text style={s.optionHint}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.12)' },
  chipTxt: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },
  chipTxtOn: { color: colors.primary, fontFamily: fonts.ui.medium },

  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  optionRowOn: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.06)' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.textMuted },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLabel: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  optionLabelOn: { color: colors.primary },
  optionHint: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted },

  sliderBlock: { gap: spacing.xs, marginTop: spacing.sm, alignItems: 'center' },
  sliderValue: { fontFamily: fonts.mono.bold, fontSize: fontSize.lg, color: colors.primary },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  sliderEdge: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, minWidth: 40, textAlign: 'center' },
});
