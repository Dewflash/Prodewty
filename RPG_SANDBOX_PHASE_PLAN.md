# RPG Sandbox Phase Plan

Last updated: 2026-06-26

This ledger is the authoritative plan for the RPG sandbox work from Phase 0 through Phase 10. It exists so every pass can be judged against explicit goals, tests, evidence, and deferred expansion notes instead of memory.

## Current Baseline

Shipped commits relevant to this ledger:

- `0b3603d` Fix RPG sandbox spatial mechanics
- `6b4ef82` Add drag-based RPG build placement
- `7af28a2` Add RPG foraging and inventory catalog
- `ef36720` Add RPG backpack inventory

Known unrelated worktree noise at the time this ledger was created:

- Modified, unrelated: `GARDEN_EXPEDITION_PLAN.md`
- Modified, unrelated: `app/app/settings.tsx`
- Untracked, unrelated or asset-staging candidates: `.agents/`, `ORIGINAL_REQUEST.md`, many files under `app/assets/...`

Do not stage or revert unrelated files while advancing these phases.

## Global Invariants

These rules must remain true after every phase.

- Normal world mode exposes only `Interact` and `Attack` as action buttons.
- Shop is purchase-only.
- Backpack owns inventory display, item inspection, and inventory-driven placement.
- Build mode owns placement, move, cancel, and stash context.
- Contextual controls only appear in their matching state.
- `RpgObjectCatalog.ts` is the single gameplay item source of truth for object metadata, item kind, icon mapping, shop inclusion, footprints, and drop tables.
- `RpgAssetRegistry.ts` is the single runtime asset source of truth for verified sprite frames, object sources, UI panels, and archive/book assets.
- Player-facing archive entries must derive from gameplay catalog entries and asset registry IDs, not a separate hand-written archive catalog.
- Movement collision and placement collision use the same object footprint metadata.
- Avatar footprint is treated as blocked during placement.
- Objects define collision footprint separately from visual footprint.
- Object z-order and avatar z-order are anchored to feet/bottom, not sprite center.
- Camera, map, avatar, objects, placement ghost, and placement cells share the same world transform unless intentionally HUD-only.
- No random numbered icon may be used without visual verification and a named catalog mapping.
- Multi-step inventory/object writes that change economy state must be transactional where partial failure would corrupt counts or placement.
- Every phase must run the self-audit loop before being considered complete.

## Status Key

- `Not started`: no scoped work has begun.
- `In progress`: phase implementation or documentation is underway.
- `Draft complete`: first implementation exists, but final audit or manual testing is pending.
- `Verified`: phase passed stated checks and has no known in-scope blockers.
- `Deferred`: intentionally postponed, with reason recorded.

## Phase Overview

| Phase | Name | Status | Primary Evidence |
| --- | --- | --- | --- |
| 0 | Audit ledger and phase discipline | Verified | This file, `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md` |
| 1 | Asset atlas and icon truth | Verified | `RPG_ASSET_ATLAS.md`, contact sheets, `npx tsc --noEmit`, Expo export |
| 2 | Backpack V1 polish | Verified | `RpgBackpack.tsx`, `npx tsc --noEmit`, Expo export |
| 3 | Shop V1 polish | Verified | `SanctuaryShop.tsx`, RPG shop asset mapping, `npx tsc --noEmit`, Expo export |
| 4 | Build and placement robustness V2 | Verified | `app/app/rpg.tsx`, `npx tsc --noEmit`, Expo export |
| 5 | Tree interaction and drops V2 | Verified | Drop tables, interaction feedback, `npx tsc --noEmit`, Expo export |
| 6 | Farming data model | Verified | SQLite v57 migration, crop catalog, garden helpers, migration simulations |
| 7 | Farming placement V1 | Verified | Seed placement flow, `npx tsc --noEmit`, Expo export |
| 8 | Growth and harvest V1 | Verified | Bootstrapper, harvest flow, `npx tsc --noEmit`, Expo export |
| 9 | Productivity energy hook | Verified | Water Drops resource, activity rewards, atomic crop acceleration |
| 10 | Streak weather | Verified | Streak rain overlay, crop watering effect, `npx tsc --noEmit`, Expo export |
| 11 | Runtime asset registry | In progress | `RpgAssetRegistry.ts`, catalog asset IDs |
| 12 | Player archive book V1 | Verified | `RpgArchive.tsx`, `rpg_discoveries` v58 migration, durable discovery hooks |
| 13 | Forest content mapping V1 | In progress | 40 forest objects mapped into registry/catalog/archive/shop pages |
| 14 | Farming art reset | In progress | Existing crop plots use verified seed/leaves placeholders; wrong plant frames removed |
| 15 | Archive usability filters | Verified | Archive category/scope filters, discovery summary counts, empty state |
| 16 | RPG content validation harness | Verified | `npm run validate:rpg` checks catalog, registry, drops, seeds, and asset files |
| 17 | Forest rarity and source metadata | Verified | Catalog rarity/source labels surfaced in shop/archive and enforced by validator |
| 18 | Shop catalog sorting | Verified | Shop sort controls for name, rarity, and price over the forest catalog |
| 19 | Shop/backpack interaction repair | Verified | Larger tappable shop/backpack surfaces, inline buy feedback, farm-sheet seed/crop art |
| 20 | Catalog detail facts | Verified | Archive/backpack facts derive price, footprint, forage, harvest, and growth data from catalog metadata |
| 21 | Archive search and sorting | Verified | Search across catalog metadata plus sort by name, rarity, and discovery status |
| 22 | Crystal content pack V1 | Verified | 40 tracked crystal objects, crystal shop filter, Crystal Shards resource, crystal forage drops |
| 23 | Forage feedback polish | Verified | Object cooldown copy is tag-aware for trees, crystals, and future forage objects |
| 24 | Backpack search and sorting | Verified | Search across inventory metadata plus sort by kind, name, and quantity |
| 25 | Bush content pack V1 | Verified | 40 tracked bush/cactus/fern/stump objects mapped into registry/catalog/archive/shop |
| 26 | Frame-capable world art renderer | Verified | Placed objects and build ghosts can render catalog sprite frames or standalone PNGs |
| 27 | Shop search and empty states | Verified | Search across catalog metadata, result counts, and safe empty shop states |
| 28 | Cave content pack V1 | Verified | 32 curated tracked cave objects mapped into registry/catalog/archive/shop |
| 29 | Source-pack filters | Verified | Archive and shop source filters split Forest/Crystal/Bush/Cave packs from gameplay tags |
| 30 | Backpack source-pack filters | Verified | Backpack inventory source filters share Forest/Crystal/Bush/Cave catalog labels |
| 31 | Shared source-pack metadata | Verified | Source-pack filter definitions are centralized in the gameplay catalog |
| 32 | Source-pack filter counts | Verified | Archive, shop, and backpack source filters show catalog/inventory counts |
| 33 | Framed world art priority | Verified | World art renderer prefers curated sprite frames before whole-image sources |
| 34 | Temple content pack V1 | Verified | 18 curated temple frame objects mapped into registry/catalog/archive/shop |
| 35 | Animated temple props V1 | Verified | Shared sprite animation renderer plus fire/chest temple props |
| 36 | Temple hazard props V1 | Verified | Spike/blade traps plus lever/gate temple props with tighter footprints |
| 37 | Object inspect feedback V1 | Verified | Interact now gives visible feedback for non-forage placed props |

## Required Audit Loop For Every Phase

For each phase, record:

1. Intended behavior.
2. Negative guarantees.
3. Files changed.
4. Current dirty worktree separation.
5. Design attack findings.
6. Implementation attack findings.
7. Verification commands and results.
8. Manual test checklist.
9. Expansion notes deferred until after the draft implementation.

Minimum commands for code phases:

```bash
cd /Users/kevinyongcj/Programming/Prodewty/app
npx tsc --noEmit
npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check
```

Minimum commands for documentation-only phases:

```bash
cd /Users/kevinyongcj/Programming/Prodewty
git diff --check -- RPG_SANDBOX_PHASE_PLAN.md
```

Use tighter paths when the phase changes a known smaller file set.

## Phase 0: Audit Ledger And Phase Discipline

Goal: create one durable source of truth for the remaining RPG sandbox work, including requirements, acceptance gates, and future expansion notes.

Deliverables:

- Create `RPG_SANDBOX_PHASE_PLAN.md`.
- Log current shipped baseline and unrelated dirty worktree state.
- Define global invariants.
- Define Phase 0 through Phase 10 with acceptance gates.
- Define a repeatable audit loop for every phase.
- Define where expansion ideas are recorded so they do not destabilize the active phase.

Acceptance gates:

