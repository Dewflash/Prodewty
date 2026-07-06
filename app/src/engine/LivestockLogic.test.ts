// Executable proof for the Wave 5a livestock math. Run: npm run test:livestock
// Validates that every animal's object type + produce item id exist in the live
// catalogs/registry (so nothing can be un-spawnable or un-collectable), and that
// the pure happiness / produce-readiness / capacity math behaves.
import {
  LIVESTOCK_ANIMALS,
  getLivestockDef,
  getLivestockDefByObjectType,
  clampHappiness,
  applyFeedHappiness,
  applyPetHappiness,
  applyMissedFeedHappiness,
  isProduceReady,
  produceQuantity,
  buildingCapacity,
  hasFreeCapacity,
  buildingHousesAnimal,
  HAPPINESS_MIN,
  HAPPINESS_MAX,
  FEED_HAPPINESS_GAIN,
  MISSED_FEED_HAPPINESS_LOSS,
  PET_HAPPINESS_GAIN,
  PRODUCE_HAPPINESS_MIN,
  QUALITY_HAPPINESS_MIN,
  BASE_CAPACITY,
  UPGRADED_CAPACITY,
  type LivestockAnimalType,
} from './LivestockLogic';
// RpgObjectCatalog / RpgAssetRegistry can't be imported here — their chain
// require()s PNG assets, which plain node/tsx can't load. Validate ids the same
// way scripts/validate-rpg-content.js and BundleCatalog.test.ts do: scan the
// source as text.
import { readFileSync } from 'fs';
import { join } from 'path';

const registrySource = readFileSync(join(__dirname, 'RpgAssetRegistry.ts'), 'utf8');
const catalogSource = readFileSync(join(__dirname, 'RpgObjectCatalog.ts'), 'utf8');
const itemIdsSource = readFileSync(join(__dirname, 'RpgItemIds.ts'), 'utf8');

// The animal OBJECT type (e.g. 'Farm_chick') must be a registered animal asset
// itemId in RpgAssetRegistry (so it spawns with a verified sprite animation).
const objectTypeIsRegistered = (objectType: string) =>
  registrySource.includes(`itemId: '${objectType}'`);
// The produce id must resolve to a real inventory item.
const itemIdExists = (itemId: string) =>
  catalogSource.includes(`'${itemId}'`) || itemIdsSource.includes(`'${itemId}'`);

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ FAIL: ${name}`); }
}

const ALL: LivestockAnimalType[] = ['chick', 'sheep', 'calf', 'piglet'];

console.log('Animal catalog integrity:');
{
  check('has exactly 4 animals', Object.keys(LIVESTOCK_ANIMALS).length === 4);
  check('getLivestockDef round-trips', getLivestockDef('chick')?.animalType === 'chick');
  check('unknown animal returns null', getLivestockDef('dragon') === null);
  check('resolve by object type', getLivestockDefByObjectType('Farm_sheep')?.animalType === 'sheep');
  check('unknown object type returns null', getLivestockDefByObjectType('Farm_nope') === null);

  // The verified 4 sprites only (no new art): every def uses one of the 4
  // registered animal sprite object types.
  const registeredAnimalTypes = new Set(['Farm_chick', 'Farm_piglet', 'Farm_sheep', 'Farm_calf']);
  for (const type of ALL) {
    const def = getLivestockDef(type)!;
    check(`${type}: object type is one of the 4 verified sprites`, registeredAnimalTypes.has(def.objectType));
    check(`${type}: object type registered in RpgAssetRegistry`, objectTypeIsRegistered(def.objectType));
    check(`${type}: produce item '${def.produceItemId}' exists`, itemIdExists(def.produceItemId));
    check(`${type}: buy price in 140-500 band`, def.buyPrice >= 140 && def.buyPrice <= 500);
    check(`${type}: produce value > 0`, def.produceValue > 0);
    check(`${type}: has a name`, def.name.length > 0);
  }

  // Produce mapping matches the animalProductDrop content values.
  check('chick → egg', getLivestockDef('chick')?.produceItemId === 'rpg_egg');
  check('sheep → wool', getLivestockDef('sheep')?.produceItemId === 'rpg_wool');
  check('calf → milk', getLivestockDef('calf')?.produceItemId === 'rpg_milk');
  check('piglet → truffle', getLivestockDef('piglet')?.produceItemId === 'rpg_truffle');

  // Housing: chick in the Coop, the other three in the Barn.
  check('chick houses in Coop', getLivestockDef('chick')?.housing === 'Coop');
  check('sheep houses in Barn', getLivestockDef('sheep')?.housing === 'Barn');
  check('calf houses in Barn', getLivestockDef('calf')?.housing === 'Barn');
  check('piglet houses in Barn', getLivestockDef('piglet')?.housing === 'Barn');
  check('buildingHousesAnimal: Coop takes chick', buildingHousesAnimal('Coop', 'chick'));
  check('buildingHousesAnimal: Coop rejects calf', !buildingHousesAnimal('Coop', 'calf'));
  check('buildingHousesAnimal: Barn takes piglet', buildingHousesAnimal('Barn', 'piglet'));
}

console.log('Happiness math:');
{
  check('clamps below 0', clampHappiness(-10) === HAPPINESS_MIN);
  check('clamps above 100', clampHappiness(130) === HAPPINESS_MAX);
  check('rounds mid values', clampHappiness(49.6) === 50);
  check(`feed adds +${FEED_HAPPINESS_GAIN}`, applyFeedHappiness(50) === 50 + FEED_HAPPINESS_GAIN);
  check('feed clamps at 100', applyFeedHappiness(95) === 100);
  check(`pet adds +${PET_HAPPINESS_GAIN}`, applyPetHappiness(50) === 55);
  check('pet clamps at 100', applyPetHappiness(98) === 100);
  check(`missed feed subtracts ${MISSED_FEED_HAPPINESS_LOSS}`, applyMissedFeedHappiness(50) === 50 - MISSED_FEED_HAPPINESS_LOSS);
  check('missed feed never below 0', applyMissedFeedHappiness(5) === 0);
  check('missed feed harsher than a feed gain', MISSED_FEED_HAPPINESS_LOSS > FEED_HAPPINESS_GAIN);
}

console.log('Produce readiness:');
{
  check('not ready if not fed yesterday', !isProduceReady(false, 100));
  check('not ready if fed but too sad', !isProduceReady(true, PRODUCE_HAPPINESS_MIN - 1));
  check('ready at exact happiness floor', isProduceReady(true, PRODUCE_HAPPINESS_MIN));
  check('ready when fed + happy', isProduceReady(true, 60));
  check('base quantity below quality floor', produceQuantity(QUALITY_HAPPINESS_MIN - 1) === 1);
  check('double quantity at quality floor', produceQuantity(QUALITY_HAPPINESS_MIN) === 2);
  check('double quantity when very happy', produceQuantity(100) === 2);
}

console.log('Capacity rules:');
{
  check(`level 1 → ${BASE_CAPACITY}`, buildingCapacity(1) === BASE_CAPACITY);
  check(`level 2 → ${UPGRADED_CAPACITY}`, buildingCapacity(2) === UPGRADED_CAPACITY);
  check('level 3+ stays at upgraded cap', buildingCapacity(5) === UPGRADED_CAPACITY);
  check('room at lvl1 with 1 animal', hasFreeCapacity(1, 1));
  check('full at lvl1 with 2 animals', !hasFreeCapacity(2, 1));
  check('room at lvl2 with 3 animals', hasFreeCapacity(3, 2));
  check('full at lvl2 with 4 animals', !hasFreeCapacity(4, 2));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
