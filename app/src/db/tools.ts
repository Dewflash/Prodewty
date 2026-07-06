import { db } from './schema';
import { getToolDef, ToolDefinition, upgradeGateFor } from '../engine/ToolCatalog';
import { getRPGState } from './rpg';
import { getMasteryLevel, getMasteryTier } from './skills';

export type UpgradeToolResult = 'ok' | 'no_coins' | 'no_materials' | 'db_error' | 'locked';

// Result of a blocked upgrade, so callers can surface the exact requirement.
export function upgradeToolLockMessage(upgradeToToolId: string): string | null {
  const nextDef = getToolDef(upgradeToToolId);
  if (!nextDef) return null;
  const gate = upgradeGateFor(nextDef);
  if (!gate) return null;
  return `Needs ${gate.skillDisplay} ${getMasteryTier(gate.minLevel)}`;
}

export function upgradeTool(currentToolId: string, upgradeToToolId: string): UpgradeToolResult {
  const currentDef = getToolDef(currentToolId);
  const nextDef = getToolDef(upgradeToToolId);

  if (!currentDef || !nextDef) return 'db_error';

  if (!nextDef.upgradeRequiredItemId || !nextDef.upgradeRequiredQuantity) return 'db_error';

  // D4 mastery gate: acquiring a Copper+ tool requires the matching mastery at
  // the gate level. Checked before any DB mutation so a blocked upgrade is a
  // clean no-op; callers show upgradeToolLockMessage() for the exact tier.
  const gate = upgradeGateFor(nextDef);
  if (gate && getMasteryLevel(gate.skill as any) < gate.minLevel) {
    return 'locked';
  }

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
