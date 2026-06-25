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
- Shop must not assume the catalog can grow beyond the current six-slot panel without an explicit pagination phase.

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
- Passed: source inspection confirmed `SanctuaryShop` receives `coins` and `refreshKey`, uses `RPG_UI_FRAMES.shopPanel`, and has no place/use controls.

Expansion notes saved:

- Add shop pagination or category tabs before `SHOP_CATALOG` exceeds the six visible slots in the current panel.
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
