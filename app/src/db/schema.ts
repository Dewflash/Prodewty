import * as SQLite from 'expo-sqlite';
import { pad } from '../utils/date';

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

  if (version < 17) {
    // Clear dungeon cooldowns so all gates are available for testing
    db.execSync(`DELETE FROM dungeon_runs`);

    // Remove any existing game inventory and reseed with one demo item per slot
    db.execSync(`DELETE FROM inventory WHERE category = 'game'`);

    // Equipment: descending rarity top→C, gloves/coat→D, rest→E
    const equipItems: [string, string, string, string][] = [
      ['Shadow Cowl',      'top',        'C', 'A shadowed upper garment. Proof of early gate clearance.'],
      ['Iron Grips',       'gloves',     'D', 'Reinforced gloves. Standard dungeon gear.'],
      ['Warden Coat',      'coat',       'D', 'A heavy outer coat. Common among gate runners.'],
      ['Rugged Leggings',  'pants',      'E', 'Basic dungeon leggings. Common drop.'],
      ['Tracker Boots',    'shoes',      'E', 'Lightweight boots for dungeon movement. Common drop.'],
      ['Copper Band',      'ring',       'E', 'A simple copper ring. Common drop.'],
      ['Hollow Chalice',   'goblet',     'E', 'A plain ceremonial goblet. Common drop.'],
      ['Stone Pendant',    'necklace',   'E', 'A plain stone pendant. Common drop.'],
      ['Cord Bracelet',    'bracelet',   'E', 'A simple cord bracelet. Common drop.'],
      ['Worn Plate Set',   'armour_set', 'E', 'A battered set of armour plates. Common drop.'],
    ];
    for (const [nm, slot, rar, desc] of equipItems) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description) VALUES (?, 'equipment', 'game', ?, ?, ?)`,
        nm, slot, rar, desc,
      );
    }

    // Weapons: sword/grimoire→D, rest→E
    const weaponItems: [string, string, string, string][] = [
      ['Iron Longsword', 'sword',    'D', 'A standard iron sword. D-rank drop.'],
      ['Torn Spellbook', 'grimoire', 'D', 'A partially-bound grimoire. D-rank drop.'],
      ['Rusty Dagger',   'dagger',   'E', 'A short rusty blade. Common drop.'],
      ['Wooden Shield',  'shield',   'E', 'A basic wooden shield. Common drop.'],
      ['Gnarled Rod',    'scepter',  'E', 'A crude wooden scepter. Common drop.'],
    ];
    for (const [nm, slot, rar, desc] of weaponItems) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description) VALUES (?, 'equipment', 'game', ?, ?, ?)`,
        nm, slot, rar, desc,
      );
    }

    // Catalysts: one per stat at E rarity
    const catalystItems: [string, string][] = [
      ['Strength Crystal', 'str'],
      ['Agility Shard',    'agi'],
      ['Focus Lens',       'foc'],
      ['Wisdom Rune',      'wis'],
      ['Spirit Bead',      'spr'],
      ['Perception Orb',   'per'],
      ['Stamina Core',     'sta'],
    ];
    for (const [nm, stat] of catalystItems) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description) VALUES (?, 'catalyst', 'game', ?, 'E', ?)`,
        nm, `catalyst_${stat}`, `Permanently boosts ${stat.toUpperCase()}. Acquired from dungeon drops.`,
      );
    }

    // Consumables: a few examples across stats
    const consumableItems: [string, string, string][] = [
      ['Strength Tonic', 'str', 'D'],
      ['Focus Draught',  'foc', 'E'],
      ['Stamina Brew',   'sta', 'E'],
    ];
    for (const [nm, stat, rar] of consumableItems) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, description) VALUES (?, 'consumable', 'game', ?, ?, ?)`,
        nm, `consumable_${stat}`, rar, `+5 ${stat.toUpperCase()} for 1 hour.`,
      );
    }

    db.execSync('PRAGMA user_version = 17');
  }

  if (version < 18) {
    // Equipment: track which item is equipped per slot
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN is_equipped INTEGER NOT NULL DEFAULT 0`); } catch {}
    // Stat buff: "str:5" means +5 STR
    try { db.execSync(`ALTER TABLE inventory ADD COLUMN stat_buff TEXT`); } catch {}

    // Active buffs from consumed consumables
    db.execSync(`CREATE TABLE IF NOT EXISTS active_buffs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER NOT NULL,
      stat_key   TEXT NOT NULL,
      stat_value INTEGER NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      expires_at TEXT NOT NULL,
      is_active  INTEGER NOT NULL DEFAULT 1
    )`);

    // Seed stat_buff values on v17 equipment + mark one equipped per slot
    db.runSync(`UPDATE inventory SET stat_buff='wis:3', is_equipped=1 WHERE item_name='Shadow Cowl'`);
    db.runSync(`UPDATE inventory SET stat_buff='str:2'                  WHERE item_name='Iron Grips'`);
    db.runSync(`UPDATE inventory SET stat_buff='spr:2'                  WHERE item_name='Warden Coat'`);
    db.runSync(`UPDATE inventory SET stat_buff='agi:1'                  WHERE item_name='Rugged Leggings'`);
    db.runSync(`UPDATE inventory SET stat_buff='agi:1'                  WHERE item_name='Tracker Boots'`);
    db.runSync(`UPDATE inventory SET stat_buff='per:1'                  WHERE item_name='Copper Band'`);
    db.runSync(`UPDATE inventory SET stat_buff='spr:1'                  WHERE item_name='Hollow Chalice'`);
    db.runSync(`UPDATE inventory SET stat_buff='foc:1'                  WHERE item_name='Stone Pendant'`);
    db.runSync(`UPDATE inventory SET stat_buff='sta:1'                  WHERE item_name='Cord Bracelet'`);
    db.runSync(`UPDATE inventory SET stat_buff='str:1'                  WHERE item_name='Worn Plate Set'`);
    db.runSync(`UPDATE inventory SET stat_buff='str:3', is_equipped=1   WHERE item_name='Iron Longsword'`);
    db.runSync(`UPDATE inventory SET stat_buff='wis:2'                  WHERE item_name='Torn Spellbook'`);
    db.runSync(`UPDATE inventory SET stat_buff='agi:1'                  WHERE item_name='Rusty Dagger'`);
    db.runSync(`UPDATE inventory SET stat_buff='str:1'                  WHERE item_name='Wooden Shield'`);
    db.runSync(`UPDATE inventory SET stat_buff='spr:1'                  WHERE item_name='Gnarled Rod'`);
    db.runSync(`UPDATE inventory SET stat_buff='str:5'                  WHERE item_name='Strength Tonic'`);
    db.runSync(`UPDATE inventory SET stat_buff='foc:5'                  WHERE item_name='Focus Draught'`);
    db.runSync(`UPDATE inventory SET stat_buff='sta:5'                  WHERE item_name='Stamina Brew'`);

    db.execSync('PRAGMA user_version = 18');
  }

  if (version < 19) {
    // Cache item name in active_buffs so buffs survive item deletion
    try { db.execSync(`ALTER TABLE active_buffs ADD COLUMN item_name TEXT`); } catch {}

    // Reseed game inventory with diverse rarities + proper descriptions
    db.execSync(`DELETE FROM inventory WHERE category = 'game'`);

    // Equipment (descending rarity: S → D) with stat_buff and descriptions
    const equipV19: [string, string, string, string, string][] = [
      ['Shadow Monarch\'s Cowl', 'top',        'S',  'wis:5', 'Woven from shadow essence. Heightens the senses of all who wear it. Exclusive to S-rank clearances and above.'],
      ['Hunter\'s Coat',         'coat',       'A',  'spr:3', 'Standard A-rank hunter issue. Reinforced inner lining resists mana fluctuations. Required for ranked gate entry.'],
      ['Iron Grips',             'gloves',     'B',  'str:2', 'Double-layered iron reinforcement. Found exclusively in B-rank gates and above. A staple for strength-focused hunters.'],
      ['Shadow Leggings',        'pants',      'C',  'agi:2', 'Lightweight dungeon legwear. Common among E to C-rank hunters on their first runs through the lower gates.'],
      ['Tracker Boots',          'shoes',      'D',  'agi:1', 'Worn but reliable. Standard issue for low-rank dungeon entry teams. Slightly better than barefoot.'],
      ['Focus Band',             'ring',       'B',  'foc:2', 'A simple band imbued with faint mana. Sharpens concentration during extended dungeon runs.'],
      ['Chalice of Eternity',    'goblet',     'SS', 'spr:5', 'Used in an ancient rite predating the first gates. Those who drink from it report hearing whispers from beyond the veil.'],
      ['Pendulum Necklace',      'necklace',   'A',  'per:3', 'A hunter\'s compass. The pendant vibrates near high-density mana pockets and before gate openings.'],
      ['Shadow Brace',           'bracelet',   'C',  'sta:1', 'Flexible shadow-thread weave. Absorbs minor impact from dungeon hazards. A common find in C-rank loot.'],
      ['Iron Shell Set',         'armour_set', 'D',  'str:2', 'A basic full-body plate set. Heavy and loud — but effective at ranks E through D. Favoured by recruits.'],
    ];
    for (const [nm, slot, rar, buff, desc] of equipV19) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description, is_equipped)
         VALUES (?, 'equipment', 'game', ?, ?, ?, ?, 1)`,
        nm, slot, rar, buff, desc,
      );
    }

    // Weapons (A → E) with diverse rarities
    const weaponsV19: [string, string, string, string, string][] = [
      ['Sovereign Blade',  'sword',    'A', 'str:4', 'A blade forged in the style of the Shadow Monarch\'s generals. Hums faintly when near an active gate.'],
      ['Torn Grimoire',    'grimoire', 'B', 'wis:3', 'Pages missing from the final chapter. Still holds residual power from its original mage. Found in Study-type gates.'],
      ['Phantom Dagger',   'dagger',   'C', 'agi:2', 'Fast and silent. A staple for perception-based hunters operating in low-light C-rank gates.'],
      ['Iron Buckler',     'shield',   'D', 'str:1', 'A basic defensive tool. Required equipment for E-rank team leaders entering multi-floor gates.'],
      ['Gnarled Rod',      'scepter',  'E', 'spr:1', 'A crude mana channel carved from dungeon wood. Found near collapsed altars in the lowest-ranked gates.'],
    ];
    for (const [nm, slot, rar, buff, desc] of weaponsV19) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description, is_equipped)
         VALUES (?, 'equipment', 'game', ?, ?, ?, ?, 1)`,
        nm, slot, rar, buff, desc,
      );
    }

    // Catalysts (E rarity, one per stat)
    const catalystsV19: [string, string, string][] = [
      ['Strength Crystal', 'str', 'Permanently boosts STR by a fixed amount. Acquired from dungeon drops. Extremely rare.'],
      ['Agility Shard',    'agi', 'Permanently boosts AGI. Dropped by shadow-type monsters in Agility gates.'],
      ['Focus Lens',       'foc', 'Permanently boosts FOC. Found in Study and Journal type dungeons.'],
      ['Wisdom Rune',      'wis', 'Permanently boosts WIS. Inscribed by dungeon spirits. Cannot be replicated.'],
      ['Spirit Bead',      'spr', 'Permanently boosts SPR. Said to contain a fragment of a dissolved dungeon boss.'],
      ['Perception Orb',   'per', 'Permanently boosts PER. Condenses the essence of observation. Rare E-rank find.'],
      ['Stamina Core',     'sta', 'Permanently boosts STA. Extracted from high-endurance dungeon creatures.'],
    ];
    for (const [nm, stat, desc] of catalystsV19) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description)
         VALUES (?, 'catalyst', 'game', ?, 'E', ?, ?)`,
        nm, `catalyst_${stat}`, `${stat.toUpperCase()}:3`, desc,
      );
    }

    // Consumables (D → E, varied rarities)
    const consumablesV19: [string, string, string, string, string][] = [
      ['Agility Serum',  'agi', 'B', 'agi:5', 'Extracted from shadow beasts. Sharpens reflexes for exactly one hour. Bitter aftertaste.'],
      ['Focus Draught',  'foc', 'C', 'foc:5', 'Clarity agent used before intel dungeon runs. Brewed from Mystic Archive residue.'],
      ['Strength Tonic', 'str', 'D', 'str:5', 'Brewed from dungeon moss. Bitter but effective. Standard pre-gate supplement for STR builds.'],
      ['Stamina Brew',   'sta', 'D', 'sta:5', 'Dense nutritive compound. Extends endurance for one hour. Required for long-floor gates.'],
      ['Wisdom Elixir',  'wis', 'C', 'wis:5', 'Distilled knowledge essence from the Mystic Archive. Temporary — but the insight lingers.'],
      ['Spirit Tonic',   'spr', 'E', 'spr:5', 'Common restorative. Boosts SPR for one hour. Available at any hunter supply depot.'],
    ];
    for (const [nm, stat, rar, buff, desc] of consumablesV19) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description)
         VALUES (?, 'consumable', 'game', ?, ?, ?, ?)`,
        nm, `consumable_${stat}`, rar, buff, desc,
      );
    }

    db.execSync('PRAGMA user_version = 19');
  }

  runMigration20();

  if (version < 21) {
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN spendable_xp INTEGER NOT NULL DEFAULT 0`); } catch {}
    try { db.execSync(`ALTER TABLE rpg_state ADD COLUMN total_xp_earned INTEGER NOT NULL DEFAULT 0`); } catch {}
    db.execSync(
      `UPDATE rpg_state SET
         spendable_xp    = COALESCE(total_xp, 0),
         total_xp_earned = (SELECT COALESCE(SUM(xp_awarded), 0) FROM activity_logs)
       WHERE id = 1`,
    );
    db.execSync('PRAGMA user_version = 21');
  }

  if (version < 22) {
    db.runSync(
      `INSERT OR IGNORE INTO inventory
         (item_name, item_type, category, slot_type, rarity, stat_buff, description, is_equipped)
       VALUES (?, 'equipment', 'game', ?, 'Chromatic', ?, ?, 0)`,
      'Void Sovereign Mantle',
      'coat',
      'str:10',
      'Formed when a dungeon core collapsed inward and fused with a hunter\'s will. No classification system can contain it. Found once. Never again.',
    );
    db.execSync('PRAGMA user_version = 22');
  }

  if (version < 23) {
    const z  = (n: number) => String(n).padStart(2, '0');
    const ts = (d: Date)   => `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:00`;
    const dDate = (n: number) => {
      const d = new Date(); d.setDate(d.getDate() - n);
      return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
    };
    const dTs = (n: number, h = 9) => {
      const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0);
      return ts(d);
    };
    const yesterday = dDate(1);

    // ── 1. Activity logs — 13 days of fresh data ─────────────────────────────
    db.execSync(`DELETE FROM activity_logs`);

    type E = { d: number; h?: number; t: 'mood'|'act'|'dungeon'|'quest';
               cat?: string; desc?: string; dur?: number;
               mood?: number; nrg?: number; prod?: number;
               xp: number; well?: string; rev?: string };

    const entries: E[] = [
      { d:13, t:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:13, t:'act',  cat:'Workout',  desc:'Morning run 5km',                 dur:45,  xp:52 },
      { d:12, t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:12, t:'act',  cat:'Coding',   desc:'Personal project sprint',          dur:90,  xp:65, rev:'Break large features into small commits' },
      { d:11, t:'mood', mood:6, nrg:6, prod:7, xp:20 },
      { d:11, t:'act',  cat:'Study',    desc:'System design — caching tradeoffs',dur:60,  xp:48, well:'Finally understood cache invalidation' },
      { d:10, t:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:10, t:'act',  cat:'Workout',  desc:'HIIT session',                     dur:30,  xp:38 },
      { d:10, h:10, t:'act', cat:'Devotion', desc:'Morning devotion — Proverbs 3', dur:20, xp:28, rev:'Trust in the Lord with all your heart' },
      { d:9,  t:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:9,  t:'act',  cat:'Coding',   desc:'Refactored database layer',         dur:80,  xp:60 },
      { d:9,  h:14, t:'dungeon', cat:'Workout', desc:"E-Rank Gate: Hunter's Run", dur:30,  xp:45 },
      { d:8,  t:'mood', mood:8, nrg:8, prod:8, xp:20 },
      { d:8,  t:'act',  cat:'Reading',  desc:'Atomic Habits ch 9–12',             dur:45,  xp:42 },
      { d:7,  t:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:7,  t:'act',  cat:'Workout',  desc:'Gym — full body',                   dur:60,  xp:62, well:'New PB on bench press' },
      { d:6,  t:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:6,  t:'act',  cat:'Journal',  desc:'Weekly reflection',                 dur:25,  xp:32, rev:"Stop saying 'I'll try' — say 'I will'" },
      { d:5,  t:'mood', mood:8, nrg:8, prod:9, xp:20 },
      { d:5,  t:'act',  cat:'Coding',   desc:'New feature shipped',               dur:120, xp:78, well:'Deployed cleanly on first attempt' },
      { d:4,  t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:4,  t:'act',  cat:'Study',    desc:'Algorithm prep — trees and graphs', dur:60,  xp:48 },
      // day 3: no log (gap for streak testing)
      { d:2,  t:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:2,  t:'act',  cat:'Workout',  desc:'Sprint intervals',                  dur:35,  xp:40 },
      { d:2,  h:11, t:'quest', cat:'Coding', desc:'Log: Coding',                  xp:30   },
      { d:1,  t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:1,  t:'act',  cat:'Admin',    desc:'Weekly planning session',            dur:30,  xp:28 },
    ];

    for (const e of entries) {
      const date = dDate(e.d);
      const tstr = dTs(e.d, e.h ?? (e.t === 'mood' ? 8 : 9));
      if (e.t === 'mood') {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             mood_rating,energy_rating,productivity_rating,categories,xp_awarded,what_went_well,what_to_improve)
           VALUES ('','','daily','mood',?,?,?,?,?,'[]',?,?,?)`,
          date, tstr, e.mood??7, e.nrg??7, e.prod??7, e.xp, e.well??null, e.rev??null,
        );
      } else {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             categories,duration_mins,xp_awarded,mood_rating,what_went_well,what_to_improve)
           VALUES (?,?,'daily',?,?,?,?,?,?,0,?,?)`,
          e.cat??'', e.desc??'', e.t, date, tstr,
          JSON.stringify([e.cat??'']), e.dur??null, e.xp, e.well??null, e.rev??null,
        );
      }
    }

    // ── 2. Dungeon runs — Hunter's Run on cooldown (12h ago), rest cleared ───
    db.execSync(`DELETE FROM dungeon_runs`);
    const huntersRunId = db.getFirstSync<{ id: number }>(
      `SELECT id FROM dungeons WHERE name = "Hunter's Run" LIMIT 1`,
    )?.id ?? db.getFirstSync<{ id: number }>('SELECT id FROM dungeons LIMIT 1')?.id;
    if (huntersRunId) {
      const t12h = ts(new Date(Date.now() - 43200000)); // 12 hours ago
      db.runSync(
        `INSERT INTO dungeon_runs (dungeon_id, started_at, completed_at, status, result, coins_earned, hp_change)
         VALUES (?, ?, ?, 'completed', 'win', 25, 0)`,
        huntersRunId, t12h, t12h,
      );
    }

    // ── 3. Active buffs — refresh expiry to 2 hours from now ─────────────────
    db.execSync(`DELETE FROM active_buffs`);
    db.runSync(
      `INSERT INTO active_buffs (item_id, stat_key, stat_value, expires_at, item_name)
       VALUES (0, 'foc', 5, ?, 'Focus Draught')`,
      ts(new Date(Date.now() + 7200000)),
    );

    // ── 4. Quest accepted_at — refresh to yesterday so it looks recent ────────
    db.runSync(
      `UPDATE quests SET accepted_at = ? WHERE status = 'accepted'`,
      yesterday + ' 08:00:00',
    );

    // ── 5. RPG state ──────────────────────────────────────────────────────────
    // Max-display values for GlobalCurrencyBar layout testing:
    //   coins=100900 → "100.9k"  gems=1000 → "1.0k"
    //   blight=9900  → "9.9k"    vigor=9900 → "9.9k"
    //   spendable_xp=999900 → "999.9k"
    db.runSync(
      `UPDATE rpg_state SET
         current_level=3, total_xp=995, xp_to_next_level=1000,
         streak_days=7, last_active_date=?,
         coins=100900, gems=1000, ap=5,
         hp=35, hp_max=100, mp=40,
         self_destruct_count=9900, vigor=9900,
         current_mood='driven', death_acknowledged=0,
         total_xp_earned=999900, spendable_xp=999900
       WHERE id=1`,
      yesterday,
    );

    // ── 6. Health state ───────────────────────────────────────────────────────
    // All at 100 → max 3-char display ("100") for each health chip
    db.runSync(
      `UPDATE health_state SET
         emotional=100, physical=100, mental=100,
         last_updated=?, last_any_log=?, health_critical=0
       WHERE id=1`,
      ts(new Date()), yesterday,
    );

    db.execSync('PRAGMA user_version = 23');
  }

  if (version < 24) {
    // Re-apply max-display seed values (v23 may already be set on device)
    db.runSync(
      `UPDATE rpg_state SET
         coins=100900, gems=1000,
         self_destruct_count=9900, vigor=9900,
         total_xp_earned=999900, spendable_xp=999900
       WHERE id=1`,
    );
    db.runSync(
      `UPDATE health_state SET emotional=100, physical=100, mental=100 WHERE id=1`,
    );
    db.execSync('PRAGMA user_version = 24');
  }

  if (version < 25) {
    const z   = (n: number) => String(n).padStart(2, '0');
    const ts  = (d: Date)   => `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:00`;
    const dDate = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; };
    const dTs   = (n: number, h = 9) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return ts(d); };
    const yesterday = dDate(1);

    // ── 1. All gates open ────────────────────────────────────────────────────
    db.execSync(`DELETE FROM dungeon_runs`);

    // ── 2. Fresh activity logs — 14 days ─────────────────────────────────────
    db.execSync(`DELETE FROM activity_logs`);
    type E25 = { d: number; h?: number; t: 'mood'|'act'|'dungeon'|'quest';
                 cat?: string; desc?: string; dur?: number;
                 mood?: number; nrg?: number; prod?: number;
                 xp: number; well?: string; rev?: string };
    const entries25: E25[] = [
      { d:14, t:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:14, t:'act',  cat:'Workout',  desc:'Morning run 5km',                   dur:45,  xp:52 },
      { d:13, t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:13, t:'act',  cat:'Coding',   desc:'Personal project sprint',            dur:90,  xp:65, rev:'Break large features into small commits' },
      { d:12, t:'mood', mood:6, nrg:6, prod:7, xp:20 },
      { d:12, t:'act',  cat:'Study',    desc:'System design — caching tradeoffs',  dur:60,  xp:48, well:'Understood cache invalidation' },
      { d:11, t:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:11, t:'act',  cat:'Workout',  desc:'HIIT session',                       dur:30,  xp:38 },
      { d:11, h:10, t:'act', cat:'Devotion', desc:'Morning devotion',              dur:20,  xp:28 },
      { d:10, t:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:10, t:'act',  cat:'Coding',   desc:'Refactored db layer',                dur:80,  xp:60 },
      { d:10, h:14, t:'dungeon', cat:'Workout', desc:"E-Rank Gate: Hunter's Run",  dur:30,  xp:45 },
      { d:9,  t:'mood', mood:8, nrg:8, prod:8, xp:20 },
      { d:9,  t:'act',  cat:'Reading',  desc:'Atomic Habits ch 9–12',              dur:45,  xp:42 },
      { d:8,  t:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:8,  t:'act',  cat:'Workout',  desc:'Gym — full body',                    dur:60,  xp:62, well:'New PB on bench press' },
      { d:7,  t:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:7,  t:'act',  cat:'Journal',  desc:'Weekly reflection',                  dur:25,  xp:32, rev:"Stop saying 'I'll try' — say 'I will'" },
      { d:6,  t:'mood', mood:8, nrg:8, prod:9, xp:20 },
      { d:6,  t:'act',  cat:'Coding',   desc:'New feature shipped',                dur:120, xp:78, well:'Deployed cleanly first attempt' },
      { d:5,  t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:5,  t:'act',  cat:'Study',    desc:'Algorithm prep — trees and graphs',  dur:60,  xp:48 },
      // day 4: gap for streak-break testing
      { d:3,  t:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:3,  t:'act',  cat:'Workout',  desc:'Sprint intervals',                   dur:35,  xp:40 },
      { d:3,  h:11, t:'quest', cat:'Coding', desc:'Log: Coding',                   xp:30   },
      { d:2,  t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:2,  t:'act',  cat:'Devotion', desc:'Bible study — Proverbs 3',           dur:25,  xp:30, rev:'Trust in the Lord with all your heart' },
      { d:1,  t:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:1,  t:'act',  cat:'Admin',    desc:'Weekly planning session',            dur:30,  xp:28 },
    ];
    for (const e of entries25) {
      const date = dDate(e.d);
      const tstr = dTs(e.d, e.h ?? (e.t === 'mood' ? 8 : 9));
      if (e.t === 'mood') {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             mood_rating,energy_rating,productivity_rating,categories,xp_awarded,what_went_well,what_to_improve)
           VALUES ('','','daily','mood',?,?,?,?,?,'[]',?,?,?)`,
          date, tstr, e.mood??7, e.nrg??7, e.prod??7, e.xp, e.well??null, e.rev??null,
        );
      } else {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             categories,duration_mins,xp_awarded,mood_rating,what_went_well,what_to_improve)
           VALUES (?,?,'daily',?,?,?,?,?,?,0,?,?)`,
          e.cat??'', e.desc??'', e.t, date, tstr,
          JSON.stringify([e.cat??'']), e.dur??null, e.xp, e.well??null, e.rev??null,
        );
      }
    }

    // ── 3. Hunter's Run on 12h cooldown, all other gates open ────────────────
    const huntersId = db.getFirstSync<{id:number}>(`SELECT id FROM dungeons WHERE name="Hunter's Run" LIMIT 1`)?.id;
    if (huntersId) {
      const t12h = ts(new Date(Date.now() - 43200000));
      db.runSync(
        `INSERT INTO dungeon_runs (dungeon_id, started_at, completed_at, status, result, coins_earned, hp_change)
         VALUES (?, ?, ?, 'completed', 'win', 25, 0)`,
        huntersId, t12h, t12h,
      );
    }

    // ── 4. Quests: all four statuses covered ─────────────────────────────────
    db.execSync(`DELETE FROM quests`);
    db.execSync(`DELETE FROM quest_completions`);
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',30,'pending')`,
      'Log: Workout', "You haven't worked out recently. Complete a workout session.", 'Workout');
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status,accepted_at) VALUES (?,?,?,'weekly',30,'accepted',?)`,
      'Log: Reading', 'Keep the reading habit alive. Log a reading session.', 'Reading', yesterday + ' 08:00:00');
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',25,'completed')`,
      'Log: Coding', 'Keep the coding habit going.', 'Coding');
    const cqId25 = db.getFirstSync<{id:number}>(`SELECT id FROM quests WHERE status='completed' LIMIT 1`)?.id;
    if (cqId25) db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?,25)`, cqId25);
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',25,'skipped')`,
      'Log: Journal', 'Complete a journal session.', 'Journal');

    // ── 5. Active buff expires in 2 hours ────────────────────────────────────
    db.execSync(`DELETE FROM active_buffs`);
    db.runSync(
      `INSERT INTO active_buffs (item_id, stat_key, stat_value, expires_at, item_name) VALUES (0, 'foc', 5, ?, 'Focus Draught')`,
      ts(new Date(Date.now() + 7200000)),
    );

    // ── 6. RPG state ──────────────────────────────────────────────────────────
    //   Level 3, 490/500 XP  → one log away from level-up
    //   coins=250  gems=5  ap=5
    //   HP=35/100  → near-death zone
    //   blight=3  vigor=8  → anima=+5  (gem reward active)
    db.runSync(
      `UPDATE rpg_state SET
         current_level=3, total_xp=490, xp_to_next_level=500,
         streak_days=7, last_active_date=?,
         coins=250, gems=5, ap=5,
         hp=35, hp_max=100, mp=40,
         self_destruct_count=3, vigor=8,
         current_mood='driven', death_acknowledged=0,
         spendable_xp=490, total_xp_earned=1800
       WHERE id=1`,
      yesterday,
    );

    // ── 7. Health bars: three different tiers ─────────────────────────────────
    //   Emotional=45 (Worn), Physical=12 (Critical), Mental=68 (Stable)
    db.runSync(
      `UPDATE health_state SET
         emotional=45, physical=12, mental=68,
         last_updated=?, last_any_log=?, health_critical=0
       WHERE id=1`,
      ts(new Date()), yesterday,
    );

    db.execSync('PRAGMA user_version = 25');
  }

  if (version < 26) {
    db.runSync(
      `UPDATE rpg_state SET coins=99999, gems=999, self_destruct_count=250, vigor=29 WHERE id=1`,
    );
    db.execSync('PRAGMA user_version = 26');
  }
}

