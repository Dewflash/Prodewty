#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const engineDir = path.join(appRoot, 'src', 'engine');
const assetRegistryPath = path.join(engineDir, 'RpgAssetRegistry.ts');
const catalogPath = path.join(engineDir, 'RpgObjectCatalog.ts');
const itemIdsPath = path.join(engineDir, 'RpgItemIds.ts');
const archivePath = path.join(engineDir, 'RpgArchive.tsx');
const backpackPath = path.join(engineDir, 'RpgBackpack.tsx');
const shopPath = path.join(engineDir, 'SanctuaryShop.tsx');
const itemIconPath = path.join(engineDir, 'RpgItemIcon.tsx');
const sanctuaryObjectPath = path.join(engineDir, 'SanctuaryObject.tsx');
const rpgScreenPath = path.join(appRoot, 'app', 'rpg.tsx');
const schemaPath = path.join(appRoot, 'src', 'db', 'schema.ts');
const sanctuaryInteractionsPath = path.join(appRoot, 'src', 'db', 'sanctuaryInteractions.ts');
const sanctuaryObjectRelationsPath = path.join(appRoot, 'src', 'db', 'sanctuaryObjectRelations.ts');
const sanctuaryRewardsPath = path.join(appRoot, 'src', 'db', 'sanctuaryRewards.ts');

const assetRegistry = fs.readFileSync(assetRegistryPath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const itemIds = fs.readFileSync(itemIdsPath, 'utf8');
const archive = fs.readFileSync(archivePath, 'utf8');
const backpack = fs.readFileSync(backpackPath, 'utf8');
const shop = fs.readFileSync(shopPath, 'utf8');
const itemIcon = fs.readFileSync(itemIconPath, 'utf8');
const sanctuaryObject = fs.readFileSync(sanctuaryObjectPath, 'utf8');
const rpgScreen = fs.readFileSync(rpgScreenPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');
const sanctuaryInteractions = fs.readFileSync(sanctuaryInteractionsPath, 'utf8');
const sanctuaryObjectRelations = fs.readFileSync(sanctuaryObjectRelationsPath, 'utf8');
const sanctuaryRewards = fs.readFileSync(sanctuaryRewardsPath, 'utf8');
const failures = [];

function fail(message) {
  failures.push(message);
}

function unique(values, label) {
  const seen = new Set();
  values.forEach(value => {
    if (seen.has(value)) fail(`Duplicate ${label}: ${value}`);
    seen.add(value);
  });
}

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    fail(`Missing block start: ${startMarker}`);
    return '';
  }
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    fail(`Missing block end after ${startMarker}: ${endMarker}`);
    return source.slice(start);
  }
  return source.slice(start, end);
}

function parseForestAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_FOREST_OBJECT_ASSETS = [', '] satisfies readonly RpgForestObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*source:\s*require\('([^']+)'\),\s*pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const tags = [...match[7].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      sourcePath: match[4],
      pixelWidth: Number(match[5]),
      pixelHeight: Number(match[6]),
      tags,
    });
  }
  if (assets.length !== 40) fail(`Expected 40 forest assets, found ${assets.length}`);
  return assets;
}

function parseCrystalAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_CRYSTAL_OBJECT_ASSETS = [', '] satisfies readonly RpgObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*source:\s*require\('([^']+)'\),\s*pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const tags = [...match[7].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      sourcePath: match[4],
      pixelWidth: Number(match[5]),
      pixelHeight: Number(match[6]),
      tags,
    });
  }
  if (assets.length !== 40) fail(`Expected 40 crystal assets, found ${assets.length}`);
  return assets;
}

function parseBushAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_BUSH_OBJECT_ASSETS = [', '] satisfies readonly RpgBushObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*source:\s*require\('([^']+)'\),\s*pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const tags = [...match[7].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      sourcePath: match[4],
      pixelWidth: Number(match[5]),
      pixelHeight: Number(match[6]),
      tags,
    });
  }
  if (assets.length !== 40) fail(`Expected 40 bush assets, found ${assets.length}`);
  return assets;
}

function parseCaveAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_CAVE_OBJECT_ASSETS = [', '] satisfies readonly RpgCaveObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*source:\s*require\('([^']+)'\),\s*pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const tags = [...match[7].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      sourcePath: match[4],
      pixelWidth: Number(match[5]),
      pixelHeight: Number(match[6]),
      tags,
    });
  }
  if (assets.length !== 32) fail(`Expected 32 cave assets, found ${assets.length}`);
  return assets;
}

function parseTempleAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_TEMPLE_OBJECT_ASSETS = [', '] satisfies readonly RpgTempleObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*frame:\s*(?:rpgSpriteFrame\((RPG_TEMPLE_[A-Z_]+_SHEET),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)|(RPG_TEMPLE_ANIMATIONS\.[A-Za-z0-9_]+\.frames\[0\])),\s*(?:animation:\s*(RPG_TEMPLE_ANIMATIONS\.[A-Za-z0-9_]+),\s*)?pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const animationFrame = match[11] ?? null;
    const animation = match[12] ?? null;
    const frame = animationFrame ? templeAnimationFrame(animationFrame) : {
      x: Number(match[5]),
      y: Number(match[6]),
      width: Number(match[7]),
      height: Number(match[8]),
      sheetWidth: Number(match[9]),
      sheetHeight: Number(match[10]),
    };
    const tags = [...match[15].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      sheet: match[4] ?? templeAnimationSheet(animationFrame),
      frame,
      animation,
      pixelWidth: Number(match[13]),
      pixelHeight: Number(match[14]),
      tags,
    });
  }
  if (assets.length !== 24) fail(`Expected 24 temple assets, found ${assets.length}`);
  return assets;
}

