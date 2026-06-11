import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { hasCustomWallpaper, getWallpaperOverlayColor, getWallpaperTextColor } from '../services/wallpaperCustom';

type Props = {
  style?: StyleProp<ViewStyle>;
  pad?: number;
  children: React.ReactNode;
};

// Wraps otherwise-transparent sections in a semi-opaque backing, but only once
// the user has set a custom wallpaper (see hasCustomWallpaper()) — flat
// colors.bg never needed this. `pad` adds a little breathing room around the
// content while an equal negative margin keeps the surrounding layout
// untouched, so existing spacing never shifts. The backing color is derived
// from the wallpaper's own palette (see getWallpaperOverlayColor()).
export function Surface({ style, pad = 0, children }: Props) {
  if (!hasCustomWallpaper()) return <View style={style}>{children}</View>;
  return (
    <View style={[style, { backgroundColor: getWallpaperOverlayColor(), borderRadius: radius.md, padding: pad, margin: -pad }]}>
      {children}
    </View>
  );
}

// Recolors muted/dim text (normally colors.textMuted or colors.border) to
// whichever of white/black reads best against the wallpaper-derived overlay —
// only when a custom wallpaper is active, otherwise unchanged.
export function muted(wallpaperActive: boolean) {
  return wallpaperActive ? getWallpaperTextColor() : colors.textMuted;
}
export function dim(wallpaperActive: boolean) {
  return wallpaperActive ? getWallpaperTextColor() : colors.border;
}

// Inline replacements for the old static `flatSurface`/`sectionSurface`
// StyleSheet entries, which couldn't pick up a per-wallpaper color since
// StyleSheet.create() resolves once at module load.
export function flatSurface(): ViewStyle {
  return { backgroundColor: getWallpaperOverlayColor() };
}
export function sectionSurface(): ViewStyle {
  return { backgroundColor: getWallpaperOverlayColor(), borderRadius: radius.md, padding: spacing.sm, margin: -spacing.sm };
}
