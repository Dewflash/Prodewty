import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { getSetting, setSetting, deleteSettingsByPrefix } from '../db/settings';

const BGM_DIR = new Directory(Paths.document, 'bgm');

function settingKey(zone: string, slot: number): string {
  return `custom_bgm_${zone}_${slot}`;
}

// Local file URI of the user-uploaded track for this zone/slot, or null if
// none has been uploaded (falls back to the bundled BGM_TRACKS entry).
export function getCustomBGM(zone: string, slot: number): string | null {
  const uri = getSetting(settingKey(zone, slot), '');
  return uri || null;
}

export function getCustomBGMName(zone: string, slot: number): string | null {
  const uri = getCustomBGM(zone, slot);
  if (!uri) return null;
  try { return new File(uri).name; } catch { return null; }
}

// Opens the system file picker, copies the chosen audio file into the app's
// document directory (picker URIs aren't guaranteed to stay valid), and
// records the local path. Returns the new local URI, or null if cancelled.
export async function pickCustomBGM(zone: string, slot: number): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;

  const picked = result.assets[0];
  if (!BGM_DIR.exists) BGM_DIR.create({ intermediates: true, idempotent: true });

  removeCustomBGM(zone, slot);

  const ext = picked.name.includes('.') ? picked.name.split('.').pop() : 'mp3';
  const dest = new File(BGM_DIR, `${zone}_${slot}.${ext}`);
  if (dest.exists) dest.delete();

  new File(picked.uri).copy(dest);
  setSetting(settingKey(zone, slot), dest.uri);
  return dest.uri;
}

export function removeCustomBGM(zone: string, slot: number): void {
  const uri = getCustomBGM(zone, slot);
  if (uri) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {}
  }
  setSetting(settingKey(zone, slot), '');
}

// Wipes every uploaded BGM file and its setting — used on full app reset.
export function clearAllCustomBGM(): void {
  try {
    if (BGM_DIR.exists) BGM_DIR.delete();
  } catch {}
  deleteSettingsByPrefix('custom_bgm_');
}
