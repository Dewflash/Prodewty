import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type Props = {
  level: number;
  totalXP: number;
  xpToNext: number;
  title: string;
  streakDays: number;
  frozen?: boolean;
};

export function XPBar({ level, totalXP, xpToNext, title, streakDays, frozen = false }: Props) {
  // total_xp in DB is stored as within-level XP (applyXP subtracts level-ups before saving)
  const currentLevelXP = totalXP;
  const progress = Math.min(currentLevelXP / xpToNext, 1);
  const streakColor = frozen ? colors.primary : colors.success;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.xpText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {currentLevelXP} / {xpToNext} XP
          </Text>
        </View>
        {streakDays > 0 && (
          <View style={[styles.streakBadge, { borderColor: streakColor, shadowColor: streakColor }]}>
            {frozen && <Text style={[styles.frozenIcon, { color: streakColor }]}>❄</Text>}
            <Text style={[styles.streakText, { color: streakColor }]}>
              Streak: {streakDays}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBadge: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: 'rgba(56,189,248,0.1)',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  levelText: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, color: colors.primary, letterSpacing: 1 },
  meta: { flex: 1, overflow: 'hidden' },
  title: { fontFamily: fonts.ui.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  xpText: { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: 'rgba(52,211,153,0.08)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6,
  },
  frozenIcon: { fontSize: 11 },
  streakText: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm },
  track: { height: 3, backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill: {
    height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4,
  },
});
