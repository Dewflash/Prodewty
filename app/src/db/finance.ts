import { db } from './schema';
import { sqlNow } from '../utils/date';

export type NetWorthEntry = {
  id: number;
  month: string;   // YYYY-MM
  amount: number;
  created_at: string;
  updated_at: string;
};

export function getAllNetWorth(): NetWorthEntry[] {
  try {
    return db.getAllSync<NetWorthEntry>(
      'SELECT * FROM finance_networth ORDER BY month DESC',
    );
  } catch { return []; }
}

export function getNetWorthForMonth(month: string): NetWorthEntry | null {
  try {
    return db.getFirstSync<NetWorthEntry>(
      'SELECT * FROM finance_networth WHERE month = ?',
      month,
    ) ?? null;
  } catch { return null; }
}

export function saveNetWorth(month: string, amount: number): void {
  const now = sqlNow();
  db.runSync(
    `INSERT INTO finance_networth (month, amount, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(month) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at`,
    month, amount, now, now,
  );
}
