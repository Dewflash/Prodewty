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
};

export function XPBar({ level, totalXP, xpToNext, title, streakDays }: Props) {
  const currentLevelXP = totalXP % xpToNext;
  const progress = Math.min(currentLevelXP / xpToNext, 1);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {level}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.xpText}>
            {currentLevelXP} / {xpToNext} XP
          </Text>
        </View>
        {streakDays > 0 && (
          <Text style={styles.streak}>{streakDays}d</Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelBadge: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  levelText: {
    fontFamily: fonts.mono.bold,
    fontSize: fontSize.xs,
    color: colors.primary,
    letterSpacing: 1,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.ui.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  xpText: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  streak: {
    fontFamily: fonts.mono.regular,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
