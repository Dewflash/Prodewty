import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { fonts, fontSize } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { getPlayerRankLabel } from '../db/game';
import { RANK_COLOR } from './game/DungeonCard';

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

  const rank      = getPlayerRankLabel(level);
  const rankColor = RANK_COLOR[rank] ?? colors.textMuted;
  const isUnranked = rank === 'F';

  // Pulsing glow on the rank badge — dormant ("sad") for the unranked F tier.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isUnranked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isUnranked, pulse]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] });
  const glowScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[
          styles.rankBadge,
          { borderColor: isUnranked ? `${rankColor}66` : rankColor },
          !isUnranked && { shadowColor: rankColor, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
        ]}>
          {!isUnranked && (
            <Animated.View
              pointerEvents="none"
              style={[styles.rankGlow, { backgroundColor: rankColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
            />
          )}
          <Text style={[styles.rankText, { color: isUnranked ? `${rankColor}AA` : rankColor }]}>{rank}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>LVL {level}</Text>
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
            <Text style={[styles.streakText, { color: streakColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
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
  rankBadge: {
    flexShrink: 0, overflow: 'hidden',
    minWidth: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  rankGlow: { ...StyleSheet.absoluteFillObject },
  rankText: { fontFamily: fonts.mono.bold, fontSize: fontSize.sm, letterSpacing: 1 },
  levelBadge: {
    flexShrink: 0,
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
    flexShrink: 0,
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
