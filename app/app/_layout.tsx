import { Stack, usePathname, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular, JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { db, initDB } from '../src/db/schema';
import { checkStreakFreeze, checkVigor, getRPGState, clearLevelUpPending, applyMpRegen } from '../src/db/rpg';
import { initAudio, playSound } from '../src/services/audio';
import { hapticHeavy, hapticSuccess } from '../src/utils/haptics';
import { registerDeathCheck } from '../src/db/deathCheckSignal';
import { triggerCurrencyRefresh } from '../src/db/currencySignal';
import { getDeathCause, type DeathCause } from '../src/db/game';
import { applyHealthDecay } from '../src/db/health';
import { shouldShowOnboarding } from '../src/db/onboarding';
import { DeathScreen } from '../src/components/DeathScreen';
import { RANK_COLOR } from '../src/components/game/DungeonCard';
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

  const [deathCause,    setDeathCause]    = useState<DeathCause>(null);
  const [levelUpLevel,  setLevelUpLevel]  = useState<number | null>(null);
  const [levelUpReward, setLevelUpReward] = useState<{ ap: number; coins: number }>({ ap: 0, coins: 0 });
  const [gemBanner,     setGemBanner]     = useState(false);
  const [rightToast,    setRightToast]    = useState<string[] | null>(null);
  const bannerY = useRef(new Animated.Value(-80)).current;
  const rightToastY = useRef(new Animated.Value(-80)).current;
  const pathname    = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    const leavingGame = pathnameRef.current.includes('/game') && !pathname.includes('/game');
    pathnameRef.current = pathname;
    if (leavingGame) checkState();
  }, [pathname]);

  function triggerGemBanner() {
    setGemBanner(true);
    playSound('gem');
    Animated.sequence([
      Animated.spring(bannerY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.delay(2800),
      Animated.timing(bannerY, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => setGemBanner(false));
  }

  function triggerRightToast(ranks: string[]) {
    setRightToast(ranks);
    Animated.sequence([
      Animated.spring(rightToastY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.delay(3200),
      Animated.timing(rightToastY, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => setRightToast(null));
  }

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  function checkState() {
    applyHealthDecay();
    applyMpRegen();
    const rpg = getRPGState();

    // Death check — only show if not already acknowledged
    const cause = getDeathCause();
    if (cause && !(rpg.death_acknowledged)) {
      playSound('died');
      hapticHeavy();
      setDeathCause(cause);
    } else if (!cause) {
      // All clear — reset acknowledged so next death triggers screen again
      try { db.runSync('UPDATE rpg_state SET death_acknowledged = 0 WHERE id = 1'); } catch {}
      setDeathCause(null);
    }

    // Level-up pending check — suppress on game tab (dungeon clear already shows the result)
    if ((rpg.level_up_pending ?? 0) > 0 && !pathnameRef.current.includes('/game')) {
      playSound('levelup');
      hapticSuccess();
      setLevelUpLevel(rpg.level_up_pending);
      setLevelUpReward({ ap: rpg.level_up_ap_gained ?? 0, coins: rpg.level_up_coins_gained ?? 0 });
      if (rpg.level_up_right_rank) triggerRightToast(rpg.level_up_right_rank.split(','));
      clearLevelUpPending();
    }
  }

  useEffect(() => {
    if (shouldShowOnboarding()) {
      const id = setTimeout(() => router.replace('/onboarding'), 0);
      return () => clearTimeout(id);
    }
    void initAudio();
    const { gemAwarded } = checkVigor();
    if (gemAwarded) triggerGemBanner();
    registerDeathCheck(checkState);
    checkState();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') checkState(); });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="quest-preferences" />
        <Stack.Screen name="revelations" />
        <Stack.Screen name="store" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="milestones" />
        <Stack.Screen name="game-log" />
        <Stack.Screen name="suitup" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="bible" />
        {/* Native swipe-back disabled — EdgeSwipeBack provides a custom one that
            reveals the live Bible list underneath instead of a static snapshot. */}
        <Stack.Screen name="bible-editor" options={{ gestureEnabled: false }} />
        <Stack.Screen name="finance" />
      </Stack>

      <DeathScreen cause={deathCause} onResolve={() => { setDeathCause(null); checkState(); triggerCurrencyRefresh(); }} />

      {gemBanner && (
        <Animated.View style={[gb.banner, { transform: [{ translateY: bannerY }] }]}>
          <Text style={gb.gem}>◆</Text>
          <View style={gb.text}>
            <Text style={gb.title}>Yet another successful day without fail</Text>
            <Text style={gb.sub}>+1 Gem awarded</Text>
          </View>
        </Animated.View>
      )}

      {rightToast && (() => {
        const lead = rightToast[rightToast.length - 1];
        const accent = RANK_COLOR[lead] ?? colors.primary;
        const label = rightToast.length > 1
          ? `${rightToast.slice(0, -1).join(', ')} & ${lead}-Rank dungeons are now permanently accessible`
          : `${lead}-Rank dungeons are now permanently accessible`;
        return (
          <Animated.View style={[gb.banner, { borderColor: accent, top: 112, transform: [{ translateY: rightToastY }] }]}>
            <Text style={[gb.gem, { color: accent }]}>⛩</Text>
            <View style={gb.text}>
              <Text style={gb.title}>{rightToast.length > 1 ? 'Gates Unlocked' : 'Gate Unlocked'}</Text>
              <Text style={gb.sub}>{label}</Text>
            </View>
          </Animated.View>
        );
      })()}

      {/* Level-up celebration modal */}
      <Modal visible={levelUpLevel !== null} transparent animationType="fade">
        <View style={lv.overlay}>
          <View style={lv.panel}>
            <Text style={lv.title}>LEVEL UP</Text>
            <Text style={lv.level}>LVL {levelUpLevel}</Text>
            <View style={lv.divider} />
            <Text style={lv.reward}>+{levelUpReward.ap} AP · +{levelUpReward.coins} Coins earned</Text>
            <Text style={lv.sub}>Allocate AP in the Game tab to raise your stats.</Text>
            <Pressable style={lv.btn} onPress={() => setLevelUpLevel(null)}>
              <Text style={lv.btnTxt}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const gb = StyleSheet.create({
  banner: {
    position: 'absolute', top: 56, left: spacing.md, right: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FF2400',
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    shadowColor: '#FF2400', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12,
    zIndex: 999,
  },
  gem:   { fontFamily: fonts.mono.bold, fontSize: 20, color: '#FF2400' },
  text:  { flex: 1, gap: 2 },
  title: { fontFamily: fonts.ui.semibold, fontSize: fontSize.sm, color: colors.textPrimary },
  sub:   { fontFamily: fonts.mono.regular, fontSize: fontSize.xs, color: '#FF2400' },
});

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
