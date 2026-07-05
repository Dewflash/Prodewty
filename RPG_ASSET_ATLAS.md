# RPG Asset Atlas

Last updated: 2026-07-06

This document records verified RPG sandbox assets and coordinates. It is the companion artifact for Phase 1 of `RPG_SANDBOX_PHASE_PLAN.md`.

## Rule

Do not use mystery numbered icon files for semantic items unless this atlas records what the icon visually is. If a good icon is not verified, use a generic placeholder until it is verified.

## Contact Sheets

Generated contact sheets are stored under `docs/rpg-asset-atlas/`.

| Contact sheet | Source asset | Grid | Purpose |
| --- | --- | --- | --- |
| `ui-icons-16.png` | `app/assets/game/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Icons.png` | 16x16 | RPG HUD and item icons |
| `inventory-sheet-16.png` | `app/assets/game/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Inventory.png` | 16x16 | Backpack panel and inventory UI |
| `shop-sheet-16.png` | `app/assets/game/craftpix-net-255216-free-basic-pixel-art-ui-for-rpg/PNG/Shop.png` | 16x16 | Shop panel and buy buttons |
| `farm-plants-16.png` | `app/assets/game/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Plants.png` | 16x16 | Crop and plant growth candidates |
| `farm-supplies-16.png` | `app/assets/game/craftpix-net-200380-free-pixel-art-plants-for-farm/PNG/Supplies.png` | 16x16 | Harvest/resource/produce candidates |
| `fish-seed-candidates.png` | mixed candidate sources | variable | Focused fish, squid, seaweed, bait, and seed candidate review |
| `wood-cloth-candidates.png` | mixed candidate sources | variable | Focused wood, plank, wool, and cloth candidate review |
| `remaining-placeholder-candidates.png` | mixed candidate sources | variable | Before choosing replacements for leftover placeholder items |
| `wired-remaining-placeholder-fixes.png` | mixed candidate sources | variable | Before/after proof for the latest rewired item icons |
| `wired-squid-fix.png` | fantasy icon sources | variable | Before/after proof replacing the squid bait/worm reuse |
| `wired-wood-cloth-fixes.png` | mixed candidate sources | variable | Before/after proof replacing raw wood, wood plank, and cloth reuses |
| `sanctuary-terrain-frames.png` | `Tiles_exterior.png` | 16x16 | The 6 shipped sanctuary ground frames (4 grass + dirt + stone), read back for visual verification |

## Verified Production Frames

These frames are safe for current production use.

| Name | Source | Coordinates | Size | Current use |
| --- | --- | --- | --- | --- |
| `backpack` | `Icons.png` | row 0, col 3 | 16x16 | HUD backpack button |
| `inventoryPanel` | `Inventory.png` | x 224, y 0 | 112x128 | Backpack overlay panel |
| `shopPanel` | `Shop.png` | x 384, y 0 | 128x128 | Shop overlay panel |
| `leaves` | `Icons.png` | row 5, col 4 | 16x16 | `rpg_leaves`, fiber, hay, bait |
| `treeSeed` | `Icon83_1_2.png` | full file | 32x32 | Tree and crop seed placeholder |
| `waterDrop` | `Icons.png` | row 17, col 2 | 16x16 | `rpg_water_drops` |
| `sprinklerProduct` | `Icons.png` | row 6, col 3 | 16x16 | `rpg_sprinkler` candidate |
| `fertiliserProduct` | `Icon108_1_2.png` | full file | 32x32 | `rpg_fertiliser` candidate |
| `stone` | `Rock5_1_no_shadow.png` | full file | 64x64 | `rpg_stone` rounded rock candidate |
| `geode` | `Rock2_1_no_shadow.png` | full file | 64x64 | `rpg_geode` closed rock/mineral candidate |
| `amethyst` | `Violet_crystal4.png` | full file | 16x16 | `rpg_amethyst` |
| `ruby` | `Red_crystal4.png` | full file | 16x16 | `rpg_ruby` |
| `diamond` | `White_crystal4.png` | full file | 16x16 | `rpg_diamond` |
| `archiveClosedBook` | `Open_book.png` | row 0, col 0 | 272x272 | Archive HUD button |
| `archiveOpenBook` | `Open_book.png` | row 2, col 3 | 272x272 | Archive overlay panel |
| `terrainGrassBase` | `Tiles_exterior.png` | col 17, row 10 (x 272, y 160) | 16x16 | Sanctuary GRASS base (flat warm grass rgb 122,173,85) |
| `terrainGrassV1` | `Tiles_exterior.png` | col 23, row 7 (x 368, y 112) | 16x16 | Sanctuary GRASS variant (leaf clumps, top) |
| `terrainGrassV2` | `Tiles_exterior.png` | col 21, row 7 (x 336, y 112) | 16x16 | Sanctuary GRASS variant (leaf clumps, top) |
| `terrainGrassV3` | `Tiles_exterior.png` | col 14, row 14 (x 224, y 224) | 16x16 | Sanctuary GRASS variant (light leaf, top-right) |
| `terrainDirt` | `Tiles_exterior.png` | col 17, row 14 (x 272, y 224) | 16x16 | Sanctuary PATH + TILLED/DITCH/WET_SOIL base (flat brown rgb 146,118,90) |
| `terrainStone` | `Tiles_exterior.png` | col 23, row 2 (x 368, y 32) | 16x16 | Sanctuary STONE_SLAB floor (pale stone course rgb 199,195,178) |

