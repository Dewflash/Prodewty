import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import type { RpgItemDefinition, RpgSpriteAnimation, RpgSpriteFrame } from './RpgObjectCatalog';

type SpriteFrameProps = {
  frame: RpgSpriteFrame;
  scale?: number;
  size?: number;
};

export function RpgSpriteFrameView({ frame, scale, size }: SpriteFrameProps) {
  const resolvedScale = scale ?? (size ? size / frame.width : 1);
  const width = frame.width * resolvedScale;
  const height = frame.height * resolvedScale;

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={frame.source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: -frame.x * resolvedScale,
          top: -frame.y * resolvedScale,
          width: frame.sheetWidth * resolvedScale,
          height: frame.sheetHeight * resolvedScale,
        }}
      />
    </View>
  );
}

type SpriteAnimationProps = {
  animation: RpgSpriteAnimation;
  scale?: number;
  size?: number;
};

export function RpgSpriteAnimationView({ animation, scale, size }: SpriteAnimationProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);

    if (animation.frames.length <= 1) {
      return undefined;
    }

    const intervalMs = 1000 / Math.max(1, animation.fps);
    const timer = setInterval(() => {
      setFrameIndex(index => (index + 1) % animation.frames.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [animation]);

  const frame = animation.frames[frameIndex] ?? animation.frames[0];
  if (!frame) return null;

  return <RpgSpriteFrameView frame={frame} scale={scale} size={size} />;
}

type ItemIconProps = {
  item?: RpgItemDefinition | null;
  size?: number;
  fallbackLabel?: string;
};

function mechanismLabel(item: RpgItemDefinition | null | undefined) {
  const tags = item?.tags ?? [];
  if (tags.includes('lever')) return 'LEVER';
  if (tags.includes('gate')) return 'GATE';
  if (tags.some(tag => tag === 'trap' || tag === 'hazard')) return 'TRAP';
  if (tags.includes('mechanism')) return 'MECH';
  return null;
}

export function RpgItemIcon({ item, size = 44, fallbackLabel = '?' }: ItemIconProps) {
  const label = mechanismLabel(item);
  const contentSize = label ? Math.max(18, Math.floor(size * 0.82)) : size;
  const maybeWrapMechanism = (node: React.ReactNode) => {
    if (!label) return node;
    return (
      <View style={[styles.mechanismIcon, { width: size, height: size }]}>
        {node}
        <View style={styles.mechanismBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.mechanismBadgeText}>{label}</Text>
        </View>
      </View>
    );
  };

  if (item?.featherIcon) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Feather name={item.featherIcon as any} size={Math.max(14, size * 0.55)} color="#eadca8" />
      </View>
    );
  }

  if (item?.icon) {
    return maybeWrapMechanism(<RpgSpriteFrameView frame={item.icon} size={contentSize} />);
  }

  if (item?.animation) {
    return maybeWrapMechanism(<RpgSpriteAnimationView animation={item.animation} size={contentSize} />);
  }

  if (item?.source) {
    return maybeWrapMechanism(<Image source={item.source} resizeMode="contain" style={{ width: contentSize, height: contentSize }} />);
  }

  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <Feather name="box" size={Math.max(14, size * 0.5)} color="#eadca8" />
      <Text style={styles.fallbackText}>{fallbackLabel.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

type ItemWorldArtProps = {
  item?: RpgItemDefinition | null;
  width: number;
  height: number;
  fallbackLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function RpgItemWorldArt({ item, width, height, fallbackLabel = '?', style }: ItemWorldArtProps) {
  if (item?.animation) {
    const firstFrame = item.animation.frames[0];
    if (firstFrame) {
      const frameScale = Math.min(width / firstFrame.width, height / firstFrame.height);
      return (
        <View style={[styles.worldArtFrame, { width, height }, style]}>
          <RpgSpriteAnimationView animation={item.animation} scale={frameScale} />
        </View>
      );
    }
  }

  if (item?.icon) {
    const frameScale = Math.min(width / item.icon.width, height / item.icon.height);
    return (
      <View style={[styles.worldArtFrame, { width, height }, style]}>
        <RpgSpriteFrameView frame={item.icon} scale={frameScale} />
      </View>
    );
  }

  if (item?.source) {
    return (
      <View style={[styles.worldArtFrame, { width, height }, style]}>
        <Image source={item.source} resizeMode="contain" style={styles.worldArtImage} />
      </View>
    );
  }

  return (
    <View style={[styles.worldArtFrame, { width, height }, style]}>
      <RpgItemIcon item={item} size={Math.min(width, height)} fallbackLabel={fallbackLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,35,28,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(234,220,168,0.35)',
  },
  fallbackText: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    color: '#eadca8',
    fontFamily: fonts.ui.bold,
    fontSize: 8,
  },
  mechanismIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanismBadge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 0,
    minHeight: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(18,22,18,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(158,230,168,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  mechanismBadgeText: {
    color: '#b9f5b8',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  worldArtFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldArtImage: {
    width: '100%',
    height: '100%',
  },
});
