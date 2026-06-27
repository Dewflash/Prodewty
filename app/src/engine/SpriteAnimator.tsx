import React, { useEffect } from 'react';
import { View, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  makeMutable,
  type SharedValue,
} from 'react-native-reanimated';

// Global shared value containing the total running time in milliseconds.
export const globalTime = makeMutable(0);

// Component to drive the global time ticker using a single useFrameCallback.
export function GlobalTicker() {
  useFrameCallback((frameInfo) => {
    if (frameInfo.timeSincePreviousFrame) {
      globalTime.value += frameInfo.timeSincePreviousFrame;
    }
  });
  return null;
}

interface SpriteAnimatorProps {
  source: ImageSourcePropType;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps?: number;
  directionRow?: SharedValue<number>; // 0: Down, 1: Left, 2: Right, 3: Up
  isPlaying?: SharedValue<boolean>;
}

export function SpriteAnimator({
  source,
  frameWidth,
  frameHeight,
  frameCount,
  fps = 10,
  directionRow,
  isPlaying,
}: SpriteAnimatorProps) {
  const accumulatedTime = useSharedValue(0);
  const lastGlobalTime = useSharedValue(globalTime.value);

  const frameDuration = 1000 / fps;

  useEffect(() => {
    accumulatedTime.value = 0;
    lastGlobalTime.value = globalTime.value;
  }, [source, frameCount]);

  const frameIndex = useDerivedValue(() => {
    const currentGlobal = globalTime.value;
    const delta = currentGlobal - lastGlobalTime.value;
    lastGlobalTime.value = currentGlobal;

    if (isPlaying && !isPlaying.value) {
      accumulatedTime.value = 0;
      return 0;
    }

    if (delta > 0) {
      accumulatedTime.value += delta;
    }

    return Math.floor(accumulatedTime.value / frameDuration) % frameCount;
  });

  const animatedStyle = useAnimatedStyle(() => {
    const row = directionRow ? directionRow.value : 0;
    return {
      transform: [
        { translateX: -(frameIndex.value * frameWidth) },
        { translateY: -(row * frameHeight) },
      ],
    };
  });

  return (
    <View
      style={{
        width: frameWidth,
        height: frameHeight,
        overflow: 'hidden',
      }}
    >
      <Animated.Image
        source={source}
        style={[
          {
            width: frameWidth * frameCount, // Total width of one row
            height: frameHeight * 4, // Assume 4 directional rows
          },
          animatedStyle,
        ]}
        resizeMode="cover"
      />
    </View>
  );
}
