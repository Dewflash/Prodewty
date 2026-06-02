import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('prodewty.db');

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      category     TEXT NOT NULL,
      description  TEXT,
      duration_mins INTEGER,
      mood_rating  INTEGER NOT NULL,
      xp_awarded   INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS rpg_state (
      id                 INTEGER PRIMARY KEY DEFAULT 1,
      current_level      INTEGER NOT NULL DEFAULT 1,
      total_xp           INTEGER NOT NULL DEFAULT 0,
      xp_to_next_level   INTEGER NOT NULL DEFAULT 500,
      unallocated_points INTEGER NOT NULL DEFAULT 0,
      strength           INTEGER NOT NULL DEFAULT 1,
      wisdom             INTEGER NOT NULL DEFAULT 1,
      focus              INTEGER NOT NULL DEFAULT 1,
      agility            INTEGER NOT NULL DEFAULT 1,
      resilience         INTEGER NOT NULL DEFAULT 1,
      title              TEXT NOT NULL DEFAULT 'Unranked',
      streak_days        INTEGER NOT NULL DEFAULT 0,
      last_active_date   TEXT
    );
  `);

  db.execSync(`INSERT OR IGNORE INTO rpg_state (id) VALUES (1);`);
}
