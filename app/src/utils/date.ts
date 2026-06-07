export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function sqlNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// Local-calendar-day date string (YYYY-MM-DD), matching sqlNow()'s local-time convention.
// Use this instead of `new Date().toISOString().split('T')[0]` (which is UTC-based and
// drifts a day off from local "today" near midnight in timezones ahead of UTC).
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
