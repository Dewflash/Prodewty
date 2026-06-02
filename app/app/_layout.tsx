import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular, JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { initDB } from '../src/db/schema';
import { checkStreakFreeze } from '../src/db/rpg';
import { getDeathCause, type DeathCause } from '../src/db/game';
import { applyHealthDecay } from '../src/db/health';
import { DeathScreen } from '../src/components/DeathScreen';

initDB();
checkStreakFreeze();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    JetBrainsMono_400Regular, JetBrainsMono_700Bold,
  });

  const [deathCause, setDeathCause] = useState<DeathCause>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Check death whenever app returns to foreground
  useEffect(() => {
    function checkOnForeground(state: string) {
      if (state === 'active') {
        applyHealthDecay();
        const cause = getDeathCause();
        if (cause) setDeathCause(cause);
      }
    }
    const sub = AppState.addEventListener('change', checkOnForeground);
    // Also check immediately on first mount
    applyHealthDecay();
    const initial = getDeathCause();
    if (initial) setDeathCause(initial);
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
      <DeathScreen cause={deathCause} onRise={() => setDeathCause(null)} />
    </>
  );
}
