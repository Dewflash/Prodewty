import { db } from './schema';
import { sqlNow } from '../utils/date';

export type Bounty = {
  id: number;
  villager_type: string;
  required_item_id: string;
  required_quantity: number;
  reward_coins: number;
  status: 'active' | 'completed';
  created_at: string;
};

// Generate a random bounty (this would typically be called daily)
export function generateBounty(villagerType: string, itemId: string, quantity: number, reward: number): boolean {
  try {
    db.runSync(
      `INSERT INTO bounties (villager_type, required_item_id, required_quantity, reward_coins, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      villagerType, itemId, quantity, reward, sqlNow()
    );
    return true;
  } catch (e) {
    console.warn('Failed to generate bounty', e);
    return false;
  }
}

// Fulfill an active bounty
export function fulfillBounty(bountyId: number): 'ok' | 'no_bounty' | 'no_items' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const bounty = db.getFirstSync<Bounty>(
      'SELECT * FROM bounties WHERE id = ? AND status = "active"',
      bountyId
    );

    if (!bounty) {
      db.execSync('ROLLBACK');
      return 'no_bounty';
    }

    const inventoryCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ? LIMIT 1',
      bounty.required_item_id, bounty.required_quantity
    );

    if (!inventoryCheck) {
      db.execSync('ROLLBACK');
      return 'no_items';
    }

    // Deduct items
    db.runSync(
      'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?',
      bounty.required_quantity, bounty.required_item_id
    );

    // Reward player
    db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', bounty.reward_coins);

    // Mark bounty complete
    db.runSync('UPDATE bounties SET status = "completed" WHERE id = ?', bounty.id);

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to fulfill bounty', e);
    return 'db_error';
  }
}
