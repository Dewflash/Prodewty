import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
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
const SWIPE_VEL  = 600; // px/s — gesture-handler velocity is in px/s, unlike PanResponder's px/ms

type Props = {
  currentIndex: number;
  children: React.ReactNode;
  // Real previous/next tab screens, mounted underneath (pointerEvents="none")
  // only while actively dragging — not a placeholder/snapshot. Omit at the ends.
  prevPeek?: React.ReactNode;
  nextPeek?: React.ReactNode;
};

export function SwipeNavWrapper({ currentIndex, children, prevPeek, nextPeek }: Props) {
  const tx = useSharedValue(0);
  const idxRef = React.useRef(currentIndex);
  idxRef.current = currentIndex;

  const [dragDir, setDragDir] = React.useState<'prev' | 'next' | null>(null);
  const dragDirRef = React.useRef<'prev' | 'next' | null>(null);

  function setDir(dir: 'prev' | 'next' | null) {
    if (dragDirRef.current === dir) return;
    dragDirRef.current = dir;
    setDragDir(dir);
  }

  function navigate(target: string) {
    tx.value = 0;
    dragDirRef.current = null;
    setDragDir(null);
    router.navigate(target as any);
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-24, 24])
    .onUpdate(e => {
      const idx = idxRef.current;
      const edgeLeft  = idx === 0;
      const edgeRight = idx === TABS.length - 1;
      if ((e.translationX > 0 && edgeLeft) || (e.translationX < 0 && edgeRight)) {
        tx.value = e.translationX * 0.12; // rubber-band resistance at the ends
      } else {
        tx.value = e.translationX;
      }
      const dir = e.translationX > 0 ? 'prev' : e.translationX < 0 ? 'next' : null;
      runOnJS(setDir)(dir);
    })
    .onEnd(e => {
      const idx = idxRef.current;
      const goNext = (e.translationX < -SWIPE_DIST || e.velocityX < -SWIPE_VEL) && idx < TABS.length - 1;
      const goPrev = (e.translationX >  SWIPE_DIST || e.velocityX >  SWIPE_VEL) && idx > 0;

      if (goNext || goPrev) {
        const target = goNext ? -W : W;
        tx.value = withTiming(target, { duration: 180 }, () => {
          runOnJS(navigate)(TABS[goNext ? idx + 1 : idx - 1]);
        });
      } else {
        tx.value = withSpring(0, { stiffness: 220, damping: 22 }, () => {
          runOnJS(setDir)(null);
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const peek = dragDir === 'prev' ? prevPeek : dragDir === 'next' ? nextPeek : null;

  return (
    <View style={s.outer}>
      {/* Dark fill — always sits behind; shown when screen slides away */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg }]} />
      {peek && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {peek}
        </View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={[s.inner, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  inner: { flex: 1 },
});
