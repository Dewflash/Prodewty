import React, { useRef, useState } from 'react';
import { Alert, View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getBGMSelection, setBGMSelection, getSetting, setSetting } from '../src/db/settings';
import { switchBGM, getCurrentBGMZone, reloadCurrentBGM } from '../src/services/audio';
import { performFullReset } from '../src/db/schema';
import { triggerCurrencyRefresh } from '../src/db/currencySignal';

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

  const [bibleXP, setBibleXP] = useState(() => getSetting('bible_xp', '50'));
  const [currency, setCurrency] = useState(() => getSetting('finance_currency', '$') || '$');

  const bibleXPRef = useRef(bibleXP);
  const currencyRef = useRef(currency);

  function handleSelect(zone: string, index: number) {
    setBGMSelection(zone, index);
    setSelections(prev => ({ ...prev, [zone]: index }));
    if (getCurrentBGMZone() === zone) void reloadCurrentBGM();
  }

  function saveBibleXP(val: string) {
    const n = parseInt(val, 10);
    const clamped = isNaN(n) ? 50 : Math.max(10, Math.min(200, n));
    const saved = String(clamped);
    setSetting('bible_xp', saved);
    setBibleXP(saved);
    bibleXPRef.current = saved;
  }

  function saveCurrency(val: string) {
    const clean = val.trim().slice(0, 3) || '$';
    setSetting('finance_currency', clean);
    setCurrency(clean);
    currencyRef.current = clean;
  }

  async function handleFullReset() {
    Alert.alert(
      'Full wipe & reset',
      'This permanently deletes ALL progress — logs, quests, inventory, dungeon history, habits, custom moods, categories, recharge activities — and resets your character to Level 1 with full health. Game content (dungeons) is kept and personal-build defaults are re-seeded.\n\nThis cannot be undone.\n\nAuthenticate to confirm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authenticate & Wipe',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm full wipe & reset',
                fallbackLabel: 'Use passcode',
                disableDeviceFallback: false,
              });
              if (result.success) {
                performFullReset();
                triggerCurrencyRefresh();
                Alert.alert('Done', 'Everything has been wiped. You are starting fresh at Level 1.');
              } else {
                Alert.alert('Cancelled', 'Authentication failed — nothing was wiped.');
              }
            } catch {
              Alert.alert('Error', 'Biometric authentication unavailable on this device.');
            }
          },
        },
      ],
    );
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

        {/* ── BGM ── */}
        <Text style={s.sectionLabel}>BACKGROUND MUSIC</Text>
        <Text style={s.sectionHint}>Selections saved — tracks will play once audio files are added.</Text>
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
                    <Text style={[s.trackLabel, selected && s.trackLabelOn]}>{trackLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Bible ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>BIBLE</Text>
        <Text style={s.sectionHint}>XP awarded for your first save on each devotion note (10–200).</Text>
        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>XP per devotion</Text>
          <TextInput
            style={s.fieldInput}
            value={bibleXP}
            onChangeText={v => { setBibleXP(v); bibleXPRef.current = v; }}
            onBlur={() => saveBibleXP(bibleXPRef.current)}
            onSubmitEditing={() => saveBibleXP(bibleXPRef.current)}
            keyboardType="numeric"
            returnKeyType="done"
            maxLength={3}
            placeholder="50"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* ── Finance ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>FINANCE</Text>
        <Text style={s.sectionHint}>Currency symbol shown in the Finance screen (max 3 characters).</Text>
        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>Currency symbol</Text>
          <TextInput
            style={s.fieldInput}
            value={currency}
            onChangeText={v => { setCurrency(v); currencyRef.current = v; }}
            onBlur={() => saveCurrency(currencyRef.current)}
            onSubmitEditing={() => saveCurrency(currencyRef.current)}
            returnKeyType="done"
            maxLength={3}
            placeholder="$"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* ── Danger Zone ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md, color: colors.danger }]}>DANGER ZONE</Text>
        <View style={s.dangerCard}>
          <View style={s.dangerRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.dangerTitle}>Full wipe & reset</Text>
              <Text style={s.dangerHint}>Permanently resets everything to a fresh Level 1 start — logs, quests, inventory, dungeon history, habits, custom moods, categories, and recharge activities are wiped and re-seeded. Requires Face ID / passcode to confirm.</Text>
            </View>
            <Pressable style={s.dangerBtn} onPress={handleFullReset}>
              <Feather name="trash-2" size={15} color={colors.danger} />
              <Text style={s.dangerBtnTxt}>Wipe</Text>
            </Pressable>
          </View>
        </View>

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
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: 60 },

  sectionLabel: {
    fontFamily: fonts.mono.regular, fontSize: fontSize.xs,
    color: colors.primary, letterSpacing: 2, marginBottom: 2,
  },
  sectionHint: {
    fontFamily: fonts.ui.regular, fontSize: fontSize.xs,
    color: colors.textMuted, marginBottom: spacing.sm,
  },

  // BGM
  zoneCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  zoneLabel:    { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  trackRow:     { flexDirection: 'row', gap: spacing.sm },
  trackBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  trackBtnOn:   { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.08)' },
  radio:        { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textMuted },
  radioOn:      { borderColor: colors.primary, backgroundColor: colors.primary },
  trackLabel:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  trackLabelOn: { color: colors.primary },

  // Field (bible XP + currency)
  fieldCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fieldLabel: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  fieldInput: {
    fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.textPrimary,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 2, minWidth: 48, textAlign: 'right',
  },

  // Danger zone
  dangerCard: {
    backgroundColor: 'rgba(239,68,68,0.04)', borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: spacing.md,
  },
  dangerRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dangerTitle:  { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.danger },
  dangerHint:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  dangerBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  dangerBtnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.danger },
});