- A reader can tell what is complete, what is next, what is deferred, and what must not regress.
- Every phase has deliverables, acceptance tests, and expansion notes.
- The document separates implementation commitments from future ideas.
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md` passes.

Expansion notes saved for after draft implementation:

- Convert this ledger into GitHub issues or a project board.
- Add phase-owner labels if other agents/threads take phases.
- Add a small script that prints phase status from this markdown.

## Phase 1: Asset Atlas And Icon Truth

Goal: stop asset guesswork by creating a verified asset atlas for RPG UI, item icons, objects, farming, drops, and future shop/crafting surfaces.

Deliverables:

- Generate or document contact sheets for each relevant sprite sheet.
- Identify verified coordinates for:
  - backpack icon,
  - backpack panel,
  - shop panel,
  - leaves,
  - seeds,
  - coins/currency,
  - crop stages,
  - tools,
  - buttons/arrows,
  - generic placeholder.
- Add named atlas entries to `RpgObjectCatalog.ts` or a dedicated asset module.
- Replace all visually wrong icons.
- Record every unverified candidate as placeholder, not production asset.

Acceptance gates:

- Leaves look like leaves.
- Seeds look like seeds or intentionally use a neutral placeholder.
- Backpack icon and panel come from verified RPG UI asset coordinates.
- No `Icon##_1.png` style random icon remains for semantic resources unless recorded as visually verified.
- The asset map is scalable: adding a new item needs a named atlas entry, not ad hoc `require()`.

Expansion notes saved for after draft implementation:

- Build a local sprite atlas viewer screen.
- Add automated snapshot generation for sprite sheets.
- Group item icons by category for filters and crafting.
- Consider extracting asset metadata into JSON for tool-assisted editing.

## Phase 2: Backpack V1 Polish

Goal: make the backpack feel stable, readable, and game-native across expected phone sizes.

Deliverables:

- Confirm `RpgBackpack.tsx` uses verified Phase 1 assets.
- Improve slot alignment against the panel asset.
- Add category filters if inventory density needs them: objects, seeds, resources.
- Keep selected-item details concise and non-overflowing.
- Show only real actions:
  - `Place` for objects,
  - seed action only when farming exists,
  - no action for passive resources.
- Add sound/haptic hooks only if existing assets fit.

Acceptance gates:

- Backpack opens and closes without interfering with movement/build state.
- Counts update after purchase, forage, placement, and stash.
- Placeable objects enter build mode from backpack.
- Non-placeable resources cannot enter build mode.
- Empty inventory state is legible.
- Text does not overflow on small phone widths.

Expansion notes saved for after draft implementation:

- Add item rarity frames.
- Add item sorting controls.
- Add item detail modal for lore/stats.
- Add drop animation into backpack.

## Phase 3: Shop V1 Polish

Goal: make shop visually match the RPG UI family while preserving its purchase-only responsibility.

Deliverables:

- Use verified shop panel or button assets.
- Show item image, name, price, owned count, and possibly footprint.
- Give feedback for insufficient coins.
- Keep shop hidden during build/edit mode.
- Buying updates backpack revision immediately.

Acceptance gates:

- Shop cannot be mistaken for backpack.
- Shop has no inventory-use controls.
- Purchase succeeds only when coins are sufficient.
- Purchase failure does not mutate inventory.
- Bought item appears in backpack.

Expansion notes saved for after draft implementation:

- Add buy confirmation for expensive items.
- Add daily rotating stock.
- Add locked items based on level/streak.
- Add sell flow only after economy balance exists.

## Phase 4: Build And Placement Robustness V2

Goal: lock the build loop to Clash-of-Clans-style drag placement with clear valid/invalid feedback and stable collision behavior.

Deliverables:

- Review all entry paths: backpack place, long-press move, cancel, stash, confirm.
- Keep red/green cells visible over grass and object sprites.
- Improve invalid reasons:
  - occupied,
  - avatar,
  - terrain,
  - out of bounds,
  - portal blocked,
  - traps avatar.
- Ensure every object uses catalog footprint for movement and placement.
- Ensure moving/stashing updates DB and collision state together.

Acceptance gates:

- Cannot place over avatar.
- Cannot place over existing object footprint.
- Cannot trap avatar or block the dungeon portal.
- Moving an object moves its blocked cells.
- Stashing removes its blocked cells and returns inventory.
- Placement ghost, placement cells, avatar, and objects scale together under zoom.

Expansion notes saved for after draft implementation:

- Add edge panning while dragging.
- Add rotate support for rectangular objects if future assets need it.
- Add snap animation on confirm.
- Add object-specific placement rules such as water-only or path-adjacent.

## Phase 5: Tree Interaction And Drops V2

Goal: make tree interactions feel intentional and keep drop/economy behavior maintainable.

Deliverables:

- Add clear tree shake or pulse feedback.
- Add curated drop tables per tree type.
- Keep cooldowns per object.
- Show drop toast with verified icon.
- Refresh backpack if open.
- Treat objects with no drops as intentional no-drop interactions.

Acceptance gates:

- Facing a tree and pressing `Interact` can produce a drop.
- Drops appear in backpack.
- Cooldown prevents rapid farming spam.
- Drop icons are verified.
- Non-drop objects give clear feedback without pretending to be harvestable.

Expansion notes saved for after draft implementation:

- Add tool requirements for special drops.
- Add rare drops and streak modifiers.
- Add drop fly-to-backpack animation.
- Add per-tree depletion/regrowth timers.

## Phase 6: Farming Data Model

Goal: add persistent farming state without mixing crops into decorative object storage.

Deliverables:

- Add `garden_plots` table through migrations.
- Define seed and crop catalog metadata.
- Define growth stages and growth durations.
- Define harvest outputs.
- Define plot occupancy and terrain rules.
- Add data helpers for querying/upserting/removing plots.

Acceptance gates:

- Farming state persists across app restarts.
- Crop state is independent from decorative `sanctuary_objects`.
- Garden plots can be reconciled from timestamps.
- DB migration is idempotent.

Expansion notes saved for after draft implementation:

- Add fertilizer.
- Add crop quality tiers.
- Add multi-harvest crops.
- Add seasonal crops/weather affinity.

## Phase 7: Farming Placement V1

Goal: let seeds be planted through the same rigorous placement vocabulary used by objects.

Deliverables:

- Selecting a seed from backpack enters planting mode.
- Planting consumes one seed.
- Planting creates a `garden_plots` row.
- Valid cells are constrained to defined farm/dirt/garden terrain.
- Invalid reasons are shown through placement feedback.
- Plots render in the world.

Acceptance gates:

- Seeds cannot be planted on avatar, objects, walls, water, or portal.
- Seed count decreases only after successful planting.
- Failed planting does not mutate inventory.
- Planted plot is visible.
- Backpack refreshes after planting.

Expansion notes saved for after draft implementation:

- Add multi-cell plots.
- Add prepared soil objects.
- Add garden bed construction.
- Add tap-to-select plot details.

## Phase 8: Growth And Harvest V1

Goal: complete the seed-to-crop-to-reward loop.

Deliverables:

- Add bootstrapper that reconciles growth on RPG mount.
- Render seed, sprout, growing, and mature states.
- `Interact` with mature crop harvests.
- Harvest grants coins/resources and clears or resets plot.
- Growing crop can report time remaining.

Acceptance gates:

- Closing and reopening app advances crops based on elapsed time.
- Mature crop can be harvested with `Interact`.
- Harvest updates wallet/backpack.
- Harvest cannot be repeated after plot is cleared/reset.
- Crop rendering matches growth stage.

Expansion notes saved for after draft implementation:

- Add animated growth stage transitions.
- Add crop encyclopedia.
- Add crop-specific yield variance.
- Add harvest combo bonuses.

## Phase 9: Productivity Energy Hook

Goal: connect real productivity to farming acceleration through a resource such as Water Drops.

Deliverables:

- Define Water Drops in catalog.
- Award Water Drops from real-life productivity completion events.
- Show Water Drops in backpack.
- Allow spending Water Drops on growing crops.
- Advance crop stage or reduce remaining timer.

Acceptance gates:

- Completing a supported productivity action grants Water Drops.
- Water Drops persist in inventory.
- Spending Water Drops mutates crop state and decrements inventory atomically.
- Insufficient Water Drops gives clear feedback and no mutation.

Expansion notes saved for after draft implementation:

- Add different energies for categories.
- Add streak multipliers.
- Add daily caps.
- Add auto-water rules.

## Phase 10: Streak Weather

Goal: reward real-world streak consistency with visible sanctuary weather and farming benefits.

Deliverables:

- Detect eligible streak state from RPG/habit data.
- Add `isRaining` or equivalent derived state.
- Render rain overlay in sanctuary.
- Rain affects crop growth or watering requirement.
- Communicate the active weather bonus without cluttering normal controls.

