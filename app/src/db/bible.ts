import { db } from './schema';
import { sqlNow } from '../utils/date';
import { applyXP } from './rpg';
import { getSetting } from './settings';

function getBibleXP(): number {
  const val = parseInt(getSetting('bible_xp', '50'), 10);
  return isNaN(val) ? 50 : Math.max(10, Math.min(200, val));
}

export type BibleNote = {
  id: number;
  title: string;
  content: string;
  log_date: string;
  created_at: string;
  updated_at: string;
  xp_awarded: number;
};

export function getNotes(): BibleNote[] {
  try {
    return db.getAllSync<BibleNote>('SELECT * FROM bible_notes ORDER BY updated_at DESC');
  } catch { return []; }
}

export function getNotesForDate(date: string): BibleNote[] {
  try {
    return db.getAllSync<BibleNote>(
      'SELECT * FROM bible_notes WHERE log_date = ? ORDER BY created_at DESC',
      date,
    );
  } catch { return []; }
}

export function getNoteById(id: number): BibleNote | null {
  try {
    return db.getFirstSync<BibleNote>('SELECT * FROM bible_notes WHERE id = ?', id) ?? null;
  } catch { return null; }
}

// Creates a blank placeholder note, returns its ID. No XP awarded yet.
export function createNote(): number {
  const today = new Date().toISOString().split('T')[0];
  const now = sqlNow();
  const result = db.runSync(
    `INSERT INTO bible_notes (title, content, log_date, created_at, updated_at, xp_awarded)
     VALUES ('', '', ?, ?, ?, 0)`,
    today, now, now,
  );
  return result.lastInsertRowId;
}

// Saves content. On first real save (xp_awarded still 0 and content non-empty),
// awards XP and logs to activity_logs. Subsequent saves just update content.
export function saveNote(id: number, content: string): void {
  const title = content.split('\n')[0].trim().slice(0, 120) || 'Untitled';
  const now = sqlNow();
  const existing = getNoteById(id);
  if (!existing) return;

  db.runSync(
    'UPDATE bible_notes SET content = ?, title = ?, updated_at = ? WHERE id = ?',
    content, title, now, id,
  );

  if (existing.xp_awarded === 0 && content.trim()) {
    const xp = getBibleXP();
    db.runSync('UPDATE bible_notes SET xp_awarded = ? WHERE id = ?', xp, id);
    try { applyXP(xp); } catch {}
  }
}

// Deletes note and refunds XP if it was already awarded.
export function deleteNote(id: number): void {
  try {
    const note = getNoteById(id);
    if (!note) return;
    if (note.xp_awarded > 0) {
      db.runSync(
        `UPDATE rpg_state SET
           total_xp        = MAX(0, total_xp - ?),
           spendable_xp    = MAX(0, COALESCE(spendable_xp, 0) - ?),
           total_xp_earned = MAX(0, COALESCE(total_xp_earned, 0) - ?)
         WHERE id = 1`,
        note.xp_awarded, note.xp_awarded, note.xp_awarded,
      );
    }
    db.runSync('DELETE FROM bible_notes WHERE id = ?', id);
  } catch {}
}
