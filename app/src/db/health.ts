import { db } from './schema';
import { triggerDeathCheck } from './deathCheckSignal';
import { sqlNow } from '../utils/date';
import { triggerCurrencyRefresh } from './currencySignal';

export type HealthState = {
  emotional: number;
  physical: number;
  mental: number;
  last_updated: string;
  last_physical_log: string | null;
  last_recreational_log: string | null;
  last_any_log: string | null;
  health_critical: number;
};

export type RestorativeActivity = {
  id: number;
  name: string;
  description: string | null;
  xp_cost: number;
  emotional_restore: number;
  physical_restore: number;
  mental_restore: number;
  is_default: number;
};

// ─── Decay rates (% per day) ─────────────────────────────────────────────────
// Active day = any activity log exists for the day (bible logs excluded).
// Active days are more taxing — higher decay requires deliberate recharge.
const ACTIVE_DECAY   = 30;
const INACTIVE_DECAY = 20;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return (Date.now() - new Date(dateStr).getTime()) / 86400000;
}

const FULL_HEALTH: HealthState = {
  emotional: 100, physical: 100, mental: 100,
  last_updated: new Date().toISOString(),
  last_physical_log: null, last_recreational_log: null, last_any_log: null,
  health_critical: 0,
};

export function getHealthState(): HealthState {
  try {
    return db.getFirstSync<HealthState>('SELECT * FROM health_state WHERE id = 1') ?? FULL_HEALTH;
  } catch {
    return FULL_HEALTH;
  }
}

export function getRestorativeActivities(): RestorativeActivity[] {
  return db.getAllSync<RestorativeActivity>(
    'SELECT * FROM restorative_activities ORDER BY is_default DESC, xp_cost ASC',
  );
}

export function addRestorativeActivity(
  name: string, description: string,
  xpCost: number, emotional: number, physical: number, mental: number,
): void {
  db.runSync(
    `INSERT INTO restorative_activities (name, description, xp_cost, emotional_restore, physical_restore, mental_restore)
     VALUES (?, ?, ?, ?, ?, ?)`,
    name.trim(), description.trim() || null, xpCost, emotional, physical, mental,
  );
}

export function applyHealthDecay(): void { try { _applyHealthDecay(); } catch {} }
function _applyHealthDecay(): void {
  const h = getHealthState();
  const now = new Date();
  const daysPassed = Math.min(
    (now.getTime() - new Date(h.last_updated).getTime()) / 86400000,
    30, // cap at 30 days max penalty
  );
  if (daysPassed < 0.042) return; // skip if < ~1 hour

  const inactive = daysSince(h.last_any_log) >= 1;
  const decayRate = inactive ? INACTIVE_DECAY : ACTIVE_DECAY;
  const emotionalDecay = decayRate * daysPassed;
  const physicalDecay  = decayRate * daysPassed;
  const mentalDecay    = decayRate * daysPassed;

  const emotional = Math.max(0, h.emotional - emotionalDecay);
  const physical  = Math.max(0, h.physical  - physicalDecay);
  const mental    = Math.max(0, h.mental    - mentalDecay);

  const wasCritical = h.health_critical === 1; // state BEFORE this decay
  const critical = (emotional === 0 || physical === 0 || mental === 0) ? 1 : 0;

  db.runSync(
    `UPDATE health_state SET emotional=?, physical=?, mental=?, last_updated=?, health_critical=? WHERE id=1`,
    emotional, physical, mental, sqlNow(), critical,
  );

  // HP restoration/depletion based on minimum health level
  const minHealth = Math.min(emotional, physical, mental);
  if (minHealth < 30) {
    const penalty = minHealth < 10 ? -10 : minHealth < 20 ? -5 : -2;
    db.runSync(`UPDATE rpg_state SET hp = MAX(0, hp + ?) WHERE id = 1`, Math.floor(penalty * daysPassed));
  } else if (minHealth >= 50) {
    const restore = minHealth >= 70 ? 5 : 2;
    db.runSync(`UPDATE rpg_state SET hp = MIN(hp_max, hp + ?) WHERE id = 1`, Math.floor(restore * daysPassed));
  }

  triggerCurrencyRefresh();
  // Trigger death check only when a bar first reaches 0 (wasn't already critical)
  if (critical && !wasCritical) {
    try { triggerDeathCheck(); } catch {}
  }
}