function seedRealisticData() {
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

function runMigration20(): void {
  const v20 = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (v20 >= 20) return;
  // ── Full test reseed: clears and rebuilds all dynamic tables ──────────────

    // Clear cooldowns so every dungeon gate is available
    db.execSync(`DELETE FROM dungeon_runs`);

    // Clear and reseed game inventory
    db.execSync(`DELETE FROM inventory WHERE category = 'game'`);

    // Equipment: 2 items per slot for top/gloves/sword (to test equip swap), 1 elsewhere
    const eqV20: [string, string, string, string, string, number][] = [
      // slot, name, rarity, buff, desc, is_equipped
      ['top',       'Shadow Monarch\'s Cowl', 'S',  'wis:5', 'Woven from shadow essence. Exclusive to S-rank clearances.', 1],
      ['top',       'Ancient Hood',           'D',  'wis:1', 'A worn hood from a long-forgotten dungeon runner. D-rank drop.', 0],
      ['gloves',    'Iron Grips',             'B',  'str:2', 'Double-layered iron. Found in B-rank gates and above.', 1],
      ['gloves',    'Worn Gloves',            'E',  'str:1', 'Basic protection. Common E-rank drop.', 0],
      ['pants',     'Shadow Leggings',        'C',  'agi:2', 'Lightweight dungeon legwear. C-rank find.', 1],
      ['pants',     'Rough Trousers',         'E',  'agi:1', 'Standard field trousers. Common.', 0],
      ['shoes',     'Tracker Boots',          'D',  'agi:1', 'Worn but reliable. Standard low-rank entry gear.', 1],
      ['ring',      'Focus Band',             'B',  'foc:2', 'A simple band imbued with mana. B-rank drop.', 1],
      ['ring',      'Copper Ring',            'E',  'foc:1', 'A plain ring. Common drop.', 0],
      ['goblet',    'Chalice of Eternity',    'SS', 'spr:5', 'Ancient ceremonial goblet. SS-rank find.', 1],
      ['coat',      'Hunter\'s Coat',         'A',  'spr:3', 'Standard A-rank hunter issue. Resists mana fluctuations.', 1],
      ['necklace',  'Pendulum Necklace',      'A',  'per:3', 'Vibrates near high-density mana pockets.', 1],
      ['bracelet',  'Shadow Brace',           'C',  'sta:1', 'Flexible shadow-thread weave. C-rank loot.', 1],
      ['armour_set','Iron Shell Set',         'D',  'str:2', 'Full plate set. Effective at ranks E–D.', 1],
    ];
    for (const [slot, nm, rar, buff, desc, eq] of eqV20) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description, is_equipped)
         VALUES (?, 'equipment', 'game', ?, ?, ?, ?, ?)`,
        nm, slot, rar, buff, desc, eq,
      );
    }

    // Weapons: sword has 2 items for swap test
    const wpV20: [string, string, string, string, string, number][] = [
      ['sword',    'Sovereign Blade',  'A', 'str:4', 'Forged in the style of the Shadow Monarch\'s generals. Hums near gates.', 1],
      ['sword',    'Basic Longsword',  'E', 'str:1', 'A plain steel sword. Common starting weapon.', 0],
      ['grimoire', 'Torn Grimoire',    'B', 'wis:3', 'Pages missing. Still holds residual power from its mage.', 1],
      ['dagger',   'Phantom Dagger',   'C', 'agi:2', 'Fast and silent. Staple for perception hunters.', 1],
      ['shield',   'Iron Buckler',     'D', 'str:1', 'Basic defensive tool. Required for E-rank team leaders.', 1],
      ['scepter',  'Gnarled Rod',      'E', 'spr:1', 'A crude mana channel. Found near collapsed altars.', 1],
    ];
    for (const [slot, nm, rar, buff, desc, eq] of wpV20) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description, is_equipped)
         VALUES (?, 'equipment', 'game', ?, ?, ?, ?, ?)`,
        nm, slot, rar, buff, desc, eq,
      );
    }

    // Catalysts: one per stat
    const catV20: [string, string, string][] = [
      ['Strength Crystal', 'str', 'Permanently boosts STR. Rare dungeon drop.'],
      ['Agility Shard',    'agi', 'Permanently boosts AGI. Dropped by shadow-type monsters.'],
      ['Focus Lens',       'foc', 'Permanently boosts FOC. Found in Study-type dungeons.'],
      ['Wisdom Rune',      'wis', 'Permanently boosts WIS. Cannot be replicated.'],
      ['Spirit Bead',      'spr', 'Contains a fragment of a dissolved dungeon boss.'],
      ['Perception Orb',   'per', 'Condenses the essence of observation. Rare E-rank find.'],
      ['Stamina Core',     'sta', 'Extracted from high-endurance dungeon creatures.'],
    ];
    for (const [nm, stat, desc] of catV20) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description)
         VALUES (?, 'catalyst', 'game', ?, 'E', ?, ?)`,
        nm, `catalyst_${stat}`, `${stat.toUpperCase()}:3`, desc,
      );
    }

    // Consumables: mix of rarities and stats, multiple per stat to test flat list
    const conV20: [string, string, string, string][] = [
      ['Agility Serum',   'agi', 'B', 'Extracted from shadow beasts. +5 AGI for 1 hour.'],
      ['Focus Draught',   'foc', 'C', 'Clarity agent used before intel dungeon runs.'],
      ['Strength Tonic',  'str', 'D', 'Brewed from dungeon moss. +5 STR for 1 hour.'],
      ['Stamina Brew',    'sta', 'D', 'Dense nutritive compound. +5 STA for 1 hour.'],
      ['Wisdom Elixir',   'wis', 'C', 'Distilled knowledge essence. +5 WIS for 1 hour.'],
      ['Spirit Tonic',    'spr', 'E', 'Common restorative. +5 SPR for 1 hour.'],
      ['Power Potion',    'str', 'E', 'Crude strength potion. Basic gate supply. +5 STR for 1 hour.'],
      ['Clarity Flask',   'foc', 'E', 'A basic mental tonic. +5 FOC for 1 hour.'],
    ];
    for (const [nm, stat, rar, desc] of conV20) {
      db.runSync(
        `INSERT INTO inventory (item_name, item_type, category, slot_type, rarity, stat_buff, description, quantity)
         VALUES (?, 'consumable', 'game', ?, ?, ?, ?, 3)`,
        nm, `consumable_${stat}`, rar, `${stat.toUpperCase()}:5`, desc,
      );
    }

    // Active buff: one currently active (expires in 2 hours) to test Buffs section in Stats
    const expIn2h = new Date(Date.now() + 7200000);
    const fmtExpiry = (d: Date) => {
      const z = (n: number) => String(n).padStart(2,'0');
      return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:00`;
    };
    // Find a consumable to link the buff to (or use id=0 fallback — LEFT JOIN handles missing)
    db.runSync(`DELETE FROM active_buffs`);
    db.runSync(
      `INSERT INTO active_buffs (item_id, stat_key, stat_value, expires_at, item_name) VALUES (0, 'foc', 5, ?, 'Focus Draught')`,
      fmtExpiry(expIn2h),
    );

    // Clear and reseed quests
    db.execSync(`DELETE FROM quests`);
    db.execSync(`DELETE FROM quest_completions`);
    const now2 = new Date();
    const today2 = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}-${String(now2.getDate()).padStart(2,'0')}`;
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',30,'pending')`,
      'Log: Workout', 'You haven\'t worked out recently. Complete a workout session.', 'Workout');
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status,accepted_at) VALUES (?,?,?,'weekly',30,'accepted',?)`,
      'Log: Reading', 'Keep the reading habit alive. Log a reading session.', 'Reading', today2 + ' 08:00:00');
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',25,'completed')`,
      'Log: Coding', 'Keep the coding habit going. Log a coding session.', 'Coding');
    const cqid = db.getFirstSync<{id:number}>(`SELECT id FROM quests WHERE status='completed' LIMIT 1`)?.id;
    if (cqid) db.runSync(`INSERT INTO quest_completions (quest_id, coins_earned) VALUES (?,25)`, cqid);
    db.runSync(`INSERT INTO quests (title,description,category,quest_type,coin_reward,status) VALUES (?,?,?,'weekly',25,'skipped')`,
      'Log: Journal', 'Complete a journal session.', 'Journal');

    // Clear and reseed activity logs (14 days) — enough for charts + activity effects
    db.execSync(`DELETE FROM activity_logs`);
    const nowR = new Date();
    const dateR = (daysAgo: number) => {
      const d = new Date(nowR.getFullYear(), nowR.getMonth(), nowR.getDate() - daysAgo);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };
    const tsR = (daysAgo: number, hour = 8) => {
      const d = new Date(nowR.getFullYear(), nowR.getMonth(), nowR.getDate() - daysAgo, hour, 0, 0);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:00:00`;
    };

    type LogEntry = { d: number; h?: number; type: 'mood'|'act'|'dungeon'|'quest';
      cat?: string; desc?: string; dur?: number; mood?: number; nrg?: number; prod?: number;
      xp: number; well?: string; rev?: string };

    const logs: LogEntry[] = [
      // Day 14 — workout + mood
      { d:14, type:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:14, type:'act',  cat:'Workout', desc:'Morning run 5km',       dur:45,  xp:52 },
      // Day 13 — coding session
      { d:13, type:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:13, type:'act',  cat:'Coding',  desc:'Personal project sprint',dur:90,  xp:65, rev:'Break large features into small commits' },
      // Day 12 — study
      { d:12, type:'mood', mood:6, nrg:6, prod:7, xp:20 },
      { d:12, type:'act',  cat:'Study',   desc:'System design review',   dur:60,  xp:48, well:'Understood caching tradeoffs' },
      // Day 11 — no log
      // Day 10 — devotion + workout
      { d:10, type:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:10, type:'act',  cat:'Workout', desc:'HIIT session',           dur:30,  xp:38 },
      { d:10, h:10, type:'act', cat:'Devotion', desc:'Morning devotion', dur:20,  xp:28 },
      // Day 9 — coding + dungeon
      { d:9,  type:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:9,  type:'act',  cat:'Coding',  desc:'Refactored db layer',    dur:80,  xp:60 },
      { d:9,  h:14, type:'dungeon', cat:'Workout', desc:'E-Rank Gate: Hunter\'s Run', dur:30, xp:45 },
      // Day 8 — reading
      { d:8,  type:'mood', mood:8, nrg:8, prod:8, xp:20 },
      { d:8,  type:'act',  cat:'Reading', desc:'Atomic Habits ch 9-12',  dur:45,  xp:42 },
      // Day 7 — workout
      { d:7,  type:'mood', mood:7, nrg:7, prod:7, xp:20 },
      { d:7,  type:'act',  cat:'Workout', desc:'Gym — full body',        dur:60,  xp:62 },
      // Day 6 — journal
      { d:6,  type:'mood', mood:6, nrg:6, prod:6, xp:20 },
      { d:6,  type:'act',  cat:'Journal', desc:'Weekly reflection',      dur:25,  xp:32, rev:'Stop saying "I\'ll try" — say "I will"' },
      // Day 5 — coding
      { d:5,  type:'mood', mood:8, nrg:8, prod:9, xp:20 },
      { d:5,  type:'act',  cat:'Coding',  desc:'New feature shipped',    dur:120, xp:78, well:'Feature deployed cleanly' },
      // Day 4 — study
      { d:4,  type:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:4,  type:'act',  cat:'Study',   desc:'Algorithm prep',         dur:60,  xp:48 },
      // Day 3 — no log
      // Day 2 — workout + quest complete
      { d:2,  type:'mood', mood:7, nrg:8, prod:8, xp:20 },
      { d:2,  type:'act',  cat:'Workout', desc:'Sprint intervals',       dur:35,  xp:40 },
      { d:2,  h:11, type:'quest', cat:'Coding', desc:'Log: Coding', xp:30 },
      // Day 1 — admin
      { d:1,  type:'mood', mood:7, nrg:7, prod:8, xp:20 },
      { d:1,  type:'act',  cat:'Admin',   desc:'Weekly planning session',dur:30,  xp:28 },
      // Today
      { d:0,  type:'mood', mood:8, nrg:8, prod:8, xp:20 },
      { d:0,  type:'act',  cat:'Workout', desc:'Morning run',            dur:40,  xp:45 },
    ];

    for (const e of logs) {
      const date = dateR(e.d);
      const ts   = tsR(e.d, e.h ?? (e.type === 'mood' ? 8 : 9));
      if (e.type === 'mood') {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             mood_rating,energy_rating,productivity_rating,categories,xp_awarded,what_went_well,what_to_improve)
           VALUES ('','','daily','mood',?,?,?,?,?,'[]',?,?,?)`,
          date, ts, e.mood??7, e.nrg??7, e.prod??7, e.xp, e.well??null, e.rev??null,
        );
      } else {
        db.runSync(
          `INSERT INTO activity_logs (category,description,log_type,entry_type,log_date,created_at,
             categories,duration_mins,xp_awarded,mood_rating,what_went_well,what_to_improve)
           VALUES (?,?,'daily',?,?,?,?,?,?,0,?,?)`,
          e.cat??'', e.desc??'', e.type, date, ts,
          JSON.stringify([e.cat??'']), e.dur??null, e.xp, e.well??null, e.rev??null,
        );
      }
    }

    // RPG state: level 3, 490/500 XP (10 away from level-up), 5 AP, 250 coins, 5 gems
    // HP: 35/100 (low — easy to test HP death)
    // Self-destruct: 3 blight, 8 vigor (anima = +5, gem active)
    db.runSync(
      `UPDATE rpg_state SET
         current_level=3, total_xp=490, xp_to_next_level=500,
         streak_days=7, last_active_date=date('now','localtime'),
         coins=250, gems=5, ap=5,
         hp=35, hp_max=100, mp=40,
         self_destruct_count=3, vigor=8,
         current_mood='driven', death_acknowledged=0
       WHERE id=1`,
    );

    // Health bars: varied levels to test different tiers
    // Emotional=45 (Worn, −5% XP), Physical=12 (Critical, −35% XP), Mental=68 (Stable)
    db.runSync(
      `UPDATE health_state SET emotional=45, physical=12, mental=68,
         last_updated=datetime('now','localtime'), health_critical=0 WHERE id=1`,
    );

    db.execSync('PRAGMA user_version = 20');
}

// ─── Auto-init: called AFTER all constants are defined ────────────────────────
initDB();
