import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';

interface JoystickProps {
  onMove: (dx: number, dy: number) => void;
  onRelease: () => void;
  bottomInset?: number;
  leftInset?: number;
}

const JOYSTICK_SIZE = 120;
const KNOB_SIZE = 50;
const MAX_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

export function Joystick({ onMove, onRelease, bottomInset = 0, leftInset = 0 }: JoystickProps) {
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Calculate distance from center
      const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
      let dx = e.translationX;
      let dy = e.translationY;

      // Clamp to max radius
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }

      knobX.value = dx;
      knobY.value = dy;

      // Normalize values between -1 and 1
      runOnJS(onMove)(dx / MAX_RADIUS, dy / MAX_RADIUS);
    })
    .onEnd(() => {
      knobX.value = withSpring(0);
      knobY.value = withSpring(0);
      runOnJS(onRelease)();
    });

  const animatedKnobStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: knobX.value },
        { translateY: knobY.value },
      ],
    };
  });

  return (
    <View style={[styles.container, { bottom: 40 + bottomInset, left: 40 + leftInset }]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.base}>
          <Animated.View style={[styles.knob, animatedKnobStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 100,
  },
  base: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
