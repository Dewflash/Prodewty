import { db } from './schema';
import { getArtifactDef } from '../engine/ArtifactCatalog';
import { sqlNow } from '../utils/date';
import { addSkillPoints } from './skills';

export function donateToMuseum(itemId: string): 'ok' | 'not_artifact' | 'already_donated' | 'no_item' | 'db_error' {
  const def = getArtifactDef(itemId);
  if (!def) return 'not_artifact';

  try {
    db.execSync('BEGIN TRANSACTION');

    const inv = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= 1', itemId);
    if (!inv) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    const donation = db.getFirstSync<{ item_id: string }>('SELECT item_id FROM rpg_museum_donations WHERE item_id = ?', itemId);
    if (donation) {
      db.execSync('ROLLBACK');
      return 'already_donated';
    }

    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = ?', itemId);
    db.runSync('INSERT INTO rpg_museum_donations (item_id, donated_at) VALUES (?, ?)', itemId, sqlNow());

    db.execSync('COMMIT');

    addSkillPoints('mining', 25);
    
    // Check milestones
    checkMuseumMilestones();

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

function checkMuseumMilestones() {
  const countRes = db.getFirstSync<{ c: number }>('SELECT count(*) as c FROM rpg_museum_donations');
  const count = countRes?.c || 0;

  // We could have a separate table for claimed rewards, but for simplicity we will just 
  // do something hacky or rely on quests.
  // Actually, since we want to be rigorous, let's just use the existing quest logic or inventory directly.
  if (count === 5) {
    // 5 items donated! Give an Ancient Seed if they don't have one
    try {
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES ('rpg_ancient_seed_pack', 1)
         ON CONFLICT(item_id) DO NOTHING` // Only give it once
      );
    } catch {}
  }
}