function parseTempleAnimations() {
  const block = extractBlock(assetRegistry, 'export const RPG_TEMPLE_ANIMATIONS = {', '} satisfies Record<string, RpgSpriteAnimation>;');
  const regex = /([A-Za-z0-9_]+):\s*rpgSpriteAnimationGrid\((RPG_TEMPLE_[A-Z_]+_SHEET),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/g;
  const animations = {};
  let match;
  while ((match = regex.exec(block))) {
    animations[`RPG_TEMPLE_ANIMATIONS.${match[1]}`] = {
      sheet: match[2],
      frameWidth: Number(match[3]),
      frameHeight: Number(match[4]),
      columns: Number(match[5]),
      rows: Number(match[6]),
      fps: Number(match[7]),
    };
  }
  return animations;
}

function templeAnimationFrame(animationFrame) {
  const animationId = animationFrame?.replace(/\.frames\[0\]$/, '');
  const animation = templeAnimations[animationId];
  if (!animation) return { x: 0, y: 0, width: 0, height: 0, sheetWidth: 0, sheetHeight: 0 };
  return {
    x: 0,
    y: 0,
    width: animation.frameWidth,
    height: animation.frameHeight,
    sheetWidth: animation.frameWidth * animation.columns,
    sheetHeight: animation.frameHeight * animation.rows,
  };
}

function templeAnimationSheet(animationFrame) {
  const animationId = animationFrame?.replace(/\.frames\[0\]$/, '');
  return templeAnimations[animationId]?.sheet ?? null;
}

function parseRegistryIds(objectAssets) {
  const explicitIds = [...assetRegistry.matchAll(/\n\s+'([^']+)':\s*\{/g)].map(match => match[1]);
  return new Set([...explicitIds, ...objectAssets.map(asset => asset.assetId)]);
}

function parseWaterDropItemId() {
  const match = itemIds.match(/RPG_WATER_DROPS_ITEM_ID\s*=\s*'([^']+)'/);
  if (!match) {
    fail('Missing RPG_WATER_DROPS_ITEM_ID export');
    return 'rpg_water_drops';
  }
  return match[1];
}

function parseCrystalShardItemId() {
  const match = itemIds.match(/RPG_CRYSTAL_SHARDS_ITEM_ID\s*=\s*'([^']+)'/);
  if (!match) {
    fail('Missing RPG_CRYSTAL_SHARDS_ITEM_ID export');
    return 'rpg_crystal_shards';
  }
  return match[1];
}

function parseCatalogItemIds(objectAssets) {
  const block = extractBlock(catalog, 'export const RPG_ITEM_CATALOG = {', '} satisfies Record<string, RpgItemDefinition>;');
  const ids = new Set(objectAssets.map(asset => asset.itemId));
  const waterDropId = parseWaterDropItemId();
  const crystalShardId = parseCrystalShardItemId();
  if (block.includes('[RPG_WATER_DROPS_ITEM_ID]')) ids.add(waterDropId);
  if (block.includes('[RPG_CRYSTAL_SHARDS_ITEM_ID]')) ids.add(crystalShardId);

  for (const match of block.matchAll(/\n\s*([A-Za-z0-9_]+):\s*\{/g)) {
    ids.add(match[1]);
  }
  for (const match of block.matchAll(/\n\s*'([^']+)':\s*\{/g)) {
    ids.add(match[1]);
  }
  return ids;
}

function validateForestAssets(forestAssets) {
  unique(forestAssets.map(asset => asset.itemId), 'forest itemId');
  unique(forestAssets.map(asset => asset.assetId), 'forest assetId');

  forestAssets.forEach(asset => {
    const resolvedPath = path.resolve(engineDir, asset.sourcePath);
    if (!fs.existsSync(resolvedPath)) fail(`Missing forest asset file for ${asset.itemId}: ${asset.sourcePath}`);
    if (!asset.assetId.startsWith('object.')) fail(`Forest assetId must start with object.: ${asset.assetId}`);
    if (asset.pixelWidth <= 0 || asset.pixelHeight <= 0) fail(`Invalid dimensions for ${asset.itemId}`);
    if (asset.tags.length === 0) fail(`Missing tags for ${asset.itemId}`);
    if (!asset.tags.includes('forest')) fail(`Forest asset missing forest tag: ${asset.itemId}`);
  });
}

function validateCrystalAssets(crystalAssets) {
  unique(crystalAssets.map(asset => asset.itemId), 'crystal itemId');
  unique(crystalAssets.map(asset => asset.assetId), 'crystal assetId');

  crystalAssets.forEach(asset => {
    const resolvedPath = path.resolve(engineDir, asset.sourcePath);
    if (!fs.existsSync(resolvedPath)) fail(`Missing crystal asset file for ${asset.itemId}: ${asset.sourcePath}`);
    if (!asset.assetId.startsWith('object.crystal.')) fail(`Crystal assetId must start with object.crystal.: ${asset.assetId}`);
    if (asset.pixelWidth <= 0 || asset.pixelHeight <= 0) fail(`Invalid dimensions for ${asset.itemId}`);
    if (!asset.tags.includes('crystal')) fail(`Crystal asset missing crystal tag: ${asset.itemId}`);
    if (!asset.tags.includes('cave')) fail(`Crystal asset missing cave tag: ${asset.itemId}`);
  });
}

