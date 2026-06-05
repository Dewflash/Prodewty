import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getBGMSelection, setBGMSelection } from '../src/db/settings';
import { switchBGM, getCurrentBGMZone, reloadCurrentBGM } from '../src/services/audio';

const BGM_ZONES = [
  { zone: 'progress',   label: 'Progress',     tracks: ['Track 1', 'Track 2', 'Track 3'] },
  { zone: 'historylog', label: 'History & Log', tracks: ['Track 1', 'Track 2', 'Track 3'] },
  { zone: 'recharge',   label: 'Recharge',      tracks: ['Track 1', 'Track 2', 'Track 3'] },
  { zone: 'game',       label: 'Game',          tracks: ['Track 1', 'Track 2', 'Track 3'] },
  { zone: 'store',      label: 'Store',         tracks: ['Track 1', 'Track 2', 'Track 3'] },
] as const;

export default function SettingsScreen() {
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const z of BGM_ZONES) init[z.zone] = getBGMSelection(z.zone);
    return init;
  });

  function handleSelect(zone: string, index: number) {
    setBGMSelection(zone, index);
    setSelections(prev => ({ ...prev, [zone]: index }));
    if (getCurrentBGMZone() === zone) {
      void reloadCurrentBGM();
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLabel}>BACKGROUND MUSIC</Text>
        <Text style={s.sectionHint}>
          Selections saved — tracks will play once audio files are added.
        </Text>

        {BGM_ZONES.map(({ zone, label, tracks }) => (
          <View key={zone} style={s.zoneCard}>
            <Text style={s.zoneLabel}>{label}</Text>
            <View style={s.trackRow}>
              {tracks.map((trackLabel, i) => {
                const selected = selections[zone] === i;
                return (
                  <Pressable
                    key={i}
                    style={[s.trackBtn, selected && s.trackBtnOn]}
                    onPress={() => handleSelect(zone, i)}
                  >
                    <View style={[s.radio, selected && s.radioOn]} />
                    <Text style={[s.trackLabel, selected && s.trackLabelOn]}>
                      {trackLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back:  { padding: 6 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.base, color: colors.textPrimary },
  scroll: { padding: spacing.md, gap: spacing.md },
  sectionLabel: {
    fontFamily: fonts.mono.regular, fontSize: fontSize.xs,
    color: colors.primary, letterSpacing: 2, marginBottom: 2,
  },
  sectionHint: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.xs,
    color: colors.textMuted, marginBottom: spacing.sm,
  },
  zoneCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  zoneLabel: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  trackRow: { flexDirection: 'row', gap: spacing.sm },
  trackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
  },
  trackBtnOn: { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.08)' },
  radio: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: colors.textMuted,
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  trackLabel: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.xs,
    color: colors.textMuted, flex: 1,
  },
  trackLabelOn: { color: colors.primary },
});
