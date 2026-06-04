import { db } from './schema';
import { calculateXP } from '../services/xpEngine';
import { applyXP } from './rpg';
import { applyHealthDecay, applyLoggingHealthBoost, applyMoodHealthEffects, getHealthXPMultiplier } from './health';

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
  what_went_well?: string;
  what_to_improve?: string;
};

export type CreateLogResult = {
  xp_awarded: number;
  level_up: boolean;
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
  // Capped at 2 years — prevents unbounded memory growth after months of use
  return db.getAllSync<ActivityLog>(
    `SELECT * FROM activity_logs
     WHERE log_date >= date('now', '-730 days') OR log_date IS NULL
     ORDER BY log_date DESC, entry_type DESC, created_at DESC`,
  );
}

export function getLogsForDate(date: string): ActivityLog[] {
  return db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE log_date = ? ORDER BY created_at DESC",
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

  const { levelUp } = applyXP(xp);
  return { xp_awarded: xp, level_up: levelUp };
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
         journal_entry = ?,
         what_went_well = COALESCE(NULLIF(?, ''), what_went_well),
         what_to_improve = COALESCE(NULLIF(?, ''), what_to_improve),
         xp_awarded = xp_awarded + ?
       WHERE id = ?`,
      input.mood_rating, input.energy_rating, input.productivity_rating,
      newJournal,
      input.what_went_well?.trim() ?? '',
      input.what_to_improve?.trim() ?? '',
      journalXP, existing.id,
    );

    applyMoodHealthEffects(input.mood_rating, input.energy_rating, input.productivity_rating);
    if (journalXP > 0) applyXP(journalXP);
    return { xp_awarded: journalXP, level_up: false };
  }

  // New mood log
  const hasJournal = !!input.journal_entry?.trim();
  const xp = MOOD_XP + (hasJournal ? JOURNAL_XP : 0);

  db.runSync(
    `INSERT INTO activity_logs
       (category, description, log_type, entry_type, log_date,
        mood_rating, energy_rating, productivity_rating, journal_entry,
        what_went_well, what_to_improve, categories, xp_awarded)
     VALUES ('', '', 'daily', 'mood', ?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
    input.log_date,
    input.mood_rating, input.energy_rating, input.productivity_rating,
    input.journal_entry?.trim() || null,
    input.what_went_well?.trim() || null,
    input.what_to_improve?.trim() || null,
    xp,
  );

  applyMoodHealthEffects(input.mood_rating, input.energy_rating, input.productivity_rating);
  const { levelUp } = applyXP(xp);
  return { xp_awarded: xp, level_up: levelUp };
}

export function deleteLog(id: number): void {
  const log = db.getFirstSync<ActivityLog>('SELECT xp_awarded FROM activity_logs WHERE id = ?', id);
  if (!log) return;
  db.runSync('DELETE FROM activity_logs WHERE id = ?', id);
  if (log.xp_awarded > 0) {
    db.runSync(
      `UPDATE rpg_state SET
         total_xp        = MAX(0, total_xp        - ?),
         spendable_xp    = MAX(0, COALESCE(spendable_xp, 0) - ?),
         total_xp_earned = MAX(0, COALESCE(total_xp_earned, 0) - ?)
       WHERE id = 1`,
      log.xp_awarded, log.xp_awarded, log.xp_awarded,
    );
  }
}

// ─── Editing ─────────────────────────────────────────────────────────────────

export function editLog(id: number, updates: {
  note?: string | null;
  what_went_well?: string | null;
  what_to_improve?: string | null;
  journal_entry?: string | null;
  // duration_mins intentionally excluded — future XP variable, locked
}): void {
  db.runSync(
    `UPDATE activity_logs SET
       description   = ?,
       what_went_well = ?,
       what_to_improve = ?,
       journal_entry = ?
     WHERE id = ?`,
    updates.note?.trim() || null,
    updates.what_went_well?.trim() || null,
    updates.what_to_improve?.trim() || null,
    updates.journal_entry?.trim() || null,
    id,
  );
}

// ─── Category next-day effects ────────────────────────────────────────────────

export type CategoryEffect = {
  category: string;
  sampleCount: number;
  nextDayMood: number | null;
  nextDayEnergy: number | null;
  baselineMood: number | null;
  baselineEnergy: number | null;
};

// Binary search: find the last date in sortedDates strictly before `date`
function lastDateBefore(sortedDates: string[], date: string): string | undefined {
  let lo = 0, hi = sortedDates.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sortedDates[mid] < date) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi >= 0 ? sortedDates[hi] : undefined;
}

