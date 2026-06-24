import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const EDGE_ZONE_WIDTH = 16;
const COMMIT_DIST_RATIO = 0.35;
const COMMIT_VELOCITY = 800;

type Props = {
  children: React.ReactNode;
  // The real destination screen, mounted underneath (pointerEvents="none")
  // only while the gesture is active — not a placeholder/snapshot.
  peek: React.ReactNode;
  // Called once the swipe-back commits, after the slide-out animation finishes.
  onCommit: () => void;
  // How far down from the top the edge strip starts (e.g. header height), so
  // it never competes with a back button or other header controls.
  topInset?: number;
};

// Left-edge swipe-back: a narrow gesture strip pinned to the screen's left
// edge tracks the finger 1:1, revealing the real `peek` screen underneath.
// Commits to navigation past 35% of screen width or a fast enough flick;
// otherwise springs back and the peek screen unmounts.
export function EdgeSwipeBack({ children, peek, onCommit, topInset = 0 }: Props) {
  const tx = useSharedValue(0);
  const [active, setActive] = React.useState(false);

  const pan = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-24, 24])
    .onStart(() => {
      runOnJS(setActive)(true);
    })
    .onUpdate(e => {
      tx.value = Math.max(0, e.translationX);
    })
    .onEnd(e => {
      const commit = e.translationX > SCREEN_W * COMMIT_DIST_RATIO || e.velocityX > COMMIT_VELOCITY;
      if (commit) {
        tx.value = withTiming(SCREEN_W, { duration: 220 }, () => {
          runOnJS(onCommit)();
        });
      } else {
        tx.value = withSpring(0, { stiffness: 260, damping: 26 }, () => {
          runOnJS(setActive)(false);
        });
      }
    });

  const foregroundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View style={s.root}>
      {active && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {peek}
        </View>
      )}
      <Animated.View style={[s.foreground, foregroundStyle]}>
        {children}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <View style={[s.edgeZone, { top: topInset, width: EDGE_ZONE_WIDTH }]} />
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  foreground: { flex: 1 },
  edgeZone: { position: 'absolute', left: 0, bottom: 0 },
});
