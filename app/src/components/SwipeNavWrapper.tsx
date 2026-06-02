import React, { useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme/colors';

const TABS = [
  '/(tabs)/',
  '/(tabs)/history',
  '/(tabs)/log',
  '/(tabs)/insights',
  '/(tabs)/game',
] as const;

const W = Dimensions.get('window').width;
const SWIPE_DIST = W * 0.28;
const SWIPE_VEL  = 0.6;

type Props = { currentIndex: number; children: React.ReactNode };

export function SwipeNavWrapper({ currentIndex, children }: Props) {
  const tx = useRef(new Animated.Value(0)).current;
  const idxRef = useRef(currentIndex);
  idxRef.current = currentIndex;
  const committedRef = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 10,

      onPanResponderGrant: () => { committedRef.current = false; },

      onPanResponderMove: (_, gs) => {
        if (committedRef.current) return;
        const idx = idxRef.current;
        const edgeLeft  = idx === 0;
        const edgeRight = idx === TABS.length - 1;
        if ((gs.dx > 0 && edgeLeft) || (gs.dx < 0 && edgeRight)) {
          tx.setValue(gs.dx * 0.12); // rubber-band resistance
        } else {
          tx.setValue(gs.dx);
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (committedRef.current) return;
        const idx = idxRef.current;
        const goNext = (gs.dx < -SWIPE_DIST || gs.vx < -SWIPE_VEL) && idx < TABS.length - 1;
        const goPrev = (gs.dx >  SWIPE_DIST || gs.vx >  SWIPE_VEL) && idx > 0;

        if (goNext || goPrev) {
          committedRef.current = true;
          const target = goNext ? -W : W;
          Animated.timing(tx, { toValue: target, duration: 180, useNativeDriver: true }).start(() => {
            tx.setValue(0);
            committedRef.current = false;
            router.navigate(TABS[goNext ? idx + 1 : idx - 1] as any);
          });
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={s.outer}>
      {/* Dark fill — always sits behind; shown when screen slides away */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg }]} />
      <Animated.View style={[s.inner, { transform: [{ translateX: tx }] }]} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  inner: { flex: 1 },
});
