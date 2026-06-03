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

  if (version < 10) {
    // New dungeon columns
    try { db.execSync(`ALTER TABLE dungeons ADD COLUMN objective_text TEXT`); } catch {}
    try { db.execSync(`ALTER TABLE dungeons ADD COLUMN duration_mins INTEGER NOT NULL DEFAULT 30`); } catch {}
    try { db.execSync(`ALTER TABLE dungeons ADD COLUMN category TEXT NOT NULL DEFAULT 'Workout'`); } catch {}

    // New dungeon_runs columns
    try { db.execSync(`ALTER TABLE dungeon_runs ADD COLUMN started_at TEXT`); } catch {}
    try { db.execSync(`ALTER TABLE dungeon_runs ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'`); } catch {}

    // Quests: add accepted_at, rename 'active' → 'pending'
    try { db.execSync(`ALTER TABLE quests ADD COLUMN accepted_at TEXT`); } catch {}
    db.execSync(`UPDATE quests SET status = 'pending' WHERE status = 'active'`);

    // Replace all dungeon seeds (abstract → specific real-world activities)
    db.execSync(`DELETE FROM dungeon_runs`);
    db.execSync(`DELETE FROM dungeons`);

    const v10Dungeons: [string, string, string, string, string, number, number, number, string, string, string, number, string][] = [
      ["Hunter's Run",    'E', "2.4km sprint. Your time starts now.",                          'sta', 'agi', 5, 25, 0.25, "Runner's Band",   '+2 STA when equipped.', 'Complete a 2.4 km run before the gate closes.',                                                    30, 'Workout' ],
      ['Iron Will',       'E', 'HIIT until failure. Push to the plank hold.',                  'str', 'sta', 5, 25, 0.25, 'Iron Gauntlet',   '+2 STR when equipped.', 'Complete a full HIIT session. Push to the plank hold.',                                            30, 'Workout' ],
      ['Intel Report',    'E', '30 mins on global news. Generate that daily report.',          'wis', 'foc', 5, 20, 0.20, "Analyst's Lens",  '+2 WIS when equipped.', "Read the day's global news and generate a macro summary report.",                                  30, 'Study'   ],
      ['Sacred Grounds',  'E', 'Bible journaling. Zone out and recollect.',                   'spr', 'wis', 5, 20, 0.20, 'Prayer Bead',     '+2 SPR when equipped.', 'Complete one Bible journal entry. Zone out and recollect.',                                        30, 'Devotion'],
      ['Mirror Protocol', 'E', "Reflect. Pieces of wisdom. Little improvements.",             'per', 'wis', 5, 20, 0.20, 'Obsidian Shard',  '+2 PER when equipped.', "Reflect and capture pieces of wisdom. Refine your language — don't use 'thing', use 'concept'.",  30, 'Journal' ],
    ];
    for (const [nm, rk, fl, ps, ss, df, cr, dc, inm, idc, obj, dur, cat] of v10Dungeons) {
      db.runSync(
        `INSERT INTO dungeons (name, rank, flavor_text, primary_stat, secondary_stat, difficulty, coin_reward, item_drop_chance, item_name, item_description, objective_text, duration_mins, category, cooldown_hours)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 48)`,
        nm, rk, fl, ps, ss, df, cr, dc, inm, idc, obj, dur, cat,
      );
    }

    db.execSync('PRAGMA user_version = 10');
  }

  if (version < 11) {
    // rpg_state new columns
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN self_destruct_count INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN last_self_destruct TEXT`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN current_mood TEXT NOT NULL DEFAULT 'driven'`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN level_up_pending INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN death_acknowledged INTEGER NOT NULL DEFAULT 0`); } catch {}

    // activity_logs: notes field for self-destruct banners
    try { db.execSync(`ALTER TABLE activity_logs ADD COLUMN self_destruct_notes TEXT`); } catch {}

    // Revival quests table
    db.execSync(`CREATE TABLE IF NOT EXISTS revival_quests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      description  TEXT,
      category     TEXT NOT NULL DEFAULT 'Workout',
      hp_restore   INTEGER NOT NULL DEFAULT 20,
      is_active    INTEGER NOT NULL DEFAULT 1
    )`);

    // Seed demo revival quests
    const rqs = [
      ['Morning Sprint',  'A quick 10-minute run. Get your blood moving.', 'Workout', 25],
      ['Cold Shower',     '3 minutes of cold water. Shock your system back online.', 'Workout', 20],
      ['Breathwork',      '5 minutes of deep diaphragmatic breathing. Reset.', 'Devotion', 15],
    ];
    for (const [t, d, c, h] of rqs) {
      db.runSync(`INSERT INTO revival_quests (title, description, category, hp_restore) VALUES (?, ?, ?, ?)`, t, d, c, h);
    }

    // Reseed: clear existing log data and insert 30 days of realistic data
    db.execSync(`DELETE FROM activity_logs`);
    db.execSync(`DELETE FROM dungeon_runs`);
    db.execSync(`DELETE FROM quests`);
    db.execSync(`DELETE FROM quest_completions`);

    try { seedRealisticData(); } catch {}

    db.execSync('PRAGMA user_version = 11');
  }

  if (version < 12) {
    // Revival quests: add duration for timer-based flow
    try { db.execSync(`ALTER TABLE revival_quests ADD COLUMN duration_mins INTEGER NOT NULL DEFAULT 10`); } catch {}
    db.execSync(`UPDATE revival_quests SET duration_mins = 10 WHERE duration_mins = 0 OR duration_mins IS NULL`);

    // Inventory: add category (game | global) and source
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN category TEXT NOT NULL DEFAULT 'game'`); } catch {}
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN source TEXT`); } catch {}

    // Clear old inventory items and reseed
    db.execSync(`DELETE FROM inventory`);

    // Global items
    const globalItems: [string, string, string, string][] = [
      ['Streak Freeze', 'global', 'consumable',  'Protects your streak for one missed day. Auto-activates.'],
      ['Energy Treat',  'global', 'consumable',  'A small financial reward to yourself. Activates when financial module is built.'],
      ['Morning Brew',  'global', 'consumable',  'A productivity ritual item. Effect TBD.'],
    ];
    for (const [nm, cat, tp, desc] of globalItems) {
      db.runSync(`INSERT INTO inventory (item_name, category, item_type, description) VALUES (?,?,?,?)`, nm, cat, tp, desc);
    }

    // Game items (from dungeon drop simulations)
    const gameItems: [string, string, string, string][] = [
      ["Runner's Band",  'game', 'equipment', '+2 STA when equipped. Dropped from Hunter\'s Run.'],
      ['Prayer Bead',    'game', 'equipment', '+2 SPR when equipped. Dropped from Sacred Grounds.'],
      ['Obsidian Shard', 'game', 'equipment', '+2 PER when equipped. Dropped from Mirror Protocol.'],
      ["Analyst's Lens", 'game', 'equipment', '+2 WIS when equipped. Dropped from Intel Report.'],
      ['Iron Gauntlet',  'game', 'equipment', '+2 STR when equipped. Dropped from Iron Will.'],
    ];
    for (const [nm, cat, tp, desc] of gameItems) {
      db.runSync(`INSERT INTO inventory (item_name, category, item_type, description) VALUES (?,?,?,?)`, nm, cat, tp, desc);
    }

    // Seed an accepted quest and a completed quest for full testing coverage
    // (only if no accepted/completed quests already exist)
    const hasAccepted = (db.getFirstSync<{ n: number }>(`SELECT count(*) as n FROM quests WHERE status='accepted'`)?.n ?? 0) > 0;
    if (!hasAccepted) {
      db.runSync(
        `INSERT INTO quests (title, description, category, quest_type, coin_reward, status, accepted_at)
         VALUES (?, ?, ?, 'weekly', 30, 'accepted', datetime('now','localtime'))`,
        'Log: Workout', 'Keep the workout habit alive. Complete a workout session.', 'Workout',
      );
    }
    const hasCompleted = (db.getFirstSync<{ n: number }>(`SELECT count(*) as n FROM quests WHERE status='completed'`)?.n ?? 0) > 0;
    if (!hasCompleted) {
      db.runSync(
        `INSERT INTO quests (title, description, category, quest_type, coin_reward, status)
         VALUES (?, ?, ?, 'weekly', 30, 'completed')`,
        'Log: Coding', 'Keep the coding habit going.', 'Coding',
      );
      const cqid = db.getFirstSync<{ id: number }>(`SELECT id FROM quests WHERE status='completed' ORDER BY id DESC LIMIT 1`)?.id;
      if (cqid) db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?,30)`, cqid);
    }

    db.execSync('PRAGMA user_version = 12');
  }

  if (version < 13) {
    // Clear dungeon runs so all dungeons are available for testing
    db.execSync(`DELETE FROM dungeon_runs`);
    db.execSync('PRAGMA user_version = 13');
  }

  if (version < 14) {
    // rpg_state: gems currency + revival counter
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN gems INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN revival_count INTEGER NOT NULL DEFAULT 0`); } catch {}

    // Custom moods table — seeded with the 6 defaults
    db.execSync(`CREATE TABLE IF NOT EXISTS custom_moods (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,
      color         TEXT NOT NULL DEFAULT '#34D399',
      passive_effect TEXT,
      mp_rate       INTEGER NOT NULL DEFAULT 0,
      is_default    INTEGER NOT NULL DEFAULT 1,
      is_active     INTEGER NOT NULL DEFAULT 1
    )`);
    const defaultMoods: [string, string, string, number][] = [
      ['driven',        '#34D399', '+10% XP gain',                  10],
      ['burnout',       '#EF4444', '−20% XP · −10% coins earned',  -20],
      ['reminiscing',   '#A855F7', '+5% XP gain',                    5],
      ['lonely',        '#64748B', '−5% XP gain',                   -5],
      ['overstimulated','#F97316', '−10% XP · restlessness penalty',-8],
      ['relapsed',      '#EF4444', '−30% XP · −15% coins earned',  -30],
    ];
    for (const [name, color, effect, mp] of defaultMoods) {
      db.runSync(
        `INSERT OR IGNORE INTO custom_moods (name, color, passive_effect, mp_rate) VALUES (?,?,?,?)`,
        name, color, effect, mp,
      );
    }

    db.execSync('PRAGMA user_version = 14');
  }

  if (version < 15) {
    // Vigor: clean-day counter (increments each day without self-destruct)
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN vigor INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN last_vigor_date TEXT`); } catch {}
    db.execSync('PRAGMA user_version = 15');
  }

  if (version < 16) {
    // inventory: add slot_type and rarity for the new equipment system
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN slot_type TEXT`); } catch {}
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN rarity TEXT NOT NULL DEFAULT 'E'`); } catch {}

    // Remove old seeded game items (Runner's Band, Iron Gauntlet, etc.) and dungeon drops
    // Only keep global items (streak freeze, treats, etc.)
    db.execSync(`DELETE FROM inventory WHERE category = 'game'`);

    db.execSync('PRAGMA user_version = 16');
  }
}

