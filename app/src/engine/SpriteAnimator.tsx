import React, { useEffect } from 'react';
import { View, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';

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
  const frameIndex = useSharedValue(0);
  const timeElapsed = useSharedValue(0);

  const frameDuration = 1000 / fps;

  useEffect(() => {
    frameIndex.value = 0;
    timeElapsed.value = 0;
  }, [source, frameCount]);

  useFrameCallback((frameInfo) => {
    if (isPlaying && !isPlaying.value) {
      frameIndex.value = 0;
      timeElapsed.value = 0;
      return;
    }

    if (frameInfo.timeSincePreviousFrame) {
      timeElapsed.value += frameInfo.timeSincePreviousFrame;
      if (timeElapsed.value >= frameDuration) {
        timeElapsed.value = 0;
        frameIndex.value = (frameIndex.value + 1) % frameCount;
      }
    }
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
