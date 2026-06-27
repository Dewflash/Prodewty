import { db } from './schema';
import { sqlNow } from '../utils/date';
import { getRecipeForProcessor } from '../engine/ProcessorCatalog';

export type SanctuaryProcessor = {
  id: number;
  object_id: number;
  processor_type: string;
  input_item_id: string | null;
  input_quantity: number;
  output_item_id: string | null;
  output_quantity: number;
  started_at: string | null;
  finish_at: string | null;
  is_processing: boolean;
  is_ready: boolean;
};

export function registerProcessor(objectId: number, processorType: string): boolean {
  try {
    db.runSync(
      `INSERT INTO sanctuary_processors (object_id, processor_type) VALUES (?, ?)`,
      objectId, processorType
    );
    return true;
  } catch (e) {
    console.warn('Failed to register processor', e);
    return false;
  }
}

export function getProcessor(objectId: number): SanctuaryProcessor | null {
  try {
    const row = db.getFirstSync<any>('SELECT * FROM sanctuary_processors WHERE object_id = ? LIMIT 1', objectId);
    if (!row) return null;
    return {
      ...row,
      is_processing: row.is_processing === 1,
      is_ready: row.is_ready === 1
    };
  } catch {
    return null;
  }
}

export function startProcessing(objectId: number, inputId: string): 'ok' | 'no_processor' | 'no_recipe' | 'busy' | 'no_item' | 'db_error' {
  const processor = getProcessor(objectId);
  if (!processor) return 'no_processor';
  if (processor.is_processing || processor.is_ready) return 'busy';

  const recipe = getRecipeForProcessor(processor.processor_type, inputId);
  if (!recipe) return 'no_recipe';

  try {
    db.execSync('BEGIN TRANSACTION');
    
    // Check if we have the input item
    const itemUpdate = db.runSync(
      'UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ? AND quantity >= ?',
      recipe.inputQuantity, inputId, recipe.inputQuantity
    );
    
    if (itemUpdate.changes <= 0) {
      db.execSync('ROLLBACK');
      return 'no_item';
    }

    const now = new Date();
    const finishTime = new Date(now.getTime() + recipe.processingMinutes * 60000);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatSqlDate = (d: Date) => 
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    db.runSync(
      `UPDATE sanctuary_processors 
       SET input_item_id = ?, input_quantity = ?, output_item_id = ?, output_quantity = ?, 
           started_at = ?, finish_at = ?, is_processing = 1, is_ready = 0
       WHERE object_id = ?`,
      inputId, recipe.inputQuantity, recipe.outputId, recipe.outputQuantity, 
      formatSqlDate(now), formatSqlDate(finishTime), objectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to start processing', e);
    return 'db_error';
  }
}

export function checkProcessorsReady(): number {
  const now = sqlNow();
  try {
    const result = db.runSync(
      `UPDATE sanctuary_processors 
       SET is_processing = 0, is_ready = 1 
       WHERE is_processing = 1 AND finish_at <= ?`,
      now
    );
    return result.changes;
  } catch (e) {
    console.warn('Failed to check processors', e);
    return 0;
  }
}

export function collectProcessorOutput(objectId: number): 'ok' | 'not_ready' | 'db_error' {
  const processor = getProcessor(objectId);
  if (!processor || !processor.is_ready || !processor.output_item_id) return 'not_ready';

  try {
    db.execSync('BEGIN TRANSACTION');

    db.runSync(
      `INSERT INTO user_inventory (item_id, quantity) VALUES (?, ?)
       ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      processor.output_item_id, processor.output_quantity
    );

    db.runSync(
      `UPDATE sanctuary_processors 
       SET input_item_id = NULL, input_quantity = 0, output_item_id = NULL, output_quantity = 0, 
           started_at = NULL, finish_at = NULL, is_processing = 0, is_ready = 0
       WHERE object_id = ?`,
      objectId
    );

    db.execSync('COMMIT');
    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    console.warn('Failed to collect processor output', e);
    return 'db_error';
  }
}

export function removeProcessor(objectId: number): boolean {
  try {
    const result = db.runSync('DELETE FROM sanctuary_processors WHERE object_id = ?', objectId);
    return result.changes > 0;
  } catch (e) {
    console.warn('Failed to remove processor', e);
    return false;
  }
}