export function getCategoryEffects(): CategoryEffect[] {
  try {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Query 1: mood logs for the past year
    const allMoods = db.getAllSync<{ log_date: string; mood_rating: number; energy_rating: number }>(
      `SELECT log_date, mood_rating, energy_rating FROM activity_logs
       WHERE entry_type = 'mood' AND mood_rating > 0 AND log_date >= ?
       ORDER BY log_date ASC`,
      cutoffStr,
    );
    if (allMoods.length < 3) return [];

    const moodByDate: Record<string, { mood: number; energy: number }> = {};
    const sortedDates: string[] = [];
    for (const m of allMoods) {
      moodByDate[m.log_date] = { mood: m.mood_rating, energy: m.energy_rating };
      sortedDates.push(m.log_date);
    }

    // Query 2: all activity dates for the past year — replaces N per-category queries
    const allActivities = db.getAllSync<{ category: string; log_date: string }>(
      `SELECT json_extract(categories, '$[0]') as category, log_date
       FROM activity_logs
       WHERE entry_type IN ('activity','dungeon','quest')
         AND log_date >= ?
         AND json_extract(categories, '$[0]') IS NOT NULL
       ORDER BY log_date ASC`,
      cutoffStr,
    );

    // Group activity dates by category in JS
    const catDates: Record<string, string[]> = {};
    for (const row of allActivities) {
      if (row.category) (catDates[row.category] ??= []).push(row.log_date);
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const r10 = (v: number | null) => v !== null ? Math.round(v * 10) / 10 : null;

    const results: CategoryEffect[] = [];

    for (const [cat, actDates] of Object.entries(catDates)) {
      if (actDates.length < 2) continue;

      const preMoods: number[] = [];
      const preEnergies: number[] = [];

      for (const date of actDates) {
        // O(log N) binary search instead of O(N) filter
        const prior = lastDateBefore(sortedDates, date);
        if (prior && moodByDate[prior]) {
          preMoods.push(moodByDate[prior].mood);
          if (moodByDate[prior].energy) preEnergies.push(moodByDate[prior].energy);
        }
      }

      if (preMoods.length === 0) continue;

      const earliest = actDates[0];
      const postMoods = allMoods.filter(m => m.log_date > earliest);
      if (postMoods.length === 0) continue;

      results.push({
        category: cat,
        sampleCount: actDates.length,
        baselineMood:   r10(avg(preMoods)),
        baselineEnergy: r10(avg(preEnergies)),
        nextDayMood:    r10(avg(postMoods.map(m => m.mood_rating))),
        nextDayEnergy:  r10(avg(postMoods.map(m => m.energy_rating).filter(v => v > 0))),
      });
    }
    return results.sort((a, b) => b.sampleCount - a.sampleCount);
  } catch { return []; }
}

export type ActivityTimeStat = {
  category: string;
  total_mins: number;
  count: number;
};

export function getActivityTimeStats(period: 'week' | 'month' | 'year'): ActivityTimeStat[] {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return db.getAllSync<ActivityTimeStat>(
    `SELECT json_extract(categories, '$[0]') as category,
            SUM(COALESCE(duration_mins, 0)) as total_mins,
            COUNT(*) as count
     FROM activity_logs
     WHERE entry_type IN ('activity','dungeon','quest')
       AND log_date >= ?
       AND json_extract(categories, '$[0]') IS NOT NULL
     GROUP BY category
     ORDER BY total_mins DESC`,
    cutoffStr,
  );
}

export function updateSelfDestructNotes(id: number, notes: string): void {
  db.runSync(`UPDATE activity_logs SET self_destruct_notes = ? WHERE id = ?`, notes.trim() || null, id);
}

// ─── Revelations (formerly Insights) ─────────────────────────────────────────

export type Revelation = {
  id: number;
  log_date: string;
  category: string;
  revelation: string;
  log_type: string;
};

export function getRevelations(query?: string): Revelation[] {
  const rows = db.getAllSync<ActivityLog>(
    "SELECT * FROM activity_logs WHERE what_to_improve IS NOT NULL AND what_to_improve != '' ORDER BY log_date DESC, created_at DESC",
  );
  const q = query?.toLowerCase().trim();
  return rows
    .map(l => ({
      id: l.id,
      log_date: l.log_date ?? l.created_at.split(' ')[0],
      category: (() => { try { return JSON.parse(l.categories)[0]; } catch { return l.category || '—'; } })(),
      revelation: l.what_to_improve!,
      log_type: l.log_type,
    }))
    .filter(r => !q || r.revelation.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
}

// getRevelations reads the `what_to_improve` DB column (internal name).
// User-facing name is "Revelation" throughout the UI.

export function searchLogs(query: string): ActivityLog[] {
  if (!query.trim()) return [];
  const q = `%${query.trim()}%`;
  return db.getAllSync<ActivityLog>(
    `SELECT * FROM activity_logs
     WHERE (description LIKE ? OR journal_entry LIKE ?)
     ORDER BY log_date DESC, created_at DESC
     LIMIT 100`,
    q, q,
  );
}

function getWeekStartStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - (day === 0 ? 6 : day - 1);
  const d = new Date(now.getFullYear(), now.getMonth(), diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export type WeeklySummary = {
  daysLogged: number;
  totalLogs: number;
  totalXP: number;
  avgMood: string;
  avgEnergy: string;
  avgProd: string;
  topCategory: string | null;
  weekStart: string;
};

export function getWeeklySummary(): WeeklySummary {
  const weekStart = getWeekStartStr();
  const all = getRecentLogs(7);
  const weekLogs = all.filter(l => (l.log_date ?? '') >= weekStart);
  const activity = weekLogs.filter(l => l.entry_type === 'activity');
  const mood = weekLogs.filter(l => l.entry_type === 'mood');

  const avg = (arr: (number | null)[]) => {
    const v = arr.filter(x => x !== null) as number[];
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—';
  };

  const catCounts: Record<string, number> = {};
  for (const l of activity) {
    try { (JSON.parse(l.categories) as string[]).forEach(c => { catCounts[c] = (catCounts[c] ?? 0) + 1; }); } catch {}
  }
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const daysLogged = new Set(activity.map(l => l.log_date)).size;

  return {
    weekStart,
    daysLogged,
    totalLogs: activity.length,
    totalXP: weekLogs.reduce((s, l) => s + l.xp_awarded, 0),
    avgMood:   avg(mood.map(l => l.mood_rating)),
    avgEnergy: avg(mood.map(l => l.energy_rating)),
    avgProd:   avg(mood.map(l => l.productivity_rating)),
    topCategory,
  };
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
export function createLog() { throw new Error('Use createActivityLog or upsertMoodLog'); }