Acceptance gates:

- Eligible streak triggers rain.
- Breaking or losing streak removes rain when appropriate.
- Rain has real farming effect.
- Rain overlay does not block normal controls.
- Performance remains acceptable.

Expansion notes saved for after draft implementation:

- Add other weather types.
- Add weather forecast UI.
- Add weather-linked rare drops.
- Add soundscape and particle quality settings.

## Phase 11: Runtime Asset Registry

Goal: turn the developer-facing asset atlas into a runtime content registry that gameplay UI can consume safely.

Deliverables:

- Add `RpgAssetRegistry.ts`.
- Move verified UI frames, book frames, and object sprite sources into named registry entries.
- Add `assetId` and `iconAssetId` references to gameplay catalog items.
- Keep gameplay rules in `RpgObjectCatalog.ts`; keep asset source/frame data in `RpgAssetRegistry.ts`.

Acceptance gates:

- Existing backpack, shop, world object rendering, drops, and farming still compile.
- Adding a new object or resource has an explicit asset registry entry.
- The archive can resolve item art from registry IDs.
- No uncurated full asset pack is promoted into gameplay just because it exists on disk.

Expansion notes saved:

- Add a deterministic registry/contact-sheet generator.
- Add asset verification states beyond boolean, such as candidate, production, deprecated.
- Add sprite-sheet frame metadata for crop stages and page-turn animation.

## Phase 12: Player Archive Book V1

Goal: make the asset/content map visible to players through a book-style archive.

Deliverables:

- Add an RPG archive modal using the magic book asset pack.
- Add a HUD archive button using the closed-book frame.
- Show cataloged objects, seeds, and resources.
- Show discovered, known, and locked states from persistent discovery, inventory, and placed sanctuary objects.
- Persist first-discovered timestamps and latest discovery source.
- Keep archive display derived from `RpgObjectCatalog.ts` and `RpgAssetRegistry.ts`.

Acceptance gates:

- Archive opens and closes without disrupting movement, shop, backpack, or build mode.
- Shop, backpack, and archive close each other instead of stacking.
- Archive refreshes when inventory changes.
- Discovered entries stay discovered after the player spends, plants, harvests, places, or stashes the item.
- Unknown entries show unlock guidance instead of fake ownership.
- The archive does not add normal-mode action buttons; `Interact` and `Attack` remain the only action buttons.

Expansion notes saved:

- Add page-turn animation after archive data is stable.
- Add crop-stage pages and object lore.
- Add filters for placeables, drops, crops, crafting materials, and rare discoveries.
- Add an archive sort mode for discovery time/source.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: focused SQLite migration/upsert simulation for `rpg_discoveries`.
- Passed: `git diff --check -- app/app/rpg.tsx app/src/db/garden.ts app/src/db/rpgDiscovery.ts app/src/db/schema.ts app/src/engine/RpgArchive.tsx RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-discovery-export-2`

## Phase 13: Forest Content Mapping V1

Goal: start replacing the tiny starter catalog with real curated content coverage, beginning with the full forest object pack.

Deliverables:

- Map every `PNG/Assets/*.png` item from `craftpix-net-505052-free-forest-objects-top-down-pixel-art`.
- Store item ID, asset ID, display name, source, dimensions, and tags in `RpgAssetRegistry.ts`.
- Generate object catalog entries from that registry metadata.
- Derive footprint, visual size, price, description, and forage behavior from curated metadata helpers.
- Add shop paging and filters so the existing six visual slots can sell the full mapped forest set.
- Lower archive item rows on the book page after phone review.

Acceptance gates:

- All 40 forest objects appear in the player archive.
- Existing starter shop items still render and purchase correctly.
- Existing placed objects still resolve by their original item IDs.
- Movement/placement collision still reads footprint metadata from catalog entries.
- New objects are reachable through shop pages without overcrowding the six-slot panel.
- Archive entries sit comfortably on the book page instead of too high.

Expansion notes saved:

- Add better shop rarity/price balance after device review.
- Add item-specific unlock sources, rarity, and biome filters.
- Add mushroom/resource drops and tree-specific seed art.
- Persist discovery timestamps and discovery source.
- Map the next pack only after this forest mapping passes device review.

## Phase 14: Farming Art Reset

Goal: remove visually wrong crop-stage art and keep garden plots on verified placeholder semantics until proper crop frames are curated.

Deliverables:

- Reset crop frames in `RpgAssetRegistry.ts` to verified `seed` and `leaves` UI frames.
- Keep the farm plant sheet as a candidate sheet, not a runtime dependency.
- Render garden plots with clear placeholder stage semantics.
- Preserve existing growth, watering, rain, harvest, and inventory behavior.

Acceptance gates:

- Planted plots do not show wrong species/icons.
- Mature plots are visually distinct from seed/growing plots.
- Plot rendering still uses 1x1 world cells and scales with the map.
- Missing crop art falls back to the verified seed icon path.
- TypeScript and Expo export pass without relying on unverified farm plant frames.

Expansion notes saved:

- Re-curate `Plants.png` with phone-sized contact-sheet review before runtime use.
- Curate crop-specific produce icons from `Supplies.png`.
- Add real seed-bag icons instead of the generic sprout marker.
- Add larger multi-frame crop sprites only after plot sizing rules exist.
- Add persistent crop discovery pages to the archive.

## Phase 15: Archive Usability Filters

Goal: make the growing archive usable once the forest pack and discovery persistence create many entries.

Deliverables:

- Add archive scope filters for all, seen, known, and locked entries.
- Keep the existing object/seed/resource category filters.
- Show discovery summary counts so players can understand archive progress.
- Add a clear empty state when a filter combination has no entries.
- Keep archive filters read-only; no item-use, buy, or build actions move into the archive.

Acceptance gates:

- Seen scope shows discovered items regardless of current inventory count.
- Known scope shows shop-known but undiscovered items.
- Locked scope shows entries that are neither known nor discovered.
- Filter changes reset pagination safely and never select an entry outside the filtered result set.
- Archive still opens without adding normal-mode action buttons.

Expansion notes saved:

- Add sort by discovered time/source once the archive detail view has enough room.
- Add rarity/source chips after item-specific unlock metadata exists.
- Add page-turn animation after filter behavior passes phone review.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/engine/RpgArchive.tsx RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-archive-filters-export`

## Phase 16: RPG Content Validation Harness

Goal: make content expansion safer by adding a repeatable check for RPG catalog and asset-registry drift.

Deliverables:

- Add a repo-local validator script that can run without launching the app.
- Add `npm run validate:rpg`.
- Validate forest object count, unique item IDs, unique asset IDs, source file existence, positive dimensions, and required tags.
- Validate catalog `assetId` and `iconAssetId` references against the asset registry.
- Validate forage/harvest drop item IDs against the item catalog.
- Validate seed maps and crop catalog seed references.

Acceptance gates:

- Validator fails on missing forest asset files.
- Validator fails on missing asset registry IDs.
- Validator fails on broken drop or seed item references.
- Validator passes on the current mapped forest catalog.
- TypeScript and Expo export still pass.

Expansion notes saved:

- Move from source-text validation to generated JSON manifests once the asset pipeline stabilizes.
- Add footprint and price-balance thresholds after phone review confirms object sizes.
- Add CI wiring once the branch is ready for PR.

Current verification evidence:

- Passed: `npm run validate:rpg` with 40 forest assets and 47 catalog items.
- Passed: `git diff --check -- app/package.json app/scripts/validate-rpg-content.js RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx tsc --noEmit`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-content-validation-export`

## Phase 17: Forest Rarity And Source Metadata

Goal: make the expanding forest catalog feel organized and inspectable instead of a flat list of interchangeable assets.

Deliverables:

- Add `RpgItemRarity` metadata to RPG catalog items.
- Derive rarity for generated forest objects from size and semantic tags.
- Add `sourceLabel` metadata for objects, seeds, and resources.
- Surface rarity/source metadata in shop cards and selected shop details.
- Surface rarity/source metadata in archive details.
- Extend `npm run validate:rpg` so new content cannot skip the metadata layer.

Acceptance gates:

- Every generated forest object has a rarity and source label.
- Archive entries preserve item rarity and source label from the catalog.
- Shop remains purchase-only and does not expose placement/inventory actions.
- Archive remains read-only and does not expose placement/buy actions.
- Validator, TypeScript, and Expo export pass.

Expansion notes saved:

- Use rarity for future shop sorting after price balance is reviewed on device.
- Add rarity frames or border sprites once UI assets are curated.
- Add source-specific archive filters after the next asset pack is mapped.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryShop.tsx app/src/engine/RpgArchive.tsx app/scripts/validate-rpg-content.js RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-rarity-metadata-export`

## Phase 18: Shop Catalog Sorting

Goal: make the large forest shop browsable without forcing players to page through a fixed alphabetical dump.

Deliverables:

- Add shop sort controls for name, rarity, and price.
- Keep existing shop filters for all, trees, mushrooms, and relics.
- Reset pagination when filter or sort changes.
- Preserve selected-item behavior and purchase-only responsibility.

Acceptance gates:

- Name sort is deterministic and alphabetical.
- Rarity sort shows higher rarity first, then alphabetically.
- Price sort shows cheaper items first, then alphabetically.
- Sort changes do not expose placement/inventory/archive actions in the shop.
- Validator, TypeScript, and Expo export pass.

Expansion notes saved:

- Add ascending/descending toggles only after phone review confirms the extra control is worth the space.
- Add rarity/source combined filters after more asset packs are mapped.
- Add economy balance review before treating price order as final.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/engine/SanctuaryShop.tsx RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-shop-sorting-export`

## Phase 19: Shop/Backpack Interaction Repair

Goal: fix device-reported shop/backpack usability failures without changing the core RPG loop.

Deliverables:

- Make shop item cards large, fully tappable selection targets.
- Move buying to one clear selected-item action inside the shop detail area.
- Show purchase success/failure inside the shop modal instead of only behind it in the world toast.
- Refresh owned counts immediately after a successful buy.
- Increase backpack slot/action touch targets and show the verified backpack icon in the panel header.
- Replace bad generic seed/crop placeholder frames with curated farm-sheet seed, leaf, and plant-stage frames.

Acceptance gates:

- Shop cards should visibly show item art, name, rarity, and price.
- Tapping any shop card selects it; tapping the Buy action attempts that selected item.
- Insufficient coins and successful purchase feedback are visible while the shop remains open.
- Bought items update owned counts and still appear in backpack through the existing inventory revision path.
- Seed inventory icons and planted crop stage icons no longer use the wrong UI atlas cells.
- Validator, TypeScript, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgAssetRegistry.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-shop-backpack-fix-export`

Manual test checklist:

- Open shop and confirm all six visible cards show recognizable art.
- Tap several cards and confirm selected detail changes.
- Buy an affordable item and confirm inline success text plus owned count increment.
- Try buying an unaffordable item and confirm inline shortfall text.
- Open backpack and confirm larger slots, backpack header icon, and visible object/seed/resource art.
- Plant a seed and confirm the in-world crop icon is a plant-stage sprite rather than the wrong worm-like asset.

## Phase 20: Catalog Detail Facts

Goal: make archive and backpack item inspection useful without creating a second item metadata source.

Deliverables:

- Derive archive fact rows from `RpgObjectCatalog.ts`.
- Show object price, placement footprint, and forage drops.
- Show seed harvest coins, maturity time, and crop yield.
- Show source metadata for resources and held items.
- Surface the same compact facts inside backpack details.
- Extend `validate:rpg` so archive facts cannot be accidentally removed from catalog generation.

Acceptance gates:

- Archive and backpack facts come from catalog/drop/crop metadata, not duplicated UI literals.
- Locked archive items still use unlock hints instead of exposing full detail facts.
- Fact chips are capped so they do not crowd out the primary action controls.
- Normal world controls remain `Interact` and `Attack`.
- Validator and TypeScript pass.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgArchive.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgObjectCatalog.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-catalog-facts-export`

Manual test checklist:

- Open archive, select a tree, and confirm price, footprint, and forage facts appear.
- Select a seed and confirm harvest/maturity/yield facts appear.
- Open backpack and confirm held objects/seeds show the same gameplay facts before Place/Plant.
- Filter archive to Locked and confirm locked items still show unlock guidance rather than full facts.

## Phase 21: Archive Search And Sorting

Goal: make the archive scale before additional asset packs are mapped.

Deliverables:

- Add archive search over name, item id, category, rarity, source, description, tags, and catalog-derived facts.
- Add archive sort controls for name, rarity, and discovery status.
- Reset page and selected entry when search, filter, scope, or sort changes.
- Include filtered result count in the archive summary.
- Reserve additional vertical space in the book scale calculation for the new controls.
- Extend `validate:rpg` to guard archive search/sort wiring.

Acceptance gates:

- Search narrows visible entries without changing catalog data or discovery state.
- Rarity sort puts higher rarity first, then name.
- Status sort groups discovered entries before known entries before locked entries.
- Locked entries remain read-only and keep unlock guidance.
- Normal world mode still only exposes `Interact` and `Attack`.
- Validator, TypeScript, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgArchive.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-archive-search-export`

Manual test checklist:

- Open archive and search for `tree`; confirm only matching names/tags/facts remain.
- Search for `footprint` and confirm catalog fact search works.
- Clear search and confirm the full filtered list returns.
- Sort by rarity and confirm rare/epic items move ahead of common items.
- Sort by status and confirm discovered/known/locked grouping.

## Phase 22: Crystal Content Pack V1

Goal: expand the RPG catalog beyond forest objects using a tracked standalone asset pack that is safe for world rendering.

Deliverables:

- Map all 40 tracked crystal object PNGs into `RpgAssetRegistry.ts`.
- Add crystal objects to the gameplay catalog, shop catalog, archive, backpack placement path, and validation harness.
- Add `Crystal Shards` as a resource with a verified crystal asset.
- Add crystal object forage drops so placed crystals can be interacted with.
- Add a `Crystals` shop filter.
- Keep crystal placement on the existing object footprint and collision model.

Acceptance gates:

- Crystal objects use standalone PNG sources, not spritesheet frames that world rendering cannot display.
- Crystal object ids and asset ids are unique.
- Crystal assets are validated for file existence and crystal/cave tags.
- Crystal Shards are a catalog resource and every crystal drop references a known item id.
- The shop can filter crystals without changing shop purchase-only behavior.
- Validator, TypeScript, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/engine/RpgItemIds.ts app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryShop.tsx app/scripts/validate-rpg-content.js`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-crystal-pack-export`

Manual test checklist:

- Open shop and filter to `Crystals`; confirm crystal cards show art and can be bought.
- Open backpack and place a bought crystal in sanctuary.
- Walk into the crystal footprint and confirm movement is blocked.
- Face the crystal and press `Interact`; confirm either a shard drop or no-drop feedback.
- Search archive for `crystal` and confirm all crystal entries appear.

## Phase 23: Forage Feedback Polish

Goal: keep object interaction feedback correct as forage expands beyond trees.

Deliverables:

- Replace hardcoded tree cooldown copy with tag-aware forage cooldown text.
- Preserve existing tree feedback.
- Add crystal-specific cooldown feedback.
- Keep the helper local to RPG interaction logic so catalog data remains the source of object tags.

Acceptance gates:

- Tree forage cooldown still says `Tree is resting`.
- Crystal forage cooldown says `Crystal is recharging`.
- Future forage objects get neutral `Object is resting` feedback.
- No economy, drop rate, placement, or control behavior changes.
- TypeScript, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-forage-feedback-export`

Manual test checklist:

- Interact with a tree twice quickly and confirm the tree cooldown text.
- Interact with a crystal twice quickly and confirm the crystal cooldown text.
- Confirm normal mode still only exposes `Interact` and `Attack`.

## Phase 24: Backpack Search And Sorting

Goal: keep backpack navigation usable as mapped item packs expand.

Deliverables:

- Add backpack search across item id, name, kind, source label, description, rarity, and tags.
- Add stable sort modes for kind, name, and quantity.
- Show filtered result counts in the backpack header.
- Extend `validate:rpg` so backpack search/sort controls become a required scalability gate.

Acceptance gates:

- Searching `crystal`, `seed`, `leaf`, or a specific object name filters the backpack without mutating inventory.
- Sorting by kind keeps placeables, seeds, and resources grouped; sorting by quantity surfaces stacked resources first.
- Empty search/category states keep the selected item and action area safe.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgBackpack.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-backpack-search-export`

Manual test checklist:

- Open backpack with mixed objects, seeds, and resources.
- Search `crystal` and confirm only crystal-related inventory remains.
- Sort by quantity and confirm larger stacks move first.
- Clear search and confirm placement/planting buttons still work from selected inventory items.

## Phase 25: Bush Content Pack V1

Goal: expand the object catalog with another complete tracked standalone asset pack.

Deliverables:

- Map 40 bush-pack standalone PNGs into `RpgAssetRegistry.ts`.
- Add Bush Archive catalog metadata, price, rarity, footprint, and shop inclusion.
- Add shop filters for bushes and cacti while keeping the filter row responsive.
- Give leafy bushes/ferns light leaf forage behavior and tag-aware cooldown copy.
- Extend `validate:rpg` to require the bush pack and shop filters.

Acceptance gates:

- `validate:rpg` reports 40 forest assets, 40 crystal assets, 40 bush assets, and 128 catalog items.
- Bush, fern, cactus, and stump entries appear in archive search and shop pages.
- Bush/cactus shop filters are visible and tappable without shrinking text into unusable boxes.
- Bush placement uses 1x1 collision footprints and visual sizes derived from 16/32/64 px source art.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryShop.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-bush-pack-export`

