import { db } from './schema';

export type DBCategory = {
  id: number;
  name: string;
  weight: number;
  attribute: 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience';
  is_default: number;
  is_physical: number;
  is_recreational: number;
  is_communal: number;
  used: number;
  color: string;
};

export function getCategories(): DBCategory[] {
  return db.getAllSync<DBCategory>(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY is_default DESC, name ASC',
  );
}

// Adjusts an existing category's XP weight (1-20) — covers categories created
// during onboarding, which are seeded with a fixed weight and otherwise have
// no UI to retune (the "New Activity" weight slider only applies at creation).
export function updateCategoryWeight(name: string, weight: number): void {
  db.runSync('UPDATE categories SET weight = ? WHERE name = ?', Math.max(1, Math.min(20, Math.round(weight))), name);
}

// Renames a category and cascades the new name into every place activity_logs
// references it by string (the legacy single `category` column and the JSON
// `categories` array), so Past History, Insights, and the quest engine keep
// pointing at the right history after a rename.
export function renameCategory(oldName: string, newName: string): 'ok' | 'duplicate' | 'not_found' {
  const trimmed = newName.trim();
  if (!trimmed) return 'not_found';
  if (trimmed === oldName) return 'ok';

  const cat = db.getFirstSync<{ id: number }>('SELECT id FROM categories WHERE name = ?', oldName);
  if (!cat) return 'not_found';

  const dup = db.getFirstSync<{ id: number }>(
    'SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?', trimmed, cat.id,
  );
  if (dup) return 'duplicate';

  db.withTransactionSync(() => {
    db.runSync('UPDATE categories SET name = ? WHERE id = ?', trimmed, cat.id);
    db.runSync('UPDATE activity_logs SET category = ? WHERE category = ?', trimmed, oldName);

    const rows = db.getAllSync<{ id: number; categories: string }>(
      `SELECT id, categories FROM activity_logs WHERE categories LIKE ?`, `%"${oldName}"%`,
    );
    for (const row of rows) {
      try {
        const arr: string[] = JSON.parse(row.categories);
        if (arr.includes(oldName)) {
          const updated = arr.map(c => (c === oldName ? trimmed : c));
          db.runSync('UPDATE activity_logs SET categories = ? WHERE id = ?', JSON.stringify(updated), row.id);
        }
      } catch {}
    }
  });

  return 'ok';
}

export function updateCategoryColor(name: string, color: string): void {
  db.runSync('UPDATE categories SET color = ? WHERE name = ?', color, name);
}

export function updateCategoryAttribute(name: string, attribute: string): void {
  db.runSync('UPDATE categories SET attribute = ? WHERE name = ?', attribute, name);
}

export function updateCategoryFlags(name: string, isPhysical: boolean, isRecreational: boolean, isCommunal: boolean): void {
  db.runSync(
    'UPDATE categories SET is_physical = ?, is_recreational = ?, is_communal = ? WHERE name = ?',
    isPhysical ? 1 : 0, isRecreational ? 1 : 0, isCommunal ? 1 : 0, name,
  );
}

export function addCategory(
  name: string,
  weight: number,
  attribute: string,
  isPhysical: boolean,
  isRecreational: boolean,
  isCommunal: boolean,
  color: string = '#38BDF8',
): void {
  db.runSync(
    `INSERT OR IGNORE INTO categories (name, weight, attribute, is_physical, is_recreational, is_communal, color) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name.trim(), weight, attribute, isPhysical ? 1 : 0, isRecreational ? 1 : 0, isCommunal ? 1 : 0, color,
  );
}

// Deletes a category from the active grid. Categories that have been logged against
// are archived (kept for Past History, can no longer be selected); never-used ones are purged outright.
export function deleteCategory(name: string): 'archived' | 'purged' | 'not_found' {
  const cat = db.getFirstSync<{ used: number }>('SELECT used FROM categories WHERE name = ?', name);
  if (!cat) return 'not_found';
  if (cat.used === 1) {
    db.runSync('UPDATE categories SET is_active = 0 WHERE name = ?', name);
    return 'archived';
  }
  db.runSync('DELETE FROM categories WHERE name = ?', name);
  return 'purged';
}

export function getPastHistoryCategories(): DBCategory[] {
  return db.getAllSync<DBCategory>(
    'SELECT * FROM categories WHERE is_active = 0 AND used = 1 ORDER BY name ASC',
  );
}
