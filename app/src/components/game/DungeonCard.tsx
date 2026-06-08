import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { isDungeonOnCooldown, getDungeonCooldownRemaining, type Dungeon } from '../../db/game';

export const RANK_COLOR: Record<string, string> = {
  E: '#64748B', D: '#34D399', C: '#38BDF8',
  B: '#A855F7', A: '#F97316', S: '#FBBF24',
  SS: '#F472B6', SSS: '#FB7185', Legend: '#FFFFFF',
};

export function DungeonCard({ dungeon, isActiveRun, onTap, onRarityInfo }: {
  dungeon: Dungeon; isActiveRun: boolean;
  onTap: () => void; onRarityInfo: () => void;
}) {
  const onCooldown        = !isActiveRun && isDungeonOnCooldown(dungeon.id, dungeon.cooldown_hours);
  const cooldownRemaining = onCooldown ? getDungeonCooldownRemaining(dungeon.id, dungeon.cooldown_hours) : null;
  const rankColor         = RANK_COLOR[dungeon.rank] ?? colors.textMuted;
  const statusColor = isActiveRun ? colors.primary : onCooldown ? colors.textMuted : colors.success;
  const statusText  = isActiveRun ? 'IN PROGRESS'
    : onCooldown ? `Replayable in: ${cooldownRemaining ?? '—'}`
    : 'Available';

  return (
    <Pressable
      onPress={!onCooldown ? onTap : undefined}
      style={[dc.card, { borderColor: rankColor, backgroundColor: `${rankColor}14` }, isActiveRun && { borderColor: colors.primary }]}
    >
      <Text style={[dc.rankLabel, { color: rankColor }]}>{dungeon.rank}-RANK GATE</Text>
      <Text style={dc.name}>{dungeon.name}</Text>
      <Text style={dc.statLine}>
        {dungeon.primary_stat.toUpperCase()} + {dungeon.secondary_stat?.toUpperCase() ?? '—'} · {dungeon.duration_mins} min
      </Text>
      {dungeon.flavor_text ? (
        <Text style={dc.flavor} numberOfLines={2}>{dungeon.flavor_text}</Text>
      ) : null}
      <View style={dc.footer}>
        <View style={[dc.statusChip, { borderColor: statusColor }]}>
          <Text style={[dc.statusTxt, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Pressable onPress={onRarityInfo} style={dc.dropBtn}>
          <Text style={dc.dropTxt}>Drop rates</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export const dc = StyleSheet.create({
  card:       { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: 6, borderWidth: 1, borderColor: colors.border },
  rankLabel:  { fontFamily: fonts.mono.regular, fontSize: 10, letterSpacing: 2 },
  name:       { fontFamily: fonts.ui.semibold,  fontSize: fontSize.md, color: colors.textPrimary },
  statLine:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: colors.textMuted },
  flavor:     { fontFamily: fonts.ui.regular,   fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:  { fontFamily: fonts.mono.regular, fontSize: 10, letterSpacing: 1 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropBtn:    { paddingHorizontal: 6, paddingVertical: 3 },
  dropTxt:    { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted, letterSpacing: 1 },
});
