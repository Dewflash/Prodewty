import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { getColors } from 'react-native-image-colors';
import { getSetting, setSetting, deleteSettingsByPrefix } from '../db/settings';
import { colors } from '../theme/colors';
import { hexToRgb, complementaryRgb, rgbToRgba, contrastOf } from '../utils/color';

const WALLPAPER_DIR = new Directory(Paths.document, 'wallpaper');
const SETTING_KEY = 'custom_wallpaper';
const PALETTE_PREFIX = 'wallpaper_palette_';
const OVERLAY_KEY = `${PALETTE_PREFIX}overlay`;
const TEXT_KEY = `${PALETTE_PREFIX}text`;

// Local file URI of the user-uploaded wallpaper, or null if none has been
// uploaded (falls back to the flat colors.bg background).
export function getCustomWallpaper(): string | null {
  const uri = getSetting(SETTING_KEY, '');
  return uri || null;
}

// True once a custom wallpaper is active — sections that relied on the flat
// colors.bg showing through now need an opaque backing (colors.surfaceOverlay)
// to stay legible over an arbitrary photo.
export function hasCustomWallpaper(): boolean {
  return getCustomWallpaper() !== null;
}

// Per-wallpaper "shadow box" backing color, derived from the wallpaper's
// dominant color (see analyzeWallpaperColors). Falls back to the static
// default until analysis completes or if it fails.
export function getWallpaperOverlayColor(): string {
  return getSetting(OVERLAY_KEY, colors.surfaceOverlay);
}

// Text color (white/black) chosen to stay legible on getWallpaperOverlayColor().
export function getWallpaperTextColor(): string {
  return getSetting(TEXT_KEY, colors.textOnSurface);
}

// Scans the wallpaper for its dominant color, derives a complementary
// "shadow box" overlay color from it, and picks white/black text for
// legibility on top of that overlay. Cached in settings for synchronous
// reads during render.
async function analyzeWallpaperColors(uri: string): Promise<void> {
  try {
    const result = await getColors(uri, { fallback: '#1E293B', cache: false, quality: 'low' });
    const dominantHex = result.platform === 'ios' ? result.background : result.dominant;
    const overlay = complementaryRgb(hexToRgb(dominantHex));
    setSetting(OVERLAY_KEY, rgbToRgba(overlay, 0.85));
    setSetting(TEXT_KEY, contrastOf(overlay, colors.textOnSurface, colors.bg));
  } catch {
    setSetting(OVERLAY_KEY, colors.surfaceOverlay);
    setSetting(TEXT_KEY, colors.textOnSurface);
  }
}

// Opens the system photo picker, copies the chosen image into the app's
// document directory, and records the local path. Returns the new local
// URI, or null if cancelled / permission denied.
export async function pickCustomWallpaper(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const picked = result.assets[0];
  if (!WALLPAPER_DIR.exists) WALLPAPER_DIR.create({ intermediates: true, idempotent: true });

  removeCustomWallpaper();

  const ext = picked.uri.includes('.') ? picked.uri.split('.').pop()!.split('?')[0] : 'jpg';
  const dest = new File(WALLPAPER_DIR, `bg.${ext}`);
  if (dest.exists) dest.delete();

  new File(picked.uri).copy(dest);
  setSetting(SETTING_KEY, dest.uri);
  await analyzeWallpaperColors(dest.uri);
  return dest.uri;
}

export function removeCustomWallpaper(): void {
  const uri = getCustomWallpaper();
  if (uri) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {}
  }
  setSetting(SETTING_KEY, '');
  deleteSettingsByPrefix(PALETTE_PREFIX);
}
