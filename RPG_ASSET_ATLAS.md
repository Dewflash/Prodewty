# RPG Asset Atlas

Last updated: 2026-06-26

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
| `leaves` | `Icons.png` | row 5, col 4 | 16x16 | `rpg_leaves` |
| `seed` | `Icons.png` | row 15, col 3 | 16x16 | Tree seed placeholder/sapling marker |

Notes:

- `leaves` is visually a green leaf cluster and replaces the prior worm-looking numbered icon.
- `seed` is currently a sprout/plant marker. It is acceptable for the draft tree-seed item, but Phase 7 may replace it with a seed-bag or crop-specific seed once farming is live.
- `inventoryPanel` includes the full right-side inventory panel from the source sheet. Earlier code used a narrower local crop; this was corrected by moving the frame into `RpgObjectCatalog.ts`.

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
- Animal sprites from `craftpix-net-291971-free-top-down-animals-farm-pixel-art-sprites` for Phase 1 through Phase 10. They belong to a later livestock phase.

## Current Code Mapping

Production mapping currently lives in `app/src/engine/RpgObjectCatalog.ts`.

Known frame entries:

```ts
RPG_UI_FRAMES.backpack
RPG_UI_FRAMES.inventoryPanel
RPG_UI_FRAMES.shopPanel
RPG_UI_FRAMES.leaves
RPG_UI_FRAMES.seed
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
| tree/gazebo objects | object | Uses full object sprite source, not icon frame |

## Open Asset Issues

- Backpack slot and detail overlays need runtime phone review after the corrected full panel frame.
- Shop slot alignment needs runtime phone review after the verified `Shop.png` panel conversion.
- Seeds use a sprout marker, not a true seed-bag icon.
- Crop stage art is not selected yet.
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
