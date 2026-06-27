import { db } from './schema';

export type RpgQuest = {
  id: number;
  title: string;
  description: string;
  objective_type: 'kill' | 'gather' | 'craft';
  target_id: string; // e.g. 'slime' or 'rpg_wood'
  target_amount: number;
  current_amount: number;
  reward_coins: number;
  reward_item_id: string | null;
  status: 'active' | 'completed' | 'claimed';
};

// Start a new quest
export function addRpgQuest(
  title: string, 
  description: string, 
  objectiveType: 'kill' | 'gather' | 'craft', 
  targetId: string, 
  targetAmount: number, 
  rewardCoins: number, 
  rewardItemId: string | null = null
): boolean {
  try {
    db.runSync(
      `INSERT INTO rpg_quests (title, description, objective_type, target_id, target_amount, reward_coins, reward_item_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      title, description, objectiveType, targetId, targetAmount, rewardCoins, rewardItemId
    );
    return true;
  } catch (e) {
    console.warn('Failed to add RPG quest', e);
    return false;
  }
}

// Update progress for an objective type
export function progressRpgQuest(objectiveType: 'kill' | 'gather' | 'craft', targetId: string, amount: number = 1): void {
  try {
    const activeQuests = db.getAllSync<RpgQuest>(
      'SELECT * FROM rpg_quests WHERE status = "active" AND objective_type = ? AND target_id = ?',
      objectiveType, targetId
    );

    for (const quest of activeQuests) {
      const newAmount = Math.min(quest.current_amount + amount, quest.target_amount);
      const newStatus = newAmount >= quest.target_amount ? 'completed' : 'active';
      
      db.runSync(
        'UPDATE rpg_quests SET current_amount = ?, status = ? WHERE id = ?',
        newAmount, newStatus, quest.id
      );
    }
  } catch (e) {
    console.warn('Failed to progress RPG quests', e);
  }
}

// Claim rewards for a completed quest
export function claimRpgQuestReward(questId: number): 'ok' | 'not_completed' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');

    const quest = db.getFirstSync<RpgQuest>(
      'SELECT * FROM rpg_quests WHERE id = ?',
      questId
    );

    if (!quest || quest.status !== 'completed') {
      db.execSync('ROLLBACK');
      return 'not_completed';
    }

    // Give coin reward
    if (quest.reward_coins > 0) {
      db.runSync('UPDATE rpg_state SET coins = coins + ? WHERE id = 1', quest.reward_coins);
    }

    // Give item reward
    if (quest.reward_item_id) {
      db.runSync(
        `INSERT INTO user_inventory (item_id, quantity) VALUES (?, 1)
         ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1`,
        quest.reward_item_id
      );
    }

    // Mark as claimed
    db.runSync('UPDATE rpg_quests SET status = "claimed" WHERE id = ?', quest.id);

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to claim RPG quest reward', e);
    return 'db_error';
  }
}
