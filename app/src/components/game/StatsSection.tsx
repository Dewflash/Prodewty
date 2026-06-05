import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import type { GameStats } from '../../db/game';

// ─── Types ────────────────────────────────────────────────────────────────────

export const STAT_KEYS: { key: keyof GameStats; label: string; abbr: string }[] = [
  { key: 'str', label: 'Strength',     abbr: 'STR' },
  { key: 'agi', label: 'Agility',      abbr: 'AGI' },
  { key: 'foc', label: 'Focus',        abbr: 'FOC' },
  { key: 'wis', label: 'Wisdom',       abbr: 'WIS' },
  { key: 'spr', label: 'Spirituality', abbr: 'SPR' },
  { key: 'per', label: 'Perception',   abbr: 'PER' },
  { key: 'sta', label: 'Stamina',      abbr: 'STA' },
];


// ─── SystemBar ────────────────────────────────────────────────────────────────

export function SystemBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  return (
    <View style={sb.wrap}>
      <View style={sb.header}>
        <Text style={sb.label}>{label}</Text>
        <Text style={[sb.val, { color }]}>{value} / {max}</Text>
      </View>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap:   { gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label:  { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  val:    { fontFamily: fonts.mono.bold, fontSize: fontSize.xs },
  track:  { height: 6, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: radius.pill },
});

// ─── StatRow ──────────────────────────────────────────────────────────────────

export function StatRow({ stat, value, apPart, autoPart, ap, onAllocate, expanded, onToggle }: {
  stat: typeof STAT_KEYS[number];
  value: number; apPart: number; autoPart: number;
  ap: number; onAllocate: (key: string) => void;
  expanded: boolean; onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={st.row}>
      <Text style={[st.abbr, expanded && st.abbrExpanded]}>
        {expanded ? stat.label : stat.abbr}
      </Text>
      {!expanded && <Text style={st.val}>{value}</Text>}
      {!expanded && <Text style={st.breakdown}>({apPart} AP + {autoPart} auto)</Text>}
      {expanded && (
        <Text style={st.breakdownExpanded}>{value} ({apPart}+{autoPart})</Text>
      )}
      {ap > 0 && (
        <Pressable onPress={() => onAllocate(stat.key as string)} style={st.plus}>
          <Text style={st.plusTxt}>+</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  row:               { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 5 },
  abbr:              { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.primary, width: 40 },
  abbrExpanded:      { color: colors.textPrimary, width: 88, fontSize: fontSize.xs },
  val:               { fontFamily: fonts.mono.bold, fontSize: fontSize.md, color: colors.textPrimary, width: 36 },
  breakdown:         { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  breakdownExpanded: { flex: 1, fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  plus:    { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(56,189,248,0.15)', borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plusTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.primary },
});
