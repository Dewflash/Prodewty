import { db } from './schema';
import { getAnimalDef, AnimalType } from '../engine/AnimalCatalog';
import { addSkillPoints } from './skills';
import { getRPGState } from './rpg';

export type RpgAnimal = {
  id: number;
  name: string;
  type: AnimalType;
  building_object_id: number;
  days_old: number;
  friendship_points: number;
  is_fed_today: boolean;
  is_petted_today: boolean;
  has_produce: boolean;
};

export function buyAnimal(name: string, type: AnimalType, buildingObjectId: number): 'ok' | 'no_coins' | 'db_error' {
  const def = getAnimalDef(type);
  if (!def) return 'db_error';

  try {
    db.execSync('BEGIN TRANSACTION');
    
    const rpg = getRPGState();
    if (rpg.coins < def.buyPrice) {
      db.execSync('ROLLBACK');
      return 'no_coins';
    }

    db.runSync('UPDATE rpg_state SET coins = coins - ? WHERE id = 1', def.buyPrice);
    
    db.runSync(
      `INSERT INTO rpg_animals (name, type, building_object_id) VALUES (?, ?, ?)`,
      name, type, buildingObjectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

export function feedAnimal(animalId: number): 'ok' | 'no_hay' | 'already_fed' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');
    const animal = db.getFirstSync<RpgAnimal>('SELECT * FROM rpg_animals WHERE id = ?', animalId);
    if (!animal) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }
    if (animal.is_fed_today) {
      db.execSync('ROLLBACK');
      return 'already_fed';
    }

    const hayCheck = db.getFirstSync<{ quantity: number }>('SELECT quantity FROM user_inventory WHERE item_id = "rpg_hay" AND quantity >= 1');
    if (!hayCheck) {
      db.execSync('ROLLBACK');
      return 'no_hay';
    }

    db.runSync('UPDATE user_inventory SET quantity = quantity - 1 WHERE item_id = "rpg_hay"');
    db.runSync('UPDATE rpg_animals SET is_fed_today = 1 WHERE id = ?', animalId);
    
    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

export function petAnimal(animalId: number): 'ok' | 'already_petted' | 'db_error' {
  try {
    const animal = db.getFirstSync<RpgAnimal>('SELECT * FROM rpg_animals WHERE id = ?', animalId);
    if (!animal) return 'db_error';
    if (animal.is_petted_today) return 'already_petted';

    // Increase friendship by 15 points (max 1000 = 5 hearts)
    db.runSync('UPDATE rpg_animals SET is_petted_today = 1, friendship_points = MIN(1000, friendship_points + 15) WHERE id = ?', animalId);
    addSkillPoints('farming', 5);
    return 'ok';
  } catch (e) {
    return 'db_error';
  }
}

export function harvestProduce(animalId: number): 'ok' | 'no_produce' | 'db_error' {
  try {
    db.execSync('BEGIN TRANSACTION');
    
    const animal = db.getFirstSync<RpgAnimal>('SELECT * FROM rpg_animals WHERE id = ?', animalId);
    if (!animal || !animal.has_produce) {
      db.execSync('ROLLBACK');
      return 'no_produce';
    }

    const def = getAnimalDef(animal.type);
    if (!def) {
      db.execSync('ROLLBACK');
      return 'db_error';
    }

    // Determine quality based on friendship
    // 0-200: 1x, 200-600: 2x, 600-1000: 3x yield for simplicity
    let yieldMultiplier = 1;
    if (animal.friendship_points > 600) yieldMultiplier = 3;
    else if (animal.friendship_points > 200) yieldMultiplier = 2;

    const finalQuantity = def.produceQuantity * yieldMultiplier;

    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      def.produceItemId, finalQuantity
    );

    db.runSync('UPDATE rpg_animals SET has_produce = 0 WHERE id = ?', animalId);
    
    db.execSync('COMMIT');
    
    addSkillPoints('farming', 15);
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

export function processOvernightAnimals(): void {
  try {
    db.execSync('BEGIN TRANSACTION');
    
    // Process all animals
    const animals = db.getAllSync<RpgAnimal>('SELECT * FROM rpg_animals');
    
    for (const animal of animals) {
      const def = getAnimalDef(animal.type);
      if (!def) continue;

      let newFriendship = animal.friendship_points;
      let hasProduce = animal.has_produce ? 1 : 0;
      const daysOld = animal.days_old + 1;

      // If fed, small friendship boost and produce chance
      if (animal.is_fed_today) {
        newFriendship = Math.min(1000, newFriendship + 5);
        if (daysOld >= def.daysToMature) {
          hasProduce = 1;
        }
      } else {
        // If not fed, friendship decay
        newFriendship = Math.max(0, newFriendship - 20);
      }

      db.runSync(
        `UPDATE rpg_animals SET 
         days_old = ?, 
         friendship_points = ?, 
         is_fed_today = 0, 
         is_petted_today = 0, 
         has_produce = ? 
         WHERE id = ?`,
        daysOld, newFriendship, hasProduce, animal.id
      );
    }
    
    db.execSync('COMMIT');
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to process overnight animals', e);
  }
}