function seedRealisticData() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();

  function dateFor(daysAgo: number): string {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function tsFor(daysAgo: number, hour = 8): string {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:00:00`;
  }

  type Entry = {
    daysAgo: number; hour?: number;
    type: 'mood' | 'activity' | 'dungeon' | 'quest';
    category?: string; cats?: string[];
    desc?: string; duration?: number;
    mood?: number; energy?: number; prod?: number;
    xp: number; well?: string; revelation?: string;
  };

  const schedule: Entry[] = [
    // 30 days ago
    { daysAgo:30, type:'mood',     mood:6, energy:6, prod:6, xp:20 },
    { daysAgo:30, type:'activity', category:'Workout', cats:['Workout'], desc:'Morning run — 5km', duration:45, xp:52 },
    // 29
    { daysAgo:29, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:29, type:'activity', category:'Coding', cats:['Coding'], desc:'Personal project', duration:90, xp:65 },
    // 28
    { daysAgo:28, type:'mood',     mood:6, energy:6, prod:7, xp:20 },
    { daysAgo:28, type:'activity', category:'Study', cats:['Study'], desc:'Clean Code — ch 3', duration:60, xp:48,
      well:'Got through 3 chapters', revelation:'Single responsibility matters more than I thought' },
    // 27 — no log
    // 26
    { daysAgo:26, type:'mood',     mood:7, energy:8, prod:8, xp:20 },
    { daysAgo:26, type:'activity', category:'Workout', cats:['Workout'], desc:'HIIT session', duration:30, xp:38 },
    { daysAgo:26, type:'activity', hour:10, category:'Devotion', cats:['Devotion'], desc:'Morning devotion', duration:20, xp:28 },
    // 25
    { daysAgo:25, type:'mood',     mood:8, energy:8, prod:8, xp:35, well:'Really productive day', revelation:'Start with the hardest task first' },
    { daysAgo:25, type:'activity', category:'Coding', cats:['Coding'], desc:'Built new feature', duration:120, xp:78 },
    // 24
    { daysAgo:24, type:'mood',     mood:6, energy:5, prod:6, xp:20 },
    { daysAgo:24, type:'activity', category:'Reading', cats:['Reading'], desc:'Atomic Habits — ch 7-9', duration:45, xp:42 },
    // 23
    { daysAgo:23, type:'mood',     mood:5, energy:5, prod:5, xp:20 },
    { daysAgo:23, type:'activity', category:'Admin', cats:['Admin'], desc:'Finances and emails', duration:30, xp:25 },
    // 22
    { daysAgo:22, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:22, type:'activity', category:'Journal', cats:['Journal'], desc:'Weekly reflection', duration:25, xp:32,
      well:'Recognised a bad habit', revelation:"Stop saying 'just' — it undermines what you are doing" },
    // 21 — no log
    // 20
    { daysAgo:20, type:'mood',     mood:8, energy:8, prod:9, xp:20 },
    { daysAgo:20, type:'activity', category:'Workout', cats:['Workout'], desc:'5km run + stretching', duration:50, xp:55 },
    // 19
    { daysAgo:19, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:19, type:'activity', category:'Coding', cats:['Coding'], desc:'Refactored database layer', duration:80, xp:60 },
    // 18 — with dungeon completion
    { daysAgo:18, type:'mood',     mood:6, energy:6, prod:6, xp:20 },
    { daysAgo:18, type:'activity', category:'Study', cats:['Study'], desc:'CS fundamentals', duration:60, xp:48 },
    { daysAgo:18, hour:14, type:'dungeon', category:'Workout', cats:['Workout'], desc:"E-Rank Gate: Hunter's Run", duration:30, xp:45 },
    // 17
    { daysAgo:17, type:'mood',     mood:7, energy:7, prod:8, xp:20 },
    { daysAgo:17, type:'activity', category:'Devotion', cats:['Devotion'], desc:'Bible study — Proverbs 3', duration:25, xp:30,
      revelation:'Trust in the Lord with all your heart' },
    // 16
    { daysAgo:16, type:'mood',     mood:8, energy:8, prod:8, xp:35 },
    { daysAgo:16, type:'activity', category:'Workout', cats:['Workout'], desc:'Strength training — full body', duration:60, xp:62 },
    // 15 — quest completion
    { daysAgo:15, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:15, hour:11, type:'quest', category:'Journal', cats:['Journal'], desc:'Log: Journal', xp:30 },
    // 14 — no log
    // 13
    { daysAgo:13, type:'mood',     mood:6, energy:6, prod:6, xp:20 },
    { daysAgo:13, type:'activity', category:'Reading', cats:['Reading'], desc:'The Power of Habit — finish', duration:45, xp:42 },
    // 12
    { daysAgo:12, type:'mood',     mood:7, energy:7, prod:8, xp:20 },
    { daysAgo:12, type:'activity', category:'Workout', cats:['Workout'], desc:'10km run', duration:60, xp:62, well:'New personal record' },
    // 11
    { daysAgo:11, type:'mood',     mood:7, energy:6, prod:7, xp:20 },
    { daysAgo:11, type:'activity', category:'Study', cats:['Study'], desc:'Data structures review', duration:90, xp:68 },
    // 10
    { daysAgo:10, type:'mood',     mood:8, energy:8, prod:8, xp:20 },
    { daysAgo:10, type:'activity', category:'Journal', cats:['Journal'], desc:'Reflection on last 2 weeks', duration:30, xp:38,
      revelation:"I lose focus when I don't set clear goals the night before" },
    { daysAgo:10, hour:10, type:'activity', category:'Devotion', cats:['Devotion'], desc:'Morning prayer', duration:15, xp:22 },
    // 9 — dungeon completion
    { daysAgo:9, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:9, type:'activity', category:'Coding', cats:['Coding'], desc:'Game tab implementation', duration:120, xp:78 },
    { daysAgo:9, hour:14, type:'dungeon', category:'Study', cats:['Study'], desc:'E-Rank Gate: Intel Report', duration:30, xp:45 },
    // 8
    { daysAgo:8, type:'mood',     mood:7, energy:7, prod:8, xp:20 },
    { daysAgo:8, type:'activity', category:'Workout', cats:['Workout'], desc:'Sprint intervals', duration:35, xp:40 },
    // --- LAST 7 DAYS (Journal and Devotion absent → triggers quests) ---
    // 7
    { daysAgo:7, type:'mood',     mood:6, energy:6, prod:7, xp:20 },
    { daysAgo:7, type:'activity', category:'Coding', cats:['Coding'], desc:'Bug fixes and testing', duration:90, xp:65 },
    // 6
    { daysAgo:6, type:'mood',     mood:7, energy:7, prod:7, xp:20 },
    { daysAgo:6, type:'activity', category:'Study', cats:['Study'], desc:'Algorithm prep', duration:60, xp:48 },
    // 5
    { daysAgo:5, type:'mood',     mood:7, energy:8, prod:8, xp:20 },
    { daysAgo:5, type:'activity', category:'Workout', cats:['Workout'], desc:'Gym — chest and back', duration:50, xp:55 },
    // 4
    { daysAgo:4, type:'mood',     mood:6, energy:6, prod:6, xp:20 },
    { daysAgo:4, type:'activity', category:'Reading', cats:['Reading'], desc:"Man's Search for Meaning — ch 1-3", duration:40, xp:40 },
    // 3 — no log
    // 2
    { daysAgo:2, type:'mood',     mood:8, energy:8, prod:8, xp:20 },
    { daysAgo:2, type:'activity', category:'Coding', cats:['Coding'], desc:'New feature shipped', duration:120, xp:78, well:'Feature deployed cleanly' },
    // 1
    { daysAgo:1, type:'mood',     mood:7, energy:7, prod:8, xp:20 },
    { daysAgo:1, type:'activity', category:'Admin', cats:['Admin'], desc:'Weekly planning session', duration:30, xp:28 },
    // today
    { daysAgo:0, type:'mood',     mood:8, energy:8, prod:8, xp:20 },
    { daysAgo:0, type:'activity', category:'Workout', cats:['Workout'], desc:'Morning run', duration:40, xp:45 },
  ];

  for (const e of schedule) {
    const date = dateFor(e.daysAgo);
    const ts   = tsFor(e.daysAgo, e.hour ?? (e.type === 'mood' ? 8 : 9));
    const cats = JSON.stringify(e.cats ?? (e.category ? [e.category] : []));

    if (e.type === 'mood') {
      db.runSync(
        `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at,
           mood_rating, energy_rating, productivity_rating, categories, xp_awarded, what_went_well, what_to_improve)
         VALUES ('','','daily','mood',?,?,?,?,?,'[]',?,?,?)`,
        date, ts, e.mood ?? 7, e.energy ?? 7, e.prod ?? 7, e.xp, e.well ?? null, e.revelation ?? null,
      );
    } else {
      db.runSync(
        `INSERT INTO activity_logs (category, description, log_type, entry_type, log_date, created_at,
           categories, duration_mins, xp_awarded, mood_rating, what_went_well, what_to_improve)
         VALUES (?,?,'daily',?,?,?,?,?,?,0,?,?)`,
        e.category ?? '', e.desc ?? '', e.type, date, ts,
        cats, e.duration ?? null, e.xp, e.well ?? null, e.revelation ?? null,
      );
    }
  }

  // Dungeon runs for the dungeon activity log entries
  const d1 = db.getFirstSync<{ id: number }>('SELECT id FROM dungeons WHERE name = "Hunter\'s Run" LIMIT 1')?.id
           ?? db.getFirstSync<{ id: number }>('SELECT id FROM dungeons LIMIT 1')?.id;
  const d2 = db.getFirstSync<{ id: number }>('SELECT id FROM dungeons WHERE name = "Intel Report" LIMIT 1')?.id
           ?? db.getFirstSync<{ id: number }>('SELECT id FROM dungeons LIMIT 1 OFFSET 2')?.id;
  if (d1) db.runSync(
    `INSERT INTO dungeon_runs (dungeon_id, started_at, completed_at, status, result, coins_earned, hp_change)
     VALUES (?,?,?,'completed','win',25,0)`, d1, tsFor(18,14), tsFor(18,14),
  );
  if (d2) db.runSync(
    `INSERT INTO dungeon_runs (dungeon_id, started_at, completed_at, status, result, coins_earned, hp_change)
     VALUES (?,?,?,'completed','win',20,0)`, d2, tsFor(9,14), tsFor(9,14),
  );

  // Quest completion entry
  db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',30,'completed')`,
    'Log: Journal', 'Complete a journal session.', 'Journal');
  const completedQId = db.getFirstSync<{id:number}>(`SELECT id FROM quests WHERE status='completed' AND title='Log: Journal' LIMIT 1`)?.id;
  if (completedQId) {
    db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?,30)`, completedQId);
  }

  // Pending quests for testing (Journal/Devotion absent in last 7 days → realistic triggers)
  const pendingQs = [
    ['Log: Journal',   'You haven\'t journaled in a while. Complete a journal session.',   'Journal',  30],
    ['Log: Devotion',  'You haven\'t done devotion recently. Complete a devotion session.', 'Devotion', 30],
    ['Log: Reading',   'Keep the reading habit alive. Log a reading session.',              'Reading',  25],
  ];
  for (const [t, d, c, r] of pendingQs) {
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',?,'pending')`, t, d, c, r);
  }

  // Recalculate rpg_state from seeded logs
  const total = db.getFirstSync<{t:number}>('SELECT sum(xp_awarded) as t FROM activity_logs')?.t ?? 0;
  let lvl = 1; let xpLeft = total;
  while (xpLeft >= 500 + (lvl - 1) * 250) { xpLeft -= 500 + (lvl - 1) * 250; lvl++; }
  db.runSync(
    `UPDATE rpg_state SET total_xp=?,current_level=?,xp_to_next_level=?,
     streak_days=12, last_active_date=date('now','localtime'),
     coins=75, ap=?, hp=80, hp_max=100, mp=0 WHERE id=1`,
    xpLeft, lvl, 500 + (lvl-1)*250, lvl * 10,
  );
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