Manual test checklist:

- Open shop, tap `Bushes`, and buy a bush or fern.
- Open shop, tap `Cacti`, and buy a cactus.
- Open backpack, search `bush`, `fern`, and `cactus`.
- Place a 64px bush and confirm it occupies one blocked tile with a 2x2 visual footprint.
- Interact with a leafy bush twice quickly and confirm leaf/drop feedback plus `Brush is resting`.

## Phase 26: Frame-Capable World Art Renderer

Goal: unlock future spritesheet-backed placeable objects without forking preview, placement, and world render logic.

Deliverables:

- Add a shared `RpgItemWorldArt` renderer for full-size world art.
- Support both standalone item `source` images and verified sprite-frame `icon` art.
- Route placed sanctuary objects through the shared renderer.
- Route build ghosts through the shared renderer so previews match final objects.
- Extend `validate:rpg` to require frame-capable world rendering.

Acceptance gates:

- Existing standalone PNG objects still render through their catalog `source`.
- Future frame-backed placeables can render from `item.icon` without adding another special case.
- Build ghost art and placed object art use the same source-of-truth renderer.
- No placement, collision, economy, or action-button behavior changes.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/RpgItemIcon.tsx app/src/engine/SanctuaryObject.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-world-art-renderer-export`

Manual test checklist:

- Place or move a tree/crystal/bush and confirm the build ghost still matches the placed object.
- Confirm long-press move still fades/hides the static object while editing.
- Confirm normal world mode still only exposes `Interact` and `Attack`.

## Phase 27: Shop Search And Empty States

Goal: keep the shop usable as the object catalog grows past quick filter browsing.

Deliverables:

- Add shop search across item id, name, description, rarity, source label, and tags.
- Show filtered result count against total shop item count.
- Add a clear search control and safe no-match empty state.
- Tighten shop spacing enough to fit search above the current six-card page layout.
- Extend `validate:rpg` so shop scalability controls are required.

Acceptance gates:

- Searching `crystal`, `bush`, `cactus`, `rare`, or an exact item id filters shop entries without mutating inventory or coins.
- Clearing search restores the current category/sort view.
- Empty search results do not expose an invalid buy action.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-shop-search-export`

Manual test checklist:

- Open shop, search `crystal`, and confirm only crystal-related items remain.
- Search a nonsense query and confirm the no-match state appears and buy is disabled.
- Clear search and confirm the selected shop page recovers.
- Buy an item after filtering and confirm owned count/coins still update.

## Phase 28: Cave Content Pack V1

Goal: add a curated cave object pack without flooding the catalog with duplicate dark/light variants.

Deliverables:

- Map 32 tracked standalone cave objects into `RpgAssetRegistry.ts`.
- Add Cave Archive catalog metadata, price, rarity, footprint, and shop inclusion.
- Add a `Cave` shop filter.
- Extend `validate:rpg` to require the cave pack, cave metadata, file existence, and shop filter.

Acceptance gates:

- `validate:rpg` reports 40 forest assets, 40 crystal assets, 40 bush assets, 32 cave assets, and 160 catalog items.
- Cave objects appear in archive search and shop search/filter.
- Cave structures/relics use larger collision footprints where appropriate; rocks/mushrooms remain compact.
- No duplicate dark/light variants are added for the same object family in V1.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryShop.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-cave-pack-export`

Manual test checklist:

- Open shop, tap `Cave`, and confirm cave objects are visible.
- Search `Cave Archive`, `totem`, `skeleton`, and `mushroom`.
- Buy and place a cave rock, cave mushroom, and larger cave structure.
- Confirm large cave structures block multiple tiles and compact cave props remain 1x1.

## Phase 29: Source-Pack Filters

Goal: make the 160-item catalog easier to inspect by filtering content packs directly, without overloading gameplay tag filters.

Deliverables:

- Add archive source filters for Forest, Crystal, Bush, and Cave catalog labels.
- Add shop source filters for the same pack labels.
- Keep existing gameplay tag filters intact for trees, mushrooms, structures, crystals, bushes, cacti, and cave-tagged items.
- Extend `validate:rpg` so source filters remain mandatory as more packs are mapped.

Acceptance gates:

- Source filtering uses catalog `sourceLabel` metadata, not ad hoc item IDs or asset paths.
- Category/tag filters and source filters compose together.
- Page, selected item, and empty states recover cleanly when filters change.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgArchive.tsx app/src/engine/SanctuaryShop.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-source-filters-export`

Manual test checklist:

- Open archive and tap Forest, Crystal, Bush, and Cave source filters.
- Combine archive source filters with Objects/Seeds/Resources, Seen/Known/Locked, search, and sort.
- Open shop and tap Forest, Crystal, Bush, and Cave source filters.
- Combine shop source filters with gameplay tag filters and search, then buy one visible item.

## Phase 30: Backpack Source-Pack Filters

Goal: keep backpack inspection aligned with archive and shop now that the catalog has multiple source packs.

Deliverables:

- Add backpack source filters for Forest, Crystal, Bush, and Cave catalog labels.
- Compose source filters with existing kind filters, search, and sort.
- Preserve item selection/page recovery when any backpack filter changes.
- Extend `validate:rpg` so backpack source filters remain mandatory.

Acceptance gates:

- Backpack source filtering uses catalog `sourceLabel` metadata.
- Resource/seed items remain visible under `All` and do not incorrectly appear under object source packs.
- Slot sizing remains bounded after the added row.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgBackpack.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-backpack-source-filters-export`

Manual test checklist:

- Open backpack with bought Forest, Crystal, Bush, and Cave items.
- Tap each source filter and confirm owned stacks narrow correctly.
- Combine source filters with Objects/Seeds/Resources, search, and sorting.
- Confirm Place/Plant buttons still target the selected stack after filters change.

## Phase 31: Shared Source-Pack Metadata

Goal: remove duplicated source-pack filter definitions so future content packs are added once and inherited by archive, shop, and backpack.

Deliverables:

- Add shared source-pack id/filter exports to `RpgObjectCatalog.ts`.
- Update archive, shop, and backpack to consume the shared filters.
- Keep each screen's matching logic local while using the same source-label source of truth.
- Extend `validate:rpg` to reject duplicated source filter lists in UI components.

Acceptance gates:

- Forest, Crystal, Bush, and Cave source filter labels live in one exported catalog constant.
- Archive, shop, and backpack use `RPG_SOURCE_PACK_FILTERS`.
- No local `ARCHIVE_SOURCE_FILTERS`, `SHOP_SOURCE_FILTERS`, or `BACKPACK_SOURCE_FILTERS` definitions remain.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgArchive.tsx app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-shared-source-filters-export`

Manual test checklist:

- Open archive, shop, and backpack and confirm source filter rows still show All/Forest/Crystal/Bush/Cave.
- Tap each filter in all three surfaces and confirm result counts update.
- Combine source filters with existing category/tag filters and search.

## Phase 32: Source-Pack Filter Counts

Goal: make source filters more inspectable by showing how many entries each pack contains on each surface.

Deliverables:

- Add a shared source-pack count helper in `RpgObjectCatalog.ts`.
- Show source counts in the archive source filter row.
- Show source counts in the shop source filter row.
- Show owned-stack source counts in the backpack source filter row.
- Extend `validate:rpg` so source filter counts stay wired.

Acceptance gates:

