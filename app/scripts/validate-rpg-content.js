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

const assetRegistry = fs.readFileSync(assetRegistryPath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const itemIds = fs.readFileSync(itemIdsPath, 'utf8');
const archive = fs.readFileSync(archivePath, 'utf8');
const backpack = fs.readFileSync(backpackPath, 'utf8');
const shop = fs.readFileSync(shopPath, 'utf8');
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

function validateContentMetadata() {
  if (!catalog.includes("export type RpgItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';")) {
    fail('Missing RpgItemRarity union type');
  }
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
  if (!archive.includes('TextInput')) fail('Archive must include search input for large catalogs');
  if (!archive.includes('archiveEntryMatchesQuery')) fail('Archive search must use catalog-derived entry data');
  if (!archive.includes('Showing {filteredEntries.length}')) fail('Archive summary must expose filtered result count');
}

function validateBackpackScalabilityControls() {
  if (!backpack.includes("type BackpackSort = 'kind' | 'name' | 'quantity';")) fail('Backpack must expose stable sort modes');
  if (!backpack.includes('TextInput')) fail('Backpack must include search input for large inventories');
  if (!backpack.includes('backpackSlotMatchesQuery')) fail('Backpack search must use catalog-derived item data');
  if (!backpack.includes('Showing {filteredInventory.length}')) fail('Backpack summary must expose filtered result count');
}

const forestAssets = parseForestAssets();
const crystalAssets = parseCrystalAssets();
const bushAssets = parseBushAssets();
const objectAssets = [...forestAssets, ...crystalAssets, ...bushAssets];
const registryIds = parseRegistryIds(objectAssets);
const catalogItemIds = parseCatalogItemIds(objectAssets);

validateForestAssets(forestAssets);
validateCrystalAssets(crystalAssets);
validateBushAssets(bushAssets);
validateAssetReferences(registryIds);
validateDropReferences(catalogItemIds);
validateSeedReferences(forestAssets, catalogItemIds);
validatePlaceableMetadata(forestAssets);
validateCrystalMetadata(crystalAssets, catalogItemIds);
validateBushMetadata(bushAssets);
validateContentMetadata();
validateArchiveScalabilityControls();
validateBackpackScalabilityControls();

if (failures.length > 0) {
  console.error('RPG content validation failed:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`RPG content validation passed (${forestAssets.length} forest assets, ${crystalAssets.length} crystal assets, ${bushAssets.length} bush assets, ${catalogItemIds.size} catalog items).`);
