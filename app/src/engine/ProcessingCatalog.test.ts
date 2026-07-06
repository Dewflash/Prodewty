// Executable proof for the Wave 5b processors. Run: npm run test:processing
// Validates that every processing recipe's input/output item ids exist in the
// live item catalog (so nothing is un-processable or un-collectable), that each
// recipe's station type is a real BuildingCatalog station, and that every output
// sells for meaningfully more than its input (the whole point of processing).
import {
  PROCESSING_CATALOG,
  getAllProcessingRecipes,
  getProcessingRecipe,
  getProcessingRecipeForStation,
  type ProcessingRecipe,
} from './ProcessingCatalog';
// RpgObjectCatalog / RpgAssetRegistry / BuildingCatalog can't be imported here —
// their chain require()s PNG assets, which plain node/tsx can't load. Validate
// ids the same way scripts/validate-rpg-content.js and the other engine tests do:
// scan the source as text.
import { readFileSync } from 'fs';
import { join } from 'path';

const catalogSource = readFileSync(join(__dirname, 'RpgObjectCatalog.ts'), 'utf8');
const itemIdsSource = readFileSync(join(__dirname, 'RpgItemIds.ts'), 'utf8');
const buildingSource = readFileSync(join(__dirname, 'BuildingCatalog.ts'), 'utf8');

const itemIdExists = (itemId: string) =>
  catalogSource.includes(`'${itemId}'`) || itemIdsSource.includes(`'${itemId}'`);
// A station type is real if some BuildingCatalog def declares `type: '<type>'`.
const stationTypeExists = (stationType: string) =>
  buildingSource.includes(`type: '${stationType}'`);

// Read a resource's sell price straight out of the RESOURCE_SELL_PRICES block in
// RpgObjectCatalog. Prices are keyed by RpgItemIds CONSTANT (e.g.
// `[RPG_MILK_ITEM_ID]: 35`), so resolve the constant name first, then read its
// number. Returns null if not priced.
function sellPriceOf(itemId: string): number | null {
  const constMatch = itemIdsSource.match(new RegExp(`export const (\\w+) = '${itemId}'`));
  if (!constMatch) return null;
  const priceMatch = catalogSource.match(new RegExp(`\\[${constMatch[1]}\\]:\\s*(\\d+)`));
  return priceMatch ? Number(priceMatch[1]) : null;
}

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const ALL: ProcessingRecipe[] = getAllProcessingRecipes();

console.log('Processing catalog integrity:');
{
  check('has exactly 2 recipes', Object.keys(PROCESSING_CATALOG).length === 2);
  check('getProcessingRecipe round-trips', getProcessingRecipe('process_cheese')?.stationType === 'CheesePress');
  check('unknown recipe returns null', getProcessingRecipe('process_nope') === null);
  check('resolve by station type', getProcessingRecipeForStation('Loom')?.outputItemId === 'rpg_cloth');
  check('unknown station returns null', getProcessingRecipeForStation('Nope') === null);

  // Processing v1 is two rustic refining recipes — cheese + cloth. The Mayonnaise
  // Machine is intentionally UNWIRED (off-theme), so it must resolve to no recipe.
  check('CheesePress → cheese', getProcessingRecipeForStation('CheesePress')?.outputItemId === 'rpg_cheese');
  check('Loom → cloth', getProcessingRecipeForStation('Loom')?.outputItemId === 'rpg_cloth');
  check('MayonnaiseMachine is intentionally unwired', getProcessingRecipeForStation('MayonnaiseMachine') === null);
  check('no mayonnaise recipe', getProcessingRecipe('process_mayonnaise') === null);

  // Inputs are the Wave 5a livestock produce ids.
  check('cheese from milk', getProcessingRecipe('process_cheese')?.inputItemId === 'rpg_milk');
  check('cloth from wool', getProcessingRecipe('process_cloth')?.inputItemId === 'rpg_wool');
}

console.log('Recipe well-formedness:');
for (const r of ALL) {
  check(`${r.recipeId}: input id '${r.inputItemId}' exists`, itemIdExists(r.inputItemId));
  check(`${r.recipeId}: output id '${r.outputItemId}' exists`, itemIdExists(r.outputItemId));
  check(`${r.recipeId}: station type '${r.stationType}' is a real station`, stationTypeExists(r.stationType));
  check(`${r.recipeId}: positive input quantity`, r.inputQuantity > 0);
  check(`${r.recipeId}: positive output quantity`, r.outputQuantity > 0);
  check(`${r.recipeId}: positive time`, r.timeMinutes > 0);
  check(`${r.recipeId}: recipeId matches map key`, PROCESSING_CATALOG[r.recipeId] === r);
}

console.log('Value gate (output worth more than input):');
for (const r of ALL) {
  const inPrice = sellPriceOf(r.inputItemId);
  const outPrice = sellPriceOf(r.outputItemId);
  check(`${r.recipeId}: input '${r.inputItemId}' is priced`, inPrice !== null);
  check(`${r.recipeId}: output '${r.outputItemId}' is priced`, outPrice !== null);
  if (inPrice !== null && outPrice !== null) {
    // Output batch must be worth meaningfully more than the input batch — use a
    // 1.5× floor so "meaningfully more" isn't just a rounding win.
    const inBatch = inPrice * r.inputQuantity;
    const outBatch = outPrice * r.outputQuantity;
    check(`${r.recipeId}: output batch (${outBatch}) ≥ 1.5× input batch (${inBatch})`, outBatch >= inBatch * 1.5);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
