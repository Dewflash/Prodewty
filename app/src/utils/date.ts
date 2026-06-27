export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function sqlNow(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

// Local-calendar-day date string (YYYY-MM-DD), matching sqlNow()'s local-time convention.
// Use this instead of `new Date().toISOString().split('T')[0]` (which is UTC-based and
// drifts a day off from local "today" near midnight in timezones ahead of UTC).
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// Like localDateStr, but rolls back to the previous calendar day if `d`'s clock
// hour is before `startHour` — lets a user-defined "day start" (e.g. 4am for a
// late sleeper) decide which logical day an action belongs to, independent of
// its real calendar date.
export function logicalDateStr(d: Date = new Date(), startHour: number = 0): string {
  if (startHour <= 0 || d.getHours() >= startHour) return localDateStr(d);
  const shifted = new Date(d);
  shifted.setDate(shifted.getDate() - 1);
  return localDateStr(shifted);
}
