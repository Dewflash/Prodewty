# RPG Asset Atlas

Last updated: 2026-06-27

This document records verified RPG sandbox assets and coordinates. It is the companion artifact for Phase 1 of `RPG_SANDBOX_PHASE_PLAN.md`.

## Rule

Do not use mystery numbered icon files for semantic items unless this atlas records what the icon visually is. If a good icon is not verified, use a generic placeholder until it is verified.

## Contact Sheets

Generated contact sheets are stored under `docs/rpg-asset-atlas/`.

| Contact sheet | Source asset | Grid | Purpose |
| --- | --- | --- | --- |
| `ui-icons-16.png` | `app/assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Icons.png` | 16x16 | RPG HUD and item icons |
| `inventory-sheet-16.png` | `app/assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Inventory.png` | 16x16 | Backpack panel and inventory UI |
| `shop-sheet-16.png` | `app/assets/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Shop.png` | 16x16 | Shop panel and buy buttons |
| `farm-plants-16.png` | `app/assets/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Plants.png` | 16x16 | Crop and plant growth candidates |
| `farm-supplies-16.png` | `app/assets/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Supplies.png` | 16x16 | Harvest/resource/produce candidates |

## Verified Production Frames

These frames are safe for current production use.

| Name | Source | Coordinates | Size | Current use |
| --- | --- | --- | --- | --- |
| `backpack` | `Icons.png` | row 0, col 3 | 16x16 | HUD backpack button |
| `inventoryPanel` | `Inventory.png` | x 224, y 0 | 112x128 | Backpack overlay panel |
| `shopPanel` | `Shop.png` | x 384, y 0 | 128x128 | Shop overlay panel |
| `leaves` | `Supplies.png` | row 6, col 2 | 32x32 | `rpg_leaves` |
| `seed` | `Supplies.png` | row 1, col 1 | 32x32 | Tree seed placeholder/sapling marker |
| `archiveClosedBook` | `Open_book.png` | row 0, col 0 | 272x272 | Archive HUD button |
| `archiveOpenBook` | `Open_book.png` | row 2, col 3 | 272x272 | Archive overlay panel |

Notes:

- `leaves` is visually a green leaf cluster and replaces the prior worm-looking numbered icon.
- `seed` is currently a sprout/plant marker. It is acceptable for the draft tree-seed item, but Phase 7 may replace it with a seed-bag or crop-specific seed once farming is live.
- `inventoryPanel` includes the full right-side inventory panel from the source sheet. Earlier code used a narrower local crop; this was corrected by moving the frame into `RpgObjectCatalog.ts`.

## Labeled Placeholder Frames

These frames are intentionally not final art, but they are semantically safer than reusing unrelated icons. The runtime overlays a text badge on these items so players can see what the item is while final produce art remains unverified.

| Name | Source | Coordinates | Size | Current use |
| --- | --- | --- | --- | --- |
| `eggProduct` | `Supplies.png` | row 3, col 8 | 32x32 | `rpg_egg` placeholder with `EGG` badge |
| `milkProduct` | `Supplies.png` | row 6, col 6 | 32x32 | `rpg_milk` placeholder with `MILK` badge |
| `woolProduct` | `Supplies.png` | row 6, col 0 | 32x32 | `rpg_wool` placeholder with `WOOL` badge |
| `truffleProduct` | `Supplies.png` | row 6, col 5 | 32x32 | `rpg_truffle` placeholder with `TRUF` badge |

## Verified Candidate Frames

These frames have been visually identified but are not yet used in production.

| Name | Source | Coordinates | Size | Planned phase |
| --- | --- | --- | --- | --- |
| `shopPanelThreeItems` | `Shop.png` | x 256, y 0 | 128x128 | Phase 3 |
| `coinSmall` | `Inventory.png` | row 5, col 15 | 16x16 | Phase 3 or 8 |
| `gemSmall` | `Inventory.png` | row 5, col 18 | 16x16 | Later currency polish |
| `toolSword` | `Icons.png` | row 8, col 0 | 16x16 | Later combat UI |
| `toolShield` | `Icons.png` | row 8, col 1 | 16x16 | Later equipment UI |
| `waterDropBlue` | `Icons.png` | row 13, col 3 | 16x16 | Phase 9 Water Drops |
| `waterDropRedBlue` | `Icons.png` | row 17, col 5 | 16x16 | Later potion/energy variant |

