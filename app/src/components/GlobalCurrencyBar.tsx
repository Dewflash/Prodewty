import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { getRPGState } from '../db/rpg';
import { getHealthState } from '../db/health';
import { getDeathCount } from '../db/game';
import { onCurrencyRefresh } from '../db/currencySignal';

function fmtNum(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

type Chip = {
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
  value: string | number;
  label?: string;
};

function CurrencyChip({ icon, color, value, label }: Chip) {
  return (
    <View style={s.chip}>
      <Feather name={icon} size={10} color={color} />
      <Text style={[s.chipVal, { color }]} numberOfLines={1}>{value}</Text>
      {label ? <Text style={s.chipLabel}>{label}</Text> : null}
    </View>
  );
}

function readData() {
  let coins = 0, emotional = 0, physical = 0, mental = 0, xp = 0;
  let blight = 0, vigor = 0, gems = 0;
  try {
    const rpg    = getRPGState();
    const health = getHealthState();
    coins    = rpg.coins               ?? 0;
    xp       = rpg.total_xp            ?? 0;
    blight   = rpg.self_destruct_count ?? 0;
    vigor    = rpg.vigor               ?? 0;
    gems     = rpg.gems                ?? 0;
    emotional = Math.round(health.emotional);
    physical  = Math.round(health.physical);
    mental    = Math.round(health.mental);
  } catch {}
  const anima = vigor - blight;
  return { coins, emotional, physical, mental, xp, blight, vigor, anima, gems };
}

export function GlobalCurrencyBar() {
  const [data, setData] = useState(readData);

  useEffect(() => {
    // Re-read whenever health/currency/soul state changes anywhere in app
    return onCurrencyRefresh(() => setData(readData()));
  }, []);

  const { coins, emotional, physical, mental, xp, blight, vigor, anima, gems } = data;

  return (
    <View style={s.bar}>
      {/* Coins + Gems */}
      <View style={s.group}>
        <CurrencyChip icon="disc"    color="#FBBF24" value={coins} />
        <CurrencyChip icon="hexagon" color="#FF2400" value={gems}  />
      </View>
      <View style={s.sep} />

      {/* Health */}
      <View style={s.group}>
        <CurrencyChip icon="activity" color={colors.statEmotional} value={`${emotional}%`} />
        <CurrencyChip icon="zap"      color={colors.statPhysical}  value={`${physical}%`}  />
        <CurrencyChip icon="cpu"      color={colors.statMental}    value={`${mental}%`}    />
      </View>
      <View style={s.sep} />

      {/* Soul record */}
      <View style={s.group}>
        <CurrencyChip icon="frown"    color="#94A3B8" value={blight} />
        <CurrencyChip icon="heart"    color="#15803D" value={vigor}  />
        <CurrencyChip icon="aperture" color="#60A5FA" value={anima >= 0 ? `+${anima}` : String(anima)} />
      </View>
      <View style={s.sep} />

      {/* XP */}
      <View style={s.group}>
        <CurrencyChip icon="star" color={colors.success} value={fmtNum(xp)} label="XP" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  group:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chipVal:   { fontFamily: fonts.mono.bold, fontSize: 10 },
  chipLabel: { fontFamily: fonts.mono.regular, fontSize: 9, color: colors.textMuted },
  sep:       { width: 1, height: 10, backgroundColor: colors.border, flexShrink: 0 },
});
