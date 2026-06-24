import { localDateStr, logicalDateStr } from '../utils/date';
import { getDayStartHour } from './settings';

// "Today" per the user's configured day-start hour — use for any cadence check
// (streaks, daily quest/gate generation, vigor, self-destruct dedup) that should
// roll over at that hour instead of midnight.
export function logicalToday(): string {
  return logicalDateStr(new Date(), getDayStartHour());
}

export function logicalYesterday(): string {
  const d = new Date(logicalToday() + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

// Computes a log row's effective_date: if `logDate` is real-calendar-today AND
// we're still before the day-start hour, the entry's effects belong to
// yesterday even though log_date stays on today's real calendar date for
// display. Manually-backdated logs (logDate !== today) are never shifted.
export function computeEffectiveDate(logDate: string): string {
  const hour = getDayStartHour();
  if (hour === 0) return logDate;
  if (logDate !== localDateStr()) return logDate;
  return logicalToday();
}
