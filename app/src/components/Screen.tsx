import React from 'react';
import { ImageBackground, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { getCustomWallpaper } from '../services/wallpaperCustom';

type Props = {
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Drop-in replacement for <SafeAreaView style={s.root/safe}> that renders the
// user's custom wallpaper (if uploaded via Settings) behind the content,
// falling back to the flat colors.bg background otherwise.
export function Screen({ edges, style, children }: Props) {
  const wallpaper = getCustomWallpaper();

  if (wallpaper) {
    const { backgroundColor: _drop, ...rest } = StyleSheet.flatten(style) || {};
    return (
      <ImageBackground source={{ uri: wallpaper }} style={s.fill} resizeMode="cover">
        <SafeAreaView style={[s.fill, rest]} edges={edges}>
          {children}
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={[s.fill, s.bg, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  bg: { backgroundColor: colors.bg },
});
