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

const assetRegistry = fs.readFileSync(assetRegistryPath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const itemIds = fs.readFileSync(itemIdsPath, 'utf8');
const archive = fs.readFileSync(archivePath, 'utf8');
const backpack = fs.readFileSync(backpackPath, 'utf8');
const shop = fs.readFileSync(shopPath, 'utf8');
const itemIcon = fs.readFileSync(itemIconPath, 'utf8');
const sanctuaryObject = fs.readFileSync(sanctuaryObjectPath, 'utf8');
const rpgScreen = fs.readFileSync(rpgScreenPath, 'utf8');
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
  if (assets.length !== 20) fail(`Expected 20 temple assets, found ${assets.length}`);
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
  if (structures.length === 0) fail('Expected structure-tagged temple assets');
  if (relics.length === 0) fail('Expected relic/statue-tagged temple assets');
  if (decor.length === 0) fail('Expected decor/banner-tagged temple assets');
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

if (failures.length > 0) {
  console.error('RPG content validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`RPG content validation passed (${forestAssets.length} forest assets, ${crystalAssets.length} crystal assets, ${bushAssets.length} bush assets, ${caveAssets.length} cave assets, ${templeAssets.length} temple assets, ${catalogItemIds.size} catalog items).`);
