// Shared formatting helpers used across game components.

export function fmtTimer(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// "str:5"  →  "+5 STR"
export function fmtBuff(statBuff: string): string {
  const [key, val] = statBuff.split(':');
  if (!key || !val) return statBuff;
  return `+${val} ${key.toUpperCase()}`;
}
