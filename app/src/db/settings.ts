import { db } from './schema';

export function getSetting(key: string, fallback = ''): string {
  try {
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
    return row?.value ?? fallback;
  } catch { return fallback; }
}

export function setSetting(key: string, value: string): void {
  try {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
  } catch {}
}

export function deleteSettingsByPrefix(prefix: string): void {
  try {
    db.runSync('DELETE FROM settings WHERE key LIKE ?', `${prefix}%`);
  } catch {}
}

export function getBGMSelection(zone: string): number {
  return parseInt(getSetting(`bgm_${zone}`, '0'), 10);
}

export function setBGMSelection(zone: string, trackIndex: number): void {
  setSetting(`bgm_${zone}`, String(trackIndex));
}
