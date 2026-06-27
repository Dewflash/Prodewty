import { db } from './schema';
import { getToolDef, ToolDefinition } from '../engine/ToolCatalog';
import { getRPGState } from './rpg';

export function upgradeTool(currentToolId: string, upgradeToToolId: string): 'ok' | 'no_coins' | 'no_materials' | 'db_error' {
  const currentDef = getToolDef(currentToolId);
  const nextDef = getToolDef(upgradeToToolId);

  if (!currentDef || !nextDef) return 'db_error';
  
  if (!nextDef.upgradeRequiredItemId || !nextDef.upgradeRequiredQuantity) return 'db_error';

  try {
    db.execSync('BEGIN TRANSACTION');

    const rpg = getRPGState();
    if (rpg.coins < nextDef.upgradeCostCoins) {
      db.execSync('ROLLBACK');
      return 'no_coins';
    }

    const materialCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ?',
      nextDef.upgradeRequiredItemId, nextDef.upgradeRequiredQuantity
    );

    if (!materialCheck) {
      db.execSync('ROLLBACK');
      return 'no_materials';
    }

    // Ensure they have the current tool
    const currentToolCheck = db.getFirstSync<{ quantity: number }>(
      'SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= 1',
      currentToolId
    );
    
    if (!currentToolCheck) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    // Deduct coins
    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', nextDef.upgradeCostCoins);

    // Deduct materials
    db.runSync('UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?', nextDef.upgradeRequiredQuantity, nextDef.upgradeRequiredItemId);

    // Swap tools
    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?', currentToolId);
    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
      upgradeToToolId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}