Notes:

- `leaves` now uses a clean green leaf UI frame. The prior `Supplies.png` row 6, col 2 crop mixed multiple produce pieces in one frame.
- `treeSeed` now uses a clean acorn file. The prior `Supplies.png` row 1, col 1 crop was effectively a blank crate slice.
- `waterDrop` now uses a complete blue bottle/drop frame. The prior row 13, col 3 UI crop showed only a partial cut-off vial.
- `sprinklerProduct` uses a clean watering-can candidate until dedicated sprinkler art is found.
- `fertiliserProduct` uses a clean white powder-pile candidate until dedicated fertiliser art is found.
- `stone` now uses a rounded rock candidate. Earlier code used a narrow cave spire that read more like an object prop than a resource icon.
- `geode` now uses a closed rock candidate. Earlier code reused a blue crystal shard even though a geode is a sealed node.
- `amethyst` now uses the violet crystal shard. Earlier code reused the blue crystal shard despite the item description saying purple.
- `squid` now uses a tentacle-like fantasy icon candidate. Earlier code reused the bait/worm candidate.
- `wood` now uses a branch-like fantasy icon candidate. Earlier code used a broken stump object.
- `woodPlank` now uses a small wood-strip candidate. Earlier code reused a loose stick bundle.
- `cloth` now uses a purple fabric/thread-like candidate. Earlier code reused the raw wool candidate.
- `inventoryPanel` includes the full right-side inventory panel from the source sheet. Earlier code used a narrower local crop; this was corrected by moving the frame into `RpgObjectCatalog.ts`.

## Candidate Resource Sources

These sources are intentionally marked candidate-quality, but they are semantically safer than reusing unrelated objects or split farm-supply frames.

| Name | Source | Coordinates | Size | Current use |
| --- | --- | --- | --- | --- |
| `egg` | `Icon84_1_2.png` | full file | 32x32 | `rpg_egg` nest/egg candidate |
| `milkProduct` | `Icons.png` | row 7, col 4 | 16x16 | `rpg_milk` bottle candidate with `MILK` badge |
| `wool` | `Icon88_1_2.png` | full file | 32x32 | `rpg_wool` textile-like candidate |
| `cloth` | `Icon85_1_2.png` | full file | 32x32 | `rpg_cloth` fabric/thread-like candidate |
| `truffle` | `Icon76_1_2.png` | full file | 32x32 | `rpg_truffle` brown mushroom/truffle candidate |
| `wood` | `Icon46_1_2.png` | full file | 32x32 | `rpg_wood` branch/log-like candidate |
| `woodPlank` | `Icon59_1_2.png` | full file | 32x32 | `rpg_wood_plank` wood-strip candidate |
| `trash` | `Icon48_1_2.png` | full file | 32x32 | `rpg_trash` bag-like junk candidate |
| `dwarvishHelm` | `Icon40_1_2.png` | full file | 32x32 | `rpg_dwarvish_helm` helmet-like relic candidate |
| `omelet` | `Icon112_1_2.png` | full file | 32x32 | `rpg_omelet` cooked dish candidate |
| `squid` | `Icon107_1_2.png` | full file | 32x32 | `rpg_squid` tentacle-like candidate |

