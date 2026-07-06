import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import type { RpgItemDefinition, RpgSpriteAnimation, RpgSpriteFrame } from './RpgObjectCatalog';
import { isSanctuaryPlaceholderObject, SanctuaryPlaceholderObjectArt } from './SanctuaryPlaceholderObjectArt';
import { getSanctuaryTerrainPaintTarget, SanctuaryTerrainPaintIcon } from './SanctuaryTerrainPaintPreview';

type SpriteFrameProps = {
  frame: RpgSpriteFrame;
  scale?: number;
  size?: number;
};

export function RpgSpriteFrameView({ frame, scale, size }: SpriteFrameProps) {
  const resolvedScale = scale ?? (size ? size / frame.width : 1);
  const width = frame.width * resolvedScale;
  const height = frame.height * resolvedScale;

  // Round the sheet offset/dimensions to whole pixels so the sprite crop does
  // not land on a fractional pixel boundary (which React Native would bilinear-
  // filter, blurring the pixel art). The outer View keeps the exact requested
  // size; only the inner image translation is quantized.
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={frame.source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: -Math.round(frame.x * resolvedScale),
          top: -Math.round(frame.y * resolvedScale),
          width: Math.round(frame.sheetWidth * resolvedScale),
          height: Math.round(frame.sheetHeight * resolvedScale),
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
  itemId?: string | null;
  size?: number;
  fallbackLabel?: string;
};

function mechanismLabel(item: RpgItemDefinition | null | undefined) {
  const tags = item?.tags ?? [];
  if (tags.includes('lever')) return 'L';
  if (tags.includes('gate')) return 'G';
  if (tags.some(tag => tag === 'trap' || tag === 'hazard')) return 'T';
  if (tags.includes('mechanism')) return 'M';
  return null;
}

function placeholderProductLabel(item: RpgItemDefinition | null | undefined) {
  const tags = item?.tags ?? [];
  // Egg, milk, and wool now use verified real icons and no longer carry the
  // `placeholder` tag, so they fall through here and render badge-free. Only
  // animal products still lacking clean art keep a short text badge (truffle).
  if (!tags.includes('animal_product') || !tags.includes('placeholder')) return null;
  if (tags.includes('truffle')) return 'TRUF';
  return item?.name?.slice(0, 4).toUpperCase() ?? null;
}

function placeholderSeedLabel(item: RpgItemDefinition | null | undefined) {
  if (item?.kind !== 'seed' || item.iconAssetId !== 'seed.treeGeneric') return null;
  const cropName = item.crop?.name ?? item.name;
  const letters = cropName.replace(/[^a-z]/gi, '').toUpperCase();
  if (!letters) return 'SEED';
  if (letters.startsWith('CABB')) return 'CABB';
  return letters.slice(0, 4);
}

export function RpgItemIcon({ item, itemId, size = 44, fallbackLabel = '?' }: ItemIconProps) {
  const label = mechanismLabel(item);
  const productLabel = placeholderProductLabel(item);
  const seedLabel = placeholderSeedLabel(item);
  const contentSize = size;
  const terrainPaintItemId = itemId ?? fallbackLabel;
  if (getSanctuaryTerrainPaintTarget(terrainPaintItemId) !== null) {
    return <SanctuaryTerrainPaintIcon itemId={terrainPaintItemId} size={size} />;
  }

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
  const maybeWrapPlaceholderProduct = (node: React.ReactNode) => {
    if (!productLabel) return node;
    return (
      <View style={[styles.placeholderProductIcon, { width: size, height: size }]}>
        {node}
        <View style={styles.placeholderProductBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.placeholderProductBadgeText}>{productLabel}</Text>
        </View>
      </View>
    );
  };
  const maybeWrapPlaceholderSeed = (node: React.ReactNode) => {
    if (!seedLabel) return node;
    return (
      <View style={[styles.placeholderSeedIcon, { width: size, height: size }]}>
        {node}
        <View style={styles.placeholderSeedBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.placeholderSeedBadgeText}>{seedLabel}</Text>
        </View>
      </View>
    );
  };

  if (item && isSanctuaryPlaceholderObject(item)) {
    const placeholderArt = <SanctuaryPlaceholderObjectArt item={item} width={contentSize} height={contentSize} />;
    if (placeholderArt) return maybeWrapMechanism(placeholderArt);
  }

  if (item?.featherIcon) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Feather name={item.featherIcon as any} size={Math.max(14, size * 0.55)} color="#eadca8" />
      </View>
    );
  }

  if (item?.icon) {
    return maybeWrapPlaceholderSeed(maybeWrapPlaceholderProduct(maybeWrapMechanism(<RpgSpriteFrameView frame={item.icon} size={contentSize} />)));
  }

  if (item?.animation) {
    return maybeWrapPlaceholderSeed(maybeWrapPlaceholderProduct(maybeWrapMechanism(<RpgSpriteAnimationView animation={item.animation} size={contentSize} />)));
  }

  if (item?.source) {
    return maybeWrapPlaceholderSeed(maybeWrapPlaceholderProduct(maybeWrapMechanism(<Image source={item.source} resizeMode="contain" style={{ width: contentSize, height: contentSize }} />)));
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
  itemId?: string | null;
  width: number;
  height: number;
  fallbackLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function RpgItemWorldArt({ item, itemId, width, height, fallbackLabel = '?', style }: ItemWorldArtProps) {
  const terrainPaintItemId = itemId ?? fallbackLabel;
  if (getSanctuaryTerrainPaintTarget(terrainPaintItemId) !== null) {
    return (
      <View style={[styles.worldArtFrame, { width, height }, style]}>
        <SanctuaryTerrainPaintIcon itemId={terrainPaintItemId} size={Math.min(width, height)} />
      </View>
    );
  }

  if (item && isSanctuaryPlaceholderObject(item)) {
    const placeholderArt = <SanctuaryPlaceholderObjectArt item={item} width={width} height={height} />;
    if (placeholderArt) {
      return (
        <View style={[styles.worldArtFrame, { width, height }, style]}>
          {placeholderArt}
        </View>
      );
    }
  }

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
      <RpgItemIcon item={item} itemId={itemId} size={Math.min(width, height)} fallbackLabel={fallbackLabel} />
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
    top: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6,
    backgroundColor: 'rgba(18,22,18,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(158,230,168,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanismBadgeText: {
    color: '#b9f5b8',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  placeholderProductIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderProductBadge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 0,
    minHeight: 11,
    borderRadius: 4,
    backgroundColor: 'rgba(38,29,22,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(234,220,168,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  placeholderProductBadgeText: {
    color: '#fff2bb',
    fontFamily: fonts.ui.bold,
    fontSize: 7,
  },
  placeholderSeedIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderSeedBadge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 0,
    minHeight: 11,
    borderRadius: 4,
    backgroundColor: 'rgba(22,42,25,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(158,230,168,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  placeholderSeedBadgeText: {
    color: '#d9ffd2',
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