function validateBushAssets(bushAssets) {
  unique(bushAssets.map(asset => asset.itemId), 'bush itemId');
  unique(bushAssets.map(asset => asset.assetId), 'bush assetId');

  bushAssets.forEach(asset => {
    const resolvedPath = path.resolve(engineDir, asset.sourcePath);
    if (!fs.existsSync(resolvedPath)) fail(`Missing bush asset file for ${asset.itemId}: ${asset.sourcePath}`);
    if (!asset.assetId.startsWith('object.bush.')) fail(`Bush assetId must start with object.bush.: ${asset.assetId}`);
    if (![16, 32, 64].includes(asset.pixelWidth)) fail(`Unexpected bush width for ${asset.itemId}: ${asset.pixelWidth}`);
    if (![16, 32, 64].includes(asset.pixelHeight)) fail(`Unexpected bush height for ${asset.itemId}: ${asset.pixelHeight}`);
    if (!asset.tags.includes('plant')) fail(`Bush asset missing plant tag: ${asset.itemId}`);
  });
}

function validateCaveAssets(caveAssets) {
  unique(caveAssets.map(asset => asset.itemId), 'cave itemId');
  unique(caveAssets.map(asset => asset.assetId), 'cave assetId');

  caveAssets.forEach(asset => {
    const resolvedPath = path.resolve(engineDir, asset.sourcePath);
    if (!fs.existsSync(resolvedPath)) fail(`Missing cave asset file for ${asset.itemId}: ${asset.sourcePath}`);
    if (!asset.assetId.startsWith('object.cave.')) fail(`Cave assetId must start with object.cave.: ${asset.assetId}`);
    if (![32, 64, 128, 256].includes(asset.pixelWidth)) fail(`Unexpected cave width for ${asset.itemId}: ${asset.pixelWidth}`);
    if (![32, 64, 128, 256].includes(asset.pixelHeight)) fail(`Unexpected cave height for ${asset.itemId}: ${asset.pixelHeight}`);
    if (!asset.tags.includes('cave')) fail(`Cave asset missing cave tag: ${asset.itemId}`);
  });
}

function validateTempleAssets(templeAssets) {
  unique(templeAssets.map(asset => asset.itemId), 'temple itemId');
  unique(templeAssets.map(asset => asset.assetId), 'temple assetId');

  const sheetDimensions = {
    RPG_TEMPLE_EXTERIOR_OBJECTS_SHEET: { width: 352, height: 656 },
    RPG_TEMPLE_INTERIOR_OBJECTS_SHEET: { width: 384, height: 256 },
    RPG_TEMPLE_FIRE_ANIMATION_SHEET: { width: 128, height: 480 },
    RPG_TEMPLE_CHEST_ANIMATION_SHEET: { width: 80, height: 192 },
    RPG_TEMPLE_SPIKES_ANIMATION_SHEET: { width: 384, height: 64 },
    RPG_TEMPLE_BLADES_TRAP_ANIMATION_SHEET: { width: 192, height: 144 },
    RPG_TEMPLE_LEVER_SHEET: { width: 80, height: 256 },
    RPG_TEMPLE_LATTICE_SHEET: { width: 160, height: 384 },
  };

  templeAssets.forEach(asset => {
    const dimensions = sheetDimensions[asset.sheet];
    if (!dimensions) fail(`Unexpected temple sheet for ${asset.itemId}: ${asset.sheet}`);
    if (!assetRegistry.includes(`const ${asset.sheet} = require(`)) fail(`Missing temple sheet source constant: ${asset.sheet}`);
    if (!asset.assetId.startsWith('object.temple.')) fail(`Temple assetId must start with object.temple.: ${asset.assetId}`);
    if (!asset.tags.includes('temple')) fail(`Temple asset missing temple tag: ${asset.itemId}`);
    if (asset.tags.includes('animated') && !asset.animation) fail(`Animated temple asset missing animation metadata: ${asset.itemId}`);
    if (asset.animation && !asset.tags.includes('animated')) fail(`Temple animation asset missing animated tag: ${asset.itemId}`);
    if (asset.pixelWidth !== asset.frame.width || asset.pixelHeight !== asset.frame.height) {
      fail(`Temple pixel dimensions must match frame dimensions for ${asset.itemId}`);
    }
    if (asset.frame.sheetWidth !== dimensions.width || asset.frame.sheetHeight !== dimensions.height) {
      fail(`Temple sheet dimensions mismatch for ${asset.itemId}`);
    }
    if (asset.frame.x < 0 || asset.frame.y < 0 || asset.frame.width <= 0 || asset.frame.height <= 0) {
      fail(`Invalid temple frame bounds for ${asset.itemId}`);
    }
    if (asset.frame.x + asset.frame.width > dimensions.width || asset.frame.y + asset.frame.height > dimensions.height) {
      fail(`Temple frame exceeds sheet bounds for ${asset.itemId}`);
    }
  });
}

function validateTempleAnimations(animations) {
  const expected = {
    'RPG_TEMPLE_ANIMATIONS.fireBowl': { sheet: 'RPG_TEMPLE_FIRE_ANIMATION_SHEET', frameWidth: 32, frameHeight: 32, columns: 4, rows: 15 },
    'RPG_TEMPLE_ANIMATIONS.chest': { sheet: 'RPG_TEMPLE_CHEST_ANIMATION_SHEET', frameWidth: 40, frameHeight: 32, columns: 2, rows: 6 },
    'RPG_TEMPLE_ANIMATIONS.spikes': { sheet: 'RPG_TEMPLE_SPIKES_ANIMATION_SHEET', frameWidth: 32, frameHeight: 32, columns: 12, rows: 2 },
    'RPG_TEMPLE_ANIMATIONS.bladeTrap': { sheet: 'RPG_TEMPLE_BLADES_TRAP_ANIMATION_SHEET', frameWidth: 64, frameHeight: 48, columns: 3, rows: 3 },
  };

  Object.entries(expected).forEach(([id, expectedConfig]) => {
    const animation = animations[id];
    if (!animation) {
      fail(`Missing temple animation: ${id}`);
      return;
    }
    Object.entries(expectedConfig).forEach(([key, value]) => {
      if (animation[key] !== value) fail(`Temple animation ${id} expected ${key}=${value}, found ${animation[key]}`);
    });
    if (animation.fps <= 0) fail(`Temple animation must have positive fps: ${id}`);
  });
}

