import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../theme/typography';
import type { RpgItemDefinition, RpgSpriteFrame } from './RpgObjectCatalog';

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

type ItemIconProps = {
  item?: RpgItemDefinition | null;
  size?: number;
  fallbackLabel?: string;
};

export function RpgItemIcon({ item, size = 44, fallbackLabel = '?' }: ItemIconProps) {
  if (item?.icon) {
    return <RpgSpriteFrameView frame={item.icon} size={size} />;
  }

  if (item?.source) {
    return <Image source={item.source} resizeMode="contain" style={{ width: size, height: size }} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size }]}>
      <Feather name="box" size={Math.max(14, size * 0.5)} color="#eadca8" />
      <Text style={styles.fallbackText}>{fallbackLabel.slice(0, 1).toUpperCase()}</Text>
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
});
