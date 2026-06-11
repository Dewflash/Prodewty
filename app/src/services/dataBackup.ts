import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from '../db/schema';
import type { SQLiteBindValue } from 'expo-sqlite';

// Static content banks reseeded by migrations — never part of a user's
// data, so they're excluded from both export and import.
const EXCLUDE_TABLES = new Set(['quest_templates', 'dungeon_templates', 'revival_quests']);

const BACKUP_DIR = new Directory(Paths.document, 'backups');

type TableInfo = { name: string; notnull: number; dflt_value: unknown; type: string; pk: number };

function backupTableNames(): string[] {
  return db
    .getAllSync<{ name: string }>(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .map(r => r.name)
    .filter(name => !EXCLUDE_TABLES.has(name));
}

export type ExportResult = { uri: string; tableCount: number };

export async function exportData(): Promise<ExportResult> {
  const names = backupTableNames();
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const name of names) {
    tables[name] = db.getAllSync<Record<string, unknown>>(`SELECT * FROM ${name}`);
  }

  if (!BACKUP_DIR.exists) BACKUP_DIR.create({ intermediates: true, idempotent: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = new File(BACKUP_DIR, `prodewty-backup-${stamp}.json`);
  if (file.exists) file.delete();
  file.write(JSON.stringify({ exportedAt: new Date().toISOString(), tables }, null, 2));

  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
  return { uri: file.uri, tableCount: names.length };
}

export type ImportResult = { restored: string[]; skipped: string[] };

// Type-based placeholder used for a column that's NOT NULL with no default
// and missing from an imported row (i.e. the column didn't exist yet when
// the backup was made).
function fallbackForType(type: string): SQLiteBindValue {
  const t = type.toUpperCase();
  if (t.includes('CHAR') || t.includes('TEXT') || t.includes('CLOB')) return '';
  if (t.includes('INT') || t.includes('REAL') || t.includes('NUM') || t.includes('DOUB') || t.includes('FLOA')) return 0;
  return null;
}

export async function importData(uri: string): Promise<ImportResult> {
  const data = JSON.parse(await new File(uri).text()) as { tables?: Record<string, Record<string, unknown>[]> };
  const restored: string[] = [];
  const skipped: string[] = [];
  const available = new Set(backupTableNames());

  db.withTransactionSync(() => {
    for (const [table, rows] of Object.entries(data.tables ?? {})) {
      if (!available.has(table)) { skipped.push(table); continue; }

      const columns = db.getAllSync<TableInfo>(`PRAGMA table_info(${table})`);
      db.runSync(`DELETE FROM ${table}`);

      for (const row of rows) {
        const cols: string[] = [];
        const values: SQLiteBindValue[] = [];
        for (const col of columns) {
          if (col.name in row) {
            cols.push(col.name);
            values.push(row[col.name] as SQLiteBindValue);
          } else if (col.notnull && col.dflt_value === null) {
            cols.push(col.name);
            values.push(fallbackForType(col.type));
          }
        }
        if (cols.length === 0) continue;
        db.runSync(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, values);
      }

      if (columns.some(c => c.name === 'id')) {
        const def = db.getFirstSync<{ sql: string }>(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`, [table]);
        if (def?.sql.toUpperCase().includes('AUTOINCREMENT')) {
          db.runSync(`INSERT OR REPLACE INTO sqlite_sequence (name, seq) SELECT ?, COALESCE(MAX(id), 0) FROM ${table}`, [table]);
        }
      }

      restored.push(table);
    }
  });

  return { restored, skipped };
}
