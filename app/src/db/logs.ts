import { db } from './schema';
import { calculateXP } from '../services/xpEngine';
import { applyXP } from './rpg';
import { applyHealthDecay, applyLoggingHealthBoost, getHealthXPMultiplier, getHealthWarning } from './health';

const MOOD_XP    = 20;
const JOURNAL_XP = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityLog = {
  id: number;
  created_at: string;
  log_type: string;       // 'daily' | 'weekly'
  entry_type: string;     // 'activity' | 'mood'
  log_date: string;       // effective date YYYY-MM-DD
  week_start: string | null;
  categories: string;     // JSON array
  description: string | null; // note/title for activity
  mood_rating: number | null;
  energy_rating: number | null;
  productivity_rating: number | null;
  duration_mins: number | null;
  journal_entry: string | null;
  what_went_well: string | null;
  what_to_improve: string | null;
  xp_awarded: number;
};

export type ActivityLogInput = {
  log_date: string;
  log_type: 'daily' | 'weekly';
  week_start?: string;
  selectedCategories: { name: string; weight: number }[];
  note?: string;
  duration_mins?: number;
  journal_entry?: string;   // weekly journal
  what_went_well?: string;
  what_to_improve?: string; // labelled "Insight" in UI
  completedHabits: { name: string; weight: number }[];
};

export type MoodLogInput = {
  log_date: string;
  mood_rating: number;
  energy_rating: number;
  productivity_rating: number;
  journal_entry?: string;
};

export type CreateLogResult = {
  xp_awarded: number;
  level_up: boolean;
  health_warning: string | null;
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function getMoodLogForDate(date: string): ActivityLog | null {
  try {
    return db.getFirstSync<ActivityLog>(
      "SELECT * FROM activity_logs WHERE entry_type = 'mood' AND log_date = ? LIMIT 1",
      date,
    ) ?? null;
  } catch { return null; }
}

export function getLogs(): ActivityLog[] {
  return db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs ORDER BY log_date DESC, entry_type DESC, created_at DESC",
  );
}

export function getLogsForDate(date: string): ActivityLog[] {
  return db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE log_date = ? ORDER BY entry_type DESC, created_at ASC",
    date,
  );
}

export function getLogsForMonth(year: number, month: number): ActivityLog[] {
  const m = String(month).padStart(2, '0');
  return db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE strftime('%Y-%m', COALESCE(log_date, date(created_at))) = ? ORDER BY log_date ASC",
    `${year}-${m}`,
  );
}

export function getRecentLogs(days: number, entryType?: 'activity' | 'mood'): ActivityLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  if (entryType) {
    return db.getAllSync<ActivityLog>(
      "SELECT * FROM activity_logs WHERE COALESCE(log_date, date(created_at)) >= ? AND entry_type = ? ORDER BY log_date DESC",
      cutoffStr, entryType,
    );
  }
  return db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE COALESCE(log_date, date(created_at)) >= ? ORDER BY log_date DESC",
    cutoffStr,
  );
}

