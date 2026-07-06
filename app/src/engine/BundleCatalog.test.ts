// Executable proof for the Wave 4 Town Hall bundles. Run: npm run test:bundles
// Validates that every bundle's required item id exists in the live item catalog
// (so nothing can be un-donatable), rewards are well-formed, and the pure
// donation/completion math (BundleLogic) behaves.
import {
  BUNDLE_CATALOG,
  getAllBundles,
  getBundleDef,
  FREE_SEED_POOL,
  BUNDLE_ENERGY_BONUS,
  type BundleDefinition,
} from './BundleCatalog';
import {
  donatableAmount,
  isItemComplete,
  isBundleComplete,
  bundleProgressFraction,
} from './BundleLogic';
// RpgObjectCatalog can't be imported here — its chain require()s PNG assets,
// which plain node/tsx can't load. Validate item ids the same way
// scripts/validate-rpg-content.js does: scan the catalog source as text.
import { readFileSync } from 'fs';
import { join } from 'path';

const catalogSource = readFileSync(join(__dirname, 'RpgObjectCatalog.ts'), 'utf8');
const itemIdsSource = readFileSync(join(__dirname, 'RpgItemIds.ts'), 'utf8');
const itemIdExists = (itemId: string) =>
  catalogSource.includes(`'${itemId}'`) || itemIdsSource.includes(`'${itemId}'`);
const seedKindDeclared = (itemId: string) => {
  // Catalog entries are keyed by their RpgItemIds CONSTANT (e.g.
  // `[RPG_TURNIP_SEED_ITEM_ID]: { kind: 'seed', ... }`), so resolve the
  // constant name first, then check `kind: 'seed'` inside that entry's block.
  const constMatch = itemIdsSource.match(new RegExp(`export const (\\w+) = '${itemId}'`));
  const key = constMatch ? `[${constMatch[1]}]:` : `'${itemId}':`;
  // The key may appear in several catalogs (crop map, item catalog, ...);
  // the seed's ITEM entry is whichever block declares kind: 'seed'.
  for (let at = catalogSource.indexOf(key); at >= 0; at = catalogSource.indexOf(key, at + 1)) {
    if (catalogSource.slice(at, at + 400).includes("kind: 'seed'")) return true;
  }
  return false;
};

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const VALID_PERKS = new Set(['hearth_sell_bonus', 'bundle_energy_bonus', 'hearth_free_seed_day']);

console.log('Bundle catalog integrity:');
{
  const bundles = getAllBundles();
  check('has exactly 3 starter bundles', bundles.length === 3);
  check('getBundleDef round-trips', getBundleDef('bundle_forage')?.id === 'bundle_forage');
  check('unknown bundle id returns null', getBundleDef('nope') === null);

  for (const def of bundles) {
    check(`${def.id}: has a name`, typeof def.name === 'string' && def.name.length > 0);
    check(`${def.id}: has at least one required item`, def.requiredItems.length > 0);
    for (const req of def.requiredItems) {
      check(`${def.id}: item '${req.itemId}' exists in RPG_ITEM_CATALOG`, itemIdExists(req.itemId));
      check(`${def.id}: item '${req.itemId}' quantity > 0`, req.quantity > 0);
    }
    check(`${def.id}: reward coins > 0`, def.reward.coins > 0);
    check(`${def.id}: reward perk is valid`, VALID_PERKS.has(def.reward.perk));
    check(`${def.id}: reward has a perkLabel`, typeof def.reward.perkLabel === 'string' && def.reward.perkLabel.length > 0);
    if (def.reward.perk === 'bundle_energy_bonus') {
      check(`${def.id}: energy perk grants a positive bonus`, (def.reward.energyBonus ?? 0) > 0);
    }
  }

  // Each of the three perks is used exactly once (the work order's 3 distinct rewards).
  const perks = bundles.map(b => b.reward.perk).sort();
  check('all three distinct perks are present', new Set(perks).size === 3);
  check('energy bonus constant matches catalog', getBundleDef('bundle_harvest')?.reward.energyBonus === BUNDLE_ENERGY_BONUS);
}

console.log('Free-seed pool:');
{
  check('has at least one seed', FREE_SEED_POOL.length > 0);
  for (const seedId of FREE_SEED_POOL) {
    check(`seed '${seedId}' exists`, itemIdExists(seedId));
    check(`seed '${seedId}' is a seed`, seedKindDeclared(seedId));
  }
}

console.log('Donation math (donatableAmount):');
{
  check('donates up to remaining need', donatableAmount(20, 5, 100) === 15);
  check('clamped by backpack quantity', donatableAmount(20, 5, 3) === 3);
  check('nothing left to donate when met', donatableAmount(20, 20, 5) === 0);
  check('never negative on over-donation', donatableAmount(20, 25, 5) === 0);
  check('zero backpack donates nothing', donatableAmount(20, 0, 0) === 0);
}

console.log('Completion math:');
{
  const def: BundleDefinition = BUNDLE_CATALOG.bundle_forage;
  check('item complete at exact requirement', isItemComplete(20, 20));
  check('item incomplete below requirement', !isItemComplete(20, 19));
  check('bundle incomplete when empty', !isBundleComplete(def, {}));

  const full: Record<string, number> = {};
  def.requiredItems.forEach(r => { full[r.itemId] = r.quantity; });
  check('bundle complete when all met', isBundleComplete(def, full));

  const over: Record<string, number> = {};
  def.requiredItems.forEach(r => { over[r.itemId] = r.quantity + 5; });
  check('bundle complete when over-donated', isBundleComplete(def, over));

  check('progress fraction 0 when empty', bundleProgressFraction(def, {}) === 0);
  check('progress fraction 1 when full', bundleProgressFraction(def, full) === 1);
  check('progress fraction clamps to 1 when over', bundleProgressFraction(def, over) === 1);
  const half: Record<string, number> = {};
  half[def.requiredItems[0].itemId] = def.requiredItems[0].quantity;
  const frac = bundleProgressFraction(def, half);
  check('partial progress is between 0 and 1', frac > 0 && frac < 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