## Farming Candidates

The farm sheets are large and should be used carefully.

Good near-term candidates:

- `Plants.png`: rows 22-26 contain smaller crop-stage plants that can fit 1x1 world cells better than the large trees.
- `Supplies.png`: rows 8-13 contain produce/resources that can work as harvested item icons.
- `Supplies.png`: row 13, cols 9-17 contain small produce icons that can become crop output icons after visual review.

Do not use yet:

- Large trees from `Plants.png` as crops. They are too large for early farming and will confuse object placement/canopy logic.
- Additional animal sprites from `craftpix-net-291971-free-top-down-animals-farm-pixel-art-sprites` beyond the four Phase 70 livestock entries until each one is framed and cataloged.

## Current Code Mapping

Production mapping currently lives in `app/src/engine/RpgObjectCatalog.ts`.

Runtime asset mapping now lives in `app/src/engine/RpgAssetRegistry.ts`.

Known frame entries:

```ts
RPG_UI_FRAMES.backpack
RPG_UI_FRAMES.inventoryPanel
RPG_UI_FRAMES.shopPanel
RPG_UI_FRAMES.leaves
RPG_UI_FRAMES.seed
BRIDGE_TILE_FRAME
PATH_TILE_FRAME
TILLED_TILE_FRAME
RPG_ARCHIVE_FRAMES.closedBook
RPG_ARCHIVE_FRAMES.openBook
```

Current item mappings:

| Item id | Kind | Icon policy |
| --- | --- | --- |
| `rpg_leaves` | resource | Uses verified `leaves` |
| `White_tree1_seed` | seed | Uses verified draft `seed` |
| `Curved_tree1_seed` | seed | Uses verified draft `seed` |
| `Luminous_tree1_seed` | seed | Uses verified draft `seed` |
| `Blue-green_balls_tree1_seed` | seed | Uses verified draft `seed` |
| `Mega_tree1_seed` | seed | Uses verified draft `seed` |
| `Farm_chick` | object | Uses framed animation from tracked farm animal pack |
| `Farm_piglet` | object | Uses framed animation from tracked farm animal pack |
| `Farm_sheep` | object | Uses framed animation from tracked farm animal pack |
| `Farm_calf` | object | Uses framed animation from tracked farm animal pack |
| `rpg_egg` | resource | Placeholder `seed` frame until a verified egg icon exists |
| `rpg_milk` | resource | Placeholder `waterDrop` frame until a verified milk icon exists |
| `rpg_wool` | resource | Placeholder `leaves` frame until a verified wool icon exists |
| `rpg_truffle` | resource | Placeholder cave mushroom source until a verified truffle icon exists |
| tree/gazebo objects | object | Uses full object sprite source, not icon frame |

## Forest Object Pack Mapping

`RpgAssetRegistry.ts` now maps all 40 files from:

`app/assets/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/`

Mapped categories:

- Trees: white, curved, luminous, light-ball, blue-green, mega, swirling, willow variants.
- Mushrooms: beige-green, white-red, and chanterelle variants.
- Structures/idols: living gazebos and tree idols.
- Forest guardians: ent variants.

Runtime behavior:

- All 40 objects are archive-visible.
- All 40 objects are valid catalog object entries with explicit footprint and visual-size metadata.
- The shop uses the existing six-slot panel as a paged/filterable catalog for all 40 mapped forest objects.
- Tree-tagged objects can use forage hooks; only tree objects with seed catalog entries can currently drop specific seeds.

## Farming Runtime Art

`RpgAssetRegistry.ts` exposes `RPG_CROP_STAGE_FRAMES` for the existing tree-seed crops, but the current runtime frames intentionally reuse verified semantic UI icons until real crop frames are curated.

Runtime behavior:

