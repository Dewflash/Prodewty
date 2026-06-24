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

// Hour (0–23) at which the user's "day" rolls over for streaks/vigor/mood/daily-
// content cadence — default 0 (midnight) preserves the original behaviour.
export function getDayStartHour(): number {
  const n = parseInt(getSetting('day_start_hour', '0'), 10);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 0;
}

export function setDayStartHour(hour: number): void {
  setSetting('day_start_hour', String(Math.max(0, Math.min(23, Math.round(hour)))));
}

export function getBGMSelection(zone: string): number {
  return parseInt(getSetting(`bgm_${zone}`, '0'), 10);
}

export function setBGMSelection(zone: string, trackIndex: number): void {
  setSetting(`bgm_${zone}`, String(trackIndex));
}
