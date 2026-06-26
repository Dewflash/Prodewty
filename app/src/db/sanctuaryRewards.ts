import { db } from './schema';
import { sqlNow } from '../utils/date';
import { recordRpgDiscovery } from './rpgDiscovery';

export type SanctuaryRewardDrop = {
  itemId: string;
  quantity: number;
};

export type SanctuaryRewardClaimResult =
  | { ok: true; coins: number; drops: SanctuaryRewardDrop[] }
  | { ok: false; reason: 'already_claimed' | 'db_error' };

export function claimSanctuaryReward(
  claimKey: string,
  itemId: string,
  rewardKind: string,
  coins: number,
  drops: SanctuaryRewardDrop[],
): SanctuaryRewardClaimResult {
  try {
    db.execSync('BEGIN TRANSACTION');
    const claim = db.runSync(
      `INSERT OR IGNORE INTO sanctuary_reward_claims (claim_key, item_id, reward_kind, claimed_at)
       VALUES (?, ?, ?, ?)`,
      claimKey,
      itemId,
      rewardKind,
      sqlNow(),
    );

    if (claim.changes <= 0) {
      db.execSync('ROLLBACK');
      return { ok: false, reason: 'already_claimed' };
    }

    if (coins > 0) {
      db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', coins);
    }

    drops.forEach(drop => {
      if (drop.quantity <= 0) return;
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
        drop.itemId,
        drop.quantity,
      );
      recordRpgDiscovery(drop.itemId, 'loot');
    });

    db.execSync('COMMIT');
    return { ok: true, coins, drops };
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim sanctuary reward', e);
    return { ok: false, reason: 'db_error' };
  }
}