export function applyLoggingHealthBoost(
  isPhysical: boolean, isRecreational: boolean, today: string,
): void { try { _applyLoggingHealthBoost(isPhysical, isRecreational, today); } catch {} }
function _applyLoggingHealthBoost(
  isPhysical: boolean, isRecreational: boolean, today: string,
): void {
  const h = getHealthState();
  const physical  = isPhysical     ? Math.min(100, h.physical  + 5) : h.physical;
  const mental    = isRecreational ? Math.min(100, h.mental    + 5) : h.mental;

  db.runSync(
    `UPDATE health_state SET
       physical = ?,
       mental = ?,
       last_any_log = ?,
       last_physical_log = CASE WHEN ? = 1 THEN ? ELSE last_physical_log END,
       last_recreational_log = CASE WHEN ? = 1 THEN ? ELSE last_recreational_log END
     WHERE id = 1`,
    physical, mental,
    today,
    isPhysical ? 1 : 0, today,
    isRecreational ? 1 : 0, today,
  );
  triggerCurrencyRefresh();
}

export function purchaseRestoration(
  activityId: number,
): 'ok' | 'insufficient_xp' | 'not_found' | 'death_state' {
  // Block restoration when a health bar is at 0 — revival quest required first
  const h = getHealthState();
  if (h.emotional <= 0 || h.physical <= 0 || h.mental <= 0) return 'death_state';

  const activity = db.getFirstSync<RestorativeActivity>(
    'SELECT * FROM restorative_activities WHERE id = ?', activityId,
  );
  if (!activity) return 'not_found';

  const rpg = db.getFirstSync<{ spendable_xp: number }>(
    'SELECT COALESCE(spendable_xp, total_xp) AS spendable_xp FROM rpg_state WHERE id = 1',
  )!;
  if (rpg.spendable_xp < activity.xp_cost) return 'insufficient_xp';

  db.runSync(
    `UPDATE health_state SET
       emotional = MIN(100, emotional + ?),
       physical  = MIN(100, physical  + ?),
       mental    = MIN(100, mental    + ?),
       health_critical = 0
     WHERE id = 1`,
    activity.emotional_restore, activity.physical_restore, activity.mental_restore,
  );

  db.runSync(
    'UPDATE rpg_state SET spendable_xp = COALESCE(spendable_xp, 0) - ? WHERE id = 1',
    activity.xp_cost,
  );

  triggerCurrencyRefresh();
  return 'ok';
}

// Tier boundaries must match getHealthTier() exactly
export function getHealthXPMultiplier(): number {
  const h = getHealthState();
  const min = Math.min(h.emotional, h.physical, h.mental);
  if (min <= 0)  return 0.93;
  if (min < 10)  return 0.94;
  if (min < 20)  return 0.95;
  if (min < 30)  return 0.96;
  if (min < 50)  return 0.98;
  if (min < 70)  return 1.01;
  if (min < 90)  return 1.02;
  return 1.03;
}

export type HealthTier = { label: string; xpMult: string; hpEffect: string };

export function getHealthTier(minHealth: number): HealthTier {
  if (minHealth <= 0)  return { label: 'Depleted', xpMult: '0.93×', hpEffect: '−20 HP/day' };
  if (minHealth < 10)  return { label: 'Critical',  xpMult: '0.94×', hpEffect: '−10 HP/day' };
  if (minHealth < 20)  return { label: 'Danger',    xpMult: '0.95×', hpEffect: '−5 HP/day'  };
  if (minHealth < 30)  return { label: 'Weakened',  xpMult: '0.96×', hpEffect: '−2 HP/day'  };
  if (minHealth < 50)  return { label: 'Worn',      xpMult: '0.98×', hpEffect: 'Neutral'     };
  if (minHealth < 70)  return { label: 'Stable',    xpMult: '1.01×', hpEffect: '+2 HP/day'   };
  if (minHealth < 90)  return { label: 'Strong',    xpMult: '1.02×', hpEffect: '+5 HP/day'   };
  return                      { label: 'Peak',      xpMult: '1.03×', hpEffect: '+5 HP/day'   };
}

// Called on each mood log submission — mood/energy/productivity shift the health bars
export function applyMoodHealthEffects(mood: number, energy: number, productivity: number): void {
  try {
    // Emotional: driven by mood
    const emotionalDelta = mood < 5 ? -5 : mood >= 8 ? 4 : 2;
    // Physical: driven by energy
    const physicalDelta  = energy < 5 ? -5 : energy >= 8 ? 4 : 2;
    // Mental: mood + productivity (overworking above 7 hurts mental)
    const mentalFromMood = mood < 5 ? -2 : 2;
    const mentalFromProd = productivity > 7 ? -3 : productivity >= 5 ? 3 : -4;
    const mentalDelta    = mentalFromMood + mentalFromProd;
    db.runSync(
      `UPDATE health_state SET
         emotional = MAX(0, MIN(100, emotional + ?)),
         physical  = MAX(0, MIN(100, physical  + ?)),
         mental    = MAX(0, MIN(100, mental    + ?))
       WHERE id = 1`,
      emotionalDelta, physicalDelta, mentalDelta,
    );
  } catch {}
}