- `All` counts every item/stack in the current surface.
- Pack counts use catalog `sourceLabel` metadata through the shared helper.
- Tree-drop resources and other non-pack items remain counted under `All`, not incorrectly under object packs.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgArchive.tsx app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-source-counts-export`

Manual test checklist:

- Open archive and confirm source filter counts roughly match pack sizes.
- Open shop and confirm Forest/Crystal/Bush/Cave counts are visible.
- Buy a few source-pack items and confirm backpack source counts update by owned stack.
- Confirm counts do not hide or shift source filter labels on phone.

## Phase 33: Framed World Art Priority

Goal: make sheet-based placeables safe by ensuring curated sprite frames render before whole-sheet image sources.

Deliverables:

- Update `RpgItemWorldArt` to prefer `item.icon` frames before `item.source`.
- Keep standalone PNG objects working through the existing `source` fallback.
- Extend `validate:rpg` to guard this branch order.

Acceptance gates:

- Existing standalone object sources still render.
- Future items with both an icon frame and a source do not accidentally display the entire source sheet in-world.
- Placed objects and build ghosts still share the same renderer.
- TypeScript, RPG content validation, whitespace check, and Expo export pass.

Current verification evidence:

- `npx tsc --noEmit`
- `npm run validate:rpg`
- `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgItemIcon.tsx`
- `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-framed-world-art-export`

Manual test checklist:

- Place an existing standalone forest/cave object and confirm it still renders.
- Place a seed/crop-style framed item when available and confirm it renders as the frame, not the full sheet.

## Manual Regression Script

Run this script after code phases that touch RPG runtime behavior.

1. Open RPG screen in sanctuary.
2. Open shop.
3. Buy a tree object.
4. Open backpack.
5. Confirm bought object appears with count.
6. Select placeable object and enter placement.
7. Drag object over invalid cells and confirm red feedback.
8. Drag object to valid cell and press `Interact`.
9. Confirm object appears and inventory count decrements.
10. Walk into object footprint and confirm movement is blocked.
11. Long-press object and move it.
12. Stash object and confirm inventory count increments.
13. Face a tree and press `Interact`.
14. Confirm feedback, cooldown, and possible drop.
15. Confirm drop appears in backpack.
16. Pinch zoom in and out.
17. Confirm avatar, map, object sprites, ghost, and cells scale together.
18. Confirm only `Interact` and `Attack` appear in normal mode.

## Phase Audit Log

### Phase 0 Audit

Intended behavior:

- This document should make the RPG sandbox plan inspectable and phase-driven.
- It should prevent scope drift by recording invariants, gates, and expansion notes.

Negative guarantees:

- It must not claim unfinished implementation is complete.
- It must not redefine Phase 1 through Phase 10 as already done.
- It must not erase or stage unrelated worktree changes.

Files changed:

- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md`
- Passed: content inspection confirmed Phase 0 through Phase 10 exist.
- Passed: each Phase 0 through Phase 10 section has deliverables, acceptance gates, and expansion notes.
- Passed: current baseline and unrelated dirty worktree state are recorded.

Open Phase 0 findings:

- None recorded yet.

Phase 0 status:

- Verified.

### Phase 1 Audit

Intended behavior:

- Replace ad hoc icon assumptions with named, verified asset frames.
- Produce contact sheets for current and near-future RPG UI/farming sheets.
- Keep unverified assets out of production mappings.

Negative guarantees:

- No active semantic item uses the prior `Icon95_1` or `Icon77_1` random numbered files.
- Farming and shop candidate sheets are documented but not treated as completed runtime features.

Files changed:

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
- Passed: active RPG paths no longer reference `Icon95_1` or `Icon77_1`.
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase1-export`

Expansion notes saved:

- Add a deterministic contact-sheet regeneration script.
- Add a dev-only atlas viewer screen.
- Move crop candidates into typed crop catalog entries during Phase 6.

Phase 1 status:

- Verified.

### Phase 2 Audit

Intended behavior:

- Backpack uses verified atlas panel metadata.
- Backpack supports scalable category filtering without fake item actions.
- Empty and filtered-empty states are explicit.

Negative guarantees:

- Filtering must not let resources enter build mode.
- Filtering must not leave selection pointing at a hidden item.
- Backpack changes must not stack with build mode controls.

Files changed:

- `app/src/engine/RpgBackpack.tsx`
- `app/src/engine/RpgObjectCatalog.ts`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/engine/RpgBackpack.tsx app/src/engine/RpgObjectCatalog.ts RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase2-export`

Expansion notes saved:

- Runtime phone check should verify filter bar legibility on the smallest target device.
- Add item rarity frames later.
- Add sorting controls only after inventory size makes filters insufficient.
- Add item detail modal only after farming/crafting adds richer item stats.

Phase 2 status:

- Verified.

### Phase 3 Audit

Intended behavior:

- Shop uses verified RPG shop panel art.
- Shop remains purchase-only and does not expose inventory-use controls.
- Shop displays item sprite, price, owned count, selected item detail, and insufficient-coin feedback.
- Purchases refresh coins and backpack inventory state immediately.

Negative guarantees:

- Shop must not mutate inventory when the user lacks coins.
- Shop must not remain open during build/edit placement.
- Shop must keep large catalogs behind explicit paging/filtering and real touch controls.

Files changed:

- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/app/rpg.tsx`
- `RPG_ASSET_ATLAS.md`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/engine/SanctuaryShop.tsx app/src/engine/RpgObjectCatalog.ts RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase3-export`
- Passed: source inspection confirmed `SanctuaryShop` receives `coins` and `refreshKey`, renders real paged touch controls, and has no place/use controls.

Expansion notes saved:

- Add rarity/sort controls once the paged catalog grows beyond the current forest pack.
- Add buy confirmation for expensive items.
- Add daily rotating stock.
- Add locked items based on level/streak.
- Add sell flow only after economy balance exists.

Phase 3 status:

- Verified.

### Phase 4 Audit

Intended behavior:

- Build mode uses explicit placement reasons for every invalid state.
- Drag placement can show out-of-bounds red cells instead of silently clamping all invalid edge drags.
- Invalid placement confirmation gives visible feedback through the world toast.
- Movement collision uses the same catalog footprints as placement collision.
- Object move, stash, and place refresh the movement collision map immediately after persistence changes.

Negative guarantees:

- Users cannot place over avatar footprint, terrain, existing object footprint, portal access, or trap-safe-path constraints.
- Build mode must not expose normal shop/backpack controls.
- Collision updates must not depend on a stale object footprint after move/stash/place.
- Placement feedback must not collapse all failures into a generic blocked message.

Files changed:

- `app/app/rpg.tsx`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/engine/SanctuaryShop.tsx app/src/engine/RpgObjectCatalog.ts RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase4-export`
- Passed: source inspection confirmed placement reasons cover `Occupied`, `Avatar`, `Terrain`, `Out of bounds`, `Blocks portal`, and `Traps avatar`.
- Passed: source inspection confirmed `makeMovementCollisionFlat` and `applyMovementCollision` use catalog footprints and are called from map refresh/effect paths.

Manual test checklist:

- Drag a placeable object over the avatar and confirm `Avatar` feedback.
- Drag over an existing tree footprint and confirm `Occupied` feedback.
- Drag over wall/water or map boundary and confirm `Terrain` or `Out of bounds` feedback.
- Place, move, and stash an object, then immediately try walking through the old and new footprint.
- Pinch zoom while in placement mode and confirm map, avatar, object, ghost, and cells scale together.

Expansion notes saved:

- Add edge panning while dragging.
- Add object rotation if future rectangular assets need it.
- Add snap animation on confirm.
- Add object-specific placement rules such as water-only, path-adjacent, or crop-bed-only.
- Extract placement/collision helpers into a pure testable module before adding farming plots.

Phase 4 status:

- Verified.

### Phase 5 Audit

Intended behavior:

- Facing an interactable sanctuary object and pressing `Interact` routes through object interaction.
- Trees with `forageDrops` can roll a seed or leaves drop.
- Interaction feedback is visible even when there is no animation-specific tree asset.
- Cooldowns prevent rapid repeated gathering from the same object.
- Drops refresh backpack inventory and use verified atlas icons.

Negative guarantees:

- Objects without drop tables must not pretend to be harvestable.
- Tree drops must not use unverified worm-looking or random numbered icons.
- `Attack` must not be required for gathering.
- Interaction must not bypass the `Interact` button.

Files changed:

- No new Phase 5 code changes in this pass; existing implementation was audited in:
  - `app/app/rpg.tsx`
  - `app/src/engine/RpgObjectCatalog.ts`
  - `app/src/engine/SanctuaryObject.tsx`
  - `app/src/engine/RpgBackpack.tsx`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase4-export`
- Passed: source inspection confirmed `forageObject` is reached from `handleInteract`.
- Passed: source inspection confirmed per-object cooldowns through `forageCooldowns`.
- Passed: source inspection confirmed `pulseObject` drives `SanctuaryObject` interaction scaling.
- Passed: source inspection confirmed drops use `RPG_UI_FRAMES.leaves` and `RPG_UI_FRAMES.seed` through catalog entries.
- Passed: source inspection confirmed `addSandboxInventoryItem` bumps backpack refresh state after a drop.

Manual test checklist:

- Face a White Tree and press `Interact`; confirm pulse/toast and possible seed/leaves drop.
- Press `Interact` repeatedly on the same tree and confirm cooldown feedback.
- Face Living Gazebo and press `Interact`; confirm muted no-drop feedback.
- Open backpack after a successful drop and confirm the item count appears in the right category.

Expansion notes saved:

- Add tool requirements for special drops.
- Add rare drops and streak modifiers.
- Add drop fly-to-backpack animation.
- Add per-tree depletion/regrowth timers.
- Add tree-specific drop odds instead of shared draft odds once economy balance exists.