Historical bad frames replaced in runtime:

- `Supplies.png` row 3, col 8 was used for both raw egg and omelet. It was visually ambiguous and touched the frame edge in the scanner.
- `Supplies.png` row 6, col 0 was used for wool and cloth. It mixed cotton-like puffs with unrelated green produce.
- `Supplies.png` row 6, col 5 was used for truffle. It was a tiny split mushroom frame and touched the frame edge.
- `Broken_tree1.png` was used for fishing trash.
- `Broken_tree1.png` was used for `rpg_wood`; it remains valid as an object/stump, not as the raw wood resource.
- `Icon75_1_2.png` was used for `rpg_wood_plank`; it reads as loose sticks rather than processed lumber.
- `Icon88_1_2.png` was used for both `rpg_wool` and `rpg_cloth`; cloth now has a separate source.
- `Temple_wooden_chest` was used for `rpg_dwarvish_helm`.
- `Icon90_1_2.png` was used for `rpg_squid`; it remains valid for bait but reads as a worm, not squid.

No better candidate found in the current asset set:

- Carp, catfish, and pufferfish still share the generic fish candidate from `Icon98_1_2.png`; the focused fish/seed sheet did not expose clearly distinct fish variants.
- Crop/tree seeds still share the acorn candidate from `Icon83_1_2.png`; the focused pass did not find a clean seed bag or seed packet icon.

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
RPG_UI_FRAMES.waterDrop
RPG_UI_FRAMES.sprinklerProduct
RPG_RESOURCE_SOURCES.treeSeed
RPG_RESOURCE_SOURCES.fertiliser
RPG_RESOURCE_SOURCES.bait
RPG_RESOURCE_SOURCES.squid
RPG_RESOURCE_SOURCES.fish
RPG_RESOURCE_SOURCES.seaweed
RPG_RESOURCE_SOURCES.salad
RPG_RESOURCE_SOURCES.hay
RPG_RESOURCE_SOURCES.coal
RPG_RESOURCE_SOURCES.wood
RPG_RESOURCE_SOURCES.woodPlank
RPG_RESOURCE_SOURCES.cheese
RPG_RESOURCE_SOURCES.mayonnaise
RPG_RESOURCE_SOURCES.egg
RPG_RESOURCE_SOURCES.wool
RPG_RESOURCE_SOURCES.cloth
RPG_RESOURCE_SOURCES.truffle
RPG_RESOURCE_SOURCES.trash
RPG_RESOURCE_SOURCES.dwarvishHelm
RPG_RESOURCE_SOURCES.omelet
RPG_UI_FRAMES.copperBar
RPG_UI_FRAMES.ironBar
RPG_UI_FRAMES.goldBar
RPG_RESOURCE_SOURCES.turnip
RPG_RESOURCE_SOURCES.cabbage
RPG_RESOURCE_SOURCES.pumpkin
RPG_ARCHIVE_FRAMES.closedBook
RPG_ARCHIVE_FRAMES.openBook
```

Current item mappings:

| Item id | Kind | Icon policy |
| --- | --- | --- |
| `rpg_leaves` | resource | Uses clean `leaves` UI frame |
| `White_tree1_seed` | seed | Uses clean `treeSeed` acorn source |
| `Curved_tree1_seed` | seed | Uses clean `treeSeed` acorn source |
| `Luminous_tree1_seed` | seed | Uses clean `treeSeed` acorn source |
| `Blue-green_balls_tree1_seed` | seed | Uses clean `treeSeed` acorn source |
| `Mega_tree1_seed` | seed | Uses clean `treeSeed` acorn source |
| `Farm_chick` | object | Uses framed animation from tracked farm animal pack |
| `Farm_piglet` | object | Uses framed animation from tracked farm animal pack |
| `Farm_sheep` | object | Uses framed animation from tracked farm animal pack |
| `Farm_calf` | object | Uses framed animation from tracked farm animal pack |
| `rpg_egg` | resource | Nest/egg candidate from fantasy icon pack |
| `rpg_milk` | resource | Labeled clean bottle candidate from `Icons.png` |
| `rpg_wool` | resource | Textile-like candidate from fantasy icon pack |
| `rpg_truffle` | resource | Brown mushroom/truffle candidate from fantasy icon pack |
| `rpg_fertiliser` | resource | Clean white powder-pile candidate from fantasy icon pack |
| `rpg_sprinkler` | resource | Clean watering-can candidate from `Icons.png` |
| `rpg_bait` | resource | Clean worm-like candidate from fantasy icon pack |
| fish items | resource | Generic fish candidate from fantasy icon pack |
| `rpg_squid` | resource | Tentacle-like candidate from fantasy icon pack |
| `rpg_seaweed` | resource | Green aquatic strand candidate from fantasy icon pack |
| `rpg_salad` | resource | Bowl of greens candidate from fantasy icon pack |
| `rpg_hay` | resource | Grain/hay candidate from fantasy icon pack |
| `rpg_coal` | resource | Dark lump candidate from fantasy icon pack |
| `rpg_wood` | resource | Branch/log-like candidate from fantasy icon pack |
| `rpg_wood_plank` | resource | Wood-strip candidate from fantasy icon pack |
| `rpg_cheese` | resource | Cheese-like wedge candidate from fantasy icon pack |
| `rpg_mayonnaise` | resource | White jar/bowl candidate from fantasy icon pack |
| `rpg_copper_bar` | resource | Brown/orange ingot candidate from `Icons.png` |
| `rpg_iron_bar` | resource | Silver ingot candidate from `Icons.png` |
| `rpg_gold_bar` | resource | Gold ingot candidate from `Icons.png` |
| `rpg_turnip` | resource | Pale root candidate from fantasy icon pack |
| `rpg_cabbage` | resource | Green produce bowl candidate from fantasy icon pack |
| `rpg_pumpkin` | resource | Orange produce bowl candidate from fantasy icon pack |
| `rpg_cloth` | resource | Separate fabric/thread-like cloth candidate from fantasy icon pack |
| `rpg_trash` | resource | Bag-like junk candidate from fantasy icon pack |
| `rpg_dwarvish_helm` | resource | Helmet-like relic candidate from fantasy icon pack |
| `rpg_omelet` | resource | Cooked dish candidate from fantasy icon pack |
| `rpg_stone` | resource | Rounded rock candidate from rocks-and-stones pack |
| `rpg_geode` | resource | Closed rock/mineral candidate from rocks-and-stones pack |
| `rpg_amethyst` | resource | Violet crystal shard from crystal pack |
| `rpg_ruby` | resource | Red crystal shard from crystal pack |
| `rpg_diamond` | resource | White crystal shard from crystal pack |
| tree/gazebo objects | object | Uses full object sprite source, not icon frame |

## Forest Object Pack Mapping

`RpgAssetRegistry.ts` now maps all 40 files from:

`app/assets/game/craftpix-net-505052-free-forest-objects-top-down-pixel-art/PNG/Assets/`

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
- `Supplies.png` remains a candidate sheet for produce/harvest icons and is not used by the current runtime registry after the egg/wool/truffle replacement pass.

## Tool Terrain Tile Art

Shipped 2026-07-06 — sanctuary ground terrain now renders from verified sprite
frames cropped out of the ruined-temple exterior tileset
`Tiles_exterior.png` (432x256, 27x16 tiles of 16px). Frame constants live in
`RpgAssetRegistry.ts` (`RPG_SANCTUARY_TERRAIN_FRAMES`) and are consumed by
`SanctuaryTerrainTile` → `SanctuaryTerrainSpriteTile` in `TileArt.tsx` using the
same overflow-hidden + translate crop technique as the dungeon floor/wall/water
tiles. Proof contact sheet: `docs/rpg-asset-atlas/sanctuary-terrain-frames.png`
(each frame read back and visually confirmed clean/seamless).

Sprite-backed terrain types (real art):

- **GRASS** — 4 warm cozy grass variants (`terrainGrassBase` + `terrainGrassV1/V2/V3`),
  chosen deterministically per world cell via the existing
  `getSanctuaryTerrainVariant(row,col,type) = (row*31+col*17+type*13)%4` seed, so
  the variant is stable frame-to-frame (never shimmers).
- **PATH** — `terrainDirt` flat brown earth.
- **TILLED** — `terrainDirt` + code-drawn furrow overlay lines.
- **DITCH** — `terrainDirt` + furrow overlay (dry dug state).
- **WET_SOIL** — `terrainDirt` + furrow + a translucent cool-dark tint View
  (`tileWetTint`), i.e. tinted tilled soil (Stardew-style watered look).
- **STONE_SLAB** — `terrainStone` pale stone-course floor.
- **WALL / WATER** — unchanged; still the dungeon `walls_floor.png` /
  `Water_coasts_animation.png` sprite crops.

Still code-drawn placeholder (no clean verified frame in this tileset — not
forced, per the atlas rule):

- **BRIDGE** and **WOOD_TILE** — need wood-plank art; `Tiles_exterior.png` has
  no wood tile. Kept as hand-drawn plank fills.
- **SAND** — no tan/sand ground tile in this sheet (only warm brown dirt). Kept
  as hand-drawn speckled fill.
- **PORTAL_DUNGEON / PORTAL_SANCTUARY** — decorative portal bases, kept as the
  existing code-drawn glowing-ring placeholder.

Real sprite sheets now used by `TileArt.tsx`:

- `craftpix-net-169442-.../PNG/walls_floor.png` (dungeon floor/wall)
- `craftpix-net-169442-.../PNG/Water_coasts_animation.png` (water)
- `craftpix-net-160005-.../PNG/Tiles_exterior.png` (sanctuary grass/dirt/stone)

Notes:

- The `Tiles_exterior.png` sheet is ruin-flavored (most tiles mix stone masonry
  with grass overgrowth or rubble holes). Only the fully clean flat-fill tiles
  were mapped; the grass base rgb(122,173,85) is warm/cozy, not ruined-looking.
- Integer scaling (2026-07-06): `getResponsiveTileSize` now snaps to 32/48/64
  (integer multiples of the 16px source cell) instead of a continuously variable
  size, and every sprite-crop offset/dimension in `TileArt.tsx`,
  `RpgItemIcon.tsx`, and the terrain crop is `Math.round`-ed, so pixel-art tiles
  no longer land on fractional pixels and blur under bilinear filtering.
- Future work: revisit BRIDGE/WOOD_TILE/SAND if a dedicated verified plank/sand
  frame set is added to the repo.

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
- Product icons are candidate mappings, not final verified produce art.

## Open Asset Issues

- Backpack and shop now use real React Native touch grids instead of sprite-panel hitbox alignment; phone review should focus on touch comfort and visual sizing.
- Seeds use a generic acorn marker, not crop-specific seed bags.
- Crop stage art is deliberately unresolved; produce icons are still candidate-quality.
- Egg, milk, wool, truffle, fertiliser, sprinkler, bait, fish, squid, seaweed, salad, hay, coal, wood plank, cheese, mayonnaise, metal bars, crop outputs, trash, Dwarvish Helm, omelet, stone, and geode are still candidates/placeholders, but the known blank/mixed/cut or semantically generic crops have been replaced where clear alternatives existed.
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
