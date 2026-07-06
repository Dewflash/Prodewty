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
const footprintPreviewPath = path.join(engineDir, 'SanctuaryFootprintPreview.tsx');
const terrainPaintPreviewPath = path.join(engineDir, 'SanctuaryTerrainPaintPreview.tsx');
const sanctuaryObjectPath = path.join(engineDir, 'SanctuaryObject.tsx');
const toolCatalogPath = path.join(engineDir, 'ToolCatalog.ts');
const craftingCatalogPath = path.join(engineDir, 'CraftingCatalog.ts');
const rpgScreenPath = path.join(appRoot, 'app', 'rpg.tsx');
const schemaPath = path.join(appRoot, 'src', 'db', 'schema.ts');
const dbCraftingPath = path.join(appRoot, 'src', 'db', 'crafting.ts');
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
const footprintPreview = fs.readFileSync(footprintPreviewPath, 'utf8');
const terrainPaintPreview = fs.readFileSync(terrainPaintPreviewPath, 'utf8');
const sanctuaryObject = fs.readFileSync(sanctuaryObjectPath, 'utf8');
const toolCatalog = fs.readFileSync(toolCatalogPath, 'utf8');
const craftingCatalog = fs.readFileSync(craftingCatalogPath, 'utf8');
const rpgScreen = fs.readFileSync(rpgScreenPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');
const dbCrafting = fs.readFileSync(dbCraftingPath, 'utf8');
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

function parseAnimalAssets() {
  const block = extractBlock(assetRegistry, 'export const RPG_ANIMAL_OBJECT_ASSETS = [', '] satisfies readonly RpgAnimalObjectAsset[];');
  const regex = /\{\s*itemId:\s*'([^']+)',\s*assetId:\s*'([^']+)',\s*name:\s*'([^']+)',\s*frame:\s*(RPG_ANIMAL_ANIMATIONS\.[^.]+\.frames\[0\]),\s*animation:\s*(RPG_ANIMAL_ANIMATIONS\.[^,]+),\s*pixelWidth:\s*(\d+),\s*pixelHeight:\s*(\d+),\s*tags:\s*\[([^\]]*)\]\s*\}/g;
  const assets = [];
  let match;
  while ((match = regex.exec(block))) {
    const tags = [...match[8].matchAll(/'([^']+)'/g)].map(tagMatch => tagMatch[1]);
    assets.push({
      itemId: match[1],
      assetId: match[2],
      name: match[3],
      frame: match[4],
      animation: match[5],
      pixelWidth: Number(match[6]),
      pixelHeight: Number(match[7]),
      tags,
    });
  }
  if (assets.length !== 4) fail(`Expected 4 farm animal assets, found ${assets.length}`);
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

function parseItemIdConstants() {
  return Object.fromEntries(
    [...itemIds.matchAll(/\b(RPG_[A-Z0-9_]+_ITEM_ID)\s*=\s*'([^']+)'/g)]
      .map(match => [match[1], match[2]]),
  );
}

function parseCatalogItemIds(objectAssets) {
  const block = extractBlock(catalog, 'export const RPG_ITEM_CATALOG = {', '} satisfies Record<string, RpgItemDefinition>;');
  const ids = new Set(objectAssets.map(asset => asset.itemId));
  const waterDropId = parseWaterDropItemId();
  const crystalShardId = parseCrystalShardItemId();
  if (block.includes('[RPG_WATER_DROPS_ITEM_ID]')) ids.add(waterDropId);
  if (block.includes('[RPG_CRYSTAL_SHARDS_ITEM_ID]')) ids.add(crystalShardId);
  const itemIdConstants = parseItemIdConstants();
  for (const match of block.matchAll(/\[(RPG_[A-Z0-9_]+_ITEM_ID)\]\s*:\s*\{/g)) {
    if (itemIdConstants[match[1]]) ids.add(itemIdConstants[match[1]]);
  }

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

function validateAnimalMetadata(animalAssets) {
  unique(animalAssets.map(asset => asset.itemId), 'animal itemId');
  unique(animalAssets.map(asset => asset.assetId), 'animal assetId');

  const expectedIds = ['Farm_chick', 'Farm_piglet', 'Farm_sheep', 'Farm_calf'];
  expectedIds.forEach(itemId => {
    if (!animalAssets.some(asset => asset.itemId === itemId)) fail(`Missing farm animal asset: ${itemId}`);
  });

  animalAssets.forEach(asset => {
    if (!asset.assetId.startsWith('object.animal.')) fail(`Animal assetId must start with object.animal.: ${asset.assetId}`);
    if (!asset.tags.includes('animal')) fail(`Animal asset missing animal tag: ${asset.itemId}`);
    if (!asset.tags.includes('livestock')) fail(`Animal asset missing livestock tag: ${asset.itemId}`);
    if (!asset.tags.includes('animated')) fail(`Animal asset missing animated tag: ${asset.itemId}`);
    if (asset.pixelWidth <= 0 || asset.pixelHeight <= 0) fail(`Invalid animal dimensions for ${asset.itemId}`);
  });

  if (!assetRegistry.includes('RPG_ANIMAL_CHICK_SHEET')) fail('Runtime asset registry must require farm animal sheets');
  if (!assetRegistry.includes('export const RPG_ANIMAL_ANIMATIONS')) fail('Runtime asset registry must expose farm animal animations');
  if (!assetRegistry.includes('...RPG_ANIMAL_OBJECT_ASSETS')) fail('Runtime object registry must include farm animals');
  if (!catalog.includes("sourceLabel: 'Animal Archive'")) fail('Animal objects must expose source label metadata');
  if (!catalog.includes('RPG_ANIMAL_OBJECT_CATALOG')) fail('Catalog must expose animal object catalog');
  if (!catalog.includes('...RPG_ANIMAL_OBJECT_CATALOG')) fail('Animal object catalog must be spread into RPG_ITEM_CATALOG and SHOP_CATALOG');
  if (!catalog.includes("{ id: 'animal', label: 'Animals', sourceLabel: 'Animal Archive' }")) {
    fail('Shared source filters must expose an animal pack');
  }
  if (!shop.includes("{ id: 'animal', label: 'Animals' }")) fail('Shop must expose an animal filter');
}

function validateContentMetadata() {
  if (!catalog.includes("export type RpgItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';")) {
    fail('Missing RpgItemRarity union type');
  }
  if (!catalog.includes("export type RpgSourcePackId = 'all' | 'forest' | 'crystal' | 'bush' | 'cave' | 'temple' | 'animal';")) {
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
  if (!catalog.includes("Granted automatically - equip it from the hotbar or character panel.")) {
    fail('Archive tool unlock hints must point to hotbar/character panel, not Backpack');
  }
  if (!catalog.includes('Footprint:')) fail('Object facts must expose placement footprint metadata');
  if (!catalog.includes('Mechanic: toggles nearby linked gates and traps')) fail('Catalog facts must expose lever mechanics');
  if (!catalog.includes('Mechanic: blocks movement until opened by a lever')) fail('Catalog facts must expose gate mechanics');
  if (!catalog.includes('Mechanic: can be disarmed directly or by a lever')) fail('Catalog facts must expose trap mechanics');
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

function validateBackpackCharacterInventorySplit() {
  if (!backpack.includes("type BackpackFilter = 'all' | 'object' | 'seed' | 'resource';")) {
    fail('Backpack filters must exclude tools so the bag stays focused on items/resources/seeds');
  }
  if (backpack.includes("{ id: 'tool', label: 'Tools' }")) {
    fail('Backpack must not expose a Tools filter; tools belong to hotbar/character equipment');
  }
  if (!backpack.includes(".filter(slot => slot.item?.kind !== 'tool')")) {
    fail('Backpack inventory query must hide tool rows');
  }
  if (backpack.includes('onEquipTool') || backpack.includes('equippedToolId')) {
    fail('Backpack must not equip tools directly');
  }
  if (!backpack.includes("selectedItem?.kind === 'tool'") || !backpack.includes('Equip from the Character panel')) {
    fail('Backpack must redirect tool ownership to the Character panel without equipping tools');
  }
  if (!rpgScreen.includes('accessibilityLabel="Open character equipment"')) {
    fail('Character/equipment panel must remain the dedicated tool surface');
  }
  if (!rpgScreen.includes('EQUIPPABLE_TOOL_ITEM_IDS.map(itemId =>')) {
    fail('Character/equipment panel or hotbar must render tool slots from TOOLS');
  }
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
  if (!shop.includes("'mechanism'")) fail('Shop must expose a direct mechanism filter for levers, gates, and traps');
  if (!shop.includes("['mechanism', 'lever', 'gate', 'trap', 'hazard'].includes(tag)")) {
    fail('Shop mechanism filter must match mechanism, lever, gate, trap, and hazard tags');
  }
  if (!shop.includes('function mechanismHint(item: ShopCatalogItem | undefined)')) {
    fail('Shop must explain selected mechanism behavior in the detail panel');
  }
  if (!shop.includes('Mechanism: toggles nearest gate/trap')) fail('Shop must tell players what levers do');
  if (!shop.includes('mechanismRank(a.tags)')) fail('Shop mechanism filter must prioritize lever/gate/trap entries');
}

function validateSanctuaryDesignRoles() {
  if (!catalog.includes('export type SanctuaryDesignRole')) {
    fail('Catalog must define shared sanctuary design role metadata');
  }
  if (!catalog.includes('export function getSanctuaryDesignRole')) {
    fail('Catalog must expose a shared sanctuary design role classifier');
  }
  ['Crop Bed', 'Sapling', 'Flooring', 'Boundary', 'Building', 'Livestock', 'Mechanism', 'Crystal Accent', 'Canopy', 'Ground Cover', 'Ruin Accent'].forEach(label => {
    if (!catalog.includes(label)) fail(`Sanctuary design roles must classify ${label}`);
  });
  if (!shop.includes('getSanctuaryDesignRole') || !shop.includes('selectedDesignRole')) {
    fail('Shop detail panel must use the shared sanctuary design role helper');
  }
  if (!backpack.includes('getSanctuaryDesignRole') || !backpack.includes('selectedDesignRole')) {
    fail('Backpack detail panel must use the shared sanctuary design role helper');
  }
  if (!shop.includes('const cardDesignRole = getSanctuaryDesignRole(item)') || !shop.includes('styles.cardRolePill')) {
    fail('Shop grid cards must show shared sanctuary role badges while browsing');
  }
  if (!backpack.includes('const slotDesignRole = slot ? getSanctuaryDesignRole(slot.item) : null') || !backpack.includes('styles.slotRolePill')) {
    fail('Backpack slots must show shared sanctuary role badges while browsing');
  }
  if (!shop.includes('cardDesignRole.tone === \'nature\' && styles.cardRoleNature') || !shop.includes('cardRoleResource')) {
    fail('Shop browse role badges must reflect shared role tone colors');
  }
  if (!backpack.includes('slotDesignRole.tone === \'nature\' && styles.slotRoleNature') || !backpack.includes('slotRoleResource')) {
    fail('Backpack browse role badges must reflect shared role tone colors');
  }
  if (!shop.includes('styles.designRolePill') || !backpack.includes('styles.designRolePill')) {
    fail('Shop and Backpack must visibly render sanctuary design role chips');
  }
  if (!shop.includes('selectedDesignRole.hint') || !backpack.includes('selectedDesignRole.hint')) {
    fail('Shop and Backpack must show design-role composition hints');
  }
  if (!catalog.includes('export type SanctuaryLayoutSetId')) {
    fail('Catalog must define shared sanctuary layout set ids');
  }
  if (!catalog.includes('export const SANCTUARY_LAYOUT_SET_FILTERS')) {
    fail('Catalog must expose shared sanctuary layout set filters');
  }
  ['grove', 'farmyard', 'ruins', 'workshop'].forEach(layoutSetId => {
    if (!catalog.includes(`'${layoutSetId}'`)) fail(`Sanctuary layout filters must expose ${layoutSetId}`);
  });
  if (!catalog.includes('export function itemMatchesSanctuaryLayoutSet')) {
    fail('Catalog must expose a shared sanctuary layout set matcher');
  }
  if (!catalog.includes('export function countSanctuaryLayoutSets')) {
    fail('Catalog must expose shared sanctuary layout set counts');
  }
  if (!catalog.includes('export function getSanctuaryLayoutFitLabels') || !catalog.includes("filter.id !== 'all'")) {
    fail('Catalog must expose shared non-All sanctuary layout fit labels');
  }
  if (!shop.includes('SANCTUARY_LAYOUT_SET_FILTERS') || !shop.includes('itemMatchesSanctuaryLayoutSet(item, layoutSet)')) {
    fail('Shop must use shared sanctuary layout set filters and matcher');
  }
  if (!backpack.includes('SANCTUARY_LAYOUT_SET_FILTERS') || !backpack.includes('itemMatchesSanctuaryLayoutSet(slot.item, layoutSet)')) {
    fail('Backpack must use shared sanctuary layout set filters and matcher');
  }
  if (!shop.includes('layoutSetCounts') || !backpack.includes('layoutSetCounts')) {
    fail('Shop and Backpack must show sanctuary layout set counts');
  }
  if (!shop.includes('getSanctuaryLayoutFitLabels(selectedEntry?.[1])') || !shop.includes('selectedLayoutFits.map')) {
    fail('Shop detail panel must show selected item sanctuary layout fit labels');
  }
  if (!backpack.includes('getSanctuaryLayoutFitLabels(selectedItem)') || !backpack.includes('selectedLayoutFits.map')) {
    fail('Backpack detail panel must show selected item sanctuary layout fit labels');
  }
}

function validateSanctuaryFootprintPreview() {
  if (!footprintPreview.includes('export function SanctuaryFootprintPreview')) {
    fail('Shared sanctuary footprint preview component must be exported');
  }
  if (!footprintPreview.includes('colWidth') || !footprintPreview.includes('colHeight')) {
    fail('Footprint preview must be driven by catalog footprint dimensions');
  }
  if (!footprintPreview.includes('rows * cols')) {
    fail('Footprint preview must render every occupied footprint cell');
  }
  if (!shop.includes("import { SanctuaryFootprintPreview } from './SanctuaryFootprintPreview';")) {
    fail('Shop must import the shared footprint preview component');
  }
  if (!shop.includes('colWidth={selectedEntry[1].colWidth}') || !shop.includes('colHeight={selectedEntry[1].colHeight}')) {
    fail('Shop must render selected catalog item footprint dimensions');
  }
  if (!backpack.includes("import { SanctuaryFootprintPreview } from './SanctuaryFootprintPreview';")) {
    fail('Backpack must import the shared footprint preview component');
  }
  if (!backpack.includes('colWidth={selectedPlaceable.colWidth}') || !backpack.includes('colHeight={selectedPlaceable.colHeight}')) {
    fail('Backpack must render selected placeable footprint dimensions');
  }
  if (!backpack.includes('label="Planting"')) {
    fail('Backpack must show a 1x1 planting preview for plantable seeds');
  }
}

function validateSanctuaryTerrainPaintPreview() {
  if (
    !terrainPaintPreview.includes('export function SanctuaryTerrainPaintPreview') ||
    !terrainPaintPreview.includes('export function SanctuaryTerrainPaintIcon') ||
    !terrainPaintPreview.includes('getSanctuaryTerrainPaintTarget')
  ) {
    fail('Shared sanctuary terrain paint preview component must be exported');
  }
  ['rpg_bridge_kit', 'rpg_path_kit', 'RPG_STONE_SLAB_ITEM_ID', 'RPG_WOOD_TILE_ITEM_ID'].forEach(token => {
    if (!terrainPaintPreview.includes(token)) fail(`Terrain paint preview must map ${token}`);
  });
  if (!terrainPaintPreview.includes('SanctuaryTerrainTile') || !terrainPaintPreview.includes('getTileDisplayName(targetTile)')) {
    fail('Terrain paint preview must render target terrain art and label');
  }
  if (!itemIcon.includes("import { getSanctuaryTerrainPaintTarget, SanctuaryTerrainPaintIcon } from './SanctuaryTerrainPaintPreview';")) {
    fail('RPG item icons must import the shared compact terrain paint icon');
  }
  if (!itemIcon.includes('itemId?: string | null') || !itemIcon.includes('getSanctuaryTerrainPaintTarget(terrainPaintItemId)') || !itemIcon.includes('<SanctuaryTerrainPaintIcon itemId={terrainPaintItemId} size={size} />')) {
    fail('RPG item icons must render compact terrain paint swatches when item ids map to terrain targets');
  }
  if (!shop.includes('<RpgItemIcon item={item} itemId={id} size={82} fallbackLabel={id} />')) {
    fail('Shop item cards must pass item ids into RPG item icons for terrain paint swatches');
  }
  if (!backpack.includes('<RpgItemIcon item={slot.item} itemId={slot.item_id}')) {
    fail('Backpack slots must pass item ids into RPG item icons for terrain paint swatches');
  }
  if (!archive.includes('discovered && getSanctuaryTerrainPaintTarget(itemId) !== null') || !archive.includes('SanctuaryTerrainPaintIcon') || !archive.includes('<ArchiveItemArt itemId={entry.itemId}')) {
    fail('Archive entries must show compact terrain paint swatches only for discovered terrain paint items');
  }
  if (!shop.includes("import { SanctuaryTerrainPaintPreview } from './SanctuaryTerrainPaintPreview';") || !shop.includes('<SanctuaryTerrainPaintPreview itemId={selectedEntry[0]} />')) {
    fail('Shop detail panel must show terrain paint target previews');
  }
  if (!backpack.includes("import { SanctuaryTerrainPaintPreview } from './SanctuaryTerrainPaintPreview';") || !backpack.includes('<SanctuaryTerrainPaintPreview itemId={selected.item_id} />')) {
    fail('Backpack detail panel must show terrain paint target previews');
  }
  if (!archive.includes("from './SanctuaryTerrainPaintPreview';") || !archive.includes('SanctuaryTerrainPaintPreview') || !archive.includes('<SanctuaryTerrainPaintPreview itemId={selected.itemId} />')) {
    fail('Archive detail panel must show discovered terrain paint target previews');
  }
}

function validateArchiveCompositionGuidance() {
  if (!archive.includes("import { SanctuaryFootprintPreview } from './SanctuaryFootprintPreview';")) {
    fail('Archive must reuse the shared footprint preview component');
  }
  if (!archive.includes('SANCTUARY_LAYOUT_SET_FILTERS') || !archive.includes('itemMatchesSanctuaryLayoutSet(archiveLayoutItem(entry), layoutSet)')) {
    fail('Archive must use shared sanctuary layout set filters and matcher');
  }
  if (!archive.includes('countSanctuaryLayoutSets(entries, archiveLayoutItem)') || !archive.includes('layoutSetCounts')) {
    fail('Archive must show shared sanctuary layout set counts');
  }
  if (!archive.includes('getSanctuaryDesignRole')) {
    fail('Archive must use the shared sanctuary design role helper');
  }
  if (!archive.includes('const selectedDesignRole = selected && (selected.discovered || selected.known)')) {
    fail('Archive role hints must stay gated behind discovered/known entries');
  }
  if (!archive.includes('const selectedLayoutFits = selected && (selected.discovered || selected.known)')) {
    fail('Archive layout fit chips must stay gated behind discovered/known entries');
  }
  if (!archive.includes('getSanctuaryLayoutFitLabels(selectedCatalogItem)') || !archive.includes('selectedLayoutFits.map')) {
    fail('Archive detail panel must show selected item sanctuary layout fit labels');
  }
  if (!archive.includes('getPlaceableItem(selected.itemId)')) {
    fail('Archive must derive footprint dimensions from the placeable catalog item');
  }
  if (!archive.includes('styles.designRolePill') || !archive.includes('styles.designRoleHint')) {
    fail('Archive must visibly render sanctuary design role chips and hints');
  }
  if (!archive.includes('colWidth={selectedPlaceable.colWidth}') || !archive.includes('colHeight={selectedPlaceable.colHeight}')) {
    fail('Archive must render selected placeable footprint dimensions');
  }
  if (!archive.includes('selectedCatalogItem?.kind === \'seed\'') || !archive.includes('label="Planting"')) {
    fail('Archive must show a 1x1 planting preview for discovered plantable seeds');
  }
}

function validateWorldArtRenderer() {
  if (!itemIcon.includes('export function RpgSpriteAnimationView')) fail('Shared item renderer must expose sprite animation view');
  if (!itemIcon.includes('item?.animation')) fail('Shared item renderer must support catalog animation metadata');
  if (!itemIcon.includes('export function RpgItemWorldArt')) fail('Shared item art renderer must expose RpgItemWorldArt');
  if (!itemIcon.includes('item?.icon')) fail('Shared item art renderer must support sprite-frame icons');
  const iconStart = itemIcon.indexOf('export function RpgItemIcon');
  const itemIconIconBranch = itemIcon.indexOf('if (item?.icon)', iconStart);
  const itemIconAnimationBranch = itemIcon.indexOf('if (item?.animation)', iconStart);
  if (itemIconIconBranch === -1 || itemIconAnimationBranch === -1 || itemIconIconBranch > itemIconAnimationBranch) {
    fail('Item icons must prefer curated icon frames before animation playback');
  }
  const worldArtStart = itemIcon.indexOf('export function RpgItemWorldArt');
  const iconBranch = itemIcon.indexOf('if (item?.icon)', worldArtStart);
  const sourceBranch = itemIcon.indexOf('if (item?.source)', worldArtStart);
  if (iconBranch === -1 || sourceBranch === -1 || iconBranch > sourceBranch) {
    fail('Shared item world art renderer must prefer sprite frames before whole-image sources');
  }
  if (!sanctuaryObject.includes('RpgItemWorldArt')) fail('Placed sanctuary objects must use shared item art rendering');
  if (!sanctuaryObject.includes('const footprintWidth = colWidth * tileSize') || !sanctuaryObject.includes('const footprintHeight = colHeight * tileSize')) {
    fail('Placed sanctuary objects must derive their grounding footprint from catalog collision dimensions');
  }
  if (!sanctuaryObject.includes('styles.groundingFootprint') || !sanctuaryObject.includes('pointerEvents="none"')) {
    fail('Placed sanctuary objects must render a non-interactive grounding footprint under world art');
  }
  if (!sanctuaryObject.includes('groundType?: TileType') || !sanctuaryObject.includes('getTerrainGroundingStyle(groundType)')) {
    fail('Placed sanctuary objects must receive terrain-aware grounding styles');
  }
  ['groundingFootprintGrass', 'groundingFootprintSoil', 'groundingFootprintWet', 'groundingFootprintSand', 'groundingFootprintStone', 'groundingFootprintWood', 'groundingFootprintPath'].forEach(styleName => {
    if (!sanctuaryObject.includes(styleName)) fail(`Placed sanctuary objects must style ${styleName}`);
  });
  if (!rpgScreen.includes('const getObjectGroundType = (obj: MapObject): TileType =>') || !rpgScreen.includes('groundType={getObjectGroundType(obj)}')) {
    fail('RPG screen must derive object grounding from the current sanctuary terrain map');
  }
  if (!sanctuaryObject.includes("catalogItem?.tags?.includes('animal')") || !sanctuaryObject.includes("catalogItem.tags.includes('livestock')")) {
    fail('Placed livestock objects must derive farm-life visuals from animal/livestock tags');
  }
  if (!sanctuaryObject.includes('styles.livestockCareCue') || !sanctuaryObject.includes('styles.groundingFootprintLivestock')) {
    fail('Placed livestock objects must render a distinct non-interactive farm-life cue');
  }
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
  if (!rpgScreen.includes("`Lever ${isOn ? 'on' : 'off'}: ${affectedText}`")) {
    fail('Lever interactions must show linked on/off feedback');
  }
  if (!rpgScreen.includes("`Lever switched ${isOn ? 'on' : 'off'} (nothing linked)`")) {
    fail('Lever interactions must explain when no mechanism is linked');
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
  if (!rpgScreen.includes("text: isDisabled ? 'Trap disarmed' : 'Trap re-armed'")) {
    fail('Trap interactions must stay feedback-only until trap damage is explicitly added');
  }
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
}

function validateInteractionTargetPrompt() {
  if (!rpgScreen.includes("type InteractionTargetKind = 'object' | 'plot' | 'farmplot' | 'portal' | 'enemy';")) {
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
  if (!rpgScreen.includes('const SHOW_NORMAL_TARGET_DEBUG = false;')) {
    fail('Normal target debug visuals must stay disabled for gameplay');
  }
  if (!rpgScreen.includes('interactionPrompt?.cells.map')) {
    fail('RPG screen must preserve world-space reticle cells for debug use');
  }
  if (!rpgScreen.includes('styles.interactionTargetCell')) {
    fail('RPG screen must preserve target reticle styles for debug use');
  }
  if (!rpgScreen.includes("activeZone === 'sanctuary' && !buildItem && interactionPrompt?.cells.map")) {
    fail('Sanctuary must show the current Interact target in world space during normal play');
  }
  if (!rpgScreen.includes('styles.sanctuaryTargetCell')) {
    fail('Sanctuary Interact target must use a dedicated non-debug focus cell style');
  }
  if (!rpgScreen.includes("interactionPrompt.kind === 'plot' || interactionPrompt.kind === 'farmplot'")) {
    fail('Sanctuary Interact target must distinguish crop/plot cells from object cells');
  }
  if (!rpgScreen.includes("interactionPrompt.kind === 'portal' && styles.sanctuaryTargetPortalCell")) {
    fail('Sanctuary Interact target must distinguish portal cells from object cells');
  }
  if (!rpgScreen.includes('key={`sanctuary-focus-${interactionPrompt.kind}-${cell.row}:${cell.col}:${index}`}') || !rpgScreen.includes('pointerEvents="none"\n              style={[\n                styles.sanctuaryTargetCell')) {
    fail('Sanctuary Interact focus cells must be stable and non-interactive');
  }
  if (!rpgScreen.includes('{SHOW_NORMAL_TARGET_DEBUG && !buildItem && interactionPrompt?.cells.map')) {
    fail('Normal target reticle must be hidden unless the debug flag is enabled');
  }
  if (!rpgScreen.includes("isTargeted={SHOW_NORMAL_TARGET_DEBUG && interactionPrompt?.kind === 'object'")) {
    fail('Placed object target outline must be hidden unless the debug flag is enabled');
  }
  if (!rpgScreen.includes("SHOW_NORMAL_TARGET_DEBUG && interactionPrompt?.kind === 'plot'")) {
    fail('Garden plot target outline must be hidden unless the debug flag is enabled');
  }
  if (!sanctuaryObject.includes('isTargeted?: boolean')) {
    fail('SanctuaryObject must preserve targeted highlight state for debug use');
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

function validateBuildPlacementFeedback() {
  if (!rpgScreen.includes('const item = getRpgItem(buildItem.itemId);')) {
    fail('Build placement must resolve item art for placement feedback');
  }
  if (!rpgScreen.includes("showWorldToast({ text: `Moved ${buildItem.label}`, item, tone: 'success' });")) {
    fail('Moving an object must show success feedback');
  }
  if (!rpgScreen.includes("showWorldToast({ text: 'No item left', item, tone: 'warn' });")) {
    fail('Missing inventory during placement must show visible feedback');
  }
  if (!rpgScreen.includes("showWorldToast({ text: `Placed ${buildItem.label}`, item, tone: 'success' });")) {
    fail('Placing an object must show success feedback');
  }
}

function validateBuildEditorNudgeControls() {
  if (!rpgScreen.includes('const nudgeBuildPlacement = (deltaRow: number, deltaCol: number)')) {
    fail('Build mode must expose one-tile nudge controls for precise sanctuary placement');
  }
  if (!rpgScreen.includes('updateBuildReport(nextRow, nextCol);')) {
    fail('Build nudge controls must refresh the shared placement report');
  }
  if (!rpgScreen.includes('styles.buildPad')) {
    fail('Build mode must render a contextual build nudge pad');
  }
  ['up', 'left', 'right', 'down'].forEach(direction => {
    if (!rpgScreen.includes(`Nudge \${buildItem.label} ${direction}`)) {
      fail(`Build nudge pad must expose ${direction} accessibility label`);
    }
  });
  if (!rpgScreen.includes('disabled={!placementReport?.valid}')) {
    fail('Build pad confirm button must disable for invalid placement');
  }
  if (!rpgScreen.includes('const placementStatusLabel = placementReport?.valid ? \'Ready\' : placementReport?.reason ?? \'Unavailable\'')) {
    fail('Build pad must derive placement status labels from placementReport');
  }
  if (!rpgScreen.includes('const placementStatusHint = placementReport?.valid') || !rpgScreen.includes("placementReport?.reason === 'Traps avatar'")) {
    fail('Build pad must derive compact placement hints from placementReport reasons');
  }
  if (!rpgScreen.includes('styles.buildPlacementReasonChip') || !rpgScreen.includes('placementStatusHint')) {
    fail('Build pad must render a compact placement reason chip');
  }
  if (!rpgScreen.includes('onPress={confirmBuildPlacement}')) {
    fail('Build pad confirm button must reuse the existing placement confirmation path');
  }
  if (!rpgScreen.includes("drag or nudge, then place")) {
    fail('Build mode prompt must explain both drag and nudge placement paths');
  }
}

function validateBuildPlacementGhostPolish() {
  if (!rpgScreen.includes('const buildFootprintStyle = useAnimatedStyle(() =>')) {
    fail('Build mode must render a world-anchored placement footprint mat');
  }
  if (!rpgScreen.includes('styles.placementFootprint')) {
    fail('Build placement footprint must have dedicated styling');
  }
  if (!rpgScreen.includes('styles.placementFootprintAnchor')) {
    fail('Build placement footprint must show a center anchor');
  }
  if (!rpgScreen.includes('placementReport?.valid ? styles.placementFootprintValid : styles.placementFootprintInvalid')) {
    fail('Build placement footprint must reflect valid and invalid placement state');
  }
  if (!rpgScreen.includes('placementReport?.cells.map((cell, index) =>') || !rpgScreen.includes('cell.valid ? styles.placementCellValid : styles.placementCellInvalid')) {
    fail('Build placement cells must render valid/invalid state from placementReport cells');
  }
  if (!rpgScreen.includes('styles.placementCellCornerTopLeft') || !rpgScreen.includes('styles.placementCellCornerBottomRight')) {
    fail('Build placement cells must render game-like corner markers instead of debug-only boxes');
  }
  if (!rpgScreen.includes('cell.valid ? styles.placementCellCornerValid : styles.placementCellCornerInvalid')) {
    fail('Build placement cell corner markers must reflect per-cell validity');
  }
  if (!rpgScreen.includes('const getFootprintGroundType = (row: number, col: number, width: number, height: number): TileType =>')) {
    fail('Build/object footprints must share a terrain anchor lookup');
  }
  if (!rpgScreen.includes('const placementGroundType = placementReport') || !rpgScreen.includes('getFootprintGroundType(placementReport.row, placementReport.col, buildFootprintCols, buildFootprintRows)')) {
    fail('Build placement footprint must derive terrain tone from the current placement report');
  }
  if (!rpgScreen.includes('styles.placementTerrainWash') || !rpgScreen.includes('placementTerrainWashStyle')) {
    fail('Build placement footprint must render a terrain-aware wash layer');
  }
  if (!rpgScreen.includes('getSanctuaryTerrainPreviewColor(type)')) {
    fail('Build placement footprint terrain wash must derive color from the shared sanctuary terrain art registry');
  }
  if (!rpgScreen.includes('!placementReport?.valid && styles.placementTerrainWashInvalid')) {
    fail('Invalid build placement must mute the terrain wash under warning feedback');
  }
  if (!rpgScreen.includes('buildItem?.mode === \'edit\' && styles.placementFootprintEdit')) {
    fail('Edit placement must have distinct footprint styling');
  }
  if (!rpgScreen.includes('!placementReport?.valid && styles.buildGhostArtInvalid')) {
    fail('Invalid build ghosts must be visually dimmed');
  }
  if (!rpgScreen.includes('const buildGhostFootprintWidth = buildFootprintCols * TILE_SIZE') || !rpgScreen.includes('const buildGhostFootprintLeft = (buildGhostWidth - buildGhostFootprintWidth) / 2')) {
    fail('Build ghost grounding must derive from the selected collision footprint dimensions');
  }
  if (!rpgScreen.includes('const buildTerrainTile = buildItem?.mode === \'terrain\'') || !rpgScreen.includes('const isTerrainEditing = buildItem?.mode === \'terrain\'')) {
    fail('Terrain build mode must derive a true 1x1 tile preview state');
  }
  if (!rpgScreen.includes('buildCatalogItem || buildSeedItem || buildTerrainTile !== null')) {
    fail('Build preview rendering must include terrain-edit items, not only objects and seeds');
  }
  if (!rpgScreen.includes('styles.terrainGhostTile') || !rpgScreen.includes('styles.terrainGhostTileInvalid')) {
    fail('Terrain-edit placement must render a dedicated terrain tile ghost with invalid dimming');
  }
  if (!rpgScreen.includes('<SanctuaryTerrainTile\n                    type={buildTerrainTile}') || !rpgScreen.includes('variant={placementReport ? getSanctuaryTerrainVariant(placementReport.row, placementReport.col, buildTerrainTile) : 0}')) {
    fail('Terrain-edit ghost must reuse the shared sanctuary terrain tile renderer');
  }
  if (!rpgScreen.includes('const terrainPaintFromTile = buildTerrainTile !== null ? placementGroundType : null') || !rpgScreen.includes('styles.terrainPaintSwapRow')) {
    fail('Terrain-edit build pad must derive and render a before/after terrain paint swatch row');
  }
  if (!rpgScreen.includes('type={terrainPaintFromTile}') || !rpgScreen.includes('type={buildTerrainTile}') || !rpgScreen.includes('getTileDisplayName(terrainPaintFromTile)') || !rpgScreen.includes('getTileDisplayName(buildTerrainTile)')) {
    fail('Terrain paint swatches must show current and target tile art with readable labels');
  }
  if (!rpgScreen.includes('styles.buildGhostGrounding') || !rpgScreen.includes('placementTerrainWashStyle')) {
    fail('Build ghost art must render a terrain-aware grounding base');
  }
  if (!rpgScreen.includes('!placementReport?.valid && styles.buildGhostGroundingInvalid')) {
    fail('Invalid build ghost grounding must dim with invalid placement state');
  }
  if (!rpgScreen.includes('styles.seedGhostSoilInset') || !rpgScreen.includes('styles.seedGhostFurrowSet')) {
    fail('Seed placement ghost must preview a readable soil bed instead of a bare icon');
  }
  if (!rpgScreen.includes('const seedGhostSoilStyle = getPlacementTerrainWashStyle(TileType.TILLED)') || !rpgScreen.includes('seedGhostSoilStyle')) {
    fail('Seed placement ghost soil color must share the terrain preview registry');
  }
  if (!rpgScreen.includes('styles.seedGhostFurrowLine') || !rpgScreen.includes('!placementReport?.valid && styles.seedGhostSoilInvalid')) {
    fail('Seed placement ghost soil preview must include furrows and invalid-state treatment');
  }
  if (!rpgScreen.includes('const selectedObjectItem = selectedObject ? getItem(selectedObject.type) : null;')) {
    fail('Edit mode must resolve the selected object item for origin footprint dimensions');
  }
  if (!rpgScreen.includes("buildItem?.mode === 'edit' && selectedObject &&")) {
    fail('Edit mode must render an original-footprint marker while moving an existing object');
  }
  if (!rpgScreen.includes('styles.editOriginFootprint')) {
    fail('Edit origin footprint must have dedicated styling');
  }
  if (!rpgScreen.includes('width: (selectedObjectItem?.colWidth ?? 1) * TILE_SIZE') || !rpgScreen.includes('height: (selectedObjectItem?.colHeight ?? 1) * TILE_SIZE')) {
    fail('Edit origin footprint must use the selected object catalog footprint dimensions');
  }
  if (!rpgScreen.includes('zIndex: 999')) {
    fail('Edit origin footprint must stay below the live placement footprint');
  }
  if (!rpgScreen.includes('<Text numberOfLines={1} adjustsFontSizeToFit style={styles.editOriginLabel}>from</Text>')) {
    fail('Edit origin footprint must label the original object location');
  }
}

function validateBuildModeContextStrip() {
  if (!rpgScreen.includes("import { SanctuaryFootprintPreview } from '../src/engine/SanctuaryFootprintPreview';")) {
    fail('Build mode must reuse the shared footprint preview component');
  }
  if (!rpgScreen.includes('getSanctuaryDesignRole')) {
    fail('Build mode must use the shared sanctuary design role helper');
  }
  if (!rpgScreen.includes('const buildDesignRole = getSanctuaryDesignRole(buildPreviewItem)')) {
    fail('Build mode must derive role hints from the selected build item');
  }
  if (!rpgScreen.includes('const buildLayoutFits = getSanctuaryLayoutFitLabels(buildPreviewItem)')) {
    fail('Build mode must derive layout fit labels from the selected build item');
  }
  if (!rpgScreen.includes('buildFootprintCols') || !rpgScreen.includes('buildFootprintRows')) {
    fail('Build mode must derive a true footprint preview from selected dimensions');
  }
  if (!rpgScreen.includes('styles.buildInfoBlock')) {
    fail('Build mode must render a visible item context strip near nudge controls');
  }
  if (!rpgScreen.includes('styles.buildItemIdentityRow') || !rpgScreen.includes('<RpgItemIcon item={buildPreviewItem} size={20} fallbackLabel={buildItem.itemId} />')) {
    fail('Build mode must show the selected item identity while placing');
  }
  if (!rpgScreen.includes('buildPreviewItem?.name ?? buildItem.label') || !rpgScreen.includes("buildItem.mode === 'edit' ? 'Adjusting layout'")) {
    fail('Build item identity row must derive label/mode from the active build item');
  }
  if (!rpgScreen.includes('buildLayoutFits.map') || !rpgScreen.includes('styles.buildLayoutFitPill')) {
    fail('Build mode must show selected item layout fit chips while placing');
  }
  if (!rpgScreen.includes('const placementTotalCells = placementReport?.cells.length ?? buildFootprintCols * buildFootprintRows') || !rpgScreen.includes('const placementClearCells = placementReport?.cells.filter(cell => cell.valid).length ?? 0')) {
    fail('Build mode must derive clear/total placement counts from the shared placement report');
  }
  if (!rpgScreen.includes('const buildFootprintSummary = `${buildFootprintCols}x${buildFootprintRows}`') || !rpgScreen.includes('const placementGroundLabel = getTileDisplayName(placementGroundType)')) {
    fail('Build mode must derive footprint and terrain labels for placement readability');
  }
  if (!rpgScreen.includes('styles.buildPlacementStatsRow') || !rpgScreen.includes('styles.buildPlacementStatPill')) {
    fail('Build mode must render compact placement stats while placing');
  }
  ['Size', 'Clear', 'Ground'].forEach(label => {
    if (!rpgScreen.includes(`>${label}</Text>`)) {
      fail(`Build placement stats must include ${label} chip`);
    }
  });
  if (!rpgScreen.includes('{placementClearCells}/{placementTotalCells}') || !rpgScreen.includes('{placementGroundLabel}')) {
    fail('Build placement stats must show clear-cell count and current ground label');
  }
  if (!rpgScreen.includes('placementReport?.valid ? styles.buildPlacementStatPillValid : styles.buildPlacementStatPillInvalid')) {
    fail('Build placement clear-count chip must reflect placement validity');
  }
  if (!rpgScreen.includes("buildDesignRole.tone === 'nature' && styles.buildInfoRoleNature") || !rpgScreen.includes('buildInfoRoleResource')) {
    fail('Build mode role chip must reflect shared role tone colors');
  }
  if (!rpgScreen.includes("buildItem.mode === 'plant' ? 'Planting'")) {
    fail('Build mode must label plantable seed footprints distinctly');
  }
  if (!rpgScreen.includes("buildItem.mode === 'edit' ? 'Moving'")) {
    fail('Build mode must label edit placement footprints distinctly');
  }
  if (!rpgScreen.includes("buildItem.mode === 'terrain' ? 'Terrain paint'") || !rpgScreen.includes("buildItem.mode === 'terrain' ? 'Painting'")) {
    fail('Build mode must label terrain-edit placement distinctly');
  }
}

function validateAttackFeedbackProtocol() {
  if (!rpgScreen.includes('const showAttackFeedback = (current: ResolvedInteractionTarget)')) {
    fail('Attack feedback must consume the shared resolved target packet');
  }
  if (!rpgScreen.includes('const target = current.target;')) {
    fail('Attack feedback must use the resolved target rather than resolving separately');
  }
  if (!rpgScreen.includes('pulseObject(target.object.id);')) {
    fail('Attack feedback must pulse struck objects');
  }
  if (!rpgScreen.includes('Struck ${target.label}')) {
    fail('Attack feedback must show struck object feedback');
  }
  if (!rpgScreen.includes("showWorldToast({ text: 'Careful: crop'")) {
    fail('Attack feedback must warn before hitting crops');
  }
  if (!rpgScreen.includes("showWorldToast({ text: 'Swing', tone: 'muted' });")) {
    fail('Empty Attack presses must still show visible swing feedback');
  }
  if (!rpgScreen.includes('showAttackFeedback(current);')) {
    fail('Attack button must call visible attack feedback');
  }
  if (!rpgScreen.includes('disabled={!!buildItem}')) {
    fail('Attack button must be truly disabled in build mode');
  }
  if (!rpgScreen.includes('accessibilityState={{ disabled: !!buildItem }}')) {
    fail('Attack button disabled state must be exposed to accessibility');
  }
  if (!rpgScreen.includes("if (target?.kind === 'enemy')")) {
    fail('Attack feedback must explicitly support enemy targets');
  }
}

function validateResolvedActionTargetProtocol() {
  if (!rpgScreen.includes('type ResolvedInteractionTarget = {')) {
    fail('RPG screen must type the shared resolved action target packet');
  }
  if (!rpgScreen.includes('const getTargetedTile = useCallback(() =>')) {
    fail('Targeted tile calculation must be a stable shared helper');
  }
  if (!rpgScreen.includes('const resolveCurrentInteractionTarget = useCallback((): ResolvedInteractionTarget =>')) {
    fail('RPG screen must centralize current tile + target resolution');
  }
  if (!rpgScreen.includes('target: resolveInteractionTargetAt(tile.row, tile.col)')) {
    fail('Shared action target packet must use the canonical target resolver');
  }
  if (!rpgScreen.includes('const current = resolveCurrentInteractionTarget();')) {
    fail('Action handlers must resolve the current action target through the shared helper');
  }
  if (!rpgScreen.includes('setInteractionPrompt(current.target);')) {
    fail('Action handlers must sync prompt state to the current resolved target');
  }
  if (rpgScreen.includes('const resolvedTarget = resolveInteractionTargetAt(target.row, target.col);')) {
    fail('Interact handler must not independently re-resolve a separate target packet');
  }
}

function validateActionControlClarity() {
  if (!rpgScreen.includes('accessibilityLabel="Leave RPG sandbox"')) {
    fail('Back button must have a clear accessibility label');
  }
  if (!rpgScreen.includes('accessibilityLabel="Enter sanctuary"') || !rpgScreen.includes('accessibilityLabel="Enter dungeon"')) {
    fail('Zone tabs must have clear accessibility labels');
  }
  if (!rpgScreen.includes("accessibilityState={{ selected: activeZone === 'sanctuary' }}")) {
    fail('Sanctuary tab must expose selected state');
  }
  if (!rpgScreen.includes("accessibilityState={{ selected: activeZone === 'dungeon' }}")) {
    fail('Dungeon tab must expose selected state');
  }
  if (!rpgScreen.includes("accessibilityLabel={`Stash ${buildItem?.label ?? 'object'}`}")) {
    fail('Stash button must name the object being stashed when available');
  }
  if (!rpgScreen.includes("accessibilityLabel=\"Cancel moving object\"")) {
    fail('Edit cancel button must have a clear accessibility label');
  }
  if (!rpgScreen.includes('interactionPrompt\n                  ? `Interact with ${interactionPrompt.label}`')) {
    fail('Interact button label must describe the current target when one exists');
  }
  if (!rpgScreen.includes("buildItem\n              ? `Confirm ${buildItem.label}`")) {
    fail('Interact button label must describe build confirmation in build mode');
  }
  if (!rpgScreen.includes('interactionPrompt\n                ? `Attack toward ${interactionPrompt.label}`')) {
    fail('Attack button label must describe the current target when one exists');
  }
  if (!rpgScreen.includes("buildItem\n              ? 'Attack unavailable while building'")) {
    fail('Attack button label must clarify disabled build mode state');
  }
  if (!rpgScreen.includes('Swings toward the tile in front of the character.')) {
    fail('Attack button must expose a concise action hint');
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
}

function validateResourceNodeFeedback() {
  if (!assetRegistry.includes('leaves: rpgUiIcon(5, 4)')) {
    fail('Leaves must use the clean green leaf UI frame, not a mixed farm-supply crop');
  }
  if (!rpgScreen.includes('const getForageEmptyText = (item: ShopCatalogItem)')) {
    fail('Forage empty feedback must be source-aware');
  }
  if (!rpgScreen.includes('const getForageSuccessText = (item: ShopCatalogItem')) {
    fail('Forage success feedback must be source-aware');
  }
  if (!rpgScreen.includes('Chipped crystal: ${reward}')) {
    fail('Crystal forage feedback must name crystal gathering');
  }
  if (!rpgScreen.includes('Chopped tree: ${reward}')) {
    fail('Tree forage feedback must name tree gathering');
  }
  if (!rpgScreen.includes('Foraged brush: ${reward}')) {
    fail('Bush/fern forage feedback must name brush foraging');
  }
}

function validateLeverMechanicsV1() {
  if (!sanctuaryInteractions.includes("'open_gate'")) {
    fail('Object interaction memory must support open_gate state');
  }
  if (!sanctuaryInteractions.includes('export function getSanctuaryObjectInteractionCount')) {
    fail('Object interaction memory must expose state count reads');
  }
  if (!sanctuaryInteractions.includes('export function setSanctuaryObjectInteractionActive')) {
    fail('Object interaction memory must expose parity-based state setting');
  }
  if (!rpgScreen.includes('const getObjectMechanicState = (obj: MapObject)')) {
    fail('RPG screen must centralize gate/trap mechanic state');
  }
  if (!rpgScreen.includes("getSanctuaryObjectInteractionCount(obj.id, 'open_gate') % 2 === 1")) {
    fail('Open gate state must derive from persisted object interactions');
  }
  if (!rpgScreen.includes('const isObjectMechanicallyPassable = (obj: MapObject)')) {
    fail('RPG screen must centralize mechanically passable objects');
  }
  if (!rpgScreen.includes('if (isObjectMechanicallyPassable(obj)) return;')) {
    fail('Open gates and disabled traps must be removed from movement collision');
  }
  if (!sanctuaryObject.includes("mechanicState?: 'open_gate' | 'disabled_trap' | null;")) {
    fail('SanctuaryObject must accept visual mechanic state');
  }
  if (!rpgScreen.includes('mechanicState={getObjectMechanicState(obj)}')) {
    fail('Placed objects must receive mechanic state for visual feedback');
  }
  if (!rpgScreen.includes('const ensureLeverRelations = (lever: MapObject)')) {
    fail('Lever interactions must auto-link nearby mechanisms');
  }
  if (!rpgScreen.includes("upsertSanctuaryObjectRelation(")) {
    fail('Lever auto-linking must persist object relations');
  }
  if (!rpgScreen.includes('const applyLeverRelation = (')) {
    fail('Lever interactions must apply linked relation side effects');
  }
  if (!rpgScreen.includes("setSanctuaryObjectInteractionActive(target.id, target.type, 'open_gate', active)")) {
    fail('Lever-gate links must set open gate state');
  }
  if (!rpgScreen.includes("setSanctuaryObjectInteractionActive(target.id, target.type, 'disable_trap', active)")) {
    fail('Lever-trap links must set disabled trap state');
  }
  if (!rpgScreen.includes('applyMovementCollision(mapObjects);')) {
    fail('Gate/trap interaction state changes must refresh movement collision');
  }
}

function validateRpgToolEnergyAndCharacterUi() {
  if (!catalog.includes('rpg_watering_can_basic')) fail('Catalog must expose Watering Can as a tool item');
  if (!catalog.includes("kind: 'tool'")) fail('Tool catalog items must be marked with item kind tool');
  if (!toolCatalog.includes("export type ToolType = 'Axe' | 'Pickaxe' | 'WateringCan'")) {
    fail('RPG tool type union must include WateringCan');
  }
  if (!rpgScreen.includes("const EQUIPPABLE_TOOL_ITEM_IDS = ['rpg_axe_basic'") || !rpgScreen.includes("'rpg_watering_can_basic'")) {
    fail('Watering Can must be granted through the shared starter tool list');
  }
  if (!toolCatalog.includes('energyCost: number;') || !toolCatalog.includes("'rpg_watering_can_basic': { itemId: 'rpg_watering_can_basic', type: 'WateringCan'")) {
    fail('RPG tools must define explicit energy costs');
  }
  if (!rpgScreen.includes('const spendToolEnergy = (toolItemId: string) => spendEnergy(getToolDef(toolItemId)?.energyCost ?? 0);')) {
    fail('RPG screen must centralize tool energy spending');
  }
  if (!rpgScreen.includes('UPDATE rpg_state SET energy = MAX(0, energy - ?) WHERE id = 1')) {
    fail('Tool energy spending must persist against rpg_state energy');
  }
  if (!rpgScreen.includes('const waterGardenPlot = (plot: GardenPlot)') || !rpgScreen.includes('waterFarmPlot(row, col)')) {
    fail('RPG screen must expose an in-world crop watering action');
  }
  if (!rpgScreen.includes("if (toolType === 'WateringCan')")) {
    fail('Equipped Watering Can must route Interact to crop watering');
  }
  if (!rpgScreen.includes('advanceGardenPlotWithInventoryItem(plot.id, RPG_WATER_DROPS_ITEM_ID, nextStage)')) {
    fail('Watering Can must use the existing Water Drops growth hook');
  }
  if (!rpgScreen.includes('const [isCharacterOpen, setIsCharacterOpen] = useState(false);')) {
    fail('RPG screen must expose a dedicated character/equipment panel state');
  }
  if (!rpgScreen.includes('accessibilityLabel="Open character equipment"')) {
    fail('HUD must expose a character/equipment button');
  }
  if (!rpgScreen.includes('styles.characterPanel')) {
    fail('RPG screen must render the character/equipment panel');
  }
}

function validateCropPlotReadabilityV1() {
  if (!rpgScreen.includes('styles.gardenSoilInset') || !rpgScreen.includes('styles.gardenFurrowLine')) {
    fail('Crop plots must render a readable soil bed over the placeholder grid');
  }
  if (!rpgScreen.includes('growth.stage === 1 && styles.gardenSoilGrowing') || !rpgScreen.includes('growth.stage >= 2 && styles.gardenSoilMature')) {
    fail('Garden plot soil beds must reflect growth and mature states');
  }
  if (!rpgScreen.includes('plot.is_watered && styles.gardenSoilWatered')) {
    fail('Food crop plots must visibly reflect watered state');
  }
}

function validateSanctuaryBreachedZoneVisuals() {
  if (!rpgScreen.includes('function getBreachedZoneOverlayColor(type: SanctuaryZoneType)')) {
    fail('Sanctuary breached zones must have a dedicated warning overlay color helper');
  }
  if (!rpgScreen.includes('activeZone === \'sanctuary\' && sanctuaryZones.map(zone => (\n            [...zone.interiorCells, ...zone.perimeterCells].map')) {
    fail('Sanctuary zone overlays must render active and breached persisted zones');
  }
  if (!rpgScreen.includes("zone.state === 'breached' && styles.zoneOverlayBreached")) {
    fail('Breached sanctuary zones must use a distinct dashed overlay style');
  }
  if (!rpgScreen.includes("backgroundColor: zone.state === 'breached' ? getBreachedZoneOverlayColor(zone.type) : getZoneOverlayColor(zone.type)")) {
    fail('Breached sanctuary zones must use the warning overlay color instead of active zone colors');
  }
  if (!rpgScreen.includes('const labelKeys = zone.interiorCells.length > 0 ? zone.interiorCells : zone.perimeterCells;')) {
    fail('Sanctuary zone labels must fall back to perimeter cells when needed');
  }
  if (!rpgScreen.includes("zone.state === 'breached' && styles.zoneLabelBreached")) {
    fail('Breached sanctuary zone labels must use a distinct warning label style');
  }
  if (!rpgScreen.includes("zone.state === 'breached' ? `${ZONE_TYPE_LABEL[zone.type]} breach` : ZONE_TYPE_LABEL[zone.type]")) {
    fail('Breached sanctuary zone labels must name the broken zone state');
  }
}

function validateSeasonWeatherFarmLoopV2() {
  if (!rpgScreen.includes("type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';")) {
    fail('RPG screen must expose explicit season ids');
  }
  if (!rpgScreen.includes('const SEASON_CONFIG: Record<SeasonId')) {
    fail('RPG screen must centralize season harvest bonuses');
  }
  if (!rpgScreen.includes('const SANCTUARY_SEASON_AMBIENCE: Record<SeasonId')) {
    fail('RPG screen must centralize sanctuary season ambience colors');
  }
  ['spring', 'summer', 'autumn', 'winter'].forEach(season => {
    if (!rpgScreen.includes(`${season}: {`)) fail(`Missing season config: ${season}`);
  });
  if (!rpgScreen.includes('getCalendarState') || !rpgScreen.includes('const currentSeason = calendar.current_season as SeasonId;')) {
    fail('RPG screen must derive current season from the persisted RPG calendar state');
  }
  if (!rpgScreen.includes('const seasonInfo = SEASON_CONFIG[currentSeason];')) {
    fail('RPG screen must resolve current season info for HUD and gameplay');
  }
  if (!rpgScreen.includes('SANCTUARY_SEASON_AMBIENCE[currentSeason]')) {
    fail('Sanctuary ambience must derive from the current persisted season');
  }
  if (!rpgScreen.includes('const seasonalBonus = { ...seasonInfo.bonus };')) {
    fail('Harvest must include the active seasonal bonus without mutating season config');
  }
  if (!rpgScreen.includes('const cropAffinityDrop = growth.crop.preferredSeasons.includes(currentSeason)')) {
    fail('Harvest must check crop preferred seasons for affinity yield');
  }
  if (!rpgScreen.includes('...(cropAffinityDrop ? [cropAffinityDrop] : []),')) {
    fail('Crop affinity bonus must be included in transactional harvest drops');
  }
  if (!rpgScreen.includes('in-season +${cropAffinityDrop.quantity}')) {
    fail('Harvest toast must explain in-season crop affinity rewards');
  }
  if (!rpgScreen.includes('...rollHarvestDrops(growth.crop.harvest.drops),\n      seasonalBonus,')) {
    fail('Seasonal bonus must be included before harvestGardenPlot so it is transactional');
  }
  if (!rpgScreen.includes('styles.weatherPill')) {
    fail('RPG HUD must show current season/weather status');
  }
  if (!rpgScreen.includes("{seasonInfo.label} {isRaining ? 'Rain' : 'Clear'}")) {
    fail('Weather chip must distinguish rain from clear weather');
  }
  if (!rpgScreen.includes('styles.seasonAmbienceOverlay')) {
    fail('Sanctuary must render a season ambience wash over placeholder terrain');
  }
  if (!rpgScreen.includes('isRaining && styles.seasonAmbienceRain')) {
    fail('Sanctuary season ambience must visually respond to rainy weather');
  }
  if (!rpgScreen.includes('pointerEvents="none"\n          style={[\n            styles.seasonAmbienceOverlay')) {
    fail('Sanctuary season ambience must stay non-interactive');
  }
}

function validateRpgTerrainPlaceholderTruth() {
  const tileArtPath = path.join(engineDir, 'TileArt.tsx');
  const tileArt = fs.readFileSync(tileArtPath, 'utf8');
  if (!tileArt.includes('honest placeholder layer') || !tileArt.includes('code-native pixel textures')) {
    fail('TileArt must explicitly document sanctuary terrain as honest textured placeholder art');
  }
  if (!tileArt.includes('export function SanctuaryTerrainTile') || !tileArt.includes('SANCTUARY_TERRAIN_ART_REGISTRY')) {
    fail('TileArt must expose registry-backed sanctuary terrain texture rendering');
  }
  if (!tileArt.includes('assetSlot:') || !tileArt.includes('detail:') || !tileArt.includes('getSanctuaryTerrainPreviewColor') || !tileArt.includes('edgeBlend')) {
    fail('Sanctuary terrain art registry must define asset slots, detail profiles, preview colors, and transition behavior');
  }
  if (!tileArt.includes('export type SanctuaryTerrainNeighbors') || !tileArt.includes('tileTransitionEdgeNorth')) {
    fail('Sanctuary terrain tiles must support neighbor-aware transition edges');
  }
  if (!tileArt.includes('variant?: number') || !tileArt.includes('normalizeTerrainVariant') || !tileArt.includes('tileGrassTuft') || !tileArt.includes('tileSpeckle')) {
    fail('Sanctuary terrain placeholder tiles must support deterministic visual variation details');
  }
  if (!rpgScreen.includes('getSanctuaryTerrainPreviewColor') || !rpgScreen.includes('SanctuaryTerrainTile')) {
    fail('RPG screen must import the sanctuary terrain tile renderer and shared preview color helper');
  }
  if (!rpgScreen.includes('const getSanctuaryTerrainNeighbors = (row: number, col: number) =>') || !rpgScreen.includes('neighbors={getSanctuaryTerrainNeighbors(rowIndex, colIndex)}')) {
    fail('Sanctuary grid must pass neighbor terrain into textured terrain tiles');
  }
  if (!rpgScreen.includes('const getSanctuaryTerrainVariant = (row: number, col: number, type: TileType)') || !rpgScreen.includes('variant={getSanctuaryTerrainVariant(rowIndex, colIndex, tile as TileType)}')) {
    fail('Sanctuary grid must pass stable per-cell terrain variation into placeholder tiles');
  }
  if (!rpgScreen.includes('TileType.PATH') || !rpgScreen.includes('TileType.TILLED') || !rpgScreen.includes('TileType.BRIDGE')) {
    fail('RPG screen must still support bridge/path/tilled terrain tile types');
  }
  if (tileArt.includes('BRIDGE_TILE_FRAME') || tileArt.includes('PATH_TILE_FRAME') || tileArt.includes('TILLED_TILE_FRAME')) {
    fail('Terrain placeholder pass must not claim final tracked bridge/path/tilled sprite frames');
  }
}

function validateSanctuaryClutterV1() {
  ['rpg_clutter_weeds', 'rpg_clutter_twig', 'rpg_clutter_rock'].forEach(itemId => {
    if (!catalog.includes(itemId)) fail(`Catalog must expose clearable clutter item: ${itemId}`);
  });
  if (!catalog.includes("tags: ['clutter', 'weed', 'plant', 'clearable']")) {
    fail('Weed clutter must be tagged as clearable clutter');
  }
  if (!catalog.includes("tags: ['clutter', 'twig', 'wood', 'clearable']")) {
    fail('Twig clutter must be tagged as clearable clutter');
  }
  if (!catalog.includes("tags: ['clutter', 'rock', 'stone', 'clearable']")) {
    fail('Rock clutter must be tagged as clearable clutter');
  }
  if (!rpgScreen.includes('const STARTER_CLUTTER_SPAWNS = [')) {
    fail('RPG screen must define starter sanctuary clutter spawns');
  }
  if (!rpgScreen.includes("system.sanctuary_clutter_v1")) {
    fail('Starter clutter must use a persistent one-time seed marker');
  }
  if (!rpgScreen.includes('const ensureStarterSpawns = (spawns: { type: string; row: number; col: number }[], discoveryFlag: string)')) {
    fail('RPG screen must seed starter clutter through the shared starter-spawn helper');
  }
  if (!rpgScreen.includes('const CLUTTER_ENERGY_COST = 3;')) {
    fail('Clearing clutter must have an explicit energy cost');
  }
  if (!rpgScreen.includes('const isClearableClutter = (item: ShopCatalogItem)')) {
    fail('RPG screen must centralize clearable clutter detection');
  }
  if (!rpgScreen.includes('const clearClutterObject = (object: MapObject, item: ShopCatalogItem)')) {
    fail('RPG screen must expose a clear clutter interaction');
  }
  if (!rpgScreen.includes('DELETE FROM sanctuary_objects WHERE id = ?')) {
    fail('Clearing clutter must remove the placed clutter object');
  }
  if (!rpgScreen.includes('deleteSanctuaryObjectInteractions(object.id)')) {
    fail('Clearing clutter must clean interaction memory');
  }
  if (!rpgScreen.includes('deleteSanctuaryObjectRelationsForObject(object.id)')) {
    fail('Clearing clutter must clean object relations');
  }
  if (!rpgScreen.includes('Cleared ${item.name}: ${rewardText}')) {
    fail('Clearing clutter must show visible reward feedback');
  }
}

function validateRpgCraftingV1() {
  if (!craftingCatalog.includes('export const CRAFTING_CATALOG')) {
    fail('CraftingCatalog must define crafting recipes');
  }
  ['recipe_woodland_planter', 'recipe_crystal_lamp', 'recipe_temple_chest'].forEach(recipeId => {
    if (!craftingCatalog.includes(`'${recipeId}'`)) fail(`Missing crafting recipe: ${recipeId}`);
  });
  if (!rpgScreen.includes('const startCraftingJob = (recipeId: string) =>') || !dbCrafting.includes('export function startCrafting(recipeId: string')) {
    fail('RPG screen must expose a crafting transaction handler');
  }
  if (!dbCrafting.includes('SELECT quantity FROM user_inventory WHERE item_id = ? AND quantity >= ? LIMIT 1')) {
    fail('Crafting must consume ingredients with quantity guards');
  }
  if (!dbCrafting.includes('UPDATE user_inventory SET quantity = quantity - ? WHERE item_id = ?')) {
    fail('Crafting must deduct ingredients inside the crafting transaction');
  }
  if (!dbCrafting.includes('ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity')) {
    fail('Crafting must add recipe output through inventory upsert');
  }
  if (!rpgScreen.includes("recordRpgDiscovery(recipe.outputItemId, 'inventory')")) {
    fail('Crafted outputs must record RPG discovery');
  }
  if (!dbCrafting.includes('try { db.execSync(\'ROLLBACK\'); } catch {}')) {
    fail('Crafting must rollback on failure');
  }
  if (!rpgScreen.includes('accessibilityLabel="Open crafting"')) {
    fail('HUD must expose a crafting button');
  }
  if (!rpgScreen.includes('styles.craftingPanel')) {
    fail('RPG screen must render the crafting panel');
  }
  if (!rpgScreen.includes('disabled={!canCraft || !hasStation}')) {
    fail('Craft button must disable when ingredients are missing');
  }
  if (!rpgScreen.includes("setIsCraftingOpen(false)")) {
    fail('Crafting panel must close when other RPG panels/modes take over');
  }
}

function validateIconQaAndMechanismReadabilityV2() {
  const woodBlock = extractBlock(catalog, "[RPG_WOOD_ITEM_ID]: {", "  [RPG_STONE_ITEM_ID]:");
  const woodPlankBlock = extractBlock(catalog, "[RPG_WOOD_PLANK_ITEM_ID]: {", "  [RPG_GEODE_ITEM_ID]:");
  const clothBlock = extractBlock(catalog, "[RPG_CLOTH_ITEM_ID]: {", "  [RPG_TURNIP_SEED_ITEM_ID]:");
  if (!woodBlock.includes('source: RPG_RESOURCE_SOURCES.wood')) {
    fail('Wood resource must use the dedicated branch/log candidate, not a broken-tree object');
  }
  if (woodBlock.includes('RPG_OBJECT_SOURCES.Broken_tree1')) {
    fail('Wood resource must not render from the broken-tree object');
  }
  if (!woodPlankBlock.includes('source: RPG_RESOURCE_SOURCES.woodPlank')) {
    fail('Wood Plank must use the dedicated wood-strip candidate, not the raw stick bundle');
  }
  if (!assetRegistry.includes('wood: RPG_WOOD_ICON')) {
    fail('Asset registry must expose a dedicated raw wood source');
  }
  if (!assetRegistry.includes('woodPlank: RPG_WOOD_PLANK_ICON')) {
    fail('Asset registry must expose a dedicated wood plank source');
  }
  if (!assetRegistry.includes('cloth: RPG_CLOTH_ICON')) {
    fail('Cloth must use a dedicated candidate instead of aliasing raw wool');
  }
  if (assetRegistry.includes('cloth: RPG_WOOL_ICON')) {
    fail('Cloth must not alias raw wool art');
  }
  if (!clothBlock.includes('source: RPG_RESOURCE_SOURCES.cloth')) {
    fail('Cloth item must render from the dedicated cloth source');
  }
  if (!catalog.includes("if (asset.tags.includes('lever')) {\n    return { colWidth: 1, colHeight: 1, visWidth: 2, visHeight: 2 };")) {
    fail('Lever visual footprint must be larger than its 1x1 collision footprint so it is visible on device');
  }
  if (!itemIcon.includes('function mechanismLabel(item: RpgItemDefinition | null | undefined)')) {
    fail('Compact item icons must centralize mechanism labels');
  }
  ['L', 'G', 'T', 'M'].forEach(label => {
    if (!itemIcon.includes(`return '${label}'`)) {
      fail(`Mechanism icon labels must include compact ${label} marker`);
    }
  });
  if (!itemIcon.includes('styles.mechanismBadge')) {
    fail('Mechanism item icons must render a readable badge in compact UI');
  }
  if (!itemIcon.includes('function placeholderProductLabel(item: RpgItemDefinition | null | undefined)')) {
    fail('Animal product placeholders must render explicit semantic labels');
  }
  if (!itemIcon.includes('styles.placeholderProductBadge')) {
    fail('Animal product placeholder icons must show a readable product badge');
  }
}

function validateFarmingSeedTaxonomyV2() {
  if (!itemIcon.includes('function placeholderSeedLabel(item: RpgItemDefinition | null | undefined)')) {
    fail('Seed placeholders must render explicit semantic labels');
  }
  if (!itemIcon.includes("item?.kind !== 'seed' || item.iconAssetId !== 'seed.treeGeneric'")) {
    fail('Seed placeholder labels must only apply to generic placeholder seed art');
  }
  if (!itemIcon.includes('styles.placeholderSeedBadge')) {
    fail('Generic seed placeholder icons must show a readable seed badge');
  }
  [
    'RPG_TURNIP_SEED_ITEM_ID',
    'RPG_CABBAGE_SEED_ITEM_ID',
    'RPG_PUMPKIN_SEED_ITEM_ID',
  ].forEach(constantName => {
    if (!catalog.includes(`[${constantName}]: {`)) fail(`Catalog must expose crop seed item keyed by ${constantName}`);
  });
  [
    'crop: RPG_CROP_CATALOG[RPG_TURNIP_SEED_ITEM_ID]',
    'crop: RPG_CROP_CATALOG[RPG_CABBAGE_SEED_ITEM_ID]',
    'crop: RPG_CROP_CATALOG[RPG_PUMPKIN_SEED_ITEM_ID]',
  ].forEach(snippet => {
    if (!catalog.includes(snippet)) fail(`Crop seed item must link to crop taxonomy: ${snippet}`);
  });
  if (!assetRegistry.includes("'seed.treeGeneric'") || !assetRegistry.includes("tags: ['seed', 'placeholder']")) {
    fail('Generic seed art must remain explicitly tagged as a placeholder asset');
  }
}

function validateFarmAnimalsV1() {
  ['rpg_egg', 'rpg_milk', 'rpg_wool', 'rpg_truffle'].forEach(itemId => {
    if (!catalog.includes(itemId)) fail(`Catalog must expose animal product resource: ${itemId}`);
  });
  ['rpg_egg', 'rpg_milk', 'rpg_wool', 'rpg_truffle'].forEach(itemId => {
    if (!catalog.includes("tags: ['animal_product'")) {
      fail(`Animal product resources must be tagged as placeholders until verified icons exist: ${itemId}`);
    }
  });
  ['resource.egg', 'resource.milk', 'resource.wool', 'resource.truffle'].forEach(assetId => {
    if (!assetRegistry.includes(`'${assetId}'`)) fail(`Asset registry must declare product placeholder: ${assetId}`);
  });
  ['milkProduct'].forEach(frameId => {
    if (!assetRegistry.includes(frameId)) fail(`Asset registry must expose ${frameId} frame`);
  });
  ['egg', 'wool', 'truffle'].forEach(sourceId => {
    if (!assetRegistry.includes(`${sourceId}: RPG_`)) {
      fail(`Asset registry must expose source-backed product candidate: ${sourceId}`);
    }
  });
  ['resource.cloth', 'resource.trash', 'resource.dwarvishHelm', 'resource.omelet'].forEach(assetId => {
    if (!assetRegistry.includes(`'${assetId}'`)) fail(`Asset registry must declare rewired placeholder: ${assetId}`);
  });
  ['cloth', 'trash', 'omelet'].forEach(sourceId => {
    if (!assetRegistry.includes(`${sourceId}: RPG_`)) {
      fail(`Asset registry must expose source-backed rewired candidate: ${sourceId}`);
    }
  });
  // dwarvishHelm graduated from a rewired candidate to a verified UI frame
  // (icon purge WO3): keep it pinned to real frame art, not a loose source.
  if (!assetRegistry.includes('dwarvishHelm: rpgUiIcon')) {
    fail('Dwarvish Helm must use the verified UI helm frame');
  }
  if (catalog.includes("description: 'A small egg from a Chick. Placeholder seed-packet art")) {
    fail('Egg must no longer use seed-packet placeholder copy');
  }
  if (catalog.includes("description: 'Fresh milk from a Calf. Placeholder droplet art")) {
    fail('Milk must no longer use water-drop placeholder copy');
  }
  if (!rpgScreen.includes('const ANIMAL_PRODUCT_COOLDOWN_MS = 30000;')) {
    fail('Animal product collection must have an explicit cooldown');
  }
  if (!rpgScreen.includes('const isFarmAnimalObject = (item: ShopCatalogItem)')) {
    fail('RPG screen must centralize farm animal object detection');
  }
  if (!rpgScreen.includes('const collectAnimalProduct = (object: MapObject, item: ShopCatalogItem)')) {
    fail('RPG screen must expose animal product collection through Interact');
  }
  if (!rpgScreen.includes('addSandboxInventoryItem(drop.itemId, drop.quantity, \'forage\')')) {
    fail('Animal products must be granted through inventory/discovery helper');
  }
  if (!rpgScreen.includes('if (isFarmAnimalObject(item))')) {
    fail('Interact object flow must route farm animals before generic forage handling');
  }
  if (!catalog.includes("description: `${asset.name} from the farm animal archive. Interact to collect a small farm product.`")) {
    fail('Animal catalog descriptions must explain Interact product collection');
  }
}

function validateArchiveFarmGuideV1() {
  [
    "facts.push(`Crop: ${item.crop.name}`)",
    "facts.push(`Stages: sprout now, growing ${formatMinutes(item.crop.stageMinutes[1])}, mature ${formatMinutes(item.crop.stageMinutes[2])}`)",
    "facts.push(`Best seasons: ${formatSeasonList(item.crop.preferredSeasons)}`)",
    "facts.push('Water: Watering Can or streak rain can advance growth')",
    "facts.push('Season: harvest includes a weather bonus; preferred seasons add extra yield')",
    "facts.push('Cooldown: 30 sec after a successful collection')",
    "facts.push('Action: stand near it and press Interact')",
    "facts.push('Use: animal product resource for selling or future crafting')",
    "facts.push('Art: labeled placeholder until final product art is verified')",
  ].forEach(snippet => {
    if (!catalog.includes(snippet)) fail(`Archive farm guide missing: ${snippet}`);
  });
  if (!catalog.includes('function formatMinutes(minutes: number)')) {
    fail('Archive farm guide must format crop stage timing');
  }
  if (!catalog.includes("export type RpgCropSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';")) {
    fail('Crop catalog must expose explicit crop season affinity ids');
  }
  if (!catalog.includes('preferredSeasons: RpgCropSeasonId[];')) {
    fail('Crop definitions must declare preferred season metadata');
  }
  if (!catalog.includes('function formatSeasonList(seasons: RpgCropSeasonId[])')) {
    fail('Archive farm guide must format preferred crop seasons');
  }
  ['White_tree1_seed', 'Curved_tree1_seed', 'Luminous_tree1_seed', 'Blue-green_balls_tree1_seed', 'Mega_tree1_seed'].forEach(seedId => {
    if (!catalog.includes(`${seedId}`) || !catalog.includes('preferredSeasons')) {
      fail(`Seed crop must declare preferred seasons: ${seedId}`);
    }
  });
  if (!archive.includes('selected.facts.slice(0, 6)')) {
    fail('Archive detail panel must show enough facts for farm guide entries');
  }
}

function validateObjectInteractionReactionsV1() {
  [
    'type WorldCellReaction = {',
    'const [worldCellReaction, setWorldCellReaction] = useState<WorldCellReaction | null>(null);',
    'const worldCellReactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);',
    'const showObjectReaction = (',
    'const showPlotReaction = (',
    'setWorldCellReaction({',
    'worldCellReactionTimer.current = setTimeout(() => setWorldCellReaction(null), 900);',
    'styles.worldCellReaction',
    'styles.worldCellReactionSuccess',
    'styles.worldCellReactionWarn',
    'showObjectReaction(object, `+${drop.quantity}`, dropDef, \'success\');',
    "showPlotReaction(plot, result.stage >= 2 ? 'mature' : '+growth', getRpgItem(RPG_WATER_DROPS_ITEM_ID), 'success');",
    "showPlotReaction(plot, `${growth.remainingMinutes}m`, getRpgItem(plot.seed_item_id), 'muted');",
    "showPlotReaction(plot, cropAffinityDrop ? 'season+' : `+${result.coins}`, affinityItem ?? firstDropItem ?? seasonalItem ?? getRpgItem(plot.seed_item_id), 'success');",
    "showObjectReaction(object, 'rest', item, 'muted');",
    "showObjectReaction(object, '...', item, 'muted');",
    "showObjectReaction(object, isOn ? 'ON' : 'OFF', item, affected.length ? 'success' : 'muted');",
    "showObjectReaction(object, isDisabled ? 'safe' : 'armed', item, isDisabled ? 'success' : 'muted');",
  ].forEach(snippet => {
    if (!rpgScreen.includes(snippet)) fail(`Object reaction feedback missing: ${snippet}`);
  });
}

const forestAssets = parseForestAssets();
const crystalAssets = parseCrystalAssets();
const bushAssets = parseBushAssets();
const caveAssets = parseCaveAssets();
const templeAnimations = parseTempleAnimations();
const templeAssets = parseTempleAssets();
const animalAssets = parseAnimalAssets();
const objectAssets = [...forestAssets, ...crystalAssets, ...bushAssets, ...caveAssets, ...templeAssets, ...animalAssets];
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
validateAnimalMetadata(animalAssets);
validateContentMetadata();
validateArchiveScalabilityControls();
validateArchiveFarmGuideV1();
validateObjectInteractionReactionsV1();
validateBackpackScalabilityControls();
validateBackpackCharacterInventorySplit();
validateShopScalabilityControls();
validateSanctuaryDesignRoles();
validateSanctuaryFootprintPreview();
validateSanctuaryTerrainPaintPreview();
validateArchiveCompositionGuidance();
validateWorldArtRenderer();
validateSanctuaryInteractionMemory();
validateSanctuaryRewardClaims();
validateLeverToggleFeedback();
validateTrapDisableFeedback();
validateGateRattleFeedback();
validateInteractionTargetPrompt();
validateActionButtonProtocol();
validateEmptyInteractionFeedback();
validateBuildPlacementFeedback();
validateBuildEditorNudgeControls();
validateBuildPlacementGhostPolish();
validateBuildModeContextStrip();
validateAttackFeedbackProtocol();
validateResolvedActionTargetProtocol();
validateActionControlClarity();
validateSanctuaryObjectRelations();
validateResourceNodeFeedback();
validateLeverMechanicsV1();
validateRpgToolEnergyAndCharacterUi();
validateCropPlotReadabilityV1();
validateSanctuaryBreachedZoneVisuals();
validateSeasonWeatherFarmLoopV2();
validateRpgTerrainPlaceholderTruth();
validateSanctuaryClutterV1();
validateRpgCraftingV1();
validateIconQaAndMechanismReadabilityV2();
validateFarmingSeedTaxonomyV2();
validateFarmAnimalsV1();

if (failures.length > 0) {
  console.error('RPG content validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`RPG content validation passed (${forestAssets.length} forest assets, ${crystalAssets.length} crystal assets, ${bushAssets.length} bush assets, ${caveAssets.length} cave assets, ${templeAssets.length} temple assets, ${animalAssets.length} animal assets, ${catalogItemIds.size} catalog items).`);
