import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('prodewty.db');

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Workout',  weight: 4, attribute: 'strength'   },
  { name: 'Coding',   weight: 4, attribute: 'focus'      },
  { name: 'Study',    weight: 3, attribute: 'wisdom'     },
  { name: 'Reading',  weight: 3, attribute: 'wisdom'     },
  { name: 'Devotion', weight: 3, attribute: 'wisdom'     },
  { name: 'Journal',  weight: 2, attribute: 'resilience' },
  { name: 'Admin',    weight: 1, attribute: 'agility'    },
];

const DEFAULT_RESTORATIVE = [
  { name: 'Leisure Walk',   desc: 'Light outdoor walk',        cost: 25, e: 0,  p: 15, m: 5  },
  { name: 'Movie / Show',   desc: 'Watch something you enjoy', cost: 30, e: 5,  p: 0,  m: 15 },
  { name: 'Read for Fun',   desc: 'Pleasure reading',          cost: 25, e: 5,  p: 0,  m: 10 },
  { name: 'Social Time',    desc: 'Quality time with people',  cost: 35, e: 20, p: 0,  m: 5  },
  { name: 'Meditation',     desc: '10+ min mindfulness',       cost: 40, e: 10, p: 0,  m: 10 },
  { name: 'Full Workout',   desc: 'Intense exercise session',  cost: 60, e: 0,  p: 25, m: 10 },
  { name: 'Good Sleep',     desc: '7–9 hours of quality sleep',cost: 50, e: 10, p: 10, m: 10 },
  { name: 'Treat Yourself', desc: 'Something you genuinely enjoy', cost: 35, e: 20, p: 0, m: 5 },
];

// ─── Init (called at module load — must be AFTER all consts above) ────────────

export function initDB() {
  db.execSync(`CREATE TABLE IF NOT EXISTS activity_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    category      TEXT,
    description   TEXT,
    duration_mins INTEGER,
    mood_rating   INTEGER,
    xp_awarded    INTEGER NOT NULL DEFAULT 0
  )`);

  db.execSync(`CREATE TABLE IF NOT EXISTS rpg_state (
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
  )`);

  db.execSync(`INSERT OR IGNORE INTO rpg_state (id) VALUES (1)`);
  runMigrations();
}

// ─── Migrations ───────────────────────────────────────────────────────────────