function validateAssetReferences(registryIds) {
  const refs = [...catalog.matchAll(/(?:assetId|iconAssetId):\s*'([^']+)'/g)].map(match => match[1]);
  refs.forEach(ref => {
    if (!registryIds.has(ref)) fail(`Catalog references missing asset registry id: ${ref}`);
  });
}

function validateDropReferences(catalogItemIds) {
  const dropRefs = [...catalog.matchAll(/itemId:\s*'([^']+)'/g)].map(match => match[1]);
  dropRefs.forEach(itemId => {
    if (!catalogItemIds.has(itemId)) fail(`Drop table references missing item id: ${itemId}`);
  });
}

function validateSeedReferences(forestAssets, catalogItemIds) {
  const forestItemIds = new Set(forestAssets.map(asset => asset.itemId));
  const seedMapBlock = extractBlock(catalog, 'const TREE_SEEDS_BY_OBJECT: Record<string, string> = {', '};');
  for (const match of seedMapBlock.matchAll(/\n\s*(?:'([^']+)'|([A-Za-z0-9_]+)):\s*'([^']+)'/g)) {
    const objectId = match[1] ?? match[2];
    const seedId = match[3];
    if (!forestItemIds.has(objectId)) fail(`Seed map references missing forest object: ${objectId}`);
    if (!catalogItemIds.has(seedId)) fail(`Seed map references missing seed item: ${seedId}`);
  }

  const cropBlock = extractBlock(catalog, 'export const RPG_CROP_CATALOG = {', '} satisfies Record<string, RpgCropDefinition>;');
  for (const match of cropBlock.matchAll(/treeSeedCrop\('([^']+)'/g)) {
    const seedId = match[1];
    if (!catalogItemIds.has(seedId)) fail(`Crop catalog references missing seed item: ${seedId}`);
  }
}

function validatePlaceableMetadata(forestAssets) {
  const largeAssets = forestAssets.filter(asset => asset.pixelWidth >= 256 || asset.tags.includes('large'));
  if (largeAssets.length === 0) fail('Expected at least one large forest asset to exercise multi-tile footprint rules');

  const trees = forestAssets.filter(asset => asset.tags.includes('tree'));
  const mushrooms = forestAssets.filter(asset => asset.tags.includes('mushroom'));
  if (trees.length === 0) fail('Expected tree-tagged forest assets');
  if (mushrooms.length === 0) fail('Expected mushroom-tagged forest assets');
}

function validateCrystalMetadata(crystalAssets, catalogItemIds) {
  const crystals = crystalAssets.filter(asset => asset.tags.includes('crystal'));
  if (crystals.length !== 40) fail(`Expected 40 crystal-tagged assets, found ${crystals.length}`);
  if (!catalog.includes("sourceLabel: 'Crystal Archive'")) fail('Crystal objects must expose source label metadata');
  if (!catalog.includes('CRYSTAL_FORAGE_DROPS')) fail('Crystal objects must expose forage drops');
  if (!catalogItemIds.has(parseCrystalShardItemId())) fail('Catalog item ids must include Crystal Shards resource');
}

function validateBushMetadata(bushAssets) {
  const foragePlants = bushAssets.filter(asset => asset.tags.includes('forage'));
  const cacti = bushAssets.filter(asset => asset.tags.includes('cactus'));
  if (foragePlants.length === 0) fail('Expected forage-tagged bush assets');
  if (cacti.length === 0) fail('Expected cactus-tagged bush assets');
  if (!catalog.includes("sourceLabel: 'Bush Archive'")) fail('Bush objects must expose source label metadata');
  if (!catalog.includes('RPG_BUSH_OBJECT_CATALOG')) fail('Catalog must expose bush object catalog');
  if (!shop.includes("{ id: 'bush', label: 'Bushes' }")) fail('Shop must expose a bush filter');
  if (!shop.includes("{ id: 'cactus', label: 'Cacti' }")) fail('Shop must expose a cactus filter');
}

function validateCaveMetadata(caveAssets) {
  const structures = caveAssets.filter(asset => asset.tags.includes('structure'));
  const relics = caveAssets.filter(asset => asset.tags.includes('relic'));
  const mushrooms = caveAssets.filter(asset => asset.tags.includes('mushroom'));
  if (structures.length === 0) fail('Expected structure-tagged cave assets');
  if (relics.length === 0) fail('Expected relic-tagged cave assets');
  if (mushrooms.length === 0) fail('Expected mushroom-tagged cave assets');
  if (!catalog.includes("sourceLabel: 'Cave Archive'")) fail('Cave objects must expose source label metadata');
  if (!catalog.includes('RPG_CAVE_OBJECT_CATALOG')) fail('Catalog must expose cave object catalog');
  if (!shop.includes("{ id: 'cave', label: 'Cave' }")) fail('Shop must expose a cave filter');
}

function validateTempleMetadata(templeAssets) {
  const structures = templeAssets.filter(asset => asset.tags.includes('structure'));
  const relics = templeAssets.filter(asset => asset.tags.includes('relic') || asset.tags.includes('statue'));
  const decor = templeAssets.filter(asset => asset.tags.includes('decor') || asset.tags.includes('banner'));
  const hazards = templeAssets.filter(asset => asset.tags.includes('hazard') || asset.tags.includes('trap'));
  const mechanisms = templeAssets.filter(asset => asset.tags.includes('mechanism'));
  if (structures.length === 0) fail('Expected structure-tagged temple assets');
  if (relics.length === 0) fail('Expected relic/statue-tagged temple assets');
  if (decor.length === 0) fail('Expected decor/banner-tagged temple assets');
  if (hazards.length === 0) fail('Expected hazard/trap-tagged temple assets');
  if (mechanisms.length === 0) fail('Expected mechanism-tagged temple assets');
  if (!catalog.includes("asset.tags.includes('trap')")) fail('Temple object descriptions/footprints must classify trap props');
  if (!catalog.includes("asset.tags.includes('mechanism')")) fail('Temple object descriptions/footprints must classify mechanism props');
  if (!catalog.includes("sourceLabel: 'Temple Archive'")) fail('Temple objects must expose source label metadata');
  if (!catalog.includes('RPG_TEMPLE_OBJECT_CATALOG')) fail('Catalog must expose temple object catalog');
  if (!catalog.includes("icon: asset.frame")) fail('Temple catalog must use verified sprite frames as icons');
  if (!catalog.includes("animation: asset.animation")) fail('Temple catalog must pass animation metadata into items');
  if (!catalog.includes("{ id: 'temple', label: 'Temple', sourceLabel: 'Temple Archive' }")) fail('Shared source filters must expose a temple pack');
  if (!assetRegistry.includes('...RPG_TEMPLE_OBJECT_ASSETS')) fail('Runtime asset registry must include temple object assets');
  if (!assetRegistry.includes('animation: asset.animation')) fail('Runtime asset registry must include object animation metadata');
  if (!assetRegistry.includes('asset.source !== undefined')) fail('Object source map must filter frame-only assets by explicit undefined checks');
  if (!assetRegistry.includes('Partial<Record<string, any>>')) fail('Object source map must be typed as partial for frame-only assets');
}

function validateContentMetadata() {
  if (!catalog.includes("export type RpgItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';")) {
    fail('Missing RpgItemRarity union type');
  }
  if (!catalog.includes("export type RpgSourcePackId = 'all' | 'forest' | 'crystal' | 'bush' | 'cave' | 'temple';")) {
    fail('Catalog must expose shared source pack ids');
  }
  if (!catalog.includes('export const RPG_SOURCE_PACK_FILTERS')) fail('Catalog must expose shared source pack filters');
  if (!catalog.includes('export function countRpgSourcePacks')) fail('Catalog must expose shared source pack count helper');
  if (!catalog.includes('rarity?: RpgItemRarity;')) fail('Catalog items must expose rarity metadata');
  if (!catalog.includes('sourceLabel?: string;')) fail('Catalog items must expose sourceLabel metadata');
  if (!catalog.includes('function forestObjectRarity')) fail('Missing forest object rarity derivation');
  if (!catalog.includes("sourceLabel: 'Forest Archive'")) fail('Forest objects must expose source label metadata');
  if (!catalog.includes("rarity: item.rarity ?? 'common'")) fail('Archive entries must preserve item rarity');
  if (!catalog.includes("sourceLabel: item.sourceLabel ?? 'Sanctuary'")) fail('Archive entries must preserve item source label');
  if (!catalog.includes('facts: getRpgItemFacts(item, catalog)')) fail('Archive entries must derive detail facts from catalog metadata');
  if (!catalog.includes('Footprint:')) fail('Object facts must expose placement footprint metadata');
  if (!catalog.includes('Harvest:')) fail('Seed facts must expose harvest metadata');
}

function validateArchiveScalabilityControls() {
  if (!archive.includes("type ArchiveSort = 'name' | 'rarity' | 'status';")) fail('Archive must expose stable sort modes');
  if (!archive.includes('RPG_SOURCE_PACK_FILTERS')) fail('Archive must use shared source pack filters');
  if (archive.includes('ARCHIVE_SOURCE_FILTERS')) fail('Archive must not duplicate source pack filter definitions');
  if (!archive.includes('archiveSourceMatches')) fail('Archive source filters must use catalog source labels');
  if (!archive.includes('sourceCounts')) fail('Archive must show source pack counts');
  if (!archive.includes('TextInput')) fail('Archive must include search input for large catalogs');
  if (!archive.includes('archiveEntryMatchesQuery')) fail('Archive search must use catalog-derived entry data');
  if (!archive.includes('Showing {filteredEntries.length}')) fail('Archive summary must expose filtered result count');
}

function validateBackpackScalabilityControls() {
  if (!backpack.includes("type BackpackSort = 'kind' | 'name' | 'quantity';")) fail('Backpack must expose stable sort modes');
  if (!backpack.includes('RPG_SOURCE_PACK_FILTERS')) fail('Backpack must use shared source pack filters');
  if (backpack.includes('BACKPACK_SOURCE_FILTERS')) fail('Backpack must not duplicate source pack filter definitions');
  if (!backpack.includes('backpackSlotMatchesSource')) fail('Backpack source filters must use catalog source labels');
  if (!backpack.includes('sourceCounts')) fail('Backpack must show source pack counts');
  if (!backpack.includes('TextInput')) fail('Backpack must include search input for large inventories');
  if (!backpack.includes('backpackSlotMatchesQuery')) fail('Backpack search must use catalog-derived item data');
  if (!backpack.includes('Showing {filteredInventory.length}')) fail('Backpack summary must expose filtered result count');
}

function validateShopScalabilityControls() {
  if (!shop.includes('RPG_SOURCE_PACK_FILTERS')) fail('Shop must use shared source pack filters');
  if (shop.includes('SHOP_SOURCE_FILTERS')) fail('Shop must not duplicate source pack filter definitions');
  if (!shop.includes('matchesShopSource')) fail('Shop source filters must use catalog source labels');
  if (!shop.includes('sourceCounts')) fail('Shop must show source pack counts');
  if (!shop.includes('TextInput')) fail('Shop must include search input for large catalogs');
  if (!shop.includes('shopEntryMatchesQuery')) fail('Shop search must use catalog-derived item data');
  if (!shop.includes('Showing {filteredShopEntries.length}')) fail('Shop summary must expose filtered result count');
  if (!shop.includes('No matches')) fail('Shop must expose a safe empty search state');
}

function validateWorldArtRenderer() {
  if (!itemIcon.includes('export function RpgSpriteAnimationView')) fail('Shared item renderer must expose sprite animation view');
  if (!itemIcon.includes('item?.animation')) fail('Shared item renderer must support catalog animation metadata');
  if (!itemIcon.includes('export function RpgItemWorldArt')) fail('Shared item art renderer must expose RpgItemWorldArt');
  if (!itemIcon.includes('item?.icon')) fail('Shared item art renderer must support sprite-frame icons');
  const worldArtStart = itemIcon.indexOf('export function RpgItemWorldArt');
  const iconBranch = itemIcon.indexOf('if (item?.icon)', worldArtStart);
  const sourceBranch = itemIcon.indexOf('if (item?.source)', worldArtStart);
  if (iconBranch === -1 || sourceBranch === -1 || iconBranch > sourceBranch) {
    fail('Shared item world art renderer must prefer sprite frames before whole-image sources');
  }
  if (!sanctuaryObject.includes('RpgItemWorldArt')) fail('Placed sanctuary objects must use shared item art rendering');
  if (!rpgScreen.includes('RpgItemWorldArt')) fail('Build ghost must use shared item art rendering');
}

function validateSanctuaryInteractionMemory() {
  if (!schema.includes('CREATE TABLE IF NOT EXISTS sanctuary_object_interactions')) {
    fail('Schema must create sanctuary_object_interactions for object interaction memory');
  }
  if (!schema.includes('PRIMARY KEY (object_id, interaction_kind)')) {
    fail('Object interaction memory must be unique per object and interaction kind');
  }
  if (!sanctuaryInteractions.includes('export function markSanctuaryObjectInteraction')) {
    fail('Object interaction memory must expose a mark helper');
  }
  if (!sanctuaryInteractions.includes('ON CONFLICT(object_id, interaction_kind) DO UPDATE')) {
    fail('Object interaction memory mark helper must increment repeated interactions');
  }
  if (!sanctuaryInteractions.includes('export function deleteSanctuaryObjectInteractions')) {
    fail('Object interaction memory must expose cleanup for stashed/deleted objects');
  }
  if (!rpgScreen.includes('markSanctuaryObjectInteraction(object.id, object.type, \'inspect\')')) {
    fail('RPG object interactions must record inspect memory');
  }
  if (!rpgScreen.includes('recordRpgDiscovery(object.type, \'inspect\')')) {
    fail('First object inspections must record RPG discovery');
  }
  if (!rpgScreen.includes('deleteSanctuaryObjectInteractions(selectedObject.id)')) {
    fail('Stashing an object must clear its interaction memory');
  }
}

function validateSanctuaryRewardClaims() {
  if (!schema.includes('CREATE TABLE IF NOT EXISTS sanctuary_reward_claims')) {
    fail('Schema must create sanctuary_reward_claims for once-only object rewards');
  }
  if (!schema.includes('claim_key TEXT PRIMARY KEY')) {
    fail('Reward claims must be keyed by a stable claim_key');
  }
  if (!catalog.includes('export type RpgInteractionLoot')) {
    fail('Catalog must expose typed interaction loot metadata');
  }
  if (!catalog.includes('interactLoot?: RpgInteractionLoot')) {
    fail('Placeable catalog items must optionally expose interaction loot');
  }
  if (!catalog.includes('claimKey: `sanctuary_chest:${asset.itemId}`')) {
    fail('Temple chest loot must use stable per-item claim keys');
  }
  if (!sanctuaryRewards.includes('export function claimSanctuaryReward')) {
    fail('Reward claims must expose an atomic claim helper');
  }
  if (!sanctuaryRewards.includes('INSERT OR IGNORE INTO sanctuary_reward_claims')) {
    fail('Reward claim helper must prevent duplicate reward grants');
  }
  if (!sanctuaryRewards.includes("recordRpgDiscovery(drop.itemId, 'loot')")) {
    fail('Reward drops must record RPG discovery with loot source');
  }
  if (!rpgScreen.includes('claimSanctuaryReward(')) {
    fail('RPG object interaction must route chest rewards through claimSanctuaryReward');
  }
  if (!rpgScreen.includes("result.reason === 'already_claimed' ? 'Chest is empty'")) {
    fail('Claimed chests must report an empty state instead of granting repeat rewards');
  }
}

function validateLeverToggleFeedback() {
  if (!sanctuaryInteractions.includes("'toggle_lever'")) {
    fail('Object interaction memory must support toggle_lever interactions');
  }
  if (!rpgScreen.includes('const isLeverObject = (item: ShopCatalogItem)')) {
    fail('RPG screen must centralize lever object detection');
  }
  if (!rpgScreen.includes("markSanctuaryObjectInteraction(object.id, object.type, 'toggle_lever')")) {
    fail('Lever interactions must persist toggle count through object interaction memory');
  }
  if (!rpgScreen.includes('toggle.count % 2 === 1')) {
    fail('Lever toggle state must derive from persisted toggle count parity');
  }
  if (!rpgScreen.includes('Lever switched on') || !rpgScreen.includes('Lever switched off')) {
    fail('Lever interactions must show on/off feedback');
  }
  if (rpgScreen.includes('UPDATE sanctuary_objects SET type')) {
    fail('Lever toggle feedback must not mutate object type or placement state');
  }
}

function validateTrapDisableFeedback() {
  if (!sanctuaryInteractions.includes("'disable_trap'")) {
    fail('Object interaction memory must support disable_trap interactions');
  }
  if (!rpgScreen.includes('const isTrapObject = (item: ShopCatalogItem)')) {
    fail('RPG screen must centralize trap object detection');
  }
  if (!rpgScreen.includes("markSanctuaryObjectInteraction(object.id, object.type, 'disable_trap')")) {
    fail('Trap interactions must persist disable state through object interaction memory');
  }
  if (!rpgScreen.includes('Trap disarmed') || !rpgScreen.includes('Trap re-armed')) {
    fail('Trap interactions must show disarm/re-arm feedback');
  }
  if (rpgScreen.includes('UPDATE rpg_state SET hp')) {
    fail('Trap feedback phase must not add HP damage rules');
  }
  if (rpgScreen.includes('disable_trap_collision')) fail('Trap feedback must not mutate movement collision state');
}

function validateGateRattleFeedback() {
  if (!sanctuaryInteractions.includes("'rattle_gate'")) {
    fail('Object interaction memory must support rattle_gate interactions');
  }
  if (!rpgScreen.includes('const isGateObject = (item: ShopCatalogItem)')) {
    fail('RPG screen must centralize gate object detection');
  }
  if (!rpgScreen.includes("markSanctuaryObjectInteraction(object.id, object.type, 'rattle_gate')")) {
    fail('Gate interactions must persist rattle count through object interaction memory');
  }
  if (!rpgScreen.includes('Gate rattles') || !rpgScreen.includes('Gate stays locked')) {
    fail('Gate interactions must show locked gate feedback');
  }
  if (rpgScreen.includes('open_gate_collision') || rpgScreen.includes('gateOpen')) {
    fail('Gate rattle feedback phase must not mutate gate open/collision state');
  }
}

function validateInteractionTargetPrompt() {
  if (!rpgScreen.includes("type InteractionTargetKind = 'object' | 'plot' | 'portal';")) {
    fail('RPG screen must type interaction target prompt kinds');
  }
  if (!rpgScreen.includes('type InteractionTargetCell = { row: number; col: number };')) {
    fail('RPG screen must type interaction target reticle cells');
  }
  if (!rpgScreen.includes('cells: InteractionTargetCell[];')) {
    fail('Interaction target model must carry reticle footprint cells');
  }
  if (!rpgScreen.includes('const [interactionPrompt, setInteractionPrompt] = useState<InteractionTarget | null>(null);')) {
    fail('RPG screen must keep a current interaction prompt state');
  }
  if (!rpgScreen.includes('const resolveInteractionTargetAt = useCallback')) {
    fail('RPG screen must centralize interaction target resolution');
  }
  if (!rpgScreen.includes('runOnJS(updateInteractionPromptFromTile)(row, col)')) {
    fail('Interaction prompt must update from tile changes without DB work in the frame loop');
  }
  if (!rpgScreen.includes("resolvedTarget?.kind === 'object'") || !rpgScreen.includes("resolvedTarget?.kind === 'plot'")) {
    fail('Interact button must consume the same resolved target model as the prompt');
  }
  if (!rpgScreen.includes('styles.interactionPrompt')) {
    fail('RPG screen must render a visible interaction prompt');
  }
  if (!rpgScreen.includes('interactionPrompt?.cells.map')) {
    fail('RPG screen must render world-space reticle cells from the target model');
  }
  if (!rpgScreen.includes('styles.interactionTargetCell')) {
    fail('RPG screen must style target reticle cells');
  }
  if (!rpgScreen.includes('{!buildItem && interactionPrompt?.cells.map')) {
    fail('Target reticle must hide while build mode is active');
  }
  if (!rpgScreen.includes("isTargeted={interactionPrompt?.kind === 'object'")) {
    fail('Targeted placed object must receive highlight state');
  }
  if (!sanctuaryObject.includes('isTargeted?: boolean')) {
    fail('SanctuaryObject must accept targeted highlight state');
  }
  const frameStart = rpgScreen.indexOf('useFrameCallback((frameInfo)');
  const frameEnd = rpgScreen.indexOf('const cameraX = useDerivedValue', frameStart);
  const frameBlock = frameStart >= 0 && frameEnd > frameStart ? rpgScreen.slice(frameStart, frameEnd) : '';
  if (frameBlock.includes('db.')) {
    fail('Interaction target frame loop must not perform SQLite work');
  }
}

function validateActionButtonProtocol() {
  if (rpgScreen.includes("buildItem ? 'Place' : 'Interact'")) {
    fail('Primary action button must keep Interact label even in build mode');
  }
  if (!rpgScreen.includes('<Text style={styles.actionText}>Interact</Text>')) {
    fail('Primary action button must render the stable Interact label');
  }
  if (!rpgScreen.includes('<Text style={styles.actionText}>Attack</Text>')) {
    fail('Secondary action button must render the stable Attack label');
  }
  if (!rpgScreen.includes('buildItem && styles.disabledBtn')) {
    fail('Attack button must remain visibly disabled in build mode instead of being replaced');
  }
}

function validateEmptyInteractionFeedback() {
  if (!rpgScreen.includes('const emptyInteractCooldownUntil = useRef(0);')) {
    fail('RPG screen must throttle empty Interact feedback');
  }
  if (!rpgScreen.includes('const showEmptyInteractionFeedback = (zone: Zone)')) {
    fail('RPG screen must centralize empty Interact feedback');
  }
  if (!rpgScreen.includes("text: zone === 'sanctuary' ? 'Nothing here' : 'Nothing nearby'")) {
    fail('Empty Interact feedback must be visible and zone-aware');
  }
  if (!rpgScreen.includes("showEmptyInteractionFeedback('sanctuary')")) {
    fail('Empty sanctuary Interact must show visible feedback');
  }
  if (!rpgScreen.includes("showEmptyInteractionFeedback('dungeon')")) {
    fail('Empty dungeon Interact must show visible feedback');
  }
  if (rpgScreen.includes('console.log(`[Interact] Sanctuary tile') || rpgScreen.includes('console.log(`[Interact] Dungeon tile')) {
    fail('Empty Interact paths must not be console-only');
  }
}

function validateSanctuaryObjectRelations() {
  if (!schema.includes('CREATE TABLE IF NOT EXISTS sanctuary_object_relations')) {
    fail('Schema must create sanctuary_object_relations for future object links');
  }
  if (!schema.includes('PRIMARY KEY (source_object_id, target_object_id, relation_kind)')) {
    fail('Object relations must be unique per source, target, and relation kind');
  }
  if (!schema.includes('idx_sanctuary_object_relations_target')) {
    fail('Object relations must index target lookups for cleanup and future reverse links');
  }
  if (!sanctuaryObjectRelations.includes("export type SanctuaryObjectRelationKind = 'lever_opens_gate' | 'lever_disarms_trap';")) {
    fail('Object relations must expose typed lever gate/trap relation kinds');
  }
  if (!sanctuaryObjectRelations.includes('sourceObjectId === targetObjectId')) {
    fail('Object relations must reject self-links');
  }
  if (!sanctuaryObjectRelations.includes('ON CONFLICT(source_object_id, target_object_id, relation_kind) DO UPDATE')) {
    fail('Object relations must upsert stable links instead of duplicating them');
  }
  if (!sanctuaryObjectRelations.includes('export function getSanctuaryObjectRelations')) {
    fail('Object relations must expose source lookup helper');
  }
  if (!sanctuaryObjectRelations.includes('export function deleteSanctuaryObjectRelationsForObject')) {
    fail('Object relations must expose cleanup helper for deleted objects');
  }
  if (!rpgScreen.includes('deleteSanctuaryObjectRelationsForObject(selectedObject.id)')) {
    fail('Stashing an object must clear source and target object relations');
  }
  if (rpgScreen.includes('lever_opens_gate') || rpgScreen.includes('lever_disarms_trap')) {
    fail('Relation foundation phase must not wire lever relation side effects into the RPG screen');
  }
}

const forestAssets = parseForestAssets();
const crystalAssets = parseCrystalAssets();
const bushAssets = parseBushAssets();
const caveAssets = parseCaveAssets();
const templeAnimations = parseTempleAnimations();
const templeAssets = parseTempleAssets();
const objectAssets = [...forestAssets, ...crystalAssets, ...bushAssets, ...caveAssets, ...templeAssets];
const registryIds = parseRegistryIds(objectAssets);
const catalogItemIds = parseCatalogItemIds(objectAssets);

validateForestAssets(forestAssets);
validateCrystalAssets(crystalAssets);
validateBushAssets(bushAssets);
validateCaveAssets(caveAssets);
validateTempleAnimations(templeAnimations);
validateTempleAssets(templeAssets);
unique(objectAssets.map(asset => asset.itemId), 'object itemId');
unique(objectAssets.map(asset => asset.assetId), 'object assetId');
validateAssetReferences(registryIds);
validateDropReferences(catalogItemIds);
validateSeedReferences(forestAssets, catalogItemIds);
validatePlaceableMetadata(forestAssets);
validateCrystalMetadata(crystalAssets, catalogItemIds);
validateBushMetadata(bushAssets);
validateCaveMetadata(caveAssets);
validateTempleMetadata(templeAssets);
validateContentMetadata();
validateArchiveScalabilityControls();
validateBackpackScalabilityControls();
validateShopScalabilityControls();
validateWorldArtRenderer();
validateSanctuaryInteractionMemory();
validateSanctuaryRewardClaims();
validateLeverToggleFeedback();
validateTrapDisableFeedback();
validateGateRattleFeedback();
validateInteractionTargetPrompt();
validateActionButtonProtocol();
validateEmptyInteractionFeedback();
validateSanctuaryObjectRelations();

if (failures.length > 0) {
  console.error('RPG content validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`RPG content validation passed (${forestAssets.length} forest assets, ${crystalAssets.length} crystal assets, ${bushAssets.length} bush assets, ${caveAssets.length} cave assets, ${templeAssets.length} temple assets, ${catalogItemIds.size} catalog items).`);