- Existing garden plots render the verified seed marker for early stages and verified leaves for mature crops.
- The plot renderer falls back to the seed icon if a crop has no verified stage frames.
- `Plants.png` is not imported by runtime crop rendering because its previously chosen frames were visually wrong on device.
- `Supplies.png` remains a candidate sheet for produce/harvest icons and is not yet used at runtime.

## Tool Terrain Tile Art

`TileArt.tsx` now uses tracked sprite frames from:

`app/assets/game/craftpix-net-160005-free-ruined-temple-top-down-location-pixel-art/PNG/Tiles_exterior.png`

Runtime terrain mappings:

- `BRIDGE_TILE_FRAME`: x 352, y 0, 32x32. Used by `BridgeTile`.
- `PATH_TILE_FRAME`: x 224, y 32, 32x32. Used by `PathTile`.
- `TILLED_TILE_FRAME`: x 176, y 128, 32x32. Used by `TilledTile`.

Notes:

- Bridge and Path are now sprite-backed instead of hand-drawn view fills.
- Tilled Soil is sprite-backed candidate ground art, but it is not final farm-soil art yet.
- Future farming art should still replace Tilled Soil with a dedicated verified soil frame if one is found.

## Farm Animal Pack Mapping

`RpgAssetRegistry.ts` maps the first four livestock entries from:

`app/assets/game/craftpix-net-291971-free-top-down-animals-farm-pixel-art-sprites/Tiled/`

Mapped production animals:

- `Farm_chick`: `Chick_animation_with_shadow.png`, framed as 24x32 cells.
- `Farm_piglet`: `Piglet_animation_with_shadow.png`, framed as 48x64 cells.
- `Farm_sheep`: `Sheep_animation_with_shadow.png`, framed as 48x64 cells.
- `Farm_calf`: `Calf_animation_with_shadow.png`, framed as 96x128 cells.

Runtime behavior:

- All four animals are archive-visible and shop-visible.
- Animals are placeable world objects with 1x1 collision footprints.
- Interacting with animals can grant products through the inventory/discovery path.
- Product icons are labeled placeholder mappings, not final verified produce art.

## Open Asset Issues

- Backpack and shop now use real React Native touch grids instead of sprite-panel hitbox alignment; phone review should focus on touch comfort and visual sizing.
- Seeds use a sprout marker, not a true seed-bag icon.
- Crop stage art is deliberately unresolved; produce icons are still unselected.
- Water Drops icon is selected as a candidate but not implemented.
- Some untracked asset sheets remain in the worktree and should only be staged when a phase needs them.

## Phase 1 Audit

Intended behavior:

- Asset decisions are inspectable.
- Current production icons are named and verified.
- Known future assets are candidates, not accidental production dependencies.

Negative guarantees:

- No new semantic item should use an unnamed `Icon##_1.png` file.
- No unverified farm/animal assets should be pulled into production.
- The atlas must not imply Phase 3 through Phase 10 are complete.

Files changed for Phase 1 draft:

- `RPG_ASSET_ATLAS.md`
- `RPG_SANDBOX_PHASE_PLAN.md`
- `docs/rpg-asset-atlas/ui-icons-16.png`
- `docs/rpg-asset-atlas/inventory-sheet-16.png`
- `docs/rpg-asset-atlas/shop-sheet-16.png`
- `docs/rpg-asset-atlas/farm-plants-16.png`
- `docs/rpg-asset-atlas/farm-supplies-16.png`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgBackpack.tsx`

Verification evidence:

- Passed: `git diff --check -- RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgBackpack.tsx`
- Passed: `npx tsc --noEmit`
- Passed: `rg "Icon95_1|Icon77_1|Icon[0-9]+_1|RPG_UI_FRAMES|inventoryPanel|PANEL_FRAME|INVENTORY_SHEET" ...` found no random numbered semantic icon use in active RPG catalog/backpack paths.
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase1-export`

Expansion notes saved for after draft implementation:

- Add a small script that regenerates contact sheets deterministically.
- Add a dev-only atlas viewer screen.
- Move crop candidates into a typed crop catalog during Phase 6.
- Add visual snapshot tests once the app has a test renderer path.

Phase 1 status:

- Verified.