export function getWeeklyLogs(): { weekStart: string; logs: ActivityLog[] }[] {
  const logs = db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE log_type = 'weekly' ORDER BY log_date DESC, created_at DESC",
  );
  const grouped: Record<string, ActivityLog[]> = {};
  for (const l of logs) {
    const key = l.week_start ?? l.log_date ?? '';
    (grouped[key] ??= []).push(l);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, wlogs]) => ({ weekStart, logs: wlogs }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function createActivityLog(input: ActivityLogInput): CreateLogResult {
  applyHealthDecay();
  const healthMult = getHealthXPMultiplier();

  const xp = Math.max(Math.floor(
    calculateXP({
      categories: input.selectedCategories,
      duration_mins: input.duration_mins,
      completed_habit_weights: input.completedHabits.map(h => h.weight),
      log_type: input.log_type,
    }) * healthMult,
  ), 1);

  // For weekly logs: append journal to the existing weekly log for this week rather than duplicating
  let journalForNewLog = input.journal_entry?.trim() || null;
  if (input.log_type === 'weekly' && journalForNewLog && input.week_start) {
    const existing = db.getFirstSync<{ id: number; journal_entry: string | null }>(
      "SELECT id, journal_entry FROM activity_logs WHERE log_type = 'weekly' AND week_start = ? ORDER BY created_at ASC LIMIT 1",
      input.week_start,
    );
    if (existing) {
      const combined = existing.journal_entry
        ? existing.journal_entry + '\n—\n' + journalForNewLog
        : journalForNewLog;
      db.runSync('UPDATE activity_logs SET journal_entry = ? WHERE id = ?', combined, existing.id);
      journalForNewLog = null; // journal stored in the first log, not this new one
    }
  }

  // mood_rating is NOT NULL in original schema — use 0 as sentinel for activity logs
  db.runSync(
    `INSERT INTO activity_logs
       (category, description, log_type, entry_type, log_date, week_start,
        categories, mood_rating, duration_mins, journal_entry, what_went_well, what_to_improve, xp_awarded)
     VALUES (?, ?, ?, 'activity', ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    input.selectedCategories[0]?.name ?? '',
    input.note?.trim() || '',
    input.log_type,
    input.log_date,
    input.week_start ?? null,
    JSON.stringify(input.selectedCategories.map(c => c.name)),
    input.duration_mins ?? null,
    journalForNewLog,
    input.what_went_well?.trim() || null,
    input.what_to_improve?.trim() || null,
    xp,
  );

  const row = db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id')!;
  for (const habit of input.completedHabits) {
    db.runSync(
      'INSERT INTO habit_completions (log_id, habit_name, weight) VALUES (?, ?, ?)',
      row.id, habit.name, habit.weight,
    );
  }

  try {
    const names = input.selectedCategories.map(c => c.name);
    if (names.length > 0) {
      const ph = names.map(() => '?').join(',');
      const flags = db.getAllSync<{ is_physical: number; is_recreational: number }>(
        `SELECT is_physical, is_recreational FROM categories WHERE name IN (${ph})`, ...names,
      );
      applyLoggingHealthBoost(
        flags.some(f => f.is_physical === 1),
        flags.some(f => f.is_recreational === 1),
        input.log_date,
      );
    }
  } catch {}

  const { levelUp } = applyXP(xp, input.selectedCategories[0]?.name ?? 'Coding');
  return { xp_awarded: xp, level_up: levelUp, health_warning: getHealthWarning() };
}

export function upsertMoodLog(input: MoodLogInput): CreateLogResult {
  const existing = getMoodLogForDate(input.log_date);

  if (existing) {
    // Existing mood log — replace moods, append journal, grant XP only for new journal
    const journalWasEmpty = !existing.journal_entry;
    const hasNewJournal = !!input.journal_entry?.trim();
    const journalXP = journalWasEmpty && hasNewJournal ? JOURNAL_XP : 0;

    const newJournal = existing.journal_entry
      ? (hasNewJournal ? existing.journal_entry + '\n—\n' + input.journal_entry!.trim() : existing.journal_entry)
      : (hasNewJournal ? input.journal_entry!.trim() : null);

    db.runSync(
      `UPDATE activity_logs SET
         mood_rating = ?, energy_rating = ?, productivity_rating = ?,
         journal_entry = ?, xp_awarded = xp_awarded + ?
       WHERE id = ?`,
      input.mood_rating, input.energy_rating, input.productivity_rating,
      newJournal, journalXP, existing.id,
    );

    if (journalXP > 0) applyXP(journalXP, 'journal');
    return { xp_awarded: journalXP, level_up: false, health_warning: getHealthWarning() };
  }

  // New mood log
  const hasJournal = !!input.journal_entry?.trim();
  const xp = MOOD_XP + (hasJournal ? JOURNAL_XP : 0);

  db.runSync(
    `INSERT INTO activity_logs
       (category, description, log_type, entry_type, log_date,
        mood_rating, energy_rating, productivity_rating, journal_entry,
        categories, xp_awarded)
     VALUES ('', '', 'daily', 'mood', ?, ?, ?, ?, ?, '[]', ?)`,
    input.log_date,
    input.mood_rating, input.energy_rating, input.productivity_rating,
    input.journal_entry?.trim() || null,
    xp,
  );

  const { levelUp } = applyXP(xp, 'journal');
  return { xp_awarded: xp, level_up: levelUp, health_warning: getHealthWarning() };
}

export function deleteLog(id: number): void {
  const log = db.getFirstSync<ActivityLog>('SELECT xp_awarded FROM activity_logs WHERE id = ?', id);
  if (!log) return;
  db.runSync('DELETE FROM activity_logs WHERE id = ?', id);
  if (log.xp_awarded > 0) {
    db.runSync('UPDATE rpg_state SET total_xp = MAX(0, total_xp - ?) WHERE id = 1', log.xp_awarded);
  }
}

// ─── Legacy compat (still used by progress page via getRecentLogs) ────────────
export function createLog() { throw new Error('Use createActivityLog or upsertMoodLog'); }
