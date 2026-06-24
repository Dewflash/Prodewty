import { db } from './schema';
import { sqlNow, localDateStr } from '../utils/date';
import { applyXP } from './rpg';
import { getSetting } from './settings';

function getBibleXP(): number {
  const val = parseInt(getSetting('bible_xp', '50'), 10);
  return isNaN(val) ? 50 : Math.max(10, Math.min(200, val));
}

export type BibleFolder = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  note_count?: number; // Populated via join
};

export type BibleNote = {
  id: number;
  folder_id: number | null;
  is_pinned: number; // 0 or 1
  title: string;
  content: string;
  html_content?: string;
  log_date: string;
  created_at: string;
  updated_at: string;
  xp_awarded: number;
  folder_name?: string; // Populated via join in "All Notes" view
};

// --- Folders ---

export function getFolders(): BibleFolder[] {
  try {
    return db.getAllSync<BibleFolder>(`
      SELECT f.*, COUNT(n.id) as note_count 
      FROM bible_folders f 
      LEFT JOIN bible_notes n ON n.folder_id = f.id 
      GROUP BY f.id 
      ORDER BY f.created_at ASC
    `);
  } catch { return []; }
}

export function createFolder(name: string): number {
  const now = sqlNow();
  const result = db.runSync(
    'INSERT INTO bible_folders (name, created_at, updated_at) VALUES (?, ?, ?)',
    name, now, now
  );
  return result.lastInsertRowId;
}

export function renameFolder(id: number, name: string): void {
  const now = sqlNow();
  db.runSync('UPDATE bible_folders SET name = ?, updated_at = ? WHERE id = ?', name, now, id);
}

export function deleteFolder(id: number): void {
  db.runSync('UPDATE bible_notes SET folder_id = NULL WHERE folder_id = ?', id);
  db.runSync('DELETE FROM bible_folders WHERE id = ?', id);
}

// --- Notes ---

export function getNotes(folderId: number | 'all' | null = 'all'): BibleNote[] {
  try {
    if (folderId === 'all' || folderId === null) {
      return db.getAllSync<BibleNote>(`
        SELECT n.*, f.name as folder_name 
        FROM bible_notes n 
        LEFT JOIN bible_folders f ON n.folder_id = f.id 
        ORDER BY n.is_pinned DESC, n.updated_at DESC
      `);
    } else {
      return db.getAllSync<BibleNote>(`
        SELECT * FROM bible_notes 
        WHERE folder_id = ? 
        ORDER BY is_pinned DESC, updated_at DESC
      `, folderId);
    }
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

export function togglePinNote(id: number, currentPinned: number): void {
  db.runSync('UPDATE bible_notes SET is_pinned = ? WHERE id = ?', currentPinned ? 0 : 1, id);
}

export function getAllNotesCount(): number {
  try {
    return db.getFirstSync<{ count: number }>('SELECT COUNT(id) as count FROM bible_notes')?.count ?? 0;
  } catch { return 0; }
}

// Creates a blank placeholder note, returns its ID. No XP awarded yet.
export function createNote(folderId: number | null = null): number {
  const today = localDateStr();
  const now = sqlNow();
  const result = db.runSync(
    `INSERT INTO bible_notes (folder_id, title, content, log_date, created_at, updated_at, xp_awarded, is_pinned)
     VALUES (?, '', '', ?, ?, ?, 0, 0)`,
    folderId, today, now, now,
  );
  return result.lastInsertRowId;
}

// Saves content. On first real save (xp_awarded still 0 and content non-empty),
// awards XP and logs to activity_logs. Subsequent saves just update content.
export function saveNote(id: number, content: string, htmlContent?: string): void {
  const title = content.split('\n')[0].trim().slice(0, 120) || 'Untitled';
  const now = sqlNow();
  const existing = getNoteById(id);
  if (!existing) return;

  if (htmlContent !== undefined) {
    db.runSync(
      'UPDATE bible_notes SET content = ?, html_content = ?, title = ?, updated_at = ? WHERE id = ?',
      content, htmlContent, title, now, id,
    );
  } else {
    db.runSync(
      'UPDATE bible_notes SET content = ?, title = ?, updated_at = ? WHERE id = ?',
      content, title, now, id,
    );
  }

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
