import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular, JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { db, initDB } from '../src/db/schema';
import { checkStreakFreeze, getRPGState, clearLevelUpPending } from '../src/db/rpg';
import { registerDeathCheck } from '../src/db/deathCheckSignal';
import { getDeathCause, type DeathCause } from '../src/db/game';
import { applyHealthDecay } from '../src/db/health';
import { DeathScreen } from '../src/components/DeathScreen';
import { colors } from '../src/theme/colors';
import { fonts, fontSize } from '../src/theme/typography';
import { spacing, radius } from '../src/theme/spacing';

initDB();
checkStreakFreeze();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_700Bold,
  });

  const [deathCause,   setDeathCause]   = useState<DeathCause>(null);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  function checkState() {
    applyHealthDecay();
    const rpg = getRPGState();

    // Death check — only show if not already acknowledged
    const cause = getDeathCause();
    if (cause && !(rpg.death_acknowledged)) {
      setDeathCause(cause);
    } else if (!cause) {
      // All clear — reset acknowledged so next death triggers screen again
      try { db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1'); } catch {}
      setDeathCause(null);
    }

    // Level-up pending check
    if ((rpg.level_up_pending ?? 0) > 0) {
      setLevelUpLevel(rpg.level_up_pending);
      clearLevelUpPending();
    }
  }

  useEffect(() => {
    registerDeathCheck(checkState);
    checkState();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') checkState(); });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="revelations" />
        <Stack.Screen name="store" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="milestones" />
        <Stack.Screen name="game-log" />
      </Stack>

      <DeathScreen cause={deathCause} onResolve={() => { setDeathCause(null); checkState(); }} />

      {/* Level-up celebration modal */}
      <Modal visible={levelUpLevel !== null} transparent animationType="fade">
        <View style={lv.overlay}>
          <View style={lv.panel}>
            <Text style={lv.title}>LEVEL UP</Text>
            <Text style={lv.level}>LVL {levelUpLevel}</Text>
            <View style={lv.divider} />
            <Text style={lv.reward}>+10 AP earned</Text>
            <Text style={lv.sub}>Allocate AP in the Game tab to raise your stats.</Text>
            <Pressable style={lv.btn} onPress={() => setLevelUpLevel(null)}>
              <Text style={lv.btnTxt}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const lv = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  panel: {
    width: '100%', maxWidth: 320, backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 20,
  },
  title: { fontFamily: fonts.mono.regular, fontSize: fontSize.sm, color: colors.primary, letterSpacing: 4 },
  level: {
    fontFamily: fonts.mono.bold, fontSize: 56, color: colors.primary, letterSpacing: 4,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16,
  },
  divider: { width: 80, height: 1, backgroundColor: colors.primary, opacity: 0.4 },
  reward: { fontFamily: fonts.mono.bold, fontSize: fontSize.base, color: colors.success },
  sub: { fontFamily: fonts.ui.regular, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.sm,
  },
  btnTxt: { fontFamily: fonts.mono.bold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 2 },
});
