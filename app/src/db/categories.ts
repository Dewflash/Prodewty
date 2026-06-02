import { db } from './schema';

export type DBCategory = {
  id: number;
  name: string;
  weight: number;
  attribute: 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience';
  is_default: number;
  is_physical: number;
  is_recreational: number;
};

export function getCategories(): DBCategory[] {
  return db.getAllSync<DBCategory>(
    'SELECT * FROM categories ORDER BY is_default DESC, name ASC',
  );
}

export function addCategory(
  name: string,
  weight: number,
  attribute: string,
  isPhysical: boolean,
  isRecreational: boolean,
): void {
  db.runSync(
    `INSERT OR IGNORE INTO categories (name, weight, attribute, is_physical, is_recreational) VALUES (?, ?, ?, ?, ?)`,
    name.trim(), weight, attribute, isPhysical ? 1 : 0, isRecreational ? 1 : 0,
  );
}
