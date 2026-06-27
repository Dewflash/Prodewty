import { db } from './schema';
import { getRPGState } from './rpg';
import { getZoneDef, ZoneId } from '../engine/ZoneCatalog';

export function travelToZone(destinationId: ZoneId): 'ok' | 'no_energy' | 'invalid_destination' | 'db_error' {
  try {
    const rpg = getRPGState() as any;
    const currentZone = (rpg.current_zone || 'farm') as ZoneId;

    if (currentZone === destinationId) return 'ok';

    const def = getZoneDef(currentZone);
    if (!def) return 'invalid_destination';

    const cost = def.connections[destinationId];
    if (cost === undefined) return 'invalid_destination'; // No direct route

    if (rpg.energy < cost) return 'no_energy';

    db.execSync('BEGIN TRANSACTION');
    db.runSync('UPDATE rpg_state SET energy = MAX(0, energy - ?), current_zone = ? WHERE id = 1', cost, destinationId);
    db.execSync('COMMIT');

    return 'ok';
  } catch (e) {
    try { db.execSync('ROLLBACK'); } catch {}
    return 'db_error';
  }
}

export function getCurrentZone(): ZoneId {
  const rpg = getRPGState() as any;
  return (rpg.current_zone || 'farm') as ZoneId;
}
