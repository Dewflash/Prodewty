import React, { useRef, useState } from 'react';
import { Alert, View, Text, TextInput, StyleSheet, ScrollView, Pressable, Switch, Image } from 'react-native';
import { Screen } from '../src/components/Screen';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as DocumentPicker from 'expo-document-picker';
import { setAppIcon, getAppIcon } from '@howincodes/expo-dynamic-app-icon';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';
import { getBGMSelection, setBGMSelection, getSetting, setSetting, getDayStartHour, setDayStartHour } from '../src/db/settings';
import { isPersonalizationEnabled } from '../src/db/insights';
import { switchBGM, getCurrentBGMZone, reloadCurrentBGM } from '../src/services/audio';
import { pickCustomBGM, removeCustomBGM, getCustomBGMName, clearAllCustomBGM } from '../src/services/bgmCustom';
import { pickCustomWallpaper, removeCustomWallpaper, getCustomWallpaper } from '../src/services/wallpaperCustom';
import { exportData, importData } from '../src/services/dataBackup';
import { performFullReset } from '../src/db/schema';
import { triggerCurrencyRefresh } from '../src/db/currencySignal';

const DAY_START_HOURS = [0, 1, 2, 3, 4, 5, 6];
function fmtHour(h: number): string {
  if (h === 0) return 'Midnight';
  return `${h}am`;
}

const APP_ICONS = [
  { key: null,               label: 'Starry',      source: require('../assets/app-icons/icon-starry.png') },
  { key: 'icon-snow-night',  label: 'Snow Night',  source: require('../assets/app-icons/icon-snow-night.png') },
  { key: 'icon-snow-day',    label: 'Snow Day',    source: require('../assets/app-icons/icon-snow-day.png') },
  { key: 'icon-sunset',      label: 'Sunset',      source: require('../assets/app-icons/icon-sunset.png') },
  { key: 'icon-dusk',        label: 'Dusk',        source: require('../assets/app-icons/icon-dusk.png') },
] as const;