function runMigrations() {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 2) {
    const newCols = [
      `log_type TEXT NOT NULL DEFAULT 'daily'`,
      `week_start TEXT`,
      `categories TEXT NOT NULL DEFAULT '[]'`,
      `energy_rating INTEGER`,
      `productivity_rating INTEGER`,
      `journal_entry TEXT`,
      `what_went_well TEXT`,
      `what_to_improve TEXT`,
    ];
    for (const col of newCols) {
      try { db.execSync(`ALTER TABLE activity_logs ADD COLUMN ${col}`); } catch {}
    }

    db.execSync(`CREATE TABLE IF NOT EXISTS categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,
      weight        INTEGER NOT NULL DEFAULT 3,
      attribute     TEXT NOT NULL DEFAULT 'focus',
      is_default    INTEGER NOT NULL DEFAULT 0,
      is_physical   INTEGER NOT NULL DEFAULT 0,
      is_recreational INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS habits (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      weight     INTEGER NOT NULL DEFAULT 3,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS habit_completions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      log_id     INTEGER NOT NULL,
      habit_name TEXT NOT NULL,
      weight     INTEGER NOT NULL DEFAULT 3,
      completed  INTEGER NOT NULL DEFAULT 1
    )`);

    for (const cat of DEFAULT_CATEGORIES) {
      db.runSync(
        `INSERT OR IGNORE INTO categories (name, weight, attribute, is_default, is_physical)
         VALUES (?, ?, ?, 1, ?)`,
        cat.name, cat.weight, cat.attribute,
        cat.name === 'Workout' ? 1 : 0,
      );
    }

    const count = db.getFirstSync<{ n: number }>('SELECT count(*) as n FROM activity_logs')?.n ?? 0;
    if (count === 0) seedFakeData();

    db.execSync('PRAGMA user_version = 2');
  }

  if (version < 3) {
    try { db.execSync(`ALTER TABLE categories ADD COLUMN is_physical INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE categories ADD COLUMN is_recreational INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`UPDATE categories SET is_physical = 1 WHERE lower(name) = 'workout'`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN highest_xp_attained INTEGER NOT NULL DEFAULT 0`); } catch {}

    db.execSync(`CREATE TABLE IF NOT EXISTS health_state (
      id                    INTEGER PRIMARY KEY DEFAULT 1,
      emotional             REAL NOT NULL DEFAULT 100,
      physical              REAL NOT NULL DEFAULT 100,
      mental                REAL NOT NULL DEFAULT 100,
      last_updated          TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      last_physical_log     TEXT,
      last_recreational_log TEXT,
      last_any_log          TEXT,
      health_critical       INTEGER NOT NULL DEFAULT 0
    )`);

    db.execSync(`INSERT OR IGNORE INTO health_state (id, emotional, physical, mental) VALUES (1, 50, 50, 50)`);
    // Also update if row already exists at full health (dev testing)
    db.execSync(`UPDATE health_state SET emotional = 50, physical = 50, mental = 50 WHERE id = 1 AND emotional >= 99 AND physical >= 99 AND mental >= 99`);

    db.execSync(`CREATE TABLE IF NOT EXISTS restorative_activities (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      description       TEXT,
      xp_cost           INTEGER NOT NULL DEFAULT 50,
      emotional_restore REAL NOT NULL DEFAULT 0,
      physical_restore  REAL NOT NULL DEFAULT 0,
      mental_restore    REAL NOT NULL DEFAULT 0,
      is_default        INTEGER NOT NULL DEFAULT 0
    )`);

    for (const a of DEFAULT_RESTORATIVE) {
      db.runSync(
        `INSERT OR IGNORE INTO restorative_activities (name, description, xp_cost, emotional_restore, physical_restore, mental_restore, is_default)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        a.name, a.desc, a.cost, a.e, a.p, a.m,
      );
    }

    db.execSync('PRAGMA user_version = 3');
  }

  if (version < 4) {
    // Force health to 50% for testing — remove this in production
    try { db.execSync(`UPDATE health_state SET emotional = 50, physical = 50, mental = 50`); } catch {}

    // Guarantee fake data for the current week so charts are visible
    try { seedCurrentWeek(); } catch {}

    db.execSync('PRAGMA user_version = 4');
  }

  if (version < 5) {
    try { db.execSync(`ALTER TABLE activity_logs ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'activity'`); } catch {}
    try { db.execSync(`ALTER TABLE activity_logs ADD COLUMN log_date TEXT`); } catch {}
    db.execSync(`UPDATE activity_logs SET log_date = date(created_at) WHERE log_date IS NULL`);
    db.execSync('PRAGMA user_version = 5');
  }

  if (version < 6) {
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN coins INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN gp INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN streak_freezes INTEGER NOT NULL DEFAULT 0`); } catch {}
    // Seed 50 test coins
    db.execSync(`UPDATE rpg_state SET coins = 50 WHERE id = 1`);
    db.execSync('PRAGMA user_version = 6');
  }

  if (version < 7) {
    db.execSync(`CREATE TABLE IF NOT EXISTS inventory (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name   TEXT NOT NULL,
      item_type   TEXT NOT NULL DEFAULT 'consumable',
      quantity    INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      acquired_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS milestones (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      title      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`);

    db.execSync('PRAGMA user_version = 7');
  }

  if (version < 8) {
    try { db.execSync(`ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '#38BDF8'`); } catch {}
    // Assign distinct default colours to each built-in category
    const defaults: [string, string][] = [
      ['workout',  '#34D399'],
      ['coding',   '#38BDF8'],
      ['study',    '#A855F7'],
      ['reading',  '#FBBF24'],
      ['devotion', '#F97316'],
      ['journal',  '#EC4899'],
      ['admin',    '#64748B'],
    ];
    for (const [name, color] of defaults) {
      db.runSync(`UPDATE categories SET color = ? WHERE lower(name) = ?`, color, name);
    }
    db.execSync('PRAGMA user_version = 8');
  }

  if (version < 9) {
    // Rename gp → ap (can't rename in SQLite — add new column, copy value)
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN ap INTEGER NOT NULL DEFAULT 0`); } catch {}
    db.execSync(`UPDATE rpg_state SET ap = COALESCE(gp, 0)`);

    // New 7-stat columns (per, sta) — str/agi/foc/wis/resilience already exist
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN per_stat INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN sta_stat INTEGER NOT NULL DEFAULT 0`); } catch {}

    // Game vitals
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN hp INTEGER NOT NULL DEFAULT 100`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN hp_max INTEGER NOT NULL DEFAULT 100`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN mp INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN job TEXT NOT NULL DEFAULT '-'`); } catch {}

    // Dungeon templates (E-rank seed)
    db.execSync(`CREATE TABLE IF NOT EXISTS dungeons (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      rank            TEXT NOT NULL DEFAULT 'E',
      flavor_text     TEXT,
      primary_stat    TEXT NOT NULL,
      secondary_stat  TEXT,
      difficulty      INTEGER NOT NULL DEFAULT 5,
      coin_reward     INTEGER NOT NULL DEFAULT 20,
      item_drop_chance REAL NOT NULL DEFAULT 0.25,
      item_name       TEXT,
      item_description TEXT,
      cooldown_hours  INTEGER NOT NULL DEFAULT 48
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS dungeon_runs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      dungeon_id   INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      result       TEXT NOT NULL DEFAULT 'win',
      coins_earned INTEGER NOT NULL DEFAULT 0,
      hp_change    INTEGER NOT NULL DEFAULT 0,
      item_dropped TEXT
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS quests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      description  TEXT,
      category     TEXT NOT NULL,
      quest_type   TEXT NOT NULL DEFAULT 'weekly',
      status       TEXT NOT NULL DEFAULT 'active',
      generated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      coin_reward  INTEGER NOT NULL DEFAULT 30,
      stat_hint    TEXT
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS quest_completions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_id    INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      coins_earned INTEGER NOT NULL DEFAULT 0
    )`);

    db.execSync(`CREATE TABLE IF NOT EXISTS game_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )`);

    // Seed E-rank dungeons
    const dungeonSeeds = [
      ['Abandoned Mine',     'E', 'Stone golems roam these tunnels. Brute force is your ally.',                     'str', 'sta',  5, 20, 0.25, 'Golem Core',     '+2 STR when equipped.'],
      ['Shadow Thicket',     'E', 'The forest shifts and deceives. Only the swift and perceptive survive.',          'agi', 'per',  5, 20, 0.25, 'Phantom Leaf',   '+2 AGI when equipped.'],
      ['Mystic Archive',     'E', 'Ink spirits guard forbidden tomes. Knowledge defeats them.',                     'wis', 'foc',  5, 20, 0.25, 'Torn Grimoire',  '+2 WIS when equipped.'],
      ['Spirit Sanctum',    'E', 'A hollow shrine pulsing with residual mana. Inner strength resonates here.',     'spr', 'wis',  5, 20, 0.25, 'Prayer Bead',    '+2 SPR when equipped.'],
      ['Storm Ridge',       'E', 'Thin air and brutal winds. Endurance above all else.',                           'sta', 'str',  5, 20, 0.25, 'Iron Band',      '+2 STA when equipped.'],
      ['Veil of Perception','E', 'A dungeon that exists between worlds. Only the perceptive find the exit.',       'per', 'spr',  5, 20, 0.25, 'Obsidian Shard', '+2 PER when equipped.'],
    ];
    for (const [nm, rk, fl, ps, ss, df, cr, dc, inm, idc] of dungeonSeeds) {
      db.runSync(
        `INSERT OR IGNORE INTO dungeons (name, rank, flavor_text, primary_stat, secondary_stat, difficulty, coin_reward, item_drop_chance, item_name, item_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nm, rk, fl, ps, ss, df, cr, dc, inm, idc,
      );
    }

    db.execSync('PRAGMA user_version = 9');
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seedFakeData() {
  const cats = DEFAULT_CATEGORIES.map(c => c.name);
  const now = new Date();

  for (let daysAgo = 365; daysAgo >= 0; daysAgo--) {
    if (Math.random() > 0.65) continue;
    const n = Math.random() > 0.75 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo,
        8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));
      const pad = (x: number) => String(x).padStart(2, '0');
      const ts = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
      const cat   = cats[Math.floor(Math.random() * cats.length)];
      const mood  = Math.floor(Math.random() * 7) + 4;
      const energy = Math.floor(Math.random() * 7) + 4;
      const prod  = Math.floor(Math.random() * 7) + 4;
      const dur   = (Math.floor(Math.random() * 4) + 1) * 30;
      const xp    = Math.floor((20 + dur / 4) * (0.8 + mood * 0.04));
      db.runSync(
        `INSERT INTO activity_logs (category, description, created_at, log_type, categories, mood_rating, energy_rating, productivity_rating, duration_mins, xp_awarded)
         VALUES (?, '', ?, 'daily', ?, ?, ?, ?, ?, ?)`,
        cat, ts, JSON.stringify([cat]), mood, energy, prod, dur, xp,
      );
    }
  }

  const total = db.getFirstSync<{ t: number }>('SELECT sum(xp_awarded) as t FROM activity_logs')?.t ?? 0;
  let lvl = 1; let xpLeft = total;
  while (xpLeft >= 500 + (lvl - 1) * 250) { xpLeft -= 500 + (lvl - 1) * 250; lvl++; }
  db.runSync(
    `UPDATE rpg_state SET total_xp=?, current_level=?, xp_to_next_level=?,
     streak_days=12, last_active_date=? WHERE id=1`,
    xpLeft, lvl, 500 + (lvl - 1) * 250, now.toISOString().split('T')[0],
  );
  try {
    db.runSync('UPDATE rpg_state SET highest_xp_attained=? WHERE id=1', total);
  } catch {}
}

function seedCurrentWeek() {
  const cats = DEFAULT_CATEGORIES.map(c => c.name);
  const now = new Date();
  for (let d = 6; d >= 0; d--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d,
      7 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
    const pad = (x: number) => String(x).padStart(2, '0');
    const ts = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    const cat   = cats[Math.floor(Math.random() * cats.length)];
    const mood  = Math.floor(Math.random() * 5) + 5;
    const energy = Math.floor(Math.random() * 5) + 5;
    const prod  = Math.floor(Math.random() * 5) + 5;
    const dur   = (Math.floor(Math.random() * 3) + 1) * 30;
    const xp    = Math.floor((20 + dur / 4) * (0.8 + mood * 0.04));
    db.runSync(
      `INSERT INTO activity_logs (category, description, created_at, log_type, categories, mood_rating, energy_rating, productivity_rating, duration_mins, xp_awarded)
       VALUES (?, '', ?, 'daily', ?, ?, ?, ?, ?, ?)`,
      cat, ts, JSON.stringify([cat]), mood, energy, prod, dur, xp,
    );
  }
}

// ─── Auto-init: called AFTER all constants are defined ────────────────────────
initDB();
