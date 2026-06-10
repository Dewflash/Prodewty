import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getRPGState } from '../db/rpg';
import { getHealthState } from '../db/health';
import { onCurrencyRefresh } from '../db/currencySignal';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type BarData = {
  coins: number;
  gems: number;
  emotional: number;
  physical: number;
  mental: number;
  blight: number;
  vigor: number;
  anima: number;
};

const FALLBACK: BarData = {
  coins: 0, gems: 0,
  emotional: 100, physical: 100, mental: 100,
  blight: 0, vigor: 0, anima: 0,
};

function readBarData(): BarData {
  const rpg = getRPGState();
  const health = getHealthState();
  const blight = rpg.self_destruct_count ?? 0;
  const vigor = rpg.vigor ?? 0;
  return {
    coins: rpg.coins ?? 0,
    gems: rpg.gems ?? 0,
    emotional: Math.round(health.emotional),
    physical: Math.round(health.physical),
    mental: Math.round(health.mental),
    blight,
    vigor,
    anima: vigor - blight,
  };
}

export function GlobalCurrencyBar() {
  const [data, setData] = useState<BarData>(() => {
    try { return readBarData(); } catch { return FALLBACK; }
  });

  const refresh = useCallback(() => {
    try { setData(readBarData()); } catch {}
  }, []);

  useEffect(() => onCurrencyRefresh(refresh), [refresh]);

  const animaLabel = data.anima > 0 ? `+${data.anima}` : String(data.anima);

  return (
    <View style={s.bar}>
      <View style={s.pair}>
        <Feather name="disc" size={10} color="#F59E0B" />
        <Text style={[s.val, { color: '#F59E0B' }]}>{data.coins}</Text>
      </View>

      <View style={s.pair}>
        <Feather name="hexagon" size={10} color="#FF2400" />
        <Text style={[s.val, { color: '#FF2400' }]}>{data.gems}</Text>
      </View>

      <View style={s.div} />

      <View style={s.pair}>
        <Feather name="activity" size={10} color={colors.statEmotional} />
        <Text style={[s.val, { color: colors.statEmotional }]}>{data.emotional}%</Text>
      </View>

      <View style={s.pair}>
        <Feather name="zap" size={10} color={colors.statPhysical} />
        <Text style={[s.val, { color: colors.statPhysical }]}>{data.physical}%</Text>
      </View>

      <View style={s.pair}>
        <Feather name="cpu" size={10} color={colors.statMental} />
        <Text style={[s.val, { color: colors.statMental }]}>{data.mental}%</Text>
      </View>

      <View style={s.div} />

      <View style={s.pair}>
        <Feather name="frown" size={10} color="#94A3B8" />
        <Text style={[s.val, { color: '#94A3B8' }]}>{data.blight}</Text>
      </View>

      <View style={s.pair}>
        <Feather name="heart" size={10} color={colors.success} />
        <Text style={[s.val, { color: colors.success }]}>{data.vigor}</Text>
      </View>

      <View style={s.pair}>
        <Feather name="aperture" size={10} color="#60A5FA" />
        <Text style={[s.val, { color: '#60A5FA' }]}>{animaLabel}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 38,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  div: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  val: {
    fontFamily: fonts.mono.regular,
    fontSize: 11,
    lineHeight: 14,
  },
});