type AppIconKey = typeof APP_ICONS[number]['key'];

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

  const [customNames, setCustomNames] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const z of BGM_ZONES) for (let i = 0; i < z.tracks.length; i++) init[`${z.zone}_${i}`] = getCustomBGMName(z.zone, i);
    return init;
  });

  const [wallpaper, setWallpaper] = useState<string | null>(() => getCustomWallpaper());
  const [appIcon, setAppIconState] = useState<AppIconKey>(null);

  React.useEffect(() => {
    getAppIcon().then(current => {
      setAppIconState(current && current !== 'DEFAULT' ? (current as AppIconKey) : null);
    }).catch(() => {});
  }, []);

  async function handleSelectIcon(key: AppIconKey) {
    try {
      await setAppIcon(key);
      setAppIconState(key);
    } catch {
      Alert.alert('Could not change icon', 'Please try again.');
    }
  }
  const [personalization, setPersonalization] = useState(() => isPersonalizationEnabled());
  const [bibleXP, setBibleXP] = useState(() => getSetting('bible_xp', '50'));
  const [currency, setCurrency] = useState(() => getSetting('finance_currency', '$') || '$');
  const [dayStartHour, setDayStartHourState] = useState(() => getDayStartHour());

  const bibleXPRef = useRef(bibleXP);
  const currencyRef = useRef(currency);

  function togglePersonalization(value: boolean) {
    setSetting('personalization_enabled', value ? '1' : '0');
    setPersonalization(value);
  }

  function handleSelectDayStartHour(hour: number) {
    setDayStartHour(hour);
    setDayStartHourState(hour);
  }

  function handleSelect(zone: string, index: number) {
    setBGMSelection(zone, index);
    setSelections(prev => ({ ...prev, [zone]: index }));
    if (getCurrentBGMZone() === zone) void reloadCurrentBGM();
  }

  async function handleUploadBGM(zone: string, slot: number) {
    const uri = await pickCustomBGM(zone, slot);
    if (!uri) return;
    setCustomNames(prev => ({ ...prev, [`${zone}_${slot}`]: getCustomBGMName(zone, slot) }));
    if (getCurrentBGMZone() === zone && selections[zone] === slot) void reloadCurrentBGM();
  }

  function handleRemoveBGM(zone: string, slot: number) {
    removeCustomBGM(zone, slot);
    setCustomNames(prev => ({ ...prev, [`${zone}_${slot}`]: null }));
    if (getCurrentBGMZone() === zone && selections[zone] === slot) void reloadCurrentBGM();
  }

  async function handleUploadWallpaper() {
    const uri = await pickCustomWallpaper();
    if (!uri) return;
    setWallpaper(uri);
  }

  function handleRemoveWallpaper() {
    removeCustomWallpaper();
    setWallpaper(null);
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

  async function confirmAndWipe(archiveHistory: boolean, retainCustomizations: boolean, retainOnboarding: boolean = false) {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm full wipe & reset',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });
      if (result.success) {
        performFullReset(archiveHistory, retainCustomizations, retainOnboarding);
        clearAllCustomBGM();
        removeCustomWallpaper();
        triggerCurrencyRefresh();
        router.replace('/onboarding');
      } else {
        Alert.alert('Cancelled', 'Authentication failed — nothing was wiped.');
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication unavailable on this device.');
    }
  }

  function handleFullReset() {
    Alert.alert(
      'Keep your activity history?',
      'You can keep your existing logs as a read-only archive (browsable in History, never editable) or delete them for good. Your character resets to Level 1 either way.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete it all', style: 'destructive', onPress: () => promptRetainCustomizations(false) },
        { text: 'Archive my history', onPress: () => promptRetainCustomizations(true) },
      ],
    );
  }

  function promptRetainCustomizations(archiveHistory: boolean) {
    Alert.alert(
      'Retain Customizations?',
      'Do you want to keep your custom activities, moods, and recharge items? If wiped, you will need to set them up again during onboarding.',
      [
        { text: 'Wipe Customizations', style: 'destructive', onPress: () => confirmAndWipe(archiveHistory, false, false) },
        { text: 'Keep Customizations', onPress: () => promptRetainOnboarding(archiveHistory) },
      ]
    );
  }

  function promptRetainOnboarding(archiveHistory: boolean) {
    Alert.alert(
      'Skip Onboarding?',
      'Since you kept your custom activities, do you want to skip the onboarding flow? (If you restart onboarding, it will introduce new recommended activities on top of your retained ones).',
      [
        { text: 'Restart Onboarding', onPress: () => confirmAndWipe(archiveHistory, true, false) },
        { text: 'Skip Onboarding', style: 'cancel', onPress: () => confirmAndWipe(archiveHistory, true, true) },
      ]
    );
  }

  async function handleExportData() {
    try {
      const { tableCount } = await exportData();
      Alert.alert('Backup Exported', `Saved a snapshot of ${tableCount} tables. Choose where to save it from the share sheet.`);
    } catch {
      Alert.alert('Export Failed', 'Could not create a backup file.');
    }
  }

  async function handleImportData() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;

    Alert.alert(
      'Restore Data',
      'This replaces your current activity logs, RPG progress, inventory, and other saved data with the contents of this file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore', style: 'destructive', onPress: async () => {
            try {
              const { restored } = await importData(uri);
              Alert.alert('Data Restored', `Restored ${restored.length} tables. Close and reopen the app for all changes to take effect.`);
            } catch {
              Alert.alert('Restore Failed', 'Could not read or apply that backup file.');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── App Icon ── */}
        <Text style={s.sectionLabel}>APP ICON</Text>
        <Text style={s.sectionHint}>Pick which icon shows on your home screen.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconRow}>
          {APP_ICONS.map(({ key, label, source }) => {
            const active = appIcon === key;
            return (
              <Pressable key={key ?? 'default'} onPress={() => handleSelectIcon(key)} style={s.iconOption}>
                <Image source={source} style={[s.iconThumb, active && s.iconThumbActive]} />
                <Text style={[s.iconOptionLabel, active && { color: colors.primary }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Day Start ── */}
        <Text style={s.sectionLabel}>DAY START</Text>
        <Text style={s.sectionHint}>
          If you stay up late, pick the hour your "day" actually rolls over at. Logs made
          before that hour still show under today's date, marked with a small back-arrow,
          but count toward streaks, vigor, mood and XP tallies as yesterday.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hourRow}>
          {DAY_START_HOURS.map(h => {
            const active = dayStartHour === h;
            return (
              <Pressable key={h} onPress={() => handleSelectDayStartHour(h)} style={[s.hourChip, active && s.hourChipActive]}>
                <Text style={[s.hourChipText, active && { color: colors.primary }]}>{fmtHour(h)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Wallpaper ── */}
        <Text style={s.sectionLabel}>BACKGROUND</Text>
        <Text style={s.sectionHint}>Replace the app's flat background with your own image across every screen.</Text>
        <View style={s.zoneCard}>
          <View style={s.wallpaperRow}>
            {wallpaper && <Image source={{ uri: wallpaper }} style={s.wallpaperPreview} />}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.fieldLabel}>Custom wallpaper</Text>
              <Text style={s.sectionHint}>{wallpaper ? 'Applied to all screens.' : 'Using default background.'}</Text>
            </View>
            <Pressable style={s.iconBtn} onPress={handleUploadWallpaper}>
              <Feather name="upload" size={14} color={colors.textMuted} />
            </Pressable>
            {wallpaper && (
              <Pressable style={s.iconBtn} onPress={handleRemoveWallpaper}>
                <Feather name="x" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── BGM ── */}
        <Text style={s.sectionLabel}>BACKGROUND MUSIC</Text>
        <Text style={s.sectionHint}>Selections saved — upload your own track per slot, or it'll play once bundled audio is added.</Text>
        {BGM_ZONES.map(({ zone, label, tracks }) => (
          <View key={zone} style={s.zoneCard}>
            <Text style={s.zoneLabel}>{label}</Text>
            {tracks.map((trackLabel, i) => {
              const selected = selections[zone] === i;
              const customName = customNames[`${zone}_${i}`];
              return (
                <View key={i} style={s.trackItem}>
                  <Pressable
                    style={[s.trackBtn, selected && s.trackBtnOn]}
                    onPress={() => handleSelect(zone, i)}
                  >
                    <View style={[s.radio, selected && s.radioOn]} />
                    <Text style={[s.trackLabel, selected && s.trackLabelOn]} numberOfLines={1}>
                      {customName ?? trackLabel}
                    </Text>
                  </Pressable>
                  <Pressable style={s.iconBtn} onPress={() => handleUploadBGM(zone, i)}>
                    <Feather name="upload" size={14} color={colors.textMuted} />
                  </Pressable>
                  {customName && (
                    <Pressable style={s.iconBtn} onPress={() => handleRemoveBGM(zone, i)}>
                      <Feather name="x" size={14} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              );
            })}
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

        {/* ── Insights ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>INSIGHTS</Text>
        <Text style={s.sectionHint}>Lets the app notice patterns in your logs — like a category that's grown into its own thing, or a habit that's plateaued — and gently suggest tweaks. Off by default if you said no during setup; flip anytime.</Text>
        <View style={s.fieldCard}>
          <Text style={s.fieldLabel}>Personalized suggestions</Text>
          <Switch
            value={personalization}
            onValueChange={togglePersonalization}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>

        {/* ── Quest Preferences ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>QUESTS</Text>
        <Text style={s.sectionHint}>Edit the answers that shape your starting categories, restoratives, and quest mix. Re-derives on save. Biometric-gated.</Text>
        <Pressable style={s.fieldCard} onPress={() => router.push('/quest-preferences')}>
          <Text style={s.fieldLabel}>Quest Preferences</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>

        {/* ── Backup & Restore ── */}
        <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>BACKUP & RESTORE</Text>
        <Text style={s.sectionHint}>Export a JSON snapshot of your logs, RPG progress, inventory, and other saved data — useful before making big changes, or to move data between schema versions.</Text>
        <Pressable style={s.fieldCard} onPress={handleExportData}>
          <Text style={s.fieldLabel}>Export data</Text>
          <Feather name="download" size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable style={[s.fieldCard, { marginTop: spacing.sm }]} onPress={handleImportData}>
          <Text style={s.fieldLabel}>Import data</Text>
          <Feather name="upload" size={16} color={colors.textMuted} />
        </Pressable>

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
    </Screen>
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

  // App Icon
  iconRow:         { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.md },
  iconOption:      { alignItems: 'center', gap: 4, width: 64 },
  iconThumb:       { width: 56, height: 56, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  iconThumbActive: { borderColor: colors.primary },
  iconOptionLabel: { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  // Day Start
  hourRow:       { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.md },
  hourChip:      { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  hourChipActive:{ borderColor: colors.primary },
  hourChipText:  { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.textMuted },

  // Wallpaper
  wallpaperRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wallpaperPreview: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.border },

  // BGM
  zoneCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  zoneLabel:    { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  trackItem:    { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trackBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  trackBtnOn:   { borderColor: colors.primary, backgroundColor: 'rgba(56,189,248,0.08)' },
  radio:        { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.textMuted },
  radioOn:      { borderColor: colors.primary, backgroundColor: colors.primary },
  trackLabel:   { fontFamily: fonts.ui.regular, fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  trackLabelOn: { color: colors.primary },
  iconBtn:      { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 6 },

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