Phase 5 status:

- Verified.

### Phase 6 Audit

Intended behavior:

- Farming state has its own persistent table and is not mixed into decorative `sanctuary_objects`.
- `garden_plots` uses world-grid vocabulary: `row` and `col`.
- Garden plots track `seed_item_id`, `crop_id`, `planted_at`, `growth_stage`, and `updated_at`.
- One plot can occupy a given world cell at a time.
- Seed/crop metadata lives in the gameplay catalog, not in ad hoc UI code.
- Planting helpers can consume a seed and create a plot atomically.

Negative guarantees:

- Existing old `grid_x/grid_y` garden data must not be stranded.
- A failed plant insert must not consume seed inventory.
- Crop metadata must not require decorative object rows.
- Phase 6 must not imply crop rendering, planting UI, offline growth, harvest, or weather is complete.

Files changed:

- `app/src/db/schema.ts`
- `app/src/db/garden.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/src/db/schema.ts app/src/db/garden.ts app/src/engine/RpgObjectCatalog.ts RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase6-export`
- Passed: SQLite old-shape simulation migrated `item_id/grid_x/grid_y` into `seed_item_id/crop_id/row/col`.
- Passed: SQLite normalized-shape simulation preserved `seed_item_id/crop_id/row/col/growth_stage` and populated `updated_at`.
- Passed: source inspection confirmed `plantSeed` wraps seed decrement and plot insert in one transaction.

Manual test checklist:

- On a device with old garden data, launch once and confirm old plots still exist with the expected row/col positions.
- Attempt to plant without seed inventory and confirm no plot row is created.
- Attempt to plant twice on the same cell and confirm seed inventory is not lost on the second attempt.
- Confirm seed items expose crop metadata through `getCropForSeed`.

Expansion notes saved:

- Add crop-stage art references after Phase 7 proves planting coordinates.
- Add prepared-soil and terrain-specific plot rules.
- Add crop quality tiers.
- Add multi-harvest crops.
- Add seasonal crops/weather affinity.

Phase 6 status:

- Verified.

### Phase 7 Audit

Intended behavior:

- Selecting a seed with crop metadata from the backpack exposes a `Plant` action.
- Planting enters the same drag-footprint build mode used by objects.
- Planting validates against avatar footprint, object footprints, existing garden plots, non-grass terrain, portals, and map bounds.
- Successful planting consumes exactly one seed and creates a `garden_plots` row.
- Failed planting does not consume seed inventory.
- Planted plots render in the sanctuary world and share the world transform with map, avatar, objects, and zoom.

Negative guarantees:

- Seeds without crop metadata must not show a fake planting action.
- Planting must not use `Attack`.
- Planting must not create decorative `sanctuary_objects`.
- Planting must not start Phase 8 growth/harvest behavior.
- Normal world controls remain `Interact` and `Attack`; planting controls are contextual to backpack/build mode.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/src/db/garden.ts`
- `app/src/db/schema.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/engine/RpgBackpack.tsx app/src/db/garden.ts app/src/db/schema.ts app/src/engine/RpgObjectCatalog.ts RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase7-export`
- Passed: source inspection confirmed `RpgBackpack` calls `onPlantSeed` only for seeds with crop metadata.
- Passed: source inspection confirmed plant mode uses `analyzePlacement(..., 'plant')`.
- Passed: source inspection confirmed `plantSeed` handles seed decrement and plot insert transactionally.
- Passed: source inspection confirmed garden plots render inside the world container.

Manual test checklist:

- Open backpack, filter to Seeds, select a tree seed, and tap `Plant`.
- Drag the seed ghost over grass and confirm green footprint.
- Drag over avatar, tree footprint, existing plot, portal, wall/water, and map edge; confirm red feedback.
- Press `Interact` on a valid cell and confirm the seed count decrements and a plot marker appears.
- Try planting another seed on the same cell and confirm no seed is lost.
- Pinch zoom after planting and confirm the plot marker scales with the world.

Expansion notes saved:

- Replace the draft seed marker with crop-stage art in Phase 8.
- Add prepared dirt/garden-bed terrain instead of treating grass as the draft valid planting terrain.
- Add plot details on `Interact`.
- Add plot movement/removal tools after harvest semantics exist.
- Add object-specific exclusions if some decorations should allow underplanting later.

Phase 7 status:

- Verified.

### Phase 8 Audit

Intended behavior:

- Sanctuary mount reconciles garden plot growth from persisted `planted_at` timestamps.
- Plots render distinct seed, growing, and mature states.
- `Interact` on an immature plot reports time remaining.
- `Interact` on a mature plot harvests it.
- Harvest grants coins and concrete inventory drops, then removes the harvested plot.
- Harvest is transactional so rewards and plot removal cannot partially apply.

Negative guarantees:

- Growth reconciliation must not require the app to remain open.
- Harvest must not be repeatable after the plot row is removed.
- Harvest must not use `Attack` or add extra normal-mode buttons.
- Harvest must not mutate decorative `sanctuary_objects`.
- Phase 8 must not imply Water Drops, weather, or live crop art animation is complete.

Files changed:

- `app/src/engine/SanctuaryBootstrapper.ts`
- `app/src/db/garden.ts`
- `app/app/rpg.tsx`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/db/garden.ts app/src/engine/SanctuaryBootstrapper.ts app/src/engine/RpgObjectCatalog.ts RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase8-export`
- Passed: source inspection confirmed `bootstrapSanctuaryGrowth` updates stale growth stages from timestamps.
- Passed: source inspection confirmed mature harvest calls `harvestGardenPlot`.
- Passed: source inspection confirmed `harvestGardenPlot` wraps coin reward, inventory drops, and plot deletion in one transaction.

Manual test checklist:

- Plant a seed, manually age its `planted_at`, reopen RPG, and confirm the stage advances.
- Interact with an immature plot and confirm time remaining feedback.
- Interact with a mature plot and confirm coins/resources are awarded.
- Confirm the plot disappears after harvest and cannot be harvested again.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Replace stage badge markers with verified crop-stage sprites.
- Add animated growth transitions.
- Add crop encyclopedia/details.
- Add crop-specific yield variance.
- Add harvest combo bonuses.
- Add live timer refresh for crops maturing while the screen remains open.

Phase 8 status:

- Verified.

### Phase 9 Audit

Intended behavior:

- Water Drops are defined as a catalog resource with a verified icon.
- Completing a supported productivity activity log grants Water Drops.
- Water Drops persist in `user_inventory` and appear in the backpack Resources filter.
- `Interact` on an immature crop spends one Water Drop to advance its growth stage.
- Water Drop spending and crop advancement are atomic.

Negative guarantees:

- Water Drops must not be decorative-only.
- Spending with insufficient Water Drops must not mutate crop state.
- Water Drop spending must not add new normal-mode buttons.
- Activity logging must not import asset-heavy RPG catalog code.
- Phase 9 must not imply streak weather is complete.

Files changed:

- `app/src/engine/RpgItemIds.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/db/logs.ts`
- `app/src/db/garden.ts`
- `app/app/rpg.tsx`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/db/garden.ts app/src/db/logs.ts app/src/engine/RpgItemIds.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryBootstrapper.ts RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase9-export`
- Passed: source inspection confirmed activity logs call `addInventoryItem` for `RPG_WATER_DROPS_ITEM_ID`.
- Passed: source inspection confirmed `advanceGardenPlotWithInventoryItem` wraps inventory decrement and plot update in one transaction.
- Passed: source inspection confirmed `Interact` on immature crop attempts Water Drop acceleration and falls back to time remaining when none exist.

Manual test checklist:

- Create a daily activity log and confirm Water Drops appear in backpack Resources.
- Interact with an immature crop while holding Water Drops and confirm the crop advances and Water Drops decrement.
- Interact with an immature crop without Water Drops and confirm time remaining feedback with no crop mutation.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Add different energy types for activity categories.
- Add streak multipliers.
- Add daily Water Drop caps.
- Add auto-water rules.
- Add explicit Water Drop count to a future crop detail panel.

Phase 9 status:

- Verified.

### Phase 10 Audit

Intended behavior:

- Sanctuary derives rain from current RPG streak state.
- A streak of at least 3 days enables rain.
- Rain renders as a sanctuary-only overlay.
- Rain overlay does not block controls.
- Rain has a real farming effect by advancing immature crops without spending Water Drops.

Negative guarantees:

- Rain must not add normal-mode action buttons.
- Rain must not consume Water Drops.
- Rain must not render in the dungeon zone.
- Rain must not block touch interaction with movement, build mode, backpack, shop, `Interact`, or `Attack`.
- Phase 10 must not claim richer forecasts, soundscape, or rare weather drops are complete.

Files changed:

- `app/app/rpg.tsx`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `git diff --check -- app/app/rpg.tsx app/src/db/garden.ts app/src/db/logs.ts app/src/engine/RpgItemIds.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryBootstrapper.ts RPG_SANDBOX_PHASE_PLAN.md`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase10-export`
- Passed: source inspection confirmed rain is derived from `rpg_state.streak_days >= 3`.
- Passed: source inspection confirmed rain overlay uses `pointerEvents="none"`.
- Passed: source inspection confirmed rain advances immature crop growth through `updatePlantGrowth` before the Water Drop spending path.

Manual test checklist:

- Set `rpg_state.streak_days` below 3 and confirm no rain overlay.
- Set `rpg_state.streak_days` to 3 or more and confirm rain overlay appears in sanctuary.
- Enter dungeon and confirm rain overlay disappears.
- Interact with an immature crop while raining and confirm it advances without spending Water Drops.
- Confirm movement, `Interact`, `Attack`, backpack, shop, and build placement remain usable while raining.

Expansion notes saved:

- Add other weather types.
- Add weather forecast UI.
- Add weather-linked rare drops.
- Add soundscape and particle quality settings.
- Add animated rain motion and intensity scaling after performance profiling.

Phase 10 status:

- Verified.

### Phase 34 Audit

Intended behavior:

- Temple Archive exists as a shared source-pack filter for archive, shop, and backpack views.
- Eighteen curated ruined-temple objects are mapped from verified sprite-sheet frames, not whole sheets.
- Temple entries use catalog metadata for names, descriptions, rarity, prices, placement footprints, and archive facts.
- Temple objects render through `icon` sprite frames in shop, backpack, build ghost, archive, and placed-world art.
- Runtime registry exposes temple asset IDs with frame metadata so archive references resolve.

Negative guarantees:

- Temple sheet assets must not render as full tilesheets in the world.
- Frame-only temple objects must not add undefined entries to `RPG_OBJECT_SOURCES`.
- Temple source-pack filtering must not fork into separate archive/shop/backpack filter lists.
- Temple objects must not bypass catalog footprints or placement collision metadata.
- Phase 34 must not claim animated temple props, dungeon encounters, loot tables, or procedural ruins are complete.

Files changed:

- `app/src/engine/RpgAssetRegistry.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-temple-pack-export`
- Passed: source inspection confirmed temple objects use `icon: asset.frame` and frame assets are excluded from `RPG_OBJECT_SOURCES`.

Manual test checklist:

- Open shop, select the Temple source pack, and confirm temple objects show visible framed item art.
- Buy a temple object and confirm it appears in backpack under the Temple source pack.
- Place a temple object and confirm the build ghost and placed object show the cropped sprite, not the full sheet.
- Confirm red/green placement cells match the catalog footprint.
- Open archive, filter to Temple, and confirm temple entries show details and source metadata.

Expansion notes saved:

- Add fire/chest animations after sprite timing is verified.
- Add temple interaction rewards only after resource tables are designed.
- Add room/wall-specific placement rules after biome or dungeon layout exists.
- Add atlas/contact-sheet tooling for the remaining temple sheets.

Phase 34 status:

- Verified.

### Phase 35 Audit

Intended behavior:

- Runtime asset registry supports reusable sprite animations made from verified frame grids.
- Item catalog entries can carry animation metadata alongside their static icon frame.
- Shared item renderers animate catalog items in shop, backpack, archive, build ghost, and placed-world art.
- Temple Archive gains two animated props: Temple Fire Bowl and Animated Temple Chest.
- Content validation checks animation grids, frame bounds, renderer support, and catalog propagation.

Negative guarantees:

- Animated props must not require one-off UI code in shop, backpack, archive, or placed-object components.
- Animated props must still have a static first frame for fallback and registry references.
- Animation metadata must not bypass catalog footprints, source-pack filters, or archive facts.
- Invalid animation dimensions or missing renderer support must fail `npm run validate:rpg`.
- Phase 35 must not claim trap mechanics, enemy AI, loot chests, or animation performance tuning are complete.

Files changed:

- `app/src/engine/RpgAssetRegistry.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgItemIcon.tsx`
- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgItemIcon.tsx app/src/engine/RpgArchive.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-temple-animation-export`
- Passed: source inspection confirmed renderer, archive, registry, and catalog all consume shared animation metadata.

Manual test checklist:

- Open shop, filter to Temple, and confirm Temple Fire Bowl and Animated Temple Chest are visible and animated.
- Buy each animated item and confirm backpack shows the animated item art.
- Place each animated item and confirm the build ghost and placed object animate from the same catalog entry.
- Open archive, filter to Temple, and confirm animated prop entries render with visible art and facts.
- Confirm normal mode still exposes only `Interact` and `Attack` as action buttons.

Expansion notes saved:

- Add trap-specific animations only after trap interaction rules exist.
- Add animation pausing or viewport culling if many animated props become a performance issue.
- Add chest interaction/loot behavior only after economy balance is designed.
- Add animation preview controls to a future asset atlas screen.

Phase 35 status:

- Verified.

### Phase 36 Audit

Intended behavior:

- Temple Archive gains four verified hazard/mechanism props: spike trap, blade trap, floor lever, and lattice gate.
- Spike and blade traps use the shared sprite animation pipeline.
- Lever and lattice gate use explicit verified sprite frames from their sheets.
- Temple catalog descriptions, rarity, prices, and footprints classify hazards/mechanisms without adding active trap damage.
- Small temple props, chests, fire, traps, and levers use compact placement footprints instead of relic/statue-sized visuals.
- Content validation enforces the new trap/mechanism categories, frame bounds, animation grids, and catalog propagation.

Negative guarantees:

- Hazard props must not damage the avatar or add combat/trap state before trap rules exist.
- Hazard props must not introduce new normal-mode action buttons.
- Hazard props must not bypass existing build placement, collision, source-pack, archive, backpack, or shop pipelines.
- Animated trap sheets must not render as full sprite sheets.
- Phase 36 must not claim puzzle logic, trap toggles, lever links, enemy AI, or dungeon room mechanics are complete.

Files changed:

- `app/src/engine/RpgAssetRegistry.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-temple-hazards-export`
- Passed: source inspection confirmed hazards/mechanisms use catalog metadata and the normal shared renderer/pipeline.

Manual test checklist:

- Open shop, filter to Temple, and confirm the spike trap, blade trap, floor lever, and lattice gate appear.
- Buy and place each hazard/mechanism prop; confirm trap art is cropped/animated and lever/gate art is cropped/static.
- Confirm small hazard/chest/fire/lever placement cells stay compact.
- Confirm placed hazard props block movement only through normal object footprints and do not damage the avatar.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Link levers to traps/gates after persistence schema for object relations exists.
- Add trap damage only after combat/health rules are designed.
- Add trap disabled/enabled animation states after interaction rules exist.
- Add puzzle-room templates after map/room authoring is stabilized.

Phase 36 status:

- Verified.

### Phase 37 Audit

Intended behavior:

- `Interact` remains the only normal-mode object interaction button.
- Forage-capable objects still roll their configured drops and cooldown text.
- Non-forage objects now pulse and show clear inspect feedback instead of feeling inert.
- Temple hazards, levers, gates, chests, fire, relics, and structures get tag-aware harmless feedback.
- Missing object catalog data reports a warning toast instead of silently doing nothing.

Negative guarantees:

- Inspect feedback must not add trap damage, lever links, gate toggles, chest loot, puzzle state, combat state, or persistence schema changes.
- Inspect feedback must not add new normal-mode buttons or change build-mode placement controls.
- Forage drop probabilities, inventory writes, discovery recording, and cooldown behavior must remain unchanged.
- Decorative objects must not become gatherable unless their catalog item explicitly defines `forageDrops`.

Files changed:

- `app/app/rpg.tsx`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-object-inspect-export`
- Passed: source inspection confirmed `Interact` routes all placed objects through one interaction path and only forage-capable objects write inventory.

Manual test checklist:

- Place a tree and confirm `Interact` still can drop leaves/seeds or show the cooldown/resting text.
- Place a temple spike trap and confirm `Interact` shows dormant trap feedback with a pulse and no damage.
- Place a temple lever and lattice gate; confirm `Interact` shows not-linked/locked feedback with no puzzle state.
- Place a chest/fire/relic/structure and confirm feedback is visible but no inventory is granted.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Link lever/gate/trap relationships only after a persisted object-relation schema exists.
- Add chest loot only after economy balance and chest rarity rules exist.
- Add trap damage/disable behavior only after health, invulnerability, and safe-path rules are designed.

Phase 37 status:

- Verified.
