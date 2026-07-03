# RPG Sandbox Phase Plan

Last updated: 2026-07-03

This ledger is the authoritative plan for the RPG sandbox work from Phase 0 onward. It exists so every pass can be judged against explicit goals, tests, evidence, and deferred expansion notes instead of memory.

## Current Baseline

Shipped commits relevant to this ledger:

- `0b3603d` Fix RPG sandbox spatial mechanics
- `6b4ef82` Add drag-based RPG build placement
- `7af28a2` Add RPG foraging and inventory catalog
- `ef36720` Add RPG backpack inventory
- `1510f8d` Add RPG resource and mechanism interactions
- `c1fab19` Hide RPG normal target debug visuals
- `f2e85a7` Surface RPG mechanisms in shop

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

## Stardew-Like Comfort Protocol

The RPG sandbox is closest to a cozy tile-life-sim loop: farming, foraging, decorating, walking, collecting, and contextual object interactions. Use Stardew Valley as a comfort benchmark for genre feel, while keeping Prodewty's mechanics, economy, assets, and code original.

- One authoritative tile world: movement, placement, farming, object interaction, and collision must agree on the same row/col and footprint model.
- Foot-based presence: avatar and object sorting, collision, and interaction range are anchored to feet/bottom cells, not sprite centers.
- Context-first input: normal mode stays simple with `Interact` and `Attack`; build, stash, move, buy, plant, and harvest controls appear only in the matching state.
- Immediate feedback: taps, placement validity, harvests, locked gates, traps, chests, and failed actions must show a visible response without waiting for a long async chain.
- Local-first performance: per-frame movement, camera, zoom, previews, and animations must not perform SQLite writes, catalog scans, asset discovery, or expensive allocations.
- Bounded camera feel: zoom and panning must keep the avatar, objects, and map in one shared world transform and must clamp to the authored map bounds.
- Readable placement: build previews must show clear green/red footprint cells, respect avatar occupancy, and never require walking around to place a backpack item.
- Transactional economy: inventory, coins, placed objects, crops, reward claims, and relation cleanup must commit together when the player-facing action is atomic.
- Scalable content: every new asset pack flows through the registry, catalog, archive, shop, backpack, and validator rather than one-off screen logic.
- Conservative animation budget: idle world animations are allowed, but they should use shared sprite-frame renderers and avoid rerendering the whole map every tick.

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
| 38 | Object interaction memory V1 | Verified | Persist first/repeat object inspect state for future chest, lever, and trap rules |
| 39 | Safe chest rewards V1 | Verified | Temple chests grant once-per-type rewards through a reward-claim ledger |
| 40 | Lever toggle feedback V1 | Verified | Temple levers persist on/off toggle feedback without puzzle side effects |
| 41 | Trap disable feedback V1 | Verified | Temple traps persist disarm/re-arm feedback without damage or collision side effects |
| 42 | Object relation foundation V1 | Verified | Persist source-target object links for future lever, gate, and trap mechanics |
| 43 | Gate rattle feedback V1 | Verified | Gate interactions persist locked feedback without opening or collision side effects |
| 44 | Interaction target prompt V1 | Verified | Show the current Interact target and highlight target objects without adding controls |
| 45 | Interaction target reticle V1 | Verified | Show the exact world-space target footprint for the current Interact target |
| 46 | Stable action button labels | Verified | Keep bottom action controls labeled Interact and Attack across normal and build modes |
| 47 | Empty Interact feedback | Verified | Empty Interact presses show throttled visible feedback instead of console-only logs |
| 48 | Build placement outcome feedback | Verified | Object placement, movement, and missing inventory cases show visible feedback |
| 49 | Attack feedback comfort pass | Verified | Attack presses show object/plot/portal/empty feedback and build mode truly disables Attack |
| 50 | Shared action target protocol | Verified | Prompt, Interact, and Attack consume one resolved facing-target packet |
| 51 | Action control clarity | Verified | Core RPG buttons expose clear roles, labels, selected states, hints, and disabled state |
| 52 | Resource node feedback V2 | Verified | Leaves use verified art and tree/bush/crystal forage feedback is source-aware |
| 53 | Lever mechanism V1 | Verified | Levers auto-link nearby gates/traps and toggle passability plus visual inactive state |
| 54 | Disable normal target debug visuals | Verified | Normal gameplay hides object outlines and target grid boxes while preserving debug reticle code |
| 55 | Mechanism shop surfacing | Verified | Shop exposes a direct Mechanisms filter, mechanism hints, and stable curated item icons |
| 56 | Future roadmap and logging discipline | Verified | Ledger now records the next RPG backlog and documentation protocol |
| 57 | Icon QA and semantic asset cleanup | Not started | Fix remaining wrong shop/backpack/drop icons through verified asset mappings |
| 58 | Mechanism usability V2 | Not started | Make lever/gate/trap ownership, linking, and state feedback obvious on device |
| 59 | Shop/backpack visual density pass | Not started | Tune card scale, row position, hit targets, item labels, and empty states after device testing |
| 60 | Full asset archive expansion | Not started | Map all usable asset packs into registry/catalog/archive without promoting junk frames |
| 61 | Farming art and seed taxonomy V2 | Not started | Replace placeholders with crop-specific seeds, plant stages, and harvest produce |
| 62 | Build/editor UX V3 | Not started | Polish Clash-style drag preview, footprint feedback, snapping, stash, and move flows |
| 63 | Dungeon/sanctuary object split | Not started | Separate safe sanctuary decor from dungeon hazards, loot, locks, and combat props |
| 64 | Economy balance and crafting foundations | Not started | Price resources, rewards, chests, processors, and future crafting loops coherently |
| 65 | Performance and save-state hardening | Not started | Profile runtime hotspots, persistence transactions, migrations, and recovery paths |
| 66 | Tool energy, watering, and character panel | Verified | Watering Can action, energy costs, character/equipment panel, textured tile placeholders |
| 67 | Clearable sanctuary clutter V1 | Verified | One-time weeds/twigs/rocks spawn, energy-gated clearing, resource rewards, collision cleanup |
| 68 | Crafting recipes V1 | Verified | Resource recipes consume materials transactionally and output placeable inventory items |
| 69 | Current issue ledger and forward plan refresh | Verified | Device feedback, post-crafting roadmap, and future-dev protocol logged in this document |
| 70 | Farm animals V1 | Verified | Four placeable livestock objects, Animal source/shop filters, Interact product rewards, placeholder product icons |
| 71 | Icon QA and semantic asset cleanup V2 | In progress | Wood now uses a named stump placeholder; validator guards resource fallback regressions |
| 72 | Mechanism usability V2 | In progress | Lever visual footprint enlarged; compact mechanism icons show LEVER/GATE/TRAP/MECH labels |
| 73 | Shop/backpack density and tap comfort V2 | Not started | Lower book rows, clearer item art, reliable card hit targets, selected detail polish |
| 74 | Farming art and seed taxonomy V2 | Not started | Crop-specific seed, stage, and produce art with archive/backpack/shop consistency |
| 75 | Build/editor UX V3 | Not started | Clash-style direct drag placement, edit-only move/stash, invalid-cell feedback, no walking required |
| 76 | Full asset archive expansion | Not started | Production/candidate/deprecated/ignored classification for every usable asset pack |
| 77 | Dungeon/sanctuary object split | Not started | Separate cozy sanctuary props from dungeon hazards, loot, locks, combat props, and zone rules |
| 78 | Economy balance and crafting foundations V2 | Not started | Coherent prices, drops, reward sinks, recipes, station candidates, and resource value tiers |
| 79 | Seasons/weather and farm loop V2 | Not started | Rain, seasons, growth modifiers, clutter regrowth rules, and daily cozy-life-sim cadence |
| 80 | Performance and save-state hardening V2 | Not started | Runtime profiling, transactional persistence audits, migration simulations, and device baseline |
| 81 | Tool terrain placeholder pass | Verified | Superseded by Phase 89: Bridge, Path, and Tilled Soil are honest base-grid placeholders, not final tracked terrain sprites |
| 82 | Backpack/tool ownership split | Verified | Backpack hides tools; hotbar and character/equipment panel own tool equip/unequip |
| 83 | Seasons and weather farm loop V2 | Verified | Season/weather HUD chip plus season-specific transactional harvest bonus drops |
| 84 | Asset correctness and placeholder honesty V3 | Verified | Mechanism compact markers no longer hide art; animal products use distinct labeled placeholders |
| 85 | Archive farm guide V1 | Verified | Archive now explains crop stages, watering/rain acceleration, season harvest bonuses, animal products, and current tool equip surface |
| 86 | Object interaction reactions V1 | Verified | Interacting with animals, forage objects, clutter, chests, gates, traps, and levers now shows a small in-world reaction badge |
| 87 | Crop plot reactions V1 | Verified | Watering, rain growth, not-ready, ready, and harvest states now show small in-world crop badges |
| 88 | Crop season affinity V1 | Verified | Crops now declare preferred seasons; in-season harvests add extra transactional yield and Archive guide facts |
| 89 | Validator architecture and terrain placeholder truth | Verified | `validate:rpg` now follows Tool/Crafting catalogs, DB helpers, calendar state, and honest terrain-placeholder policy |
| 90 | Sanctuary panel density and seed placeholder identity | Verified | Shop/Backpack/Archive show larger readable item surfaces; generic seed placeholders carry semantic badges and validator guards |
| 91 | Build nudge controls V1 | Verified | Build/edit mode now has contextual one-tile nudge controls, status, coordinates, and an explicit valid-placement confirm button |
| 92 | Placement ghost readability V1 | Verified | Build/edit ghosts now show a world-anchored footprint mat, center anchor, valid/invalid state, and edit-mode tint |
| 93 | Sanctuary design role hints V1 | Verified | Shop and Backpack now share catalog-derived layout roles and composition hints for decorating decisions |
| 94 | Sanctuary layout set filters V1 | Verified | Shop and Backpack can filter by Grove, Farm, Ruins, and Work layout intent using shared catalog matching |
| 95 | Item footprint preview V1 | Verified | Shop and Backpack details now show a compact shared footprint grid for placeables and plantable seeds |
| 96 | Build mode item context V1 | Verified | Build/edit controls now show selected item role, hint, and footprint while placing, moving, or planting |
| 97 | Archive composition guidance V1 | Verified | Archive details now show discovered item role, composition hint, and shared footprint/planting preview |
| 98 | Archive layout set filters V1 | Verified | Archive can filter planning entries by Grove, Farm, Ruins, and Work using shared layout semantics |
| 99 | Browse-card role badges V1 | Verified | Shop cards and Backpack slots now show shared sanctuary role badges while browsing items |
| 100 | Browse role tone badges V1 | Verified | Shop and Backpack browse badges now use role-tone colors for faster Grove/Farm/Ruins/Work scanning |
| 101 | Build mode role tone chip V1 | Verified | Build/edit placement context now carries the same role-tone chip language as browsing surfaces |
| 102 | Selected layout fit chips V1 | Verified | Shop and Backpack details now show which Grove/Farm/Ruins/Work layout sets the selected item fits |
| 103 | Build mode layout fit chips V1 | Verified | Build/edit placement context shows the selected item's Grove/Farm/Ruins/Work fit chips |
| 104 | Archive layout fit chips V1 | Verified | Archive details show Grove/Farm/Ruins/Work fit chips for discovered or known selected entries |
| 105 | Placed object grounding V1 | Verified | Placed sanctuary objects get catalog-footprint grounding mats so assets read better over placeholder terrain |
| 106 | Crop plot bed readability V1 | Verified | Garden and food crop plots get layered soil/furrow/watered visuals over placeholder terrain |
| 107 | Livestock farm-life cue V1 | Verified | Placed livestock gets a tag-driven barnyard cue and warmer grounding tone without changing animal product logic |
| 108 | Sanctuary season ambience V1 | Verified | Sanctuary gets a season/rain ambience wash from existing calendar/weather state without changing farm mechanics |
| 109 | Sanctuary interact focus V1 | Verified | Normal sanctuary play shows the current Interact target in-world using the resolved target cells |
| 110 | Breached zone readability V1 | Verified | Persisted breached Pond/Garden/Building Plot zones remain visible with warning overlays and labels for repair |
| 111 | Edit origin footprint V1 | Verified | Moving an existing sanctuary object shows its original catalog footprint as a subtle from-marker |
| 112 | Sanctuary terrain texture placeholders V1 | Verified | Sanctuary grid tiles now render code-native pixel textures instead of flat color boxes while preserving TileType logic |
| 113 | Terrain-aware object grounding V1 | Verified | Placed sanctuary object grounding mats inherit the current terrain tone from the object's footprint anchor tile |
| 114 | Terrain-aware placement footprint V1 | Verified | Build/edit placement footprints render a terrain-tone wash from the current placement report without weakening valid/invalid feedback |
| 115 | Terrain-aware build ghost grounding V1 | Verified | Build/edit object ghosts render a terrain-aware base under the preview art using the selected collision footprint |
| 116 | Plant ghost soil preview V1 | Verified | Plant placement ghosts render a tiny soil-bed and furrows under the seed icon so crop placement reads like a future plot |
| 117 | Placement cell marker polish V1 | Verified | Build placement cells now use soft valid/invalid fills with corner markers instead of heavy debug-style boxes |
| 118 | Build pad placement reason chip V1 | Verified | Build mode now shows a compact placement reason/hint chip derived from the current placement report |
| 119 | Build pad item identity row V1 | Verified | Build mode now shows the active item/seed icon and label inside the placement pad for clearer customization |
| 120 | Terrain art registry foundation V1 | Verified | Sanctuary terrain now flows through asset-slot metadata, shared preview colors, and neighbor-aware transition edges |
| 121 | Deterministic terrain variation V1 | Verified | Sanctuary placeholder terrain now gets stable per-cell detail variation for a less tiled farm-grid feel |
| 122 | Terrain paint ghost preview V1 | Verified | Terrain edit placement now previews the actual target tile art over the grid before confirming |
| 123 | Terrain paint before-after swatches V1 | Verified | Build pad now shows compact current-to-target terrain swatches while painting sanctuary tiles |
| 124 | Terrain paint browse preview V1 | Verified | Backpack, Shop, and Archive details now explain terrain-paint item targets with shared tile swatches |
| 125 | Terrain paint card art V1 | Verified | Terrain-paint item icons now use compact target-tile swatches across RPG browse/card surfaces |
| 126 | Build placement stats row V1 | Verified | Build mode now summarizes footprint size, clear cells, and hovered terrain while customizing sanctuary layout |

## Future Development Roadmap

The next RPG work should proceed in this order unless a device-blocking bug appears. Each phase must leave the game playable and should be small enough to commit independently.

| Phase | Focus | Why it matters | Main files likely touched | Acceptance target |
| --- | --- | --- | --- | --- |
| 57 | Icon QA and semantic asset cleanup | Wrong icons break trust fastest; this is the highest-value polish pass after the mechanism shop fix. | `RpgAssetRegistry.ts`, `RpgObjectCatalog.ts`, `RpgItemIcon.tsx`, `validate-rpg-content.js`, `RPG_ASSET_ATLAS.md` | Every visible resource/drop/shop/backpack icon has a named verified mapping or an explicit placeholder label. |
| 58 | Mechanism usability V2 | Levers/gates/traps are mechanically useful only if the player can understand links and current state. | `rpg.tsx`, `SanctuaryObject.tsx`, `sanctuaryInteractions.ts`, `RpgObjectCatalog.ts` | A player can place a lever and nearby gate/trap, trigger it, and understand what changed without debug boxes. |
| 59 | Shop/backpack visual density pass | The device UI needs to feel like a game inventory, not a debug catalog. | `SanctuaryShop.tsx`, `RpgBackpack.tsx`, `RpgArchive.tsx`, shared item card helpers if extracted | Items are tappable, readable, lower on the book/panel where needed, and still scale across phone sizes. |
| 60 | Full asset archive expansion | The archive should become the player's content book and the developer's content map. | `RpgAssetRegistry.ts`, `RpgObjectCatalog.ts`, `RpgArchive.tsx`, validator | All asset packs are triaged into production, candidate, deprecated, or ignored groups before more gameplay uses them. |
| 61 | Farming art and seed taxonomy V2 | Farming needs correct seed/crop/produce identity before balancing growth or rewards. | `garden.ts`, `RpgObjectCatalog.ts`, `RpgAssetRegistry.ts`, `rpg.tsx` | Planting, growth, harvest, backpack, and archive show crop-specific art and names. |
| 62 | Build/editor UX V3 | Placement should stay direct, tactile, and predictable. | `rpg.tsx`, `SanctuaryObject.tsx`, placement helpers if extracted | Drag placement never requires walking, invalid cells are clear, stash/move remain edit-only, and avatar/object collision stays authoritative. |
| 63 | Dungeon/sanctuary object split | Cozy sanctuary objects and risky dungeon props need separate rules before combat expands. | Catalog tags, interaction handlers, zone state, dungeon map data | Sanctuary stays safe/decorative; dungeon hazards, chests, locks, and combat props can evolve without leaking rules into sanctuary. |
| 64 | Economy balance and crafting foundations | Rewards need sinks before the catalog becomes too large. | Inventory DB helpers, shop pricing, reward tables, future processor tables | Prices, drops, chest rewards, Water Drops, and crafting candidates have a coherent tuning model. |
| 65 | Performance and save-state hardening | Content volume is rising; the runtime needs protection before more animation and AI. | `rpg.tsx`, DB helpers, migration scripts, validator/perf notes | No per-frame DB/catalog work, writes are transactional, migrations are simulated, and device performance has a profiling baseline. |

## Current Device Feedback Queue

This queue records the latest player-facing issues and preferences that should shape the next passes.

| Issue | Current decision | Planned phase |
| --- | --- | --- |
| Normal target highlights and large footprint boxes felt like debug visuals. | Keep target outline/grid code disabled in normal mode; item name prompt is enough. Placement/build mode can still show green/red cells. | 54 done, continue guarding in 75 |
| Some icons are still visually wrong or confusing. | Treat every wrong icon as an asset-mapping bug, not cosmetic noise. Use verified atlas entries or explicit placeholders only. | 71 |
| Levers or mechanism props are hard to see/understand on device. | Improve shop/backpack visibility, world labels, mechanism hints, and link/state feedback without adding normal buttons. | 72 |
| Shop/backpack/archive panels can sit too high or show tiny assets. | Tune rows, card scale, image containment, labels, and tap surfaces on real phone dimensions. | 73 |
| Farming and seed art is still partly placeholder. | Build a crop taxonomy before adding more farm balance so seeds, plants, harvest produce, archive entries, and backpack icons agree. | 74 |
| Placement should feel like Clash-style direct manipulation. | Backpack item placement should allow direct drag/preview from UI, show red/green footprint cells, and not require walking first. | 75 |
| Build move/stash controls should not be persistent. | Move and stash remain edit-only/context-only after long press or build drag state. Normal mode stays `Interact` and `Attack`. | 75 |
| Trees, props, clutter, avatar, crops, and future animals must share one occupancy model. | Collision, placement, and movement must read object footprints from catalog metadata and refresh together when objects move/delete/place. | 75 and 80 |
| Animal assets exist but are not yet production-mapped. | First four livestock are mapped through registry/catalog/archive/shop/backpack/validator. Remaining animal pack expansion is deferred. | 70 done, continue in 76 |

## Post-Crafting Development Phases

These are the recommended next phases after Phase 68. They supersede older loose chat plans but preserve their intent.

### Phase 70: Farm Animals V1

Goal: add the first cozy livestock loop without destabilizing movement, placement, or inventory.

Deliverables:

- Map verified animal sprite sources in `RpgAssetRegistry.ts`.
- Add an `Animals` source-pack/category path through catalog, shop, backpack, and archive.
- Add a small initial set of placeable animals such as Chick, Piglet, Sheep, and Calf.
- Give each animal a 1x1 collision footprint unless a verified sprite needs a larger footprint.
- Add `Interact` rewards with cooldown feedback: eggs, wool, milk, truffles, or explicit placeholder produce.
- Add animal-product resources to inventory/archive with honest placeholder labels if no verified product icon exists.
- Extend `validate-rpg-content.js` so animals cannot be added without registry/catalog/source validation.

Acceptance target:

- A player can buy or craft/place an animal, walk around it, interact with it, receive a readable reward/cooldown response, and see the animal/product in the archive/backpack.

Negative guarantees:

- Animals must not be animated or rewarded through per-frame database work.
- Animals must not bypass placement collision, avatar blocking, stash/move cleanup, or catalog footprint rules.
- Product icons must not use mystery assets unless visually verified and logged in `RPG_ASSET_ATLAS.md`.

### Phase 71: Icon QA And Semantic Asset Cleanup V2

Goal: remove remaining visual-trust breaks caused by incorrect icons.

Deliverables:

- Audit every visible resource, produce, tool, mechanism, seed, crop, animal, and craft output icon.
- Update `RPG_ASSET_ATLAS.md` with verified production frames and placeholder decisions.
- Replace wrong icons in `RpgObjectCatalog.ts` and `RpgAssetRegistry.ts`.
- Add validator checks for known important semantic IDs.

Acceptance target:

- Shop, backpack, archive, HUD, crafting, forage drops, and interaction rewards never show obviously unrelated art such as a worm-like leaf icon.

### Phase 72: Mechanism Usability V2

Goal: make levers, gates, traps, and state changes understandable without debug overlays.

Deliverables:

- Improve mechanism shop cards and backpack cards so tiny lever art is visible.
- Add concise mechanism state text in prompts/toasts/details.
- Show linked mechanism effects through subtle state changes, labels, or action feedback.
- Keep target outlines disabled in normal mode.
- Preserve lever/gate/trap persistence and collision behavior.

Acceptance target:

- A player can place a lever near a gate or trap, press `Interact`, and understand what changed.

### Phase 73: Shop, Backpack, And Archive Density V2

Goal: make the panels feel like game UI on phone, not debug lists.

Deliverables:

- Lower archive/book item rows if they sit too high on the page art.
- Tune card height, icon containment, label truncation, and selected details.
- Improve empty states and result counts without cluttering the screen.
- Keep touch targets comfortable and reliable on device.

Acceptance target:

- Shop items are visible and tappable, backpack inventory is readable, and archive rows sit naturally on the book art.

### Phase 74: Farming Art And Seed Taxonomy V2

Goal: make farming identity coherent before adding deeper balance.

Deliverables:

- Define crop IDs, seed IDs, stage art, harvest produce, growth duration, and water/season rules in one catalog path.
- Replace generic crop placeholders where verified crop art exists.
- Add archive/backpack facts for growth stage, produce, and seed source.
- Keep old saves compatible with existing planted crop IDs.

Acceptance target:

- Planting, growing, watering, harvesting, inventory, and archive entries all agree on the crop identity and art.

### Phase 75: Build/Editor UX V3

Goal: rebuild placement around direct manipulation and clear footprint feedback.

Deliverables:

- Let backpack placement start a direct drag/preview flow without requiring the avatar to walk to the target first.
- Show Clash-style green/red placement cells during drag.
- Keep move/stash controls visible only in edit state.
- Keep normal mode limited to `Interact` and `Attack`.
- Ensure avatar, objects, crops, clutter, and animals all contribute to placement blocking.
- Clamp zoom/pan and keep avatar/object scale inside the same world transform.

Acceptance target:

- A player can drag an item from inventory, see if it fits, drop it, move it, or stash it without trapping the avatar or desyncing collision.

### Phase 76: Full Asset Archive Expansion

Goal: turn the archive into both a player collection book and a developer content map.

Deliverables:

- Classify every asset pack as production, candidate, deprecated, or ignored.
- Map production assets through registry/catalog/archive/shop/backpack/validator.
- Add archive source filters for new packs only after asset quality is verified.
- Keep animation sheets framed rather than rendering whole strips.

Acceptance target:

- Every player-visible asset has a known source, category, and archive entry; every unused asset has a documented reason.

### Phase 77: Dungeon/Sanctuary Object Split

Goal: prevent cozy sanctuary rules and dungeon hazard rules from contaminating each other.

Deliverables:

- Add catalog tags or zone rules that separate safe decor, farm objects, mechanisms, hazards, loot, and combat props.
- Restrict risky props from sanctuary-only flows when needed.
- Keep shared rendering/footprint metadata but separate interaction semantics.

Acceptance target:

- Sanctuary remains decorative/cozy while dungeon objects can become dangerous, lockable, lootable, or combat-aware.

### Phase 78: Economy Balance And Crafting Foundations V2

Goal: make resources, drops, purchases, and recipes feel intentionally tuned.

Deliverables:

- Establish resource tiers and expected earning rates.
- Tune shop prices against forage, crop, animal, and crafting loops.
- Expand recipes only after ingredient sources and sinks are clear.
- Prepare station-gated processors without forcing a migration too early.

Acceptance target:

- Players have obvious reasons to gather, farm, interact, craft, and buy without one loop making all others pointless.

### Phase 79: Seasons, Weather, And Daily Loop V2

Goal: move from sandbox features toward a cozy daily-life rhythm.

Deliverables:

- Define season state, day/night hooks, rain effects, and growth modifiers.
- Connect streak/weather bonuses to farming without making them mandatory.
- Decide if clutter regrowth, animal yield, and crop growth reset daily or timer-based.

Acceptance target:

- Weather and seasons influence the farm visibly and mechanically while staying understandable.

### Phase 80: Performance And Save-State Hardening V2

Goal: protect the game from jank and persistence bugs as content grows.

Deliverables:

- Profile map render, movement, placement drag, zoom/pan, inventory overlays, and archive filtering.
- Confirm no per-frame SQLite writes, catalog rebuilds, or asset scans.
- Audit transactions for placement, stash, craft, harvest, animal collection, and clearing.
- Simulate migrations and recovery paths for old saves.

Acceptance target:

- The RPG remains smooth on device and survives interrupted writes, app restarts, old saves, and large catalogs.

## Logging Protocol

Use this section as the rule for every future RPG pass.

- Add one Phase Overview row before coding when the phase is substantial.
- Add a full `### Phase N Audit` block before committing.
- Record intended behavior, negative guarantees, files changed, verification evidence, manual test checklist, and expansion notes.
- Keep device-reported issues as first-class acceptance criteria, not as loose chat memory.
- Record known unverified assets as candidates or placeholders; do not imply visual correctness until checked.
- For code changes, run the fastest relevant static checks before commit. For docs-only changes, at minimum run `git diff --check` on the edited docs.
- Stage only the phase files. Leave unrelated settings, plans, and loose assets untouched unless the phase explicitly owns them.

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

### Phase 38 Audit

Intended behavior:

- Add a persisted `sanctuary_object_interactions` table keyed by object instance and interaction kind.
- Add a small helper for marking object interactions and cleaning them up when an object is stashed/deleted.
- `Interact` records `inspect` memory for placed objects before deciding whether the object is forage-capable.
- First inspection of a non-forage object shows explicit `Examined:` feedback; repeat inspections use the normal object-specific feedback.
- First inspections record RPG discovery with source `inspect`.
- Stashing a placed object deletes its interaction-memory rows in the same transaction.
- The RPG validator now enforces the table, helper, inspect recording, and stash cleanup wiring.

Negative guarantees:

- Interaction memory must not grant coins, items, chest loot, trap damage, lever links, gate toggles, puzzle state, or combat state.
- Forage-capable objects must keep their existing drop probabilities, cooldown behavior, inventory writes, and discovery source for drops.
- Stashing must not leave stale interaction rows for the deleted placed object.
- The new table must not become a second collision, placement, inventory, or archive source of truth.

Files changed:

- `app/src/db/schema.ts`
- `app/src/db/sanctuaryInteractions.ts`
- `app/src/db/rpgDiscovery.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/db/schema.ts app/src/db/sanctuaryInteractions.ts app/src/db/rpgDiscovery.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-object-memory-export`
- Passed: source inspection confirmed object inspection memory is separate from inventory, placement, collision, and chest/lever/trap reward mechanics.

Manual test checklist:

- Interact with a placed non-forage object once and confirm the toast starts with `Examined:`.
- Interact with the same object again and confirm the normal tag-specific feedback appears.
- Interact with a forage-capable tree/crystal/bush and confirm drops/cooldowns still work normally.
- Long-press/stash an inspected object, place it again, and confirm the old placed-object interaction memory was cleared.
- Confirm no new normal-mode buttons appear beyond `Interact` and `Attack`.

Expansion notes saved:

- Use `interaction_kind` values for future `open_chest`, `toggle_lever`, `disable_trap`, and `read_lore` mechanics.
- Add object relation tables before lever/gate/trap links so linked mechanics do not depend on names or screen position.
- Add chest loot only after economy balance decides whether rewards are per object instance, per item type, or time-gated.

Phase 38 status:

- Verified.

### Phase 39 Audit

Intended behavior:

- Temple chest catalog entries now define explicit interaction loot metadata.
- Chest rewards use stable `sanctuary_chest:{itemId}` claim keys so rewards are once per chest type, not once per placement.
- `Interact` on an unclaimed chest grants coins plus rolled loot drops through an atomic DB helper.
- Claimed chests show `Chest is empty` and do not grant repeat coins/items.
- Reward drops record RPG discovery with source `loot`.
- Archive facts expose once-only interaction loot for placeable items that define it.
- The RPG validator enforces the reward claim table, helper, catalog metadata, and screen wiring.

Negative guarantees:

- Stashing/re-placing the same chest type must not reset the reward claim.
- Chest rewards must not use object instance IDs as the only anti-repeat protection.
- Chest rewards must not affect tree/crystal/bush forage probabilities or cooldowns.
- Chest rewards must not add new normal-mode buttons, trap damage, lever links, gate toggles, or puzzle state.
- Failed/already-claimed reward claims must not partially grant coins or inventory.

Files changed:

- `app/src/db/schema.ts`
- `app/src/db/sanctuaryRewards.ts`
- `app/src/db/rpgDiscovery.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --cached --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-safe-chest-export`
- Passed: source inspection confirmed reward claims are keyed by stable chest item type and granted in one transaction.

Manual test checklist:

- Place a Temple Wooden Chest, interact, and confirm coins plus possible Crystal Shards are granted once.
- Interact with the same chest again and confirm `Chest is empty`.
- Stash and re-place the same chest type, interact again, and confirm `Chest is empty`.
- Place the Animated Temple Chest and confirm it has its own one-time reward.
- Confirm forage objects still drop/cool down normally and normal mode still only shows `Interact` and `Attack`.

Expansion notes saved:

- Add per-instance chest rewards only after inventory supports durable object instance IDs.
- Add chest rarity tables and biome-specific loot after economy balance is designed.
- Add chest opening animation states after the renderer can freeze an animation on a terminal frame.

Phase 39 status:

- Verified.

### Phase 40 Audit

Intended behavior:

- `Interact` on a temple floor lever now toggles it on/off using persisted object interaction memory.
- Lever state derives from `toggle_lever` interaction count parity.
- Toggle feedback alternates between `Lever switched on` and `Lever switched off`.
- Lever toggles still also record normal inspect discovery through the shared object interaction path.
- The RPG validator enforces the new interaction kind, lever detection, persisted toggle call, parity state, and toast feedback.

Negative guarantees:

- Lever toggles must not move gates, disable traps, open chests, grant loot, damage the avatar, mutate object placement, or add puzzle links.
- Lever toggles must not add a new normal-mode button; all behavior remains behind `Interact`.
- Lever toggles must not alter object type, collision footprints, placement state, inventory, or reward claims.
- Stashing a lever must still clean its interaction memory through the existing stash cleanup path.

Files changed:

- `app/src/db/sanctuaryInteractions.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --cached --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-lever-toggle-export`
- Passed: source inspection confirmed lever toggles only write interaction memory and do not mutate placement, reward, trap, or gate state.

Manual test checklist:

- Place a Temple Floor Lever and interact once; confirm `Lever switched on`.
- Interact with the same lever again; confirm `Lever switched off`.
- Stash and re-place that lever; confirm toggle memory resets for the new placed object.
- Confirm lattice gates and traps are not affected by lever toggles.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Add object relation tables before lever/gate/trap links.
- Add visual lever on/off frames if the asset sheet has verified alternate states and renderer support for stateful frames.
- Add puzzle-side effects only after safe-path, gate-blocking, and trap-disable rules are designed.

Phase 40 status:

- Verified.

### Phase 41 Audit

Intended behavior:

- `Interact` on temple trap/hazard props toggles a persisted `disable_trap` interaction count.
- Trap state derives from `disable_trap` count parity.
- Trap feedback alternates between `Trap disarmed` and `Trap re-armed`.
- Trap interactions still record normal inspect discovery through the shared object interaction path.
- The RPG validator enforces the new interaction kind, trap detection, persisted disable call, and disarm/re-arm feedback.

Negative guarantees:

- Trap disable feedback must not damage the avatar, heal the avatar, change HP, mutate collision, mutate object placement, grant loot, or link to levers/gates.
- Trap feedback must not add any normal-mode buttons beyond `Interact` and `Attack`.
- Trap feedback must not affect chest rewards, forage drops, crop growth, gate state, or lever state.
- Stashing a trap must still clean its interaction memory through the existing stash cleanup path.

Files changed:

- `app/src/db/sanctuaryInteractions.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --cached --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-trap-disable-export`
- Passed: source inspection confirmed trap feedback only writes interaction memory and does not mutate health, collision, rewards, gates, or placement.

Manual test checklist:

- Place a Temple Spike Trap and interact once; confirm `Trap disarmed`.
- Interact with the same trap again; confirm `Trap re-armed`.
- Repeat on the Temple Blade Trap and confirm the same feedback loop.
- Confirm walking collision remains based on the trap footprint even while disarmed.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Add actual trap damage only after health, invulnerability, and cooldown windows are designed.
- Add collision/passability changes only after safe-path and map-authoring rules can prevent soft locks.
- Link lever-disarm behavior only after an object relation table exists.

Phase 41 status:

- Verified.

### Phase 42 Audit

Intended behavior:

- Add a persisted `sanctuary_object_relations` table that can link one placed object to another placed object by relation kind.
- Support typed future relation kinds for `lever_opens_gate` and `lever_disarms_trap`.
- Reject self-links at the helper layer so one placed object cannot target itself.
- Upsert relation rows by source object, target object, and relation kind instead of creating duplicates.
- Clean all source and target relation rows when a placed object is stashed.
- The RPG validator enforces schema shape, typed helpers, self-link rejection, upsert semantics, cleanup, and no runtime side effects.

Negative guarantees:

- Relation persistence must not make levers open gates, disarm traps, mutate collision, mutate object placement, damage/heal the avatar, grant loot, or add new normal-mode controls.
- Relation cleanup must not block the existing interaction-memory cleanup or stash inventory return transaction.
- Relation helpers must not interpolate object ids or item ids into SQL strings.
- Relation rows must not be keyed by item type alone; they must be tied to placed object ids so moving or replacing objects keeps links explicit.

Files changed:

- `app/src/db/schema.ts`
- `app/src/db/sanctuaryObjectRelations.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-object-relations-export`
- Passed: source inspection confirmed relation helpers only write/read/delete relation rows and do not mutate health, collision, placement, inventory, rewards, or lever/trap behavior.

Manual test checklist:

- Stash a placed lever; confirm no crash and inventory return still works.
- Stash a placed gate or trap; confirm no crash and map refresh still works.
- Confirm lever and trap interactions still only show feedback and do not affect gates, traps, collision, HP, or loot.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Build an authoring flow later that lets the user select a lever, choose a nearby gate/trap target, and create a relation row.
- Only apply relation side effects after safe-path, locked-gate, trap-cooldown, and visual state rules exist.
- Consider target lookup helpers once reverse relation gameplay becomes real.

Phase 42 status:

- Verified.

### Phase 43 Audit

Intended behavior:

- `Interact` on gate-tagged props records a persisted `rattle_gate` interaction count.
- Gate feedback alternates between `Gate rattles` and `Gate stays locked`.
- The same path covers temple and cave gates because both are catalog-tagged as `gate`.
- The RPG validator enforces the new interaction kind, gate detection, persisted rattle call, locked feedback, and no open/collision side effects.

Negative guarantees:

- Gate rattling must not open gates, close gates, mutate collision, mutate object placement, mutate relation rows, damage/heal the avatar, grant loot, or link to levers.
- Gate feedback must not add any normal-mode buttons beyond `Interact` and `Attack`.
- Gate feedback must not interfere with chest rewards, trap disarming feedback, lever toggles, forage drops, crop growth, or inventory.
- Stashing a gate must still clean interaction memory and object relation rows through existing stash cleanup.

Files changed:

- `app/src/db/sanctuaryInteractions.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-gate-rattle-export`
- Passed: source inspection confirmed gate feedback only writes interaction memory and does not mutate collision, placement, relation rows, health, inventory, rewards, or lever/trap behavior.

Manual test checklist:

- Place a Temple Lattice Gate and interact once; confirm `Gate rattles`.
- Interact with the same gate again; confirm `Gate stays locked`.
- Place any cave gate and confirm the same feedback loop.
- Confirm walking collision remains based on the gate footprint after both interactions.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Gate opening requires relation rows, safe-path validation, stateful gate visuals, and movement-collision state rules.
- Add actual open/closed frame variants only after verifying the lattice sheet frame coordinates.
- Relation-driven lever gates should use placed object ids, not item ids, to avoid accidental global gate toggles.

Phase 43 status:

- Verified.

### Phase 44 Audit

Intended behavior:

- Normal mode shows a compact prompt for the current object, crop, or portal targeted by the avatar's facing direction.
- The `Interact` button consumes the same target resolution model as the prompt.
- Targeted placed objects receive a subtle visual highlight.
- Targeted crop plots receive a subtle border highlight.
- Prompt updates on tile changes through a tile-change bridge and does not write to SQLite from the frame loop.

Negative guarantees:

- The prompt must not add a third normal-mode action button.
- The prompt must not change movement, collision, placement, zoom, object persistence, crop persistence, rewards, inventory, or relation rows.
- The frame loop must not perform SQLite work, catalog discovery, asset loading, or React state updates when the target tile has not changed.
- Build mode must hide the prompt and keep existing placement controls.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/SanctuaryObject.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-interaction-target-export`
- Passed: source inspection confirmed the frame loop only computes facing tile changes and does not perform SQLite work or update React state unless the target tile changes.

Manual test checklist:

- Face a tree, gate, trap, lever, chest, crop, and portal; confirm the prompt label changes to that target.
- Move between empty tiles; confirm the prompt disappears.
- Long-press an object to enter edit mode; confirm the prompt hides and stash/cancel are the only contextual edit controls.
- Confirm Interact still performs the targeted object/crop/portal action.
- Confirm normal mode still only exposes `Interact` and `Attack`.

Expansion notes saved:

- Add a world-space target reticle later if mobile visual density still needs stronger feedback.
- Move target resolution into a reusable engine module once NPCs, pets, or tools also need it.
- Keep all targetable gameplay tied to tile/footprint metadata rather than sprite bounds.

Phase 44 status:

- Verified.

### Phase 45 Audit

Intended behavior:

- The current interaction target model carries world-space reticle cells.
- Normal mode renders a lightweight reticle over the exact target tile or object footprint.
- Object targets highlight their full collision footprint, not just the sprite center or the single faced tile.
- Crop and portal targets highlight their single target tile.
- The reticle shares the same world transform as map tiles, objects, crops, and avatar.

Negative guarantees:

- The reticle must not add controls, mutate gameplay state, affect collision, affect placement validity, change persistence, or change interaction outcomes.
- The reticle must not render in build mode, where placement cells already own grid feedback.
- The reticle must not be computed from sprite bounds; it must come from tile footprints.
- The frame loop must not perform any extra SQLite or asset work for the reticle.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-interaction-reticle-export`
- Passed: source inspection confirmed reticle cells come from the interaction target model, render inside the world transform, and do not add persistence or gameplay side effects.

Manual test checklist:

- Face a one-tile tree/prop and confirm one target cell appears.
- Face a multi-tile object and confirm every blocked footprint cell is highlighted.
- Face a crop plot and confirm one crop tile is highlighted.
- Face a portal and confirm one portal tile is highlighted.
- Enter build/edit mode and confirm reticle disappears while placement cells remain.

Expansion notes saved:

- If this feels too visually busy on-device, reduce opacity or show only the footprint border.
- Reuse target cells for future tool swings, NPC clicks, and controller focus.
- Add accessibility haptics only after the visual interaction path is stable.

Phase 45 status:

- Verified.

### Phase 46 Audit

Intended behavior:

- The primary bottom action button is always labeled `Interact`.
- The secondary bottom action button is always labeled `Attack`.
- Build mode continues to use the Interact button to confirm placement.
- Build mode keeps Attack visible but disabled, preserving the two-button control surface.
- The RPG validator enforces the stable action button label protocol.

Negative guarantees:

- Build mode must not rename the primary action button to `Place`.
- This phase must not alter placement validity, target reticles, movement, collision, persistence, economy, shop, backpack, archive, or object interactions.
- This phase must not add any new normal-mode action button.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-action-labels-export`
- Passed: source inspection confirmed the bottom action buttons remain `Interact` and `Attack`, with Attack still disabled in build mode.

Manual test checklist:

- Enter normal mode; confirm bottom buttons read `Interact` and `Attack`.
- Start placing an object from the backpack; confirm bottom buttons still read `Interact` and `Attack`.
- Confirm Interact still confirms valid placement.
- Confirm Attack remains disabled while build mode is active.

Expansion notes saved:

- Future tools should appear as contextual state around Interact, not as extra permanent buttons.
- If controller support is added, map confirm/cancel/tool inputs onto the same action protocol.

Phase 46 status:

- Verified.

### Phase 47 Audit

Intended behavior:

- Pressing `Interact` on an empty sanctuary target shows a muted `Nothing here` toast.
- Pressing `Interact` on an empty dungeon target shows a muted `Nothing nearby` toast.
- Empty interaction feedback is throttled so repeated taps do not continuously reset feedback.
- Object, crop, portal, build placement, and chest/forage interactions continue to use their existing specific feedback paths.
- The RPG validator enforces visible empty interaction feedback and rejects console-only empty interaction paths.

Negative guarantees:

- Empty interaction feedback must not add buttons, mutate movement, mutate collision, change target prompts, change reticles, change inventory, change coins, write SQLite, or affect build mode.
- Empty interaction feedback must not fire when a real object, crop, portal, placement, reward, or forage action handles the Interact press.
- Empty interaction feedback must not spam every frame; it only runs on Interact button presses.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-empty-interact-export`
- Passed: source inspection confirmed empty Interact paths now route through a throttled visible toast and do not write SQLite or change gameplay state.

Manual test checklist:

- Face an empty sanctuary tile and tap Interact; confirm `Nothing here`.
- Face an empty dungeon tile and tap Interact; confirm `Nothing nearby`.
- Tap Interact repeatedly on empty space; confirm feedback does not feel spammy.
- Face an object/crop/portal and tap Interact; confirm the specific action still wins over empty feedback.
- Enter build mode and confirm Interact still confirms placement rather than showing empty feedback.

Expansion notes saved:

- Add a tiny haptic later if mobile testing shows empty Interact needs tactile feedback.
- Keep empty feedback muted; it is a comfort cue, not an error.

Phase 47 status:

- Verified.

### Phase 48 Audit

Intended behavior:

- Successfully placing an object from the backpack shows `Placed {item}` feedback with item art.
- Successfully moving an existing object shows `Moved {item}` feedback with item art.
- Attempting to place an inventory item whose quantity is gone shows `No item left`.
- Seed planting keeps its existing crop-specific feedback path.
- The RPG validator enforces feedback for object placement, object movement, and missing inventory placement.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, inventory arithmetic, item prices, crop planting, object relations, or build controls.
- Placement feedback must not run before the relevant persistence action succeeds.
- Missing inventory feedback must only appear after the transactional quantity decrement fails.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-build-feedback-export`
- Passed: source inspection confirmed feedback appears after successful object move/place persistence and after failed transactional inventory decrement.

Manual test checklist:

- Place an object from the backpack; confirm `Placed {item}` feedback appears.
- Long-press and move an existing object; confirm `Moved {item}` feedback appears.
- Try to place an object after its quantity is exhausted; confirm `No item left`.
- Plant a seed; confirm the crop-specific planted feedback still appears.
- Confirm placement validity and red/green footprint cells are unchanged.

Expansion notes saved:

- Add sound/haptics for placement only after the visual feedback is stable.
- Consider a subtle object pulse on successful placement/move later.

Phase 48 status:

- Verified.

### Phase 49 Audit

Intended behavior:

- Pressing `Attack` in normal mode always gives visible feedback.
- Striking a placed object pulses that object and shows `Struck {target}` feedback with the object's item art.
- Striking a crop warns `Careful: crop` without harvesting, damaging, or deleting the plot.
- Striking a portal shows muted feedback instead of silently doing nothing.
- Striking empty space shows muted `Swing` feedback.
- `Attack` is truly disabled in build mode and exposes that disabled state to accessibility.

Negative guarantees:

- This phase must not add HP damage, enemy state, crop damage, object deletion, reward drops, combat persistence, movement changes, collision changes, or placement changes.
- Attack feedback must reuse the same target resolver as Interact so prompts, reticles, and button effects do not drift apart.
- Attack feedback must not perform database writes or catalog mutation.
- Build mode must keep Interact as the placement confirm path and Attack as unavailable.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Face empty ground and tap Attack; confirm `Swing` feedback and attack animation.
- Face a placed object and tap Attack; confirm the object pulses and feedback says `Struck {object}`.
- Face a crop and tap Attack; confirm warning feedback and the crop remains intact.
- Face a portal and tap Attack; confirm muted portal feedback and no zone transition.
- Enter build mode; confirm Attack is disabled and Interact still confirms placement.

Expansion notes saved:

- Later combat should add enemies and hit boxes as a separate system, not by overloading object interaction feedback.
- If mobile testing shows toast spam during repeated attacks, add a tiny attack-feedback cooldown separate from the attack animation lockout.

Phase 49 status:

- Verified.

### Phase 50 Audit

Intended behavior:

- The current facing tile and resolved target are represented as one `ResolvedInteractionTarget` packet.
- Prompt refresh, Interact, and Attack use the same current-target helper instead of parallel target resolution.
- Pressing Attack or Interact syncs the visible prompt to the same target packet the action consumes.
- Existing object, crop, portal, empty Interact, and Attack feedback behavior remains unchanged.
- The RPG validator enforces the shared action target protocol.

Negative guarantees:

- This phase must not change movement, collision, placement, shop, backpack, archive, farming math, loot drops, attack stats, or persistence.
- This phase must not move target resolution into the Reanimated frame loop or add SQLite work to frame callbacks.
- This phase must not add new permanent action buttons.
- This phase must not resolve a second divergent Interact target inside the button handler.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Face a placed object; confirm the prompt names it, Interact inspects/forages it, and Attack strikes the same object.
- Face a crop; confirm prompt, Interact, and Attack agree on the crop tile.
- Face a portal; confirm Interact transitions zones while Attack only gives portal feedback.
- Face empty ground; confirm Interact and Attack show their empty feedback paths.
- Enter build mode; confirm prompt reticle hides and Interact still confirms placement.

Expansion notes saved:

- If controller or keyboard input is added, route those inputs through `resolveCurrentInteractionTarget`.
- Future enemies should become another `InteractionTargetKind` rather than a separate combat-only targeting model.

Phase 50 status:

- Verified.

### Phase 51 Audit

Intended behavior:

- Core RPG controls expose clear accessibility roles and labels without adding visible controls.
- Zone tabs expose selected state for sanctuary/dungeon.
- Interact describes build confirmation, current target interaction, or default interaction depending on state.
- Attack describes its current target and clearly reports that it is unavailable while building.
- Edit-mode Stash/Cancel and the RPG back button are labeled clearly.
- The RPG validator enforces the core action-control clarity contract.

Negative guarantees:

- This phase must not change button placement, visible labels, gameplay behavior, collision, placement math, inventory, economy, target resolution, or persistence.
- This phase must not add new permanent buttons or expose build-only controls outside build/edit state.
- Accessibility hints must describe existing behavior, not promise unimplemented mechanics.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/db/sanctuaryInteractions.ts app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryObject.tsx app/scripts/validate-rpg-content.js`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-mechanics-export`

Manual test checklist:

- In normal mode, confirm visible buttons are still only `Interact` and `Attack`.
- Face an object/crop/portal and confirm action behavior is unchanged.
- Enter build mode; confirm Interact still confirms placement and Attack is disabled.
- Long-press an object; confirm Stash and Cancel remain edit-only.
- With VoiceOver/manual inspection, confirm labels describe the current target or state.

Expansion notes saved:

- If controller support is added, mirror these labels into an input-hint model.
- Add haptics later only after the visual and accessibility feedback loops are settled.

Phase 51 status:

- Verified.

### Phase 52 Audit

Intended behavior:

- `Leaves` use the verified loose green leaf frame from the farm supplies sheet.
- Tree, bush/fern/flower, and crystal forage feedback names the source action.
- Empty forage rolls are source-aware instead of all saying the same generic text.
- Drop toasts still show the actual dropped item icon and add the item to inventory through the existing inventory/discovery path.
- The RPG validator enforces the new resource-node feedback contract.

Negative guarantees:

- This phase must not change forage drop probabilities, quantities, cooldown duration, item IDs, inventory arithmetic, shop prices, placement rules, or crop harvest math.
- Tree-specific seed drops must remain limited to trees with mapped seed items.
- Resource feedback must not invent drops when the forage roll fails.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgAssetRegistry.ts`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/db/sanctuaryInteractions.ts app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryObject.tsx app/scripts/validate-rpg-content.js`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-mechanics-export`

Manual test checklist:

- Interact with a tree; confirm success says `Shook tree` or failure says `No seed fell`.
- Interact with a bush/fern/flower; confirm success says `Foraged brush`.
- Interact with a crystal; confirm success says `Chipped crystal`.
- Confirm Leaves show as a green leaf icon in the toast/backpack/archive.
- Confirm drop quantities and cooldowns feel unchanged.

Expansion notes saved:

- Later add tiny resource pickup particles/sound once icons and copy are stable.
- If more resource types are added, move source-aware forage copy into catalog metadata.

Phase 52 status:

- Verified.

### Phase 53 Audit

Intended behavior:

- Interacting with a lever auto-links it to the nearest gate and nearest trap if it has no relation of that kind yet.
- Lever links persist in `sanctuary_object_relations`.
- Toggling a linked lever opens/closes linked gates and disarms/re-arms linked traps through persisted interaction state.
- Open gates and disabled traps are removed from movement collision.
- Open gates and disabled traps render with a muted/green inactive visual state.
- Direct trap interaction still disarms/re-arms and refreshes collision.
- Direct gate interaction reports `Gate is open` when lever state has opened it, otherwise it keeps locked/rattle feedback.
- The RPG validator enforces the linked mechanism contract.

Negative guarantees:

- This phase must not add HP damage, enemies, puzzle failure states, extra action buttons, non-transactional inventory writes, placement rule changes, shop changes, or crop changes.
- Lever auto-linking must not link an object to itself.
- Open/disabled state must come from persisted object interaction state, not transient React-only state.
- Placement collision must still treat existing placed objects as occupied; passability only affects avatar movement.

Files changed:

- `app/app/rpg.tsx`
- `app/src/db/sanctuaryInteractions.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/SanctuaryObject.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/db/sanctuaryInteractions.ts app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryObject.tsx app/scripts/validate-rpg-content.js`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-mechanics-export`

Manual test checklist:

- Place a lever and gate; interact with the lever and confirm the gate opens visually and becomes walkable.
- Interact with the lever again and confirm the gate closes and blocks movement.
- Place a lever and trap; interact with the lever and confirm the trap becomes visibly safe and walkable.
- Interact directly with a trap; confirm it toggles safe/armed and collision updates.
- Stash a linked object; confirm relation cleanup still prevents stale links.

Expansion notes saved:

- Later add explicit link-edit UI instead of nearest-object auto-linking.
- Later add gate open/closed animation frames if the asset sheet has a clean alternate state.
- Later make traps damage or slow the avatar only after the movement/collision contract is proven.

Phase 53 status:

- Verified.

### Phase 54 Audit

Intended behavior:

- Normal gameplay no longer renders object outline highlights when the avatar faces an item.
- Normal gameplay no longer renders the large target footprint/grid box around faced objects or crops.
- The interaction prompt/name pop-up remains visible and continues to describe the current target.
- Build/edit placement keeps its placement footprint cells visible.
- The reticle/highlight code and styles remain in place behind `SHOW_NORMAL_TARGET_DEBUG = false` for future debug use.
- The RPG validator enforces that normal target debug visuals stay disabled.

Negative guarantees:

- This phase must not delete the target model, prompt, action target resolver, placement grid, build/edit placement feedback, collision, object mechanics, interaction behavior, inventory, shop, archive, or persistence.
- This phase must not remove debug code entirely; it only disables normal-mode rendering.
- This phase must not make Interact/Attack ambiguous; the target name prompt remains the player-facing cue.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Walk near/facing an object; confirm only the name/detail prompt appears, with no object outline and no grid box.
- Face a crop; confirm no crop outline/grid box in normal mode.
- Start placing or moving an item; confirm placement footprint cells still appear.
- Interact and Attack should still use the same current target as the prompt.

Expansion notes saved:

- If a future debug menu exists, it can flip `SHOW_NORMAL_TARGET_DEBUG` rather than reintroducing visual code.
- If player feedback feels too hidden later, prefer a softer prompt treatment over world-space grid overlays.

Phase 54 status:

- Verified.

### Phase 55 Audit

Intended behavior:

- Shop exposes a direct `Mechanisms` category so levers, gates, traps, hazards, and mechanism props are findable without paging through the full catalog.
- Mechanism filter sorts levers first, gates second, traps third, then generic mechanisms.
- Selected mechanism items show a one-line behavior hint in the shop detail panel.
- Archive/backpack item facts explain lever, gate, and trap mechanics.
- Inventory/shop item icons prefer explicit curated `icon` frames before animation playback, reducing weird first-frame icons.
- World art can still animate through `RpgItemWorldArt`; only compact icons are stabilized.

Negative guarantees:

- This phase must not change mechanism persistence, lever linking, collision, placement, shop purchasing logic, prices, inventory arithmetic, source filters, or catalog item IDs.
- This phase must not remove Temple source filtering; it adds a category filter on top of existing source filters.
- This phase must not make animated world props static.

Files changed:

- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgItemIcon.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/src/engine/SanctuaryShop.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgItemIcon.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Shop and tap `Mechanisms`; confirm lever, gate, and trap items are visible immediately.
- Confirm the lever appears before gate/trap items in the mechanism filter.
- Select the lever/gate/trap and confirm the detail panel explains its behavior.
- Confirm Temple source filter still works.
- Confirm animated placed props still animate in the world.

Expansion notes saved:

- Later add a small “Starter mechanism set” purchase if buying lever/gate/trap individually still feels awkward.
- Later add visual labels for tiny flat assets like floor levers inside shop cards if the icon remains too subtle on-device.

Phase 55 status:

- Verified.

### Phase 56 Audit

Intended behavior:

- The RPG ledger accurately describes itself as the authoritative plan from Phase 0 onward, not only Phase 0 through Phase 10.
- Recent shipped RPG commits are recorded in the current baseline.
- Future RPG development is logged as explicit backlog phases, not scattered only through chat or expansion notes.
- The next roadmap prioritizes device-visible polish first: wrong icons, mechanism clarity, shop/backpack readability, asset archive scale, farming art, editor UX, dungeon split, economy, and performance hardening.
- A repeatable logging protocol makes future passes easier to audit, commit, and resume.

Negative guarantees:

- This phase must not change runtime behavior, migrations, gameplay mechanics, assets, item IDs, shop prices, inventory logic, interaction handlers, or validation rules.
- Future roadmap rows must remain plans until their phases are implemented and audited.
- This documentation pass must not stage unrelated dirty settings, older planning docs, or loose untracked assets.

Files changed:

- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md`

Manual test checklist:

- Confirm Phase Overview includes Phase 56 and planned Phase 57 through Phase 65 rows.
- Confirm `Future Development Roadmap` gives the next implementation order and acceptance targets.
- Confirm `Logging Protocol` states what each future pass must record.
- Confirm no runtime files are changed by this phase.

Expansion notes saved:

- Later split this ledger into generated GitHub issues if the backlog becomes too large to scan in one markdown file.
- Later add a small script that validates every Phase Overview row has a matching audit block or is explicitly `Not started`.

Phase 56 status:

- Verified.

### Phase 66 Audit

Intended behavior:

- Add Watering Can as a real RPG starter tool using the same catalog, backpack, hotbar, and archive path as the other tools.
- Plain Interact on immature crops inspects progress; equipped Watering Can performs the deliberate in-world watering action.
- Watering uses the existing Water Drops growth hook and spends RPG MP as action energy only when the action can actually proceed.
- Shovel, Bridge Kit, Path, and Plow also spend explicit MP energy after their terrain/resource validation succeeds.
- Sanctuary HUD shows current energy, and a dedicated character/equipment panel shows avatar status, HP, energy, equipped tool, tool slots, and tool energy costs.
- Bridge, Path, and Tilled Soil render with textured view-built placeholders instead of flat color fills.

Negative guarantees:

- This phase must not add new normal-world action buttons; `Interact` and `Attack` remain the only bottom gameplay actions.
- This phase must not add a schema migration; action energy reuses existing `rpg_state.mp`.
- Failed tool validation must not spend energy or resources.
- Watering must not bypass crop occupancy, growth stage, or Water Drops checks.
- Placeholder tile art must be logged as placeholder, not claimed as verified final asset art.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/TileArt.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgAssetRegistry.ts app/src/engine/TileArt.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Confirm Watering Can appears in the hotbar, Backpack Tools filter, and character/equipment panel.
- Till grass, plant a seed, equip Watering Can, face the crop, press Interact, and confirm energy and Water Drops decrease only on successful watering.
- Press Interact on an immature crop with no tool and confirm it reports crop progress instead of spending Water Drops.
- Try each tool with invalid terrain/resources and confirm energy does not decrease.
- Open the character panel and confirm HP, energy, equipped tool, and tool slots are readable on device.
- Confirm Bridge, Path, and Tilled Soil no longer look like single flat debug colors.

Expansion notes saved:

- No verified final bridge/path/tilled-soil terrain art was found in the active runtime mapping during this pass; current versions are styled placeholders.
- A future phase should make Water Drops and MP balance less confusing, likely by naming MP as Energy in the RPG sandbox or introducing a proper daily farm-energy stat.
- A future phase should move tools out of the Backpack entirely if the desired final structure is a character/equipment inventory separate from seeds/resources.

Phase 66 status:

- Verified.

### Phase 67 Audit

Intended behavior:

- Seed a small set of sanctuary weeds, fallen twigs, and loose rocks exactly once for existing or new saves.
- Treat clutter as real `sanctuary_objects` so movement collision, z-order, interaction targeting, cleanup, and persistence use the same world model as other objects.
- Interacting with clearable clutter spends a fixed 3 MP energy, removes the clutter object, cleans interaction/relation memory, refreshes movement collision, and grants resource rewards.
- Weeds grant Leaves, twigs grant Wood, and rocks have a chance to grant Crystal Shards.
- Clearing all clutter must be permanent; starter clutter must not respawn every launch.
- The RPG validator enforces the clutter catalog, seed marker, energy cost, delete path, cleanup path, and feedback contract.

Negative guarantees:

- This phase must not add new normal-world buttons; clutter is cleared through the existing `Interact` flow.
- This phase must not add a schema migration or separate clutter table.
- Starter clutter must not spawn on portals, non-grass tiles, existing object cells, or existing garden plot cells.
- Clearing clutter must not delete unrelated player-placed objects, crops, terrain overrides, coins, or tools.
- Clutter sprites are reused verified/candidate world assets, not claimed as final dedicated weed/twig/rock art.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/engine/RpgObjectCatalog.ts app/scripts/validate-rpg-content.js`

Manual test checklist:

- Launch the sanctuary and confirm weeds/twigs/rocks appear once.
- Walk into clutter and confirm it blocks movement like a small world object.
- Face each clutter type and press Interact; confirm energy decreases, the clutter disappears, and a reward toast appears.
- Relaunch after clearing all starter clutter and confirm it does not respawn.
- Confirm existing object placement, crop planting, terrain tools, Watering Can, Backpack, Archive, Shop, Interact, and Attack still work.

Expansion notes saved:

- Later add dedicated weed/twig/rock sprites if an asset pass finds better art.
- Later add tool-specific clearing rules such as scythe for weeds, axe for twigs, and pickaxe for rocks.
- Later add regrowth/new debris events tied to storms or seasons, but only after the one-time cleanup loop is proven.

Phase 67 status:

- Verified.

### Phase 68 Audit

Intended behavior:

- Add a compact Craft HUD panel without adding new normal-world action buttons.
- Define a small V1 recipe list that turns gathered resources into placeable inventory items.
- Crafting recipes consume Wood, Leaves, and Crystal Shards so resources are useful beyond selling.
- Crafting is transactional: all ingredient decrements must succeed before output inventory is granted.
- Crafted outputs record RPG discovery, refresh inventory UI, and can be placed later through the Backpack.
- The RPG validator enforces the recipe list, HUD entry, panel rendering, guarded ingredient consumption, inventory output, discovery, disabled craft buttons, and rollback path.

Negative guarantees:

- This phase must not add a separate crafting database table or migration.
- This phase must not place crafted objects directly into the world; Backpack/build mode remains the placement path.
- This phase must not allow partial ingredient loss if output insertion fails.
- This phase must not hide or replace `Interact` and `Attack`.
- This phase must not claim final crafting balance; recipes are V1 sinks for existing resource loops.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Craft from the HUD and confirm recipe cards show output items and ingredient owned/required counts.
- With insufficient resources, confirm Craft is disabled and missing ingredients are visibly marked.
- Gather or grant enough Wood, Leaves, and Crystal Shards, craft an item, and confirm ingredients decrease and output appears in Backpack.
- Place a crafted output from Backpack and confirm normal placement rules still apply.
- Confirm Backpack, Archive, Shop, Character, Interact, Attack, Watering Can, and clutter clearing still work.

Expansion notes saved:

- Later extract recipes to a dedicated catalog/module once recipe count grows.
- Later add station-gated recipes through processors such as ovens, mills, or workbenches.
- Later add recipe unlocks through Archive discoveries, quests, or dungeon rewards.

Phase 68 status:

- Verified.

### Phase 69 Audit

Intended behavior:

- Update the RPG ledger so current device feedback and future development phases are no longer scattered through chat memory.
- Add post-crafting phases for animals, icon cleanup, mechanisms, panel density, farming art, direct placement, asset expansion, dungeon/sanctuary split, economy, seasons/weather, and performance hardening.
- Record player-facing issues as acceptance criteria, especially wrong icons, hard-to-see levers, debug-looking highlights, direct drag placement, and shared occupancy/collision rules.
- Keep the roadmap actionable without pretending planned phases are implemented.

Negative guarantees:

- This phase must not change runtime behavior, gameplay mechanics, item IDs, prices, migrations, assets, or validation rules.
- This phase must not mark future phases as complete.
- This phase must not stage unrelated dirty files or loose asset folders.

Files changed:

- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: `RPG_SANDBOX_PHASE_PLAN.md`
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The prior roadmap had become stale because Phases 66 through 68 shipped after the older Future Development Roadmap was written.
- The fix is a new current feedback queue plus explicit Phase 70 through Phase 80 sections, leaving older Phase 57 through Phase 65 rows intact as historical backlog references.
- Animal, icon, mechanism, placement, farming, and performance work are split so future passes can stop at stable commit points.

Implementation attack findings:

- Documentation-only change; no runtime code paths, DB writes, imports, or assets changed.
- Future phases are marked `Not started` with acceptance targets, not implementation evidence.
- The device feedback queue ties subjective UI complaints to concrete next-phase decisions.

Verification evidence:

- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md`

Manual test checklist:

- Confirm Phase Overview includes Phase 69 through Phase 80.
- Confirm `Current Device Feedback Queue` captures wrong icons, invisible levers, hidden normal debug outlines, direct drag placement, edit-only move/stash, and shared occupancy concerns.
- Confirm `Post-Crafting Development Phases` gives concrete deliverables and acceptance targets for future RPG work.
- Confirm no runtime files are changed by this phase.

Expansion notes saved:

- Later convert Phase 70 through Phase 80 into GitHub issues or project-board cards if planning overhead grows.
- Later add a script to enforce that every verified phase row has a matching audit block.

Phase 69 status:

- Verified.

### Phase 70 Audit

Intended behavior:

- Add a first livestock loop using tracked farm animal assets instead of leaving the animal pack unused.
- Map Chick, Piglet, Sheep, and Calf through `RpgAssetRegistry.ts`, `RpgObjectCatalog.ts`, Shop, Backpack, Archive, placement, and validation.
- Add an `Animals` source/shop path so the player can find livestock directly.
- Allow `Interact` on placed livestock to collect small animal products with cooldown feedback.
- Add Egg, Milk, Wool, and Truffle resources so products are visible in Backpack/Archive after collection.
- Log placeholder product icons honestly in `RPG_ASSET_ATLAS.md`.

Negative guarantees:

- This phase must not add normal-world action buttons; animals use the existing `Interact` flow.
- This phase must not add per-frame DB writes or autonomous animal AI.
- This phase must not bypass the existing placement/collision footprint model.
- This phase must not claim final product icons: Egg, Milk, Wool, and Truffle art remains placeholder until a dedicated icon QA pass.
- This phase must not stage the loose duplicate untracked animal asset folder; it uses the tracked `app/assets/game/...` pack.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgAssetRegistry.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/SanctuaryShop.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_ASSET_ATLAS.md`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, loose untracked duplicate asset folders.

Design attack findings:

- The animal sheets are animation strips, so runtime mapping uses framed sprite animations instead of rendering whole images.
- Animal objects are normal placeable objects with 1x1 collision footprints, preserving the shared occupancy model.
- Animal product collection is routed before generic forage handling so livestock gets animal-specific feedback and a longer cooldown.
- Product icons are intentionally placeholders because no dedicated egg/milk/wool/truffle icons were verified in the atlas during this pass.

Implementation attack findings:

- `RPG_ANIMAL_OBJECT_ASSETS` flows into `RPG_OBJECT_ASSETS`, which feeds the asset registry and object metadata path.
- `RPG_ANIMAL_OBJECT_CATALOG` flows into both `RPG_ITEM_CATALOG` and `SHOP_CATALOG`, so Archive/Backpack/Shop share the same source of truth.
- `ANIMAL_PRODUCT_COOLDOWN_MS` is memory-only for V1; product collection persists only the granted inventory/discovery result.
- Validator now checks animal assets, source filters, shop filter, product resources, placeholder asset entry, and Interact routing.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryShop.tsx`

Manual test checklist:

- Open Shop and confirm `Animals` filter shows Chick, Piglet, Sheep, and Calf.
- Buy and place each animal; confirm placement/collision behaves like a normal 1x1 object.
- Walk up to each animal and press `Interact`; confirm a product toast appears or a cooldown/resting toast appears.
- Confirm Egg, Milk, Wool, and Truffle appear in Backpack/Archive after collection.
- Confirm normal gameplay still shows only `Interact` and `Attack`.

Expansion notes saved:

- Later add dedicated product art for egg/milk/wool/truffle during Phase 71.
- Later add stable daily timers or persisted animal collection cooldowns if livestock yield becomes balance-critical.
- Later expand the rest of the animal pack through Phase 76 after each sprite sheet is framed and categorized.

Phase 70 status:

- Verified.

### Phase 71/72 Slice Audit

Intended behavior:

- Make the worst current icon/readability complaints better without waiting for a full asset QA phase.
- Wood should show a named stump placeholder instead of the generic fallback box.
- Temple Floor Lever should be easier to see in the world while still occupying only one collision tile.
- Shop, Backpack, Archive, and Crafting compact item icons should label mechanism objects so tiny lever/gate/trap art is not the only clue.
- Normal world target outlines and grid boxes remain disabled; this is not a return to debug overlays.

Negative guarantees:

- This slice must not change lever/gate/trap persistence, relation linking, collision passability, purchase logic, inventory counts, or action buttons.
- This slice must not claim all wrong icons are fixed; crop/produce/tool/animal icon QA remains planned.
- Lever collision footprint must remain 1x1 even though the visual footprint is larger.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgItemIcon.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this slice: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The floor lever was technically mapped but too small/flat in world context; increasing visual footprint improves readability without touching occupancy.
- Wood had a verified placeholder in the asset registry but the catalog did not supply that source to the item renderer, so compact UI could fall back to a generic box.
- Mechanism UI needed a player-readable cue in compact inventory/shop contexts because tiny top-down mechanism frames can be hard to parse on a phone.

Implementation attack findings:

- `RpgItemIcon` wraps only compact mechanism icons with a label badge; `RpgItemWorldArt` still renders world objects normally.
- The lever visual footprint is catalog metadata and therefore flows through existing world/ghost rendering.
- Validator guards were added for the new source mapping, lever footprint rule, and mechanism icon labels.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgItemIcon.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Shop > Mechanisms and confirm lever/gate/trap cards show readable labels.
- Buy/place Temple Floor Lever and confirm it is easier to see in-world, while still blocking/occupying a 1x1 placement cell.
- Open Backpack/Archive/Crafting where mechanism objects appear and confirm compact icons are labeled.
- Confirm normal gameplay still shows no debug target outline or large grid box.
- Confirm Wood now shows the stump placeholder rather than a generic fallback tile.

Expansion notes saved:

- Phase 71 still needs full semantic icon QA for produce, crop seeds, tools, animal products, and any remaining placeholders.
- Phase 72 still needs better lever/gate/trap link ownership feedback and possibly visible state variants, but without normal-mode debug boxes.

Phase 71/72 slice status:

- Verified.

### Phase 81 Audit

Intended behavior:

- Close the original tool-art gap where Bridge, Path, and Tilled Soil were still hand-drawn placeholder View fills.
- Render Bridge, Path, and Tilled Soil from tracked sprite frames in `Tiles_exterior.png`.
- Log the frame coordinates in `RPG_ASSET_ATLAS.md` so the terrain art is inspectable.
- Update the RPG validator to require sprite-backed terrain tool tiles.

Negative guarantees:

- This phase must not change terrain persistence, tool costs, movement passability, water blocking, crop planting rules, action buttons, or inventory logic.
- This phase must not stage loose untracked asset folders; it uses tracked assets under `app/assets/game/...`.
- This phase must not claim final farm-soil art for Tilled Soil; it is sprite-backed candidate ground art until a dedicated soil frame is verified.

Files changed:

- `app/src/engine/TileArt.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_ASSET_ATLAS.md`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The previous terrain tiles were no longer flat debug colors, but they were still manually drawn View art.
- A tracked temple exterior tile sheet contains usable terrain frames, so the fastest useful improvement is to frame that sheet rather than inventing new art.
- Bridge and Path now use true sprite frames; Tilled Soil uses a real ground/dirt candidate frame but still needs a future farm-specific soil verification pass.

Implementation attack findings:

- `frameTile` scales arbitrary source-sheet frames into the existing `TILE_SIZE`, preserving the current map/grid model.
- `BridgeTile`, `PathTile`, and `TilledTile` remain the public render components used by `rpg.tsx`, so no terrain persistence or tool code changed.
- Validator now rejects missing terrain frame constants and rejects returning to hand-drawn View fill implementations for these tool tiles.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md app/src/engine/TileArt.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Equip Bridge Kit, build a bridge on water, and confirm it shows sprite-backed plank/bridge art.
- Equip Path, place a path on grass, and confirm it shows sprite-backed path/stone art.
- Equip Plow, till grass, and confirm it shows sprite-backed ground art instead of flat brown View lines.
- Confirm terrain tool costs, energy spending, movement passability, and normal `Interact`/`Attack` controls still behave the same.

Expansion notes saved:

- Later replace Tilled Soil with a dedicated verified farm-soil frame during Phase 74.
- Later add tile variants/auto-tiling for path and bridge adjacency after direct placement UX is stronger.

Phase 81 status:

- Verified.

### Phase 82 Audit

Intended behavior:

- Resolve the inventory tension where tools were visible/equippable inside Backpack even though the desired inventory feel is seeds, resources, and placeable items.
- Keep tools as real catalog/starter items, but hide them from Backpack display and filters.
- Preserve tool equip/unequip through the hotbar and dedicated character/equipment panel.
- Remove the Backpack tool equip button path so the bag is no longer the tool-management surface.
- Add validator guards so tools do not drift back into Backpack UI accidentally.

Negative guarantees:

- This phase must not remove tools from the catalog, starter grant, hotbar, character panel, tool energy costs, or in-world tool actions.
- This phase must not change Backpack placement, planting, selling, source filters, sorting, or search for non-tool items.
- This phase must not add new normal-world action buttons; normal controls remain `Interact` and `Attack`.

Files changed:

- `app/app/rpg.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The dedicated character/equipment panel already exists and renders tool slots from `TOOLS`, so Backpack does not need to be a second equip surface.
- Hiding tools at Backpack load time keeps inventory counts, source counts, search, and pagination consistent for visible item stacks.
- Tool catalog entries remain useful for Archive/docs/starter grants even though Backpack hides them.

Implementation attack findings:

- `RpgBackpack` filters out `item.kind === 'tool'` after resolving catalog metadata.
- Backpack filters now include only All, Objects, Seeds, and Resources.
- Obsolete `equippedToolId` and `onEquipTool` props were removed from Backpack and its RPG screen call site.
- Validator now enforces the Backpack/character ownership split.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/engine/RpgBackpack.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Backpack and confirm there is no Tools filter and no tool stacks in the grid.
- Confirm objects, seeds, and resources still show, search, sort, place, plant, and sell normally.
- Open character/equipment panel and confirm tools can still be equipped/unequipped there.
- Use hotbar to equip/unequip tools and confirm in-world tool actions still work.

Expansion notes saved:

- Later decide whether tools should still appear in Archive as discoverable equipment or move to a dedicated Equipment tab.
- Later tune starter inventory migration if old saves keep tool item rows that are now intentionally hidden from Backpack.

Phase 82 status:

- Verified.

### Phase 83 Audit

Intended behavior:

- Make sanctuary weather/seasons more than cosmetic by adding season-specific harvest bonuses.
- Derive current season from the real month without adding a migration.
- Show a compact sanctuary HUD chip with current season, clear/rain state, and harvest bonus hint.
- Keep existing streak rain behavior: rain still appears from streak state and can advance immature crops without Water Drops.
- Add seasonal bonus drops to the same `harvestGardenPlot` transaction so failed harvests do not grant bonus inventory.

Negative guarantees:

- This phase must not add normal-world action buttons.
- This phase must not change crop planting, crop growth tables, Water Drops spending, rain overlay pointer events, or harvest coin values.
- This phase must not claim full calendar, forecast, season-specific crop restrictions, or day/night simulation is complete.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- Existing rain already had a real crop effect, so the higher-value gap was adding a broader season/weather loop players can read at a glance.
- Month-derived seasons avoid new persistence while still giving the farm a changing cadence.
- Harvest bonuses are resource drops rather than direct coin inflation, preserving existing crop coin tuning.

Implementation attack findings:

- `SEASON_CONFIG` centralizes labels, icons, colors, bonus drops, and player-facing hints.
- `getCurrentSeason()` derives Spring/Summer/Autumn/Winter from `Date.getMonth()`.
- Harvest merges `seasonInfo.bonus` into the drop list before `harvestGardenPlot`, keeping inventory writes transactional.
- The HUD chip is sanctuary-only and does not affect dungeon UI or normal controls.
- Validator now enforces season IDs, config, transaction placement, and HUD copy.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Enter Sanctuary and confirm the HUD shows current season and Clear/Rain state.
- Harvest a mature crop and confirm the toast includes the season bonus.
- Confirm the bonus item appears in Backpack resources.
- Set streak rain active and confirm the chip says Rain while existing rain crop behavior still works.
- Enter Dungeon and confirm the season/weather chip is not shown.

Expansion notes saved:

- Later add persisted in-game day/season calendars if real-month seasons feel too slow.
- Later add forecast UI, weather sounds, rare weather drops, and season-specific crop affinities.
- Later make seasons affect animal yields or clutter regrowth once those loops are more stable.

Future RPG development log:

- Phase 84: Asset correctness pass. Replace remaining placeholder/wrong icons for leaves, seeds, animal products, levers, gates, traps, mechanisms, crop stages, and terrain tools with verified atlas entries; update `RPG_ASSET_ATLAS.md` with source paths, frame coordinates, intended size, collision footprint, and fallback policy.
- Phase 85: Farming loop depth. Add crop-specific season affinities, clearer mature/boost/harvest feedback, crop product icons, and a lightweight crop journal page in the Archive so players understand what each seed produces before planting.
- Phase 86: Interaction juice and feedback. Add small object interaction reactions for trees, animals, crops, mechanisms, and resource nodes: sprite nudge, sparkle/drop toast, cooldown/readiness state, and no extra normal-world buttons beyond `Interact` and `Attack`.
- Phase 87: Movement and placement polish. Revisit tile size, sprite visual footprint, collision footprint, avatar footprint, and direct placement so object blocking stays physically honest while still feeling close to Stardew-style readable top-down spacing.
- Phase 88: World progression. Add clutter/regrowth scheduling, seasonal spawn pools, rain/weather spawn modifiers, and sanctuary cleanup/reward pacing without creating save bloat or frame-time spikes.
- Phase 89: Performance and save-state audit. Profile dense sanctuary scenes, animation timers, database writes, inventory transactions, and map rendering on device; lock in budgets for object count, crop count, animal count, and particle effects.

Phase 83 status:

- Verified.

### Phase 84 Audit

Intended behavior:

- Make compact mechanism icons easier to read by preserving full-size lever/gate/trap/mechanism art and using a small corner marker instead of a bottom badge that covers the sprite.
- Stop animal products from looking like unrelated items: Egg must not look like a seed packet, Milk must not look like Water Drops, Wool must not look like Leaves, and Truffle must not use a cave object without an explicit product placeholder path.
- Keep placeholder product art honest by labeling it in UI and documenting the exact farm-supply frames in `RPG_ASSET_ATLAS.md`.
- Keep all normal-world controls unchanged: only `Interact` and `Attack` in normal play.

Negative guarantees:

- This phase must not claim final egg, milk, wool, or truffle art exists.
- This phase must not change animal collection probability, cooldowns, inventory quantities, shop pricing, placement, collision, or archive discovery rules.
- This phase must not stage loose untracked asset folders.

Files changed:

- `app/src/engine/RpgAssetRegistry.ts`
- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgItemIcon.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_ASSET_ATLAS.md`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- Wrong semantic icons break trust faster than missing final art, so labeled placeholders are better than pretending a seed, water drop, leaf, or cave mushroom is the correct animal product.
- Mechanism items already have real temple frames, but the previous full-width badge competed with tiny floor-lever art in compact UI.
- Product placeholders should live in the asset registry as named frame decisions, not as one-off catalog hacks.

Implementation attack findings:

- `RPG_UI_FRAMES` now exposes distinct `eggProduct`, `milkProduct`, `woolProduct`, and `truffleProduct` farm-supply frames.
- `RPG_ITEM_CATALOG` points each animal product at its own placeholder asset id and frame.
- `RpgItemIcon` renders animal-product placeholder labels (`EGG`, `MILK`, `WOOL`, `TRUF`) while mechanism icons use compact corner markers (`L`, `G`, `T`, `M`) that leave the sprite visible.
- Validator now guards against the old seed-packet and water-drop animal product copy returning.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_ASSET_ATLAS.md RPG_SANDBOX_PHASE_PLAN.md app/src/engine/RpgAssetRegistry.ts app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgItemIcon.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Shop Mechanisms and confirm floor levers, gates, and traps show actual art with only a tiny marker.
- Open Backpack resources after collecting animal products and confirm Egg, Milk, Wool, and Truffle are labeled and no longer appear as seed, Water Drops, Leaves, or an unlabeled cave mushroom.
- Interact with placed Chick, Calf, Sheep, and Piglet and confirm product collection still uses the normal `Interact` button and existing cooldown feedback.

Expansion notes saved:

- Later replace `eggProduct`, `milkProduct`, `woolProduct`, and `truffleProduct` with true product sprites if a better tracked asset is verified.
- Later add an asset QA screen or Archive filter that lists every placeholder explicitly so art debt is visible.

Phase 84 status:

- Verified.

### Phase 85 Audit

Intended behavior:

- Turn the Archive into a more useful farm guide for current systems, not just a collection checklist.
- Seed entries should explain crop name, growth stage timing, Watering Can/rain acceleration, harvest coin value, season bonus, and yield.
- Animal entries should explain their product drop, collection cooldown, and that the normal `Interact` button is the collection action.
- Animal product resources should explain that they are livestock outputs for selling or future crafting, and that their current art is a labeled placeholder.
- Tool archive hints should no longer claim tools are equipped from Backpack; tools now belong to the hotbar and character panel.

Negative guarantees:

- This phase must not change crop growth timing, harvest rewards, season bonus logic, animal product cooldowns, animal drop chances, inventory transactions, or normal-world action buttons.
- This phase must not claim final product art exists.
- This phase must not stage unrelated settings or loose asset folders.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The Archive already had catalog-derived fact rendering, so the scalable move was to enrich `getRpgItemFacts` rather than hard-code a separate crop screen.
- Showing six fact pills instead of four is enough for seed entries to communicate the current farm loop without redesigning the book layout.
- Correcting stale Backpack tool text prevents the Archive from contradicting the Backpack/tool ownership split.

Implementation attack findings:

- Crop facts derive from `item.crop`, so future crop additions inherit the same guidebook shape.
- Animal product facts derive from `forageDrops` and tags, so current livestock and later livestock stay consistent.
- Product placeholder facts are attached to tagged resources rather than product-specific UI branches.
- Validator now enforces the guide facts, six visible fact slots, formatted stage timing, and corrected tool unlock hint.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/src/engine/RpgObjectCatalog.ts app/src/engine/RpgArchive.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Archive, filter to Seeds, and confirm tree seed detail facts show crop, stages, water/rain acceleration, harvest, season bonus, and yield.
- Open Archive, filter to Animals, and confirm livestock entries show product drop, cooldown, and Interact action.
- Open Archive resources for Egg/Milk/Wool/Truffle and confirm they explain product use plus placeholder art.
- Open Archive tools and confirm unlock hints point to hotbar or character panel, not Backpack.

Expansion notes saved:

- Later add a dedicated crop journal page with stage sprites and product previews once crop art is less placeholder-heavy.
- Later add season affinity and crop restrictions to these facts when those systems become real mechanics.

Phase 85 status:

- Verified.

### Phase 86 Audit

Intended behavior:

- Make `Interact` feel more immediate by showing a small in-world badge above the object that reacted.
- Animal collection should show product quantity on success, a rest marker on failed product roll, and a waiting marker during cooldown.
- Forage objects and clearable clutter should show reward/empty/cooldown feedback at the object, not only in the global toast.
- Levers, traps, gates, chests, and repeatable loot objects should show compact state/reward reactions without adding new normal-world controls.

Negative guarantees:

- This phase must not change item drop rates, cooldown duration, inventory transactions, object deletion, collision, relation state, or `Interact`/`Attack` button protocol.
- This phase must not add persistent reaction state; reactions are temporary UI only.
- This phase must not stage unrelated settings or loose asset folders.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- The existing object pulse was useful but too subtle, especially for tiny animals and mechanisms.
- The global toast says what happened, but a world-anchored badge connects the feedback to the exact object and keeps the interaction feeling game-like.
- Using item icons for successful rewards makes the reaction self-explanatory while still preserving the normal top HUD controls.

Implementation attack findings:

- `WorldCellReaction` stores temporary world coordinates and display metadata, then clears through its own timer.
- `showObjectReaction` derives the object footprint from catalog metadata so the badge centers over the object's blocked base.
- Existing transaction and reward paths are unchanged; reactions are emitted after those paths determine success/failure.
- Validator now checks the state, timer cleanup, renderer, styles, and representative animal/mechanism reaction calls.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Interact with Chick/Piglet/Sheep/Calf and confirm a small badge appears above the animal on product success, rest, or cooldown.
- Interact with trees/crystals/bushes and confirm reward/empty/cooldown badges appear above the object.
- Clear weeds/twigs/rocks and confirm the reward badge appears where the clutter was.
- Interact with lever, trap, gate, and chest objects and confirm a compact state/reward badge appears without extra controls.

Expansion notes saved:

- Later replace static badges with short pixel particles or sprite-specific animation hooks once final assets are steadier.
- Later replace static badges with richer crop-specific particles if the garden plot UI needs more feedback than Phase 87's shared badge.

Phase 86 status:

- Verified.

### Phase 87 Audit

Intended behavior:

- Extend in-world reaction badges to crop plots so watering, rain growth, not-ready inspection, ready state, and harvest all point at the crop tile.
- Reuse the same temporary world-cell reaction renderer as object interactions.
- Keep crop interactions on the existing normal `Interact`/tool action flow; no new buttons.

Negative guarantees:

- This phase must not change crop growth timing, Water Drops costs, rain growth rules, harvest transactions, seasonal bonus logic, crop rendering, or placement rules.
- This phase must not add persistent reaction state.
- This phase must not stage unrelated settings or loose asset folders.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- Crop plots are not `SanctuaryObject` instances, so the object-only reaction state would leave farming feedback behind.
- Generalizing the reaction to `WorldCellReaction` keeps one renderer and one cleanup timer for objects and plots.
- Rendering the badge after garden plots makes crop reactions visible above stage sprites and growth bars.

Implementation attack findings:

- `showPlotReaction` anchors the shared reaction badge to the plot's row/col with a 1x1 footprint.
- `waterGardenPlot` emits reactions for mature, rain growth, Water Drop growth, missing Water Drops, and failures.
- `inspectOrHarvestPlot` emits reactions for rain growth, remaining minutes, failed harvest, and successful coin harvest.
- Validator now checks shared world-cell reaction state plus representative object and plot reaction calls.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js`

Manual test checklist:

- Use Watering Can on an immature crop and confirm a `+growth` or `mature` badge appears above the crop.
- Try watering without Water Drops and confirm a `need drop` badge appears above the crop.
- Interact with an immature crop and confirm the remaining minutes badge appears above the crop.
- Harvest a mature crop and confirm a coin/reward badge appears above the crop before it disappears.
- Confirm object reaction badges from Phase 86 still appear for animals and trees.

Expansion notes saved:

- Later add crop-specific watering/harvest particles once final crop art is stronger.
- Later show season-affinity badges if seasons become crop-specific mechanics.

Phase 87 status:

- Verified.

### Phase 88 Audit

Intended behavior:

- Make seasons affect crop gameplay beyond a generic weather harvest bonus.
- Every current tree crop should declare preferred seasons in the crop catalog.
- Archive seed facts should show best seasons and explain that preferred seasons add extra yield.
- Harvesting a crop in one of its preferred seasons should add an extra yield drop through the same `harvestGardenPlot` transaction.
- Out-of-season crops remain plantable and harvestable; affinity is a bonus, not a hard restriction.

Negative guarantees:

- This phase must not change crop planting rules, growth timing, base harvest coins, base drop chances, Water Drops behavior, or rain growth behavior.
- This phase must not add migrations or persisted season state.
- This phase must not stage unrelated settings or loose asset folders.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated and intentionally not staged by this phase: `app/app/settings.tsx`, `.agents/`, `ORIGINAL_REQUEST.md`, and loose untracked asset folders.

Design attack findings:

- Hard season restrictions would be punishing with the current tiny crop set, so a soft in-season bonus is the better first pass.
- Crop affinity belongs in `RPG_CROP_CATALOG`, not in the screen, so Archive facts and harvest behavior share one source of truth.
- The in-season bonus must be appended before `harvestGardenPlot` so inventory and plot deletion stay atomic.

Implementation attack findings:

- `RpgCropSeasonId` mirrors the current season ids and every crop definition declares `preferredSeasons`.
- Archive seed facts now include `Best seasons` and explain preferred-season extra yield.
- `inspectOrHarvestPlot` creates `cropAffinityDrop` only when the active season matches the crop's preferred seasons.
- The affinity drop is included in the same transactional drop array as base and season/weather drops.

Verification evidence:

- Passed: `npx tsc --noEmit`
- Passed: `npm run validate:rpg`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/src/engine/RpgObjectCatalog.ts app/scripts/validate-rpg-content.js`

Manual test checklist:

- Open Archive seed entries and confirm each shows best seasons.
- Harvest a mature crop during one of its preferred seasons and confirm the toast includes `in-season`.
- Confirm the in-world crop badge still appears on harvest.
- Harvest a crop outside its preferred season and confirm it still harvests normally without the affinity bonus.

Expansion notes saved:

- Later add crop-specific seasonal growth speed or quality tiers once the crop set is broader.
- Later add UI calendar/forecast controls if real-month seasons feel too slow for testing.

Phase 88 status:

- Verified.

### Phase 89 Audit

Intended behavior:

- Repair `npm run validate:rpg` so it validates the current RPG architecture instead of stale inline-era implementation details.
- Keep tools owned by the tool/equipment architecture: `ToolCatalog.ts`, starter tool item IDs, hotbar, and Character panel.
- Keep crafting owned by `CraftingCatalog.ts` plus `src/db/crafting.ts`, with the RPG screen only starting and claiming jobs.
- Record the terrain decision clearly: Bridge, Path, and Tilled Soil are honest base-grid placeholders because visible soil/terrain character comes from world objects and overlays, not final tile sprites.
- Preserve sanctuary customization as the priority by keeping validation focused on RPG catalog, shop, backpack, archive, placement, interaction, and farming surfaces.

Negative guarantees:

- This phase must not change XP, global stats, habit/mood logging, non-RPG navigation, or non-RPG persistence.
- This phase must not force tracked terrain sprites back into `TileArt.tsx` while terrain is intentionally placeholder base-grid art.
- This phase must not move tools back into Backpack ownership or restore instant inline crafting recipes.
- This phase must not weaken validator coverage for catalog, archive, shop, backpack, object interaction, farming, animals, or mechanisms.

Files changed:

- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated files should remain untouched unless a later phase explicitly owns them.

Design attack findings:

- The validator was red because it checked obsolete strings such as inline `CRAFTING_RECIPES`, `ToolId`, `rpg_tool_watering_can`, and tracked terrain sprite frame constants.
- The current app uses catalog-backed tools, persisted equipment, timed crafting jobs, calendar state, and flat terrain placeholders. Validation needed to follow those sources of truth instead of making the code regress to older shapes.
- Base terrain art is not the final sanctuary customization surface; placed objects, crops, clutter, livestock, buildings, paths/bridges as mechanics, and future overlays carry the Stardew-like read.

Implementation attack findings:

- `validate-rpg-content.js` now reads `ToolCatalog.ts`, `CraftingCatalog.ts`, and `src/db/crafting.ts`.
- Tool validation checks `rpg_watering_can_basic`, `ToolType = WateringCan`, explicit `energyCost`, starter tool grants, Character/hotbar ownership, and `rpg_state.energy` spending.
- Crafting validation checks catalog recipes, DB transaction helpers, guarded ingredient reads, output upsert, rollback, discovery on claim, station gating, and disabled craft buttons.
- Terrain validation now requires explicit placeholder honesty and rejects accidental claims that final bridge/path/tilled sprite frames exist.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Backpack and confirm tools are hidden from normal inventory rows.
- Open Character equipment and confirm starter tools appear as tool slots.
- Equip Watering Can and confirm Interact/tool use waters crops through the existing crop flows.
- Open Crafting and confirm recipes page through timed jobs rather than instant inline crafting.
- Confirm bridge/path/tilled terrain still works mechanically as base-grid placeholders.

Expansion notes saved:

- Later add real tracked terrain tile sprites only if they improve readability beyond object/overlay art.
- Later add an explicit validator section for sanctuary customization density once the shop/backpack/archive polish pass is complete.

Phase 89 status:

- Verified for validator architecture repair; broader sprint verification continues in the current work pass.

### Phase 90 Audit

Intended behavior:

- Make the sanctuary customization surfaces feel more like game UI and less like dense debug catalogs.
- Shop should show fewer, larger cards per page so object art, prices, rarity, and ownership are readable on phone.
- Backpack should show fewer, larger slots per page, with clearer selected item details and action buttons.
- Archive entries should sit lower and larger on the book art, with a correct Known count.
- Generic seed placeholder art should carry semantic labels so Turnip/Cabbage/Pumpkin/tree seeds remain readable until final seed art is verified.

Negative guarantees:

- This phase must not change XP, global stats, economy prices, crop growth timing, harvest output, item ownership, placement rules, or non-RPG surfaces.
- This phase must not claim final crop seed art exists.
- This phase must not move tools back into Backpack actions.
- This phase must not add new acquisition paths or wire non-RPG systems into the RPG.

Files changed:

- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/src/engine/RpgArchive.tsx`
- `app/src/engine/RpgItemIcon.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Shop pages with six cards were dense enough that sanctuary objects could read like rows in a catalog instead of collectible/customization pieces.
- Backpack's twelve-slot page made icons small at phone sizes; eight larger slots are a better Stardew-like tradeoff.
- Archive's Known count was using an impossible predicate because current knowledge implies discovery.
- Generic acorn seed art is acceptable only when the UI tells the player what seed it represents.

Implementation attack findings:

- Shop capacity changed to four cards per page with larger art boxes, card labels, price pills, and selected detail hierarchy.
- Backpack capacity changed to eight slots per page with larger icons, details, and action buttons.
- Archive entry positions were lowered on the open-book frame, entry art/text sizes increased, detail spacing improved, and Known count now checks discovered+known entries.
- `RpgItemIcon` adds `placeholderSeedLabel` and a green semantic seed badge for items using `seed.treeGeneric`.
- Validator now requires semantic seed placeholder labels and crop seed items linked to `RPG_CROP_CATALOG`.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop on a phone viewport and confirm four larger cards per page are readable and tappable.
- Open Backpack and confirm item slots are larger, tools remain hidden, and selected item actions are clear.
- Open Archive and confirm entries sit naturally on the book art and Known/Seen/Locked counts make sense.
- Inspect Turnip, Cabbage, Pumpkin, and tree seeds in Shop/Backpack/Archive and confirm generic seed art has a readable semantic badge.

Expansion notes saved:

- Later replace generic seed badges with verified crop-specific seed packet art.
- Later add a visual QA pass with screenshots or simulator proof once direct placement UX work begins.

Phase 90 status:

- Verified for automated gates; manual device verification remains part of the broader sanctuary polish loop.

### Phase 91 Audit

Intended behavior:

- Make sanctuary placement/editing more precise without changing the existing placement model.
- Build mode should still support direct drag placement, but also expose one-tile nudge controls for fine adjustments when a finger obscures the ghost.
- Build mode should show current validity, invalid reason, and row/column coordinates.
- A contextual Place/Move button should reuse the same `confirmBuildPlacement` path as Interact and disable itself when the footprint is invalid.
- Normal gameplay remains simple: no nudge controls outside build/edit mode.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, safe-path checks, inventory arithmetic, object prices, crop growth, harvesting, XP, global stats, or non-RPG behavior.
- This phase must not create a second placement confirmation path; the build pad calls the existing `confirmBuildPlacement`.
- This phase must not add normal-mode controls beyond `Interact` and `Attack`.
- This phase must not make move/stash persistent outside edit/build state.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI files from Phase 89/90.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Drag placement already exists, but mobile precision can suffer because a finger can cover the ghost and grid cells.
- One-tile nudge controls improve sanctuary decoration without introducing a new world model.
- The nudge helper must use the same shared build row/col values and call `updateBuildReport` so red/green footprint feedback remains authoritative.

Implementation attack findings:

- `nudgeBuildPlacement(deltaRow, deltaCol)` clamps using the same build bounds as drag and refreshes the shared placement report.
- `buildPad` renders only when `buildItem` exists.
- The center Place/Move button is disabled for invalid placement and calls `confirmBuildPlacement`.
- In edit mode, the nudge pad lifts above the stash/edit bar so narrow phone viewports do not overlap the controls.
- The existing mode prompt now tells the player to drag or nudge, then place.
- `validate:rpg` enforces the nudge helper, report refresh, contextual pad, accessibility labels, disabled invalid confirm, and reuse of `confirmBuildPlacement`.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing an object from Backpack and confirm the build pad appears.
- Tap all four nudge arrows and confirm the ghost moves one tile at a time.
- Drag the ghost and confirm nudge controls still update from the dragged position.
- Move onto invalid terrain/occupied/avatar cells and confirm status/reason changes and the Place button disables.
- Press Interact and the build pad Place/Move button on valid cells and confirm both use the same placement behavior.
- Long-press an object, nudge it, move it, then confirm old/new collision stays correct.

Expansion notes saved:

- Later add edge-panning while dragging near the screen boundary.
- Later add optional rotate/variant controls only if catalog footprints and art variants support them.

Phase 91 status:

- Verified.

### Phase 92 Audit

Intended behavior:

- Make sanctuary build/edit placement read like a deliberate customization tool, not just a translucent object floating over debug cells.
- Build mode should render a world-anchored footprint mat at the authoritative build row/col, using the same width/height as placement collision.
- The footprint should show valid vs invalid state clearly and include a center anchor so multi-tile objects are easier to align.
- Edit mode should feel visually distinct from fresh placement without changing the existing edit/move persistence model.
- Invalid ghosts should be visibly dimmed while still preserving the existing red invalid-cell feedback and disabled confirm button.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, safe-path checks, object persistence, inventory arithmetic, prices, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not introduce a second source of truth for placement; the mat follows the existing shared build row/col and `placementReport`.
- This phase must not add non-build-mode controls or visual clutter during normal sanctuary movement.
- This phase must not claim final soil/terrain art exists; terrain remains placeholder where intentionally logged.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI files from Phase 89/90.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Previous red/green cells proved validity but felt like debug overlays rather than an in-world decorating surface.
- Multi-tile objects need a clear footprint anchor so players can align buildings, trees, and decor against paths/gardens.
- The footprint must be derived from the same animated build coordinates as the ghost, otherwise drag/nudge could desync visual and confirm behavior.

Implementation attack findings:

- `buildFootprintStyle` is an animated, world-anchored footprint using shared build row/col and collision footprint dimensions.
- The footprint uses `placementReport?.valid` for valid/invalid styling and keeps per-cell validity overlays intact.
- A center anchor dot improves alignment for multi-tile objects and changes color with validity.
- Edit mode applies a distinct footprint/ghost tint while still reusing `confirmBuildPlacement`.
- `validate:rpg` now guards the footprint mat, anchor, valid/invalid styling, edit styling, and invalid ghost dimming.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing a one-tile seed, a two-tile decor item, and a larger building; confirm the footprint mat matches the actual occupied cells.
- Drag and nudge across valid, occupied, avatar, and terrain-invalid cells; confirm mat, cells, pad status, and disabled Place/Move stay in sync.
- Long-press an existing object and confirm edit mode uses the distinct tint while stash/cancel remain reachable.
- Confirm normal movement mode does not show placement mats.

Expansion notes saved:

- Later add edge-panning and optional rotate/variant controls after placement readability is verified on device.
- Later replace terrain/soil placeholders with final overlays/assets when the actual soil art set is chosen.

Phase 92 status:

- Verified.

### Phase 93 Audit

Intended behavior:

- Make sanctuary item choice feel more like decorating and less like browsing raw catalog rows.
- Shop and Backpack should use one shared catalog helper to classify item layout roles such as Canopy, Ground Cover, Landmark, Mechanism, Flooring, Boundary, Livestock, Crop Bed, and Crafting Stock.
- Shop details should show the selected item role and a short composition hint before purchase.
- Backpack details should show the same role and hint before placement, planting, selling, or using an item.
- The role language should help players combine paths, plants, buildings, ruins, animals, and resources into Stardew-like sanctuary layouts.

Negative guarantees:

- This phase must not change prices, inventory quantities, buying/selling behavior, placement validity, collision, crop growth, rewards, XP, global stats, or non-RPG behavior.
- This phase must not create separate role taxonomies for Shop and Backpack; both must use `getSanctuaryDesignRole`.
- This phase must not make tools belong to Backpack again.
- This phase must not claim final terrain/soil art exists; it only improves decision support around existing items.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-92.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Source filters and tags help find items, but they do not explain how an item should be used in a cozy layout.
- Players choosing objects need layout-role vocabulary at both acquisition time and placement time.
- A shared catalog helper prevents the shop from calling an item a Canopy while the backpack treats it as generic decor.

Implementation attack findings:

- `getSanctuaryDesignRole` classifies seeds, resources, floors, boundaries, stations, buildings, livestock, mechanisms, crystals, trees, ground cover, ruin accents, landmarks, decor, and resource nodes.
- Shop imports the helper and renders a role chip plus one-line composition hint for the selected catalog item.
- Backpack imports the same helper and renders the same role chip plus hint for the selected inventory stack.
- `validate:rpg` now guards the shared helper, required role labels, Shop/Backpack helper usage, visible role chips, and composition hints.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop and inspect trees, crystals, mechanisms, animals, buildings, floors, and fences; confirm each selected item shows a useful role and hint.
- Buy a few differently themed items, open Backpack, and confirm the same role language appears before placing.
- Confirm Backpack still hides tools and only shows place/plant/use/sell actions appropriate to the selected item.
- Confirm no prices, quantities, stats, or placement rules changed.

Expansion notes saved:

- Later add optional “layout set” filters (Farmyard, Grove, Ruins, Workshop) if the role chips prove useful on device.
- Later feed these roles into archive guide pages or a sanctuary planning overlay.

Phase 93 status:

- Verified.

### Phase 94 Audit

Intended behavior:

- Let players browse sanctuary items by layout intent, not only raw category/source/search.
- Shop and Backpack should expose shared layout filters: All, Grove, Farm, Ruins, and Work.
- Grove should collect plants, trees, saplings, mushrooms, and low natural detail.
- Farm should collect crop beds, livestock, feed/farm items, and farmyard boundary pieces.
- Ruins should collect cave/temple/crystal/relic/mechanism objects for shrine and dungeon-themed layouts.
- Work should collect stations, buildings, floors, structure pieces, resources, and craft/workshop items.
- Counts should show how many catalog/inventory items match each layout set.

Negative guarantees:

- This phase must not change prices, purchase flow, inventory quantities, selling behavior, placement validity, collision, crop growth, rewards, XP, global stats, or non-RPG behavior.
- This phase must not create Shop-only or Backpack-only layout matching; both must use the shared catalog matcher.
- This phase must not make tools appear in Backpack.
- This phase must not claim final soil/terrain art exists; it only improves how existing items are found.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-93.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The Phase 93 role chips help explain the selected item, but players still need a fast way to gather items for a layout concept.
- Layout filters should be broader than tags: a farmyard can include livestock, crop seeds, hay/feed, and fence pieces; ruins can include crystals, mechanisms, cave relics, and temple pieces.
- A shared matcher keeps the layout semantics identical before buying and before placing.

Implementation attack findings:

- `SANCTUARY_LAYOUT_SET_FILTERS` defines All/Grove/Farm/Ruins/Work in the catalog.
- `itemMatchesSanctuaryLayoutSet` uses the shared design role plus tags/source labels to match layout intent.
- `countSanctuaryLayoutSets` gives both panels per-layout counts.
- Shop filters catalog entries through `itemMatchesSanctuaryLayoutSet(item, layoutSet)` and renders a compact layout filter row.
- Backpack filters inventory stacks through `itemMatchesSanctuaryLayoutSet(slot.item, layoutSet)` and renders the same layout filter row.
- Backpack slot sizing reserves space for the extra layout row so the grid and action area remain stable on shorter panels.
- `validate:rpg` guards the shared ids, filter list, matcher, counts, and Shop/Backpack usage.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop and toggle Grove/Farm/Ruins/Work; confirm results feel like coherent decoration sets.
- Buy representative items from two layout sets, open Backpack, and confirm the same filters narrow the owned stacks.
- Confirm source/category/search/sort still combine with the layout filter without losing selection or paging safety.
- Confirm Backpack tools stay hidden and no prices, stats, or placement behavior changed.

Expansion notes saved:

- Later consider showing active layout set on the placement mode pill if it helps players remember the current decorating concept.
- Later feed these layout sets into Archive guide pages or sanctuary planning overlays.

Phase 94 status:

- Verified.

### Phase 95 Audit

Intended behavior:

- Make item size readable before a player buys or places a sanctuary item.
- Shop details should show a compact footprint grid for the selected catalog item using its actual `colWidth`/`colHeight`.
- Backpack details should show the same compact footprint grid for selected placeable stacks.
- Backpack details should show a 1x1 planting preview for plantable seeds.
- The preview should be shared by Shop and Backpack so footprint visuals stay consistent.

Negative guarantees:

- This phase must not change placement validity, collision, object persistence, seed planting rules, prices, purchase flow, inventory quantities, selling behavior, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not duplicate two separate footprint renderers in Shop and Backpack.
- This phase must not claim final terrain/soil art exists; it only previews occupied cells.

Files changed:

- `app/src/engine/SanctuaryFootprintPreview.tsx`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-94.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Text-only `Footprint: 2x2` is easy to skip when choosing decor; a mini grid makes footprint shape visible at a glance.
- The preview must read the catalog dimensions, not infer from art size, because placement collision owns the footprint.
- Planting seeds occupy one cell, so Backpack should use the same visual vocabulary for seed placement.

Implementation attack findings:

- `SanctuaryFootprintPreview` renders every occupied cell from `colWidth` and `colHeight` and labels the size.
- Shop imports the shared preview and renders selected catalog item dimensions.
- Backpack imports the shared preview and renders selected placeable dimensions, or a 1x1 `Planting` preview for plantable seeds.
- Backpack slot sizing reserves space for the extra footprint row.
- `validate:rpg` now guards the shared component, cell rendering, Shop usage, Backpack usage, and seed planting preview.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop and inspect 1x1, 2x2, and larger items; confirm the footprint grid matches the text/placement expectation.
- Open Backpack and inspect owned placeables; confirm the same footprint grid appears.
- Select Turnip/Cabbage/Pumpkin/tree seeds and confirm the planting preview appears as 1x1.
- Confirm no prices, quantities, stats, placement rules, or crop rules changed.

Expansion notes saved:

- Later consider reusing the footprint preview in Archive entries once Archive composition guidance expands.
- Later add visual proof screenshots for Shop/Backpack on narrow phone viewports.

Phase 95 status:

- Verified.

### Phase 96 Audit

Intended behavior:

- Make the active sanctuary placement surface explain what the player is placing without opening Shop or Backpack again.
- Build/edit mode should show whether the player is Placing, Moving, or Planting.
- Build/edit controls should show the selected item's shared sanctuary design role and composition hint when available.
- Build/edit controls should reuse the shared compact footprint grid and true selected dimensions.
- Plantable seeds should show a 1x1 Planting footprint in build mode.

Negative guarantees:

- This phase must not change placement validity, collision, object persistence, seed planting rules, prices, purchase flow, inventory quantities, selling behavior, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not create a second role taxonomy or footprint renderer.
- This phase must not claim final terrain/soil art exists; it only adds build-mode decision context.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-95.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Shop and Backpack now explain roles and footprint before selection, but build mode previously made that context disappear while the player was actually placing the item.
- The nudge pad is already the player's precise placement tool, so a compact context strip there is the least disruptive place to surface item size and role.
- Reusing the shared role helper and footprint preview keeps placement-time language aligned with purchase and inventory surfaces.

Implementation attack findings:

- `rpg.tsx` imports `getSanctuaryDesignRole` and `SanctuaryFootprintPreview`.
- Build mode derives `buildDesignRole`, `buildFootprintCols`, `buildFootprintRows`, and a contextual footprint label from the active `buildItem`.
- The build nudge pad now renders a compact context block with Placing/Moving/Planting state, role label, role hint, and footprint preview.
- `validate:rpg` now guards the shared helper usage, shared footprint preview usage, true dimension derivation, and plant/edit labels.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing an owned object and confirm the nudge pad shows Placing, role, hint, and footprint.
- Long-press/move an existing object and confirm the context changes to Moving while the footprint remains correct.
- Plant a seed and confirm the context shows Planting with a 1x1 preview.
- Drag/nudge across valid and invalid cells and confirm placement validity, disabled Place/Move, collisions, and inventory behavior are unchanged.

Expansion notes saved:

- Later add visual screenshot proof for narrow phone viewports.
- Later consider showing the active layout set beside this context if Shop/Backpack layout filters become part of the placement flow.

Phase 96 status:

- Verified.

### Phase 97 Audit

Intended behavior:

- Make Archive entries useful for sanctuary planning, not only collection tracking.
- Discovered/known Archive entries should show the same sanctuary design role and composition hint used in Shop, Backpack, and build mode.
- Discovered/known placeable object entries should show a compact footprint preview from catalog dimensions.
- Discovered/known seed entries should show a 1x1 Planting preview.
- Locked entries should remain redacted and must not reveal role/hint/footprint details.

Negative guarantees:

- This phase must not change discovery/knowledge gates, placement validity, collision, object persistence, seed planting rules, prices, purchase flow, inventory quantities, selling behavior, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not create a second role taxonomy or footprint renderer.
- This phase must not claim final terrain/soil art exists; it only improves Archive planning context.

Files changed:

- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-96.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Shop, Backpack, and build mode now explain item roles and footprint, but Archive still lacked the same planning vocabulary.
- Archive is the natural long-term guide surface, so carrying role/footprint there helps players plan sanctuary layouts before buying or placing.
- Role and footprint context must be gated behind discovery/knowledge so locked entries do not leak hidden item detail.

Implementation attack findings:

- Archive imports `getSanctuaryDesignRole`, `getRpgItem`, `getPlaceableItem`, and `SanctuaryFootprintPreview`.
- Archive derives selected catalog item, selected placeable item, and selected design role from the active entry.
- Archive renders role chip, composition hint, placeable footprint preview, or 1x1 seed Planting preview only when the entry is discovered/known.
- `validate:rpg` now guards Archive shared role usage, shared footprint usage, discovery gating, true dimension derivation, and seed planting preview.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Archive, select a known object, and confirm role/hint/footprint appear.
- Select a known seed and confirm a 1x1 Planting preview appears.
- Select locked entries and confirm they still show redacted copy without role/hint/footprint detail.
- Confirm discovery counts, known counts, filters, sorting, inventory quantities, placement behavior, and crop behavior are unchanged.

Expansion notes saved:

- Later add screenshot proof for Archive detail density on narrow phone viewports.
- Later consider a dedicated Archive "layout guide" tab if role hints prove useful in manual play.

Phase 97 status:

- Verified.

### Phase 98 Audit

Intended behavior:

- Make Archive planning browseable by the same sanctuary layout intents as Shop and Backpack.
- Archive should expose All, Grove, Farm, Ruins, and Work layout-set filters.
- Archive should show per-layout counts from the shared layout-set counter.
- Archive filtering should combine safely with category, source pack, scope, search, and sort filters.
- The layout-set semantics should stay shared across Archive, Shop, and Backpack.

Negative guarantees:

- This phase must not change discovery/knowledge gates, placement validity, collision, object persistence, seed planting rules, prices, purchase flow, inventory quantities, selling behavior, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not create Archive-only layout semantics.
- This phase must not claim final terrain/soil art exists; it only improves Archive planning filters.

Files changed:

- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-97.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- After Phase 97, Archive could explain selected items, but players still had to browse the full collection with source/category filters rather than layout intent.
- Shared layout sets make the Archive a planning surface: Grove/Farm/Ruins/Work mean the same thing before learning, buying, carrying, and placing items.
- The added row required slightly more vertical budget, so Archive book scaling now reserves space for the extra filter row.

Implementation attack findings:

- Archive imports `SANCTUARY_LAYOUT_SET_FILTERS`, `itemMatchesSanctuaryLayoutSet`, `countSanctuaryLayoutSets`, and `SanctuaryLayoutSetId`.
- Archive derives a lightweight layout-match item from each entry's category/tags/source label.
- Archive filters entries through `itemMatchesSanctuaryLayoutSet(archiveLayoutItem(entry), layoutSet)`.
- Archive renders a compact layout filter row with counts from `countSanctuaryLayoutSets(entries, archiveLayoutItem)`.
- `validate:rpg` now guards Archive shared layout filters, matcher usage, and counts.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Archive and toggle Grove/Farm/Ruins/Work; confirm entries narrow by layout intent.
- Confirm category, source, scope, search, and sort still combine with the active layout filter.
- Confirm counts update from Archive entries and locked/discovered/known states continue to display normally.
- Confirm no inventory quantities, placement behavior, prices, crop behavior, or stats changed.

Expansion notes saved:

- Later consider a dedicated sanctuary planning page if Archive layout filters become too dense for phone.
- Later add visual screenshot proof for Archive filter density on narrow phone viewports.

Phase 98 status:

- Verified.

### Phase 99 Audit

Intended behavior:

- Make Shop and Backpack browsing feel more like selecting layout pieces, not only scanning raw item icons.
- Shop cards should show a compact shared sanctuary role badge for each visible catalog item.
- Backpack slots should show a compact shared sanctuary role badge for each owned stack.
- The badges should reuse `getSanctuaryDesignRole` so card roles match selected-detail roles, Archive roles, and build-mode roles.
- Quantity badges, prices, rarity, card selection, and slot selection should remain unchanged.

Negative guarantees:

- This phase must not change prices, purchase flow, inventory quantities, selling behavior, placement validity, collision, crop growth, XP, global stats, discovery gates, or non-RPG behavior.
- This phase must not create a second role taxonomy or alter layout-filter matching.
- This phase must not claim final terrain/soil art exists; it only improves browsing readability.

Files changed:

- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-98.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Selected detail panels already explain role and hint, but players still had to tap items one by one to discover whether they were Canopy, Flooring, Livestock, etc.
- Card-level badges make broad browsing match the sanctuary planning model established by layout filters.
- Backpack slot badges need to avoid the quantity pill, so they sit top-left while quantity stays bottom-right.

Implementation attack findings:

- Shop derives `cardDesignRole` from each visible shop item and renders a compact role pill under rarity.
- Backpack derives `slotDesignRole` from each occupied slot and renders a compact top-left role pill.
- Both surfaces continue using the shared `getSanctuaryDesignRole` helper.
- `validate:rpg` now guards Shop card role badges and Backpack slot role badges.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop and confirm visible cards show compact role badges without hiding art, rarity, or price.
- Open Backpack and confirm occupied slots show compact role badges without hiding quantity.
- Confirm selection, buying, selling, placing, planting, layout filters, and quantities are unchanged.
- Confirm role labels match the selected-detail role for representative Grove/Farm/Ruins/Work items.

Expansion notes saved:

- Later add screenshot proof for Shop/Backpack card density on narrow phone viewports.
- Later consider tinting card badges by role tone if the neutral chip is too subtle in manual play.

Phase 99 status:

- Verified.

### Phase 100 Audit

Intended behavior:

- Make Shop and Backpack role badges easier to scan by giving each shared role tone a subtle visual identity.
- Nature, Farm, Ruin, Utility, Livestock, and Resource badge tones should be visible while browsing Shop cards.
- The same role-tone language should appear on Backpack slot badges.
- Badge text should stay compact and bounded so long role labels do not spill into price or quantity controls.
- Role tone should continue to come from `getSanctuaryDesignRole`.

Negative guarantees:

- This phase must not change prices, purchase flow, inventory quantities, selling behavior, placement validity, collision, crop growth, XP, global stats, discovery gates, layout-filter matching, or non-RPG behavior.
- This phase must not create a second role taxonomy.
- This phase must not claim final terrain/soil art exists; it only improves browse readability.

Files changed:

- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-99.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Phase 99 made roles visible while browsing, but a single neutral badge made every role feel visually equivalent.
- Tone coloring reinforces the Grove/Farm/Ruins/Work layout model already used by filters and Archive planning.
- Backpack badges needed darker backgrounds than Shop cards because they overlay item art.

Implementation attack findings:

- Shop card role badges now apply tone-specific styles from `cardDesignRole.tone`.
- Backpack slot role badges now apply tone-specific overlay styles from `slotDesignRole.tone`.
- Both surfaces keep using the shared role helper and keep existing price/quantity/selection UI intact.
- `validate:rpg` now guards browse badge tone mapping in Shop and Backpack.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Shop and confirm different role cards show distinct but subtle badge tones.
- Open Backpack and confirm slot badges remain readable on item art while quantity stays visible.
- Confirm selecting, buying, selling, placing, planting, filtering, and sorting are unchanged.
- Confirm role badge labels still match selected-detail role labels.

Expansion notes saved:

- Later add screenshot proof for narrow phone viewports.
- Later consider using these tone colors in a dedicated sanctuary planning overlay.

Phase 100 status:

- Verified.

### Phase 101 Audit

Intended behavior:

- Keep sanctuary role-tone language visible through the whole customization flow, including the moment of placing or moving an item.
- Build/edit mode context should use the active `buildDesignRole.tone` to style the role chip.
- Nature, Farm, Ruin, Utility, Livestock, and Resource tones should match the browsing/planning vocabulary.
- The build role chip should remain compact and bounded inside the nudge pad.

Negative guarantees:

- This phase must not change placement validity, collision, object persistence, seed planting rules, prices, purchase flow, inventory quantities, selling behavior, crop growth, XP, global stats, discovery gates, layout-filter matching, or non-RPG behavior.
- This phase must not create a second role taxonomy.
- This phase must not claim final terrain/soil art exists; it only improves placement-context readability.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-100.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Browse surfaces now use tone badges, but build mode still showed a neutral role chip while the player was making placement decisions.
- Placement context is the final decision point for sanctuary customization, so it should preserve the same role-tone language.
- The nudge pad is compact, so the role chip needs subtle color and a border without increasing its footprint.

Implementation attack findings:

- Build mode role chip now applies tone-specific styles from `buildDesignRole.tone`.
- The tone styles are darker overlay-friendly variants so they remain readable inside the build pad.
- `validate:rpg` now guards build-mode role-tone mapping.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing Grove/Farm/Ruins/Work items and confirm the build role chip tone changes with role.
- Move an existing object and confirm the chip remains compact while nudge controls and footprint preview remain visible.
- Confirm placement validity, Place/Move disabled state, dragging, nudging, inventory, crop behavior, and stats are unchanged.

Expansion notes saved:

- Later add visual proof screenshots for build-mode nudge pad density.
- Later consider a dedicated role legend only if tone colors are unclear in manual play.

Phase 101 status:

- Verified.

### Phase 102 Audit

Intended behavior:

- Make selected item details explain not only the role, but where the item fits in sanctuary layout planning.
- Catalog should expose one shared helper for non-All layout fit labels.
- Shop selected details should show Grove/Farm/Ruins/Work fit chips for the selected catalog item.
- Backpack selected details should show the same fit chips for the selected owned item.
- Fit chips should use the existing shared layout matcher so they stay aligned with actual filters.

Negative guarantees:

- This phase must not change prices, purchase flow, inventory quantities, selling behavior, placement validity, collision, crop growth, XP, global stats, discovery gates, layout-filter matching, or non-RPG behavior.
- This phase must not create a second layout taxonomy or alter existing layout-set counts.
- This phase must not claim final terrain/soil art exists; it only improves selected-item planning context.

Files changed:

- `app/src/engine/RpgObjectCatalog.ts`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG UI/build files from Phase 89-101.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Layout filters help browse by intent, but selected details did not summarize which layout sets an item belongs to.
- A shared helper avoids Shop and Backpack drifting on fit labels.
- Excluding `All` keeps the detail row meaningful and compact.

Implementation attack findings:

- `getSanctuaryLayoutFitLabels` returns non-All layout labels using `itemMatchesSanctuaryLayoutSet`.
- Shop derives `selectedLayoutFits` from the selected catalog item and renders compact fit chips.
- Backpack derives `selectedLayoutFits` from the selected inventory item and renders matching fit chips.
- `validate:rpg` now guards the shared helper and both detail-panel fit rows.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check -- RPG_SANDBOX_PHASE_PLAN.md app/app/rpg.tsx app/scripts/validate-rpg-content.js app/src/engine/SanctuaryShop.tsx app/src/engine/RpgBackpack.tsx app/src/engine/RpgArchive.tsx app/src/engine/RpgItemIcon.tsx app/src/engine/RpgObjectCatalog.ts app/src/engine/SanctuaryFootprintPreview.tsx`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Select Grove/Farm/Ruins/Work items in Shop and confirm fit chips match the filter sets they appear in.
- Select owned items in Backpack and confirm the same fit chips appear.
- Confirm source/category/search/sort/layout filters still work and quantities/prices/actions are unchanged.
- Confirm placement, planting, crop behavior, stats, and non-RPG surfaces are unchanged.

Expansion notes saved:

- Later consider reusing layout fit chips in Archive detail if detail density remains acceptable.
- Later add screenshot proof for Shop/Backpack detail density on narrow phone viewports.

Phase 102 status:

- Verified.

### Phase 103 Audit

Intended behavior:

- Keep layout-fit guidance visible at the final customization decision point: placing, planting, or moving an item in sanctuary build mode.
- Build/edit controls should derive Grove/Farm/Ruins/Work fit labels from the same shared catalog helper used by Shop and Backpack.
- Fit chips should sit inside the existing build context block above the footprint preview and should wrap compactly before the nudge grid.
- Planting should also show layout-fit context for seed items when the shared helper can classify them.

Negative guarantees:

- This phase must not change placement validity, collision, safe-path checks, object persistence, seed planting rules, crop growth, prices, purchase flow, inventory quantities, selling behavior, XP, global stats, discovery gates, layout-filter matching, or non-RPG behavior.
- This phase must not create build-mode-only layout semantics or duplicate the Grove/Farm/Ruins/Work taxonomy.
- This phase must not add build controls outside build/edit mode or claim final soil/terrain art exists.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-102.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Shop and Backpack now show layout fit labels, but the active placement surface did not carry that planning context forward.
- The build pad already owns selected item role, hint, and footprint; layout-fit chips belong there rather than in a new HUD control.
- Reusing `getSanctuaryLayoutFitLabels` keeps build-mode context aligned with the real shared layout filters.

Implementation attack findings:

- `rpg.tsx` imports `getSanctuaryLayoutFitLabels` and derives `buildLayoutFits` from `buildPreviewItem`.
- Build/edit mode renders compact `Fits` chips inside `styles.buildInfoBlock` before `SanctuaryFootprintPreview`.
- The new chip row wraps in the existing build pad and stays hidden outside build/edit mode.
- `validate:rpg` now guards the shared helper usage and visible build-mode fit chips.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing representative Grove/Farm/Ruins/Work objects and confirm the build pad shows matching fit chips.
- Start planting a seed and confirm plantable items keep the compact build context without covering nudge controls.
- Long-press/move an existing object and confirm fit chips still show while editing.
- Confirm invalid placement reasons, nudge controls, Interact confirmation, and Place/Move button behavior are unchanged.

Expansion notes saved:

- Later consider adding the same fit chips to Archive detail if book density remains readable.
- Later consider a dedicated sanctuary planning overlay only if the build pad becomes too dense for phone.

Phase 103 status:

- Verified.

### Phase 104 Audit

Intended behavior:

- Make Archive detail a complete sanctuary planning surface by showing which Grove/Farm/Ruins/Work sets a selected entry fits.
- Archive should use the same `getSanctuaryLayoutFitLabels` helper as Shop, Backpack, and build mode.
- Layout fit chips should appear only for discovered or known selected entries, matching existing role and footprint detail gates.
- Locked Archive entries should continue showing hints/source context without revealing full planning metadata.

Negative guarantees:

- This phase must not change discovery rules, knowledge gates, source/category/scope/search/sort/layout filtering, Archive counts, prices, inventory, placement validity, crop growth, XP, global stats, or non-RPG behavior.
- This phase must not create Archive-only layout semantics or duplicate the Grove/Farm/Ruins/Work taxonomy.
- This phase must not claim final terrain/soil art exists.

Files changed:

- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-103.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Archive can already filter entries by shared layout intent, but selected details did not summarize the current entry's fit sets.
- Archive is the long-term planning book, so showing fit chips there completes the browse -> plan -> buy/carry -> place language chain.
- Gating fit chips behind `selected.discovered || selected.known` avoids leaking full composition metadata for locked entries.

Implementation attack findings:

- `RpgArchive.tsx` imports `getSanctuaryLayoutFitLabels`.
- `selectedLayoutFits` is derived from `selectedCatalogItem` only when the selected entry is discovered or known.
- Archive detail renders compact `Fits` chips between the role row and footprint preview.
- `validate:rpg` now guards the discovered/known gate and visible Archive fit-chip row.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Open Archive and select discovered Grove/Farm/Ruins/Work entries; confirm fit chips match the layout filters they appear under.
- Select locked entries and confirm fit chips remain hidden.
- Confirm Archive category, source, scope, search, sort, layout filters, counts, role hints, and footprint previews still behave as before.
- Confirm Shop, Backpack, build mode, placement, planting, stats, and non-RPG surfaces are unchanged.

Expansion notes saved:

- Later consider a dedicated Archive layout guide tab if the detail panel becomes too dense for phone.
- Later add screenshot proof for Archive detail density on narrow phone viewports.

Phase 104 status:

- Verified.

### Phase 105 Audit

Intended behavior:

- Make placed sanctuary objects feel grounded on the placeholder terrain by drawing a subtle base mat under their art.
- The mat should be driven by the existing catalog collision footprint (`colWidth` x `colHeight`) and the active tile size.
- Grounding should improve Stardew-like placement readability for single-tile and multi-tile objects without changing how placement works.
- Targeted/mechanic-state objects should keep readable state treatment while still using the same grounded footprint.

Negative guarantees:

- This phase must not change movement collision, placement validity, safe-path checks, object persistence, z-order anchoring, interaction targeting, inventory, prices, crop growth, XP, global stats, discovery gates, or non-RPG behavior.
- This phase must not introduce a second footprint source of truth or use visual dimensions for collision/readability mats.
- This phase must not claim final terrain/soil art exists; the mat is a readability layer over current placeholder terrain.

Files changed:

- `app/src/engine/SanctuaryObject.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-104.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Placed objects already use bottom-center anchoring and feet-based z-order, but art could visually float over the honest placeholder grid.
- A subtle footprint mat under the sprite makes the actual occupied footprint readable without changing world state.
- Using `colWidth`, `colHeight`, and `tileSize` keeps the mat aligned with the authoritative collision footprint.

Implementation attack findings:

- `SanctuaryObject` now derives `footprintWidth`, `footprintHeight`, and `footprintLeft` from catalog dimensions.
- A non-interactive `groundingFootprint` view renders before `RpgItemWorldArt`, keeping the art layer above the mat.
- Large, targeted, and mechanic-state objects get slight tone adjustments while retaining the same footprint source.
- `validate:rpg` now guards catalog-footprint-derived grounding and non-interactive rendering.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Place single-tile and multi-tile sanctuary objects and confirm each appears grounded over the grid.
- Long-press/move an object and confirm edit behavior, z-order, and nudge placement remain unchanged.
- Interact with gates/traps/levers and confirm mechanic visual state still reads on top of the grounding mat.
- Confirm avatar collision, placement validity, safe-path rejection, inventory quantities, stats, and non-RPG surfaces are unchanged.

Expansion notes saved:

- Later tune mat opacity with screenshot proof on device if it reads too strong or too faint against final terrain assets.
- Later consider biome/theme-specific ground tint only if it remains driven by existing catalog/layout metadata.

Phase 105 status:

- Verified.

### Phase 106 Audit

Intended behavior:

- Make sanctuary crop plots read as planted beds over the placeholder grid instead of flat debug tiles.
- Decorative garden plots and real food crop plots should share the same layered soil/furrow visual language.
- Growing and mature plots should keep distinct bed tones, while real food plots should visibly reflect existing watered state.
- Crop icons, stage symbols, growth bars, reactions, and interaction targeting should continue to sit on the same tile and z-order.

Negative guarantees:

- This phase must not change crop planting rules, crop growth timing, Water Drops behavior, watering energy cost, rain effects, harvest rewards, season bonuses, plot persistence, placement validity, collision, inventory, XP, global stats, or non-RPG behavior.
- This phase must not claim final farm-soil art exists; it only improves the current placeholder plot read with layered in-world UI.
- This phase must not add crop buttons or controls outside the existing Interact/tool flows.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-105.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Plot rendering already existed for both decorative garden crops and real food crops, but the tile backing was a flat block.
- A small inset soil bed with furrow lines makes planted tiles more legible without changing terrain or crop persistence.
- Food crop watered state already exists in `farming_plots.is_watered`, so using it for a visual tint improves feedback without new mechanics.

Implementation attack findings:

- Garden plots now render `gardenSoilInset` plus three `gardenFurrowLine` rows before crop art.
- Garden soil tint follows existing `growth.stage` state for growing and mature crops.
- Real food crop plots render the same bed and add `gardenSoilWatered` when `plot.is_watered` is true.
- `validate:rpg` now guards the soil bed, furrow lines, growth/mature tint, and watered tint.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Plant or view decorative garden plots at seed, growing, and mature stages and confirm the bed remains readable under the crop icon.
- Plant a real food crop on tilled soil, water it, and confirm the plot tint changes without altering watering behavior.
- Confirm crop reactions, progress bars, Interact harvesting, Watering Can usage, rain growth, and season bonuses remain unchanged.
- Confirm placement/collision, inventory quantities, stats, and non-RPG surfaces are unchanged.

Expansion notes saved:

- Later replace layered placeholder beds with verified final soil/crop sprites when the actual soil asset set is chosen.
- Later add screenshot proof across narrow phone and tablet widths once final crop art candidates are available.

Phase 106 status:

- Verified.

### Phase 107 Audit

Intended behavior:

- Make placed livestock read as farm life in the sanctuary, not just generic placeable props.
- Livestock visuals should derive from existing `animal` and `livestock` catalog tags.
- Placed animals should keep the existing shared world art, footprint anchoring, z-order, long-press move behavior, and Interact product collection.
- The added cue should be non-interactive and subtle: a warmer footprint tone plus a small hay/feed-style mark under the sprite.

Negative guarantees:

- This phase must not change animal product cooldowns, product drops, product inventory grants, discovery, forage flow, object persistence, movement collision, placement validity, z-order anchoring, prices, XP, global stats, or non-RPG behavior.
- This phase must not create a new livestock state model or imply product readiness that the current cooldown system does not expose.
- This phase must not add normal-world buttons or controls.

Files changed:

- `app/src/engine/SanctuaryObject.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-106.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Animal assets and product collection already exist, but the placed world object did not distinguish livestock from other decorative objects until interaction.
- Tag-driven rendering keeps the visual cue aligned with the catalog and avoids hard-coded animal IDs.
- A hay/feed cue communicates farmyard life without inventing readiness, mood, hunger, or product state.

Implementation attack findings:

- `SanctuaryObject` derives `isLivestockObject` from `catalogItem.tags`.
- Livestock uses a warmer grounding footprint style while keeping the same catalog collision footprint.
- A non-interactive `livestockCareCue` renders before `RpgItemWorldArt`, so animal art remains on top.
- `validate:rpg` now guards animal/livestock tag derivation and the distinct livestock visual cue.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Place Chick/Calf/Piglet/Sheep and confirm each has a subtle farm-life cue under the sprite.
- Long-press/move livestock and confirm edit behavior, z-order, and placement remain unchanged.
- Interact with livestock before and after product cooldown and confirm product collection/rest feedback is unchanged.
- Confirm non-animal objects, crops, inventory, stats, and non-RPG surfaces are unchanged.

Expansion notes saved:

- Later surface true product readiness only if the animal cooldown becomes persisted/readable enough to support it honestly.
- Later add livestock-specific idle particles or sound only after performance budgets are measured.

Phase 107 status:

- Verified.

### Phase 108 Audit

Intended behavior:

- Make the sanctuary feel more alive across seasons while final terrain and soil assets are still placeholder-grade.
- The ambience should derive from the existing persisted calendar season and current rain state.
- The season wash should render only in the sanctuary and sit below the rain layer and HUD.
- The effect should be non-interactive and subtle enough that placed objects, plots, grid placeholders, and controls remain readable.

Negative guarantees:

- This phase must not change crop growth, harvest bonuses, rain growth, calendar advancement, animal products, inventory, XP, placement validity, terrain editing, prices, stats, or non-RPG behavior.
- This phase must not create new weather state or make any normal-world UI changes.
- This phase must not replace final asset work; it is a compatible visual bridge for the current placeholder terrain.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-107.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The sanctuary already exposes season/weather in the HUD, but the world surface did not visually react beyond rain streaks.
- A pointer-disabled full-screen tint is compatible with future terrain/soil sprites because it does not alter tile composition, collision, or item rendering.
- Keeping the layer below rain and below the HUD preserves readability while giving the placeholder grid a stronger seasonal mood.

Implementation attack findings:

- `SANCTUARY_SEASON_AMBIENCE` centralizes subtle color and border tones for spring, summer, autumn, and winter.
- The ambience layer renders only when `activeZone === 'sanctuary'`.
- The layer uses `SANCTUARY_SEASON_AMBIENCE[currentSeason]` and adds `seasonAmbienceRain` when `isRaining` is true.
- `validate:rpg` now guards the centralized ambience palette, season-derived render path, rainy variant, and non-interactive overlay.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Enter the sanctuary in each season and confirm the terrain receives a subtle matching ambience wash.
- Toggle or advance into rainy weather and confirm the rainy tint and rain streaks both appear.
- Confirm HUD tabs, weather pill, placement controls, object interaction, crop plots, and avatar movement remain readable and usable.
- Confirm combat/explore zones and non-RPG surfaces do not receive the sanctuary ambience layer.

Expansion notes saved:

- Later replace or tune the wash once final terrain/soil art is layered over the grid.
- Later add season-specific particles or audio only after performance and visual density are measured.

Phase 108 status:

- Verified.

### Phase 109 Audit

Intended behavior:

- Make normal sanctuary play clearer by showing the exact object, crop, plot, or portal that Interact will use.
- The marker should reuse the existing `interactionPrompt.cells` target model so it matches the Interact button's resolved target.
- The marker should render only in the sanctuary during normal play, not while placing or moving objects.
- Crop/plot and portal targets should have distinct tones while object targets keep a warm neutral focus.
- The marker should be non-interactive and stay visually below build placement feedback.

Negative guarantees:

- This phase must not change target resolution, object interaction behavior, crop growth, watering, harvesting, animal products, forage rolls, inventory, XP, stats, placement validity, collision, persistence, dungeon combat, or non-RPG behavior.
- This phase must not enable the old debug reticle for normal play.
- This phase must not add a second targeting source of truth.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-108.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The prompt and action button already know the current Interact target, but the world surface did not clearly show the targeted footprint in normal gameplay.
- Promoting the existing cell model into a polished focus marker avoids stale or mismatched targeting logic.
- Keeping the debug reticle disabled preserves the normal UI while making sanctuary interaction feel more tactile and Stardew-like.

Implementation attack findings:

- `interactionPrompt.cells.map` now renders `sanctuaryTargetCell` when `activeZone === 'sanctuary' && !buildItem`.
- Crop/plot targets use `sanctuaryTargetCropCell`; portals use `sanctuaryTargetPortalCell`; other sanctuary targets use the default warm focus style.
- The existing `SHOW_NORMAL_TARGET_DEBUG` renderer remains separate and disabled.
- `validate:rpg` now guards sanctuary-only normal focus cells, dedicated styles, crop/portal tone variants, stable keys, and pointer-disabled rendering.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Face placed objects, multi-tile objects, decorative garden plots, food crops, and the dungeon portal and confirm the focus cells match the Interact target.
- Start placing or moving an object and confirm the normal focus marker disappears while build placement feedback remains.
- Confirm the Interact prompt, Interact button accessibility label, object reactions, crop actions, and avatar movement remain unchanged.
- Confirm dungeon enemies and non-RPG surfaces do not receive the sanctuary focus marker.

Expansion notes saved:

- Later animate the focus marker subtly if runtime performance leaves headroom.
- Later add richer readiness markers only when the underlying product/crop state can be surfaced honestly.

Phase 109 status:

- Verified.

### Phase 110 Audit

Intended behavior:

- Make declared sanctuary zones remain understandable after a perimeter breach.
- Active zones should keep their existing purpose colors and labels.
- Breached zones should render from the persisted `sanctuaryZones` rows with a warning tint, dashed outline, and breached label.
- Labels should still anchor even if a zone has no interior cells by falling back to perimeter cells.
- This should help repair and customization planning without changing zone logic.

Negative guarantees:

- This phase must not change zone declaration, breach detection, repair detection, `zoneCellMap`, garden tilling gates, pond fishing gates, building plot rules, object placement, persistence, stats, XP, inventory, combat, or non-RPG behavior.
- This phase must not make breached zones active for mechanics; it is visual repair/readability only.
- This phase must not alter the hidden debug zone map behavior.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-109.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Breached zones persist in DB for repair, but the world render previously filtered to active zones only, making broken zones visually disappear.
- Rendering both active and breached zones from the same `sanctuaryZones` state preserves one source of truth.
- Warning visuals communicate broken state without implying the zone is still mechanically active.

Implementation attack findings:

- Zone overlays now render `sanctuaryZones.map(...)` instead of filtering to active zones.
- `getBreachedZoneOverlayColor` supplies warning tints by zone type.
- `zoneOverlayBreached` adds a dashed warning outline while active zones keep existing colors.
- Zone labels now render for active and breached zones, use perimeter fallback keys, and show `Pond/Garden/Building Plot breach` for broken zones.
- `validate:rpg` now guards breached overlay colors, dashed styles, label fallback, and warning labels.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Create a declared Garden/Pond/Building Plot, remove a perimeter piece, and confirm the zone remains visible as breached.
- Replace the missing perimeter piece and confirm the restored active zone returns to the normal purpose color and label.
- Confirm tilling/fishing/building gates still depend on active zones only.
- Confirm normal active zone labels, pending zone candidates, and the hidden debug zone map still behave as before.

Expansion notes saved:

- Later add a tiny repair sparkle or path hint only if repair state needs stronger guidance.
- Later tune breached colors after final terrain and object assets are chosen.

Phase 110 status:

- Verified.

### Phase 111 Audit

Intended behavior:

- Make sanctuary object moving feel more grounded by showing where the selected object started.
- The original-location marker should appear only while moving an existing object in edit mode.
- The marker should use the selected object's catalog collision footprint, not visual sprite dimensions.
- The live placement footprint and ghost remain the authoritative destination preview.
- The marker should be non-interactive and visually lower-priority than the destination footprint.

Negative guarantees:

- This phase must not change object move confirmation, placement validity, collision, avatar blocking, inventory, stash behavior, zone breach/repair, persistence, stats, XP, crop logic, animal products, dungeon behavior, or non-RPG behavior.
- This phase must not create a second placement model or alter `placementReport`.
- This phase must not show the origin marker for fresh placement or planting.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-110.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Edit mode hides the original object while moving it and shows the live ghost, which is correct mechanically but can make layout editing feel floaty.
- Showing the origin footprint improves spatial memory without changing the move transaction or validity checks.
- Using catalog `colWidth`/`colHeight` keeps multi-tile origin markers aligned with collision, not art bounds.

Implementation attack findings:

- `selectedObjectItem` resolves the catalog item for the object being moved.
- Edit mode renders `editOriginFootprint` only when `buildItem?.mode === 'edit' && selectedObject`.
- The marker is positioned at `selectedObject.row/col` and sized with `selectedObjectItem?.colWidth/colHeight`.
- The live build footprint remains rendered separately and above the origin marker.
- `validate:rpg` now guards the selected item lookup, edit-only render condition, catalog footprint sizing, dedicated styles, and `from` label.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Long-press a single-tile object and confirm a subtle `from` footprint remains at its original cell while moving.
- Long-press a multi-tile object and confirm the origin marker matches the collision footprint size.
- Drag or nudge the live ghost and confirm the origin marker stays fixed while destination validity updates.
- Confirm fresh placement and seed planting do not show an origin marker.
- Confirm Move, Stash, zone breach/repair, object collision, and inventory behavior remain unchanged.

Expansion notes saved:

- Later add an optional swap/undo affordance only if the move transaction gains explicit history support.
- Later tune the label if final art makes text too noisy at phone zoom.

Phase 111 status:

- Verified.

### Phase 112 Audit

Intended behavior:

- Start moving the sanctuary grid away from flat color boxes.
- Sanctuary tiles should render a textured pixel-art placeholder layer keyed by the existing `TileType`.
- Water and walls should reuse existing fitting sheet-backed tile renderers where appropriate.
- Grass, path, bridge, tilled, wet soil, ditch, sand, stone slab, wood tile, and portals should get deterministic code-native texture marks until a proper farm/sanctuary tileset is chosen.
- Dungeon tile rendering should remain on its existing tileset path.

Negative guarantees:

- This phase must not change tile enums, collision, water respawn behavior, terrain override persistence, farming/tilling/watering, bridge/path/terrain placement validity, zone logic, object placement, inventory, stats, XP, dungeon behavior, or non-RPG behavior.
- This phase must not claim final terrain sprites exist for bridge/path/tilled soil.
- This phase must not borrow prop art as ground art.

Files changed:

- `app/src/engine/TileArt.tsx`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-111.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The project has strong object and water/wall assets, but no verified matching farm/sanctuary ground tileset yet.
- The existing ruins sand assets are props, not terrain tiles, so wiring them into every ground cell would be misleading.
- A deterministic textured placeholder component improves the grid read now while keeping the real `TileType` model ready for final sprites later.

Implementation attack findings:

- `SanctuaryTerrainTile` centralizes textured placeholder rendering for sanctuary terrain.
- The component reuses `WaterTile` for water and `TilesetTile` wall art for walls.
- Other sanctuary terrain types use code-native pixel texture marks with tone maps, furrows, plank lines, and portal cores.
- The RPG map renderer routes only `activeZone === 'sanctuary'` through `SanctuaryTerrainTile`; dungeon rendering remains unchanged.
- `validate:rpg` now guards the textured placeholder documentation, exported renderer, sanctuary render path, and continued refusal to claim final tracked terrain frames.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Enter sanctuary and confirm grass, path, bridge, tilled, wet soil, ditch, sand, stone slab, wood tile, water, wall, and portal cells no longer read as plain flat boxes.
- Place Bridge/Path/Stone Slab/Wood Tile and confirm only visuals changed; placement validity and inventory consumption remain unchanged.
- Hoe, water, rain, and harvest crops and confirm tile behavior remains unchanged.
- Enter dungeon and confirm dungeon floor/wall rendering remains unchanged.

Expansion notes saved:

- Later replace the code-native texture layer with a verified farm/sanctuary ground tileset.
- Later add auto-tiling edge variants once final terrain art and adjacency rules are chosen.

Phase 112 status:

- Verified.

### Phase 113 Audit

Intended behavior:

- Make placed sanctuary objects feel more integrated with the newly textured terrain layer.
- Object grounding mats should derive a terrain tone from the object's catalog-footprint anchor tile.
- Grass, soil, wet/ditch/water, sand, stone, wood/bridge, and path terrain should have distinct grounding tones.
- The existing livestock, targeted-object, and mechanism-state treatments should remain layered on top of terrain grounding.

Negative guarantees:

- This phase must not change object placement validity, movement collision, safe-path checks, object persistence, item catalog dimensions, inventory, prices, crop growth, animal product logic, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not introduce a second object-position source of truth.
- This phase must not make build ghosts or HUD controls depend on terrain state.

Files changed:

- `app/src/engine/SanctuaryObject.tsx`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-112.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The placed-object renderer already uses catalog collision footprints for base mats, so terrain-aware grounding can reuse that visual footprint without touching placement logic.
- Deriving the terrain from the bottom footprint anchor keeps the read stable for multi-tile objects and matches feet-based z-order expectations.
- Build ghost terrain awareness is intentionally deferred because the ghost position lives in animated shared values; bridging that into React terrain lookup would be a broader state change.

Implementation attack findings:

- `SanctuaryObject` now accepts a `groundType` prop and maps `TileType` values to terrain-specific grounding styles.
- The RPG screen derives `groundType` from current `mapData`, including terrain overrides, using the object's catalog footprint dimensions.
- Existing livestock, targeted, and mechanism-state styles still layer through the same non-interactive footprint view.
- `validate:rpg` now guards the terrain-aware prop, style variants, and RPG-side object-ground lookup.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Place or move objects over grass, path, tilled/wet soil, bridge/wood, stone, sand, and water/ditch-adjacent terrain and confirm grounding tones change without moving the art.
- Confirm livestock still shows the farm-life cue and warm treatment.
- Confirm targeted objects and open/disabled mechanism states remain readable.
- Confirm movement collision, placement validity, object move/stash, inventory, and dungeon behavior are unchanged.

Phase 113 status:

- Verified.

### Phase 114 Audit

Intended behavior:

- Make build/edit placement feel visually grounded on the same terrain system as placed objects.
- The live placement footprint should derive its terrain tone from the current `placementReport` row/col plus selected footprint dimensions.
- Valid/invalid placement feedback should remain the primary signal; terrain tone should appear as a subtle inner wash only.
- Placed-object grounding and placement-footprint grounding should share the same bottom-anchor terrain lookup.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, safe-path checks, object persistence, inventory consumption, stash/move behavior, terrain editing rules, crop planting rules, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not add new build-position state outside `placementReport`/animated placement values.
- This phase must not allow terrain tone to override invalid placement warning colors.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-113.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- `placementReport` is already updated by drag, nudge, begin-place, begin-edit, and plant-mode flows, so deriving visual tone from it avoids a new source of truth.
- The terrain wash is a child layer inside the existing animated placement footprint, which keeps the world transform, z-index, footprint dimensions, and valid/invalid border behavior unchanged.
- Invalid placement needs the red warning state to stay dominant, so the terrain wash is muted when `placementReport.valid` is false.

Implementation attack findings:

- `getFootprintGroundType` centralizes the bottom-anchor terrain lookup for both placed-object grounding and placement-footprint wash.
- `placementGroundType` derives from `placementReport.row`, `placementReport.col`, `buildFootprintCols`, and `buildFootprintRows`.
- `placementTerrainWash` renders inside the world-anchored footprint and supports grass, soil, wet, sand, stone, wood, and path tones.
- `validate:rpg` now guards the shared anchor helper, placement-report terrain derivation, wash layer, terrain variants, and invalid-state wash muting.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing/moving objects over grass, path, tilled/wet soil, bridge/wood, stone, and sand and confirm the footprint wash changes tone.
- Drag/nudge a placement across valid and invalid terrain and confirm red/green validity remains clearer than the wash.
- Confirm plant mode still only plants on valid crop terrain and shows the same footprint dimensions.
- Confirm object persistence, collision, inventory consumption, stash/move, terrain editing, and dungeon behavior remain unchanged.

Phase 114 status:

- Verified.

### Phase 115 Audit

Intended behavior:

- Make the live build/edit object ghost feel grounded while arranging sanctuary objects.
- The object ghost should render a subtle terrain-aware base under its art, separate from the larger placement footprint wash.
- The ghost base should use the selected item's collision footprint dimensions, centered inside the visual sprite box.
- Invalid placement should continue to dim both the ghost art and its grounding base.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, safe-path checks, object persistence, inventory consumption, stash/move behavior, terrain editing rules, crop planting rules, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not change build ghost z-order, world transform, drag/nudge behavior, or placement confirmation.
- This phase must not apply object ghost grounding to plant seed ghosts, which use the seed icon preview path.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-114.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The existing `buildGhostStyle` already anchors the visual sprite by bottom-center, so adding a child base can stay inside the same world transform and z-order.
- Using `buildFootprintCols`/`buildFootprintRows` keeps the base tied to collision footprint dimensions rather than visual sprite dimensions.
- Reusing `placementTerrainWashStyle` keeps terrain tone consistent between the placement footprint and the object ghost without adding a second terrain palette.

Implementation attack findings:

- `buildGhostFootprintWidth`, `buildGhostFootprintHeight`, and `buildGhostFootprintLeft` derive the ghost base geometry from the selected collision footprint.
- The build ghost object branch now renders a non-interactive `buildGhostGrounding` view before `RpgItemWorldArt`.
- Invalid placement applies `buildGhostGroundingInvalid`, while the existing invalid ghost art dimming remains unchanged.
- `validate:rpg` now guards footprint-derived ghost grounding, terrain-aware styling, and invalid-state dimming.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing single-tile and multi-tile objects and confirm a subtle base appears under the ghost art.
- Move an existing object and confirm the live ghost base follows drag/nudge movement without affecting the original-location marker.
- Drag/nudge across valid and invalid cells and confirm the ghost art/base dim while red/green placement feedback remains dominant.
- Confirm plant seed placement, object persistence, collision, inventory consumption, stash/move, terrain editing, and dungeon behavior remain unchanged.

Phase 115 status:

- Verified.

### Phase 116 Audit

Intended behavior:

- Make plant placement read like a future crop plot instead of a loose inventory icon.
- The seed ghost should render a tiny soil bed with furrows under the seed icon.
- Invalid plant placement should keep the existing ghost dimming and also mute the soil bed.
- The preview should remain 1x1 and use the existing build ghost world transform.

Negative guarantees:

- This phase must not change plant placement validity, farming plot persistence, seed inventory consumption, crop growth, watering, harvesting, terrain editing rules, object placement, collision, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not change the food-crop vs decorative-tree planting split.
- This phase must not apply object ghost grounding to plant seed ghosts.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-115.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Existing crop plots already use `gardenSoilInset` and furrow-line language, so the seed ghost should echo that instead of inventing a new placement symbol.
- The seed ghost branch is separate from object ghost rendering, which keeps plant placement distinct from placeable object customization.
- The preview is a child of the existing animated `buildGhostStyle`, so it shares the same world transform, z-index, and 1x1 footprint as plant placement.

Implementation attack findings:

- The seed ghost now renders `seedGhostSoilInset`, `seedGhostFurrowSet`, and three `seedGhostFurrowLine` marks before `RpgItemIcon`.
- Invalid placement applies `seedGhostSoilInvalid` while existing `buildGhostArtInvalid` dimming remains unchanged.
- `validate:rpg` now guards the soil-bed, furrow, and invalid-state treatment for seed placement ghosts.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start planting a food-crop seed and confirm the ghost shows a soil bed/furrows under the seed icon.
- Move the plant ghost over valid tilled soil and invalid terrain and confirm the invalid state still dims clearly.
- Confirm planting still consumes inventory and creates the same food/decorative crop records as before.
- Confirm object placement, terrain editing, crop watering/growth/harvest, collision, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 116 status:

- Verified.

### Phase 117 Audit

Intended behavior:

- Make build placement cells feel more like game UI and less like debug boxes.
- Each occupied placement cell should still be rendered from `placementReport.cells`.
- Valid and invalid cells should keep distinct colors through a soft tile fill and four crisp corner markers.
- Multi-tile objects should keep per-cell readability while the larger placement footprint/ghost remains unchanged.

Negative guarantees:

- This phase must not change placement validity, placement report generation, collision, avatar blocking, safe-path checks, object persistence, inventory consumption, stash/move behavior, terrain editing rules, crop planting rules, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not remove per-cell invalid feedback.
- This phase must not change build ghost z-order, world transform, drag/nudge behavior, or placement confirmation.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-116.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- `placementReport.cells` is already the authoritative per-cell placement result, so marker polish can stay attached to that map without adding state.
- The existing 3px full-cell border made multi-cell placement readable but too debug-like beside the new terrain/object/ghost grounding.
- Corner markers preserve per-cell validity while letting terrain, footprint wash, and ghost art remain visible.

Implementation attack findings:

- Placement cells now apply `placementCellValid`/`placementCellInvalid` instead of inline border/fill colors.
- Each placement cell renders four non-interactive corner marker views.
- Corner marker color is derived from `cell.valid`, matching the cell-level validity state.
- `validate:rpg` now guards placement-report-driven cells, corner markers, and per-cell valid/invalid marker styling.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Place single-tile and multi-tile objects and confirm each occupied cell has corner markers.
- Drag/nudge across invalid terrain, occupied cells, avatar cells, and safe-path failures and confirm per-cell invalid feedback remains visible.
- Confirm the larger placement footprint, build ghost, plant ghost, object placement, inventory consumption, stash/move, crop planting, collision, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 117 status:

- Verified.

### Phase 118 Audit

Intended behavior:

- Make build mode explain the current placement state inside the build pad, not only through color.
- The build pad should show a compact reason/hint chip derived from `placementReport.valid` and `placementReport.reason`.
- Valid placement should show a positive action hint such as place/move/plant here.
- Invalid placement should show short actionable hints for terrain, occupied cells, avatar blocking, trapped avatar, blocked portal, and unavailable states.

Negative guarantees:

- This phase must not change placement validity, placement report generation, collision, avatar blocking, safe-path checks, object persistence, inventory consumption, stash/move behavior, terrain editing rules, crop planting rules, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not introduce a new placement state source outside `placementReport`.
- This phase must not change build ghost z-order, world transform, drag/nudge behavior, or placement confirmation.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-117.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The build pad already disables placement from `placementReport.valid`, so a chip can mirror that state without affecting interaction.
- Keeping reason copy short avoids crowding the small build pad and preserves the nudge controls as the primary command surface.
- Deriving labels and hints in render scope is enough because the source state already updates through drag/nudge/build-start flows.

Implementation attack findings:

- `placementStatusLabel` mirrors `placementReport.valid`/`placementReport.reason`.
- `placementStatusHint` maps placement report states to compact action hints.
- The build pad renders `buildPlacementReasonChip` below the header with valid/invalid tone styling.
- `validate:rpg` now guards placement-report-derived labels, hints, and chip rendering.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Place, move, and plant while nudging over valid cells and confirm the chip shows the matching positive action.
- Nudge over terrain, occupied cells, avatar cells, trapped-avatar, and blocked-portal cases and confirm the chip changes without enabling placement.
- Confirm placement validity, object persistence, inventory consumption, crop planting, collision, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 118 status:

- Verified.

### Phase 119 Audit

Intended behavior:

- Make the build pad identify the exact sanctuary item or seed currently being placed.
- The pad should show a compact item icon, item label, and mode hint above the role/layout context.
- Place, edit, and plant modes should each use a short mode hint without changing placement behavior.
- The row should use the existing `buildPreviewItem`/`buildItem` data and fit within the compact build pad.

Negative guarantees:

- This phase must not change placement validity, placement report generation, collision, avatar blocking, safe-path checks, object persistence, inventory consumption, stash/move behavior, terrain editing rules, crop planting rules, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not introduce a new selected-item state source outside existing build mode data.
- This phase must not change build ghost z-order, world transform, drag/nudge behavior, or placement confirmation.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-118.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The build pad already contains role, fit, footprint, and placement status, but the exact item identity was only visible through world ghost/name text elsewhere.
- Reusing `RpgItemIcon` keeps the identity row aligned with backpack/shop/archive visual language.
- The row is compact and truncates text to avoid pushing nudge controls out of reach on small screens.

Implementation attack findings:

- The build pad now renders `buildItemIdentityRow` inside `buildInfoBlock`.
- `RpgItemIcon` receives `buildPreviewItem` and `buildItem.itemId` as fallback label.
- The identity name derives from `buildPreviewItem?.name ?? buildItem.label`.
- The mode hint distinguishes edit, plant, and place modes without changing any mode logic.
- `validate:rpg` now guards the selected-item identity row and active build-item-derived label/mode text.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing an object and confirm the build pad shows its icon/name and sanctuary-piece mode hint.
- Move an existing object and confirm the row shows the selected object identity with adjusting-layout hint.
- Start planting a seed and confirm the row shows seed/crop identity with future-crop-plot hint.
- Confirm placement validity, object persistence, inventory consumption, crop planting, collision, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 119 status:

- Verified.

### Phase 120 Audit

Intended behavior:

- Make sanctuary terrain art asset-ready by moving tile tones, patterns, and future replacement slots into a shared registry.
- Keep current terrain honest as code-native placeholder art until final soil/path/floor assets exist.
- Make sanctuary grid tiles receive neighboring terrain so placeholder paths, soil, sand, floors, bridges, and portals can show transitional edge treatment.
- Make placement footprint wash, build ghost grounding, and seed ghost soil preview read colors from the same terrain registry instead of duplicating tone mappings in `rpg.tsx`.

Negative guarantees:

- This phase must not change TileType values, collision rules, terrain edit rules, persistence, farming growth, crop planting validity, object placement validity, avatar movement, shop/backpack/archive behavior, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not claim final bridge/path/soil sprite frames exist.
- This phase must not change map dimensions, saved terrain override semantics, object footprint geometry, placement confirmation, inventory consumption, or stash/move behavior.

Files changed:

- `app/src/engine/TileArt.tsx`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-119.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The old tile renderer was centralized, but its art metadata was embedded directly in render logic.
- Placement/build preview tone mapping duplicated terrain colors in `rpg.tsx`, which would drift once real terrain assets arrive.
- Neighbor-aware visual edges can be driven from TileType data without changing collision, farming, or saved terrain state.

Implementation attack findings:

- `SANCTUARY_TERRAIN_ART_REGISTRY` defines asset slots, renderer kind, placeholder pattern, tone, and edge blending per TileType.
- `SanctuaryTerrainTile` still renders water/wall from existing sheets and all other sanctuary terrain as honest placeholders.
- Sanctuary grid rendering passes `getSanctuaryTerrainNeighbors(rowIndex, colIndex)` into each tile.
- Placement footprint wash, object build ghost grounding, and seed ghost soil preview use `getSanctuaryTerrainPreviewColor`.
- `validate:rpg` now guards the terrain registry, neighbor-aware rendering, and shared preview color path.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Inspect sanctuary grass, path, tilled, wet soil, sand, ditch, bridge, stone slab, wood tile, and portal tiles for readable placeholder texture and edge transitions.
- Place, move, and plant over multiple terrain types and confirm placement/build/seed previews keep terrain-toned grounding.
- Confirm collision, terrain editing, crop planting, object persistence, inventory consumption, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 120 status:

- Verified.

### Phase 121 Audit

Intended behavior:

- Make sanctuary placeholder terrain feel less repetitive while final assets are still pending.
- Add deterministic per-cell visual variation to registry-backed terrain tiles using only row, column, and TileType.
- Let grass, path/sand, soil/ditch, plank/floor, and portal placeholders vary small decorative details without changing the map model.
- Preserve the asset-ready registry path so final sprites can replace placeholder details later.

Negative guarantees:

- This phase must not change TileType values, collision rules, terrain edit rules, saved terrain overrides, farming growth, planting validity, object placement validity, avatar movement, persistence, inventory consumption, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not introduce random runtime terrain rendering that changes between renders.
- This phase must not claim final terrain sprites exist or add asset dependencies outside RPG terrain rendering.

Files changed:

- `app/src/engine/TileArt.tsx`
- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-120.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The Phase 120 registry made terrain asset-ready, but repeated placeholder tiles still looked mechanically cloned.
- Stable coordinate-derived variation gives a more organic Stardew-like grid without adding state, persistence, timers, randomness, or asset loading.
- Keeping variation inside `SanctuaryTerrainTile` preserves one terrain art pipeline for real grid rendering and future sprite replacement.

Implementation attack findings:

- `SANCTUARY_TERRAIN_ART_REGISTRY` now includes a `detail` profile for each TileType.
- `SanctuaryTerrainTile` accepts an optional `variant` prop and normalizes it to four stable variants.
- Grass tiles can render tiny tufts; path/sand can render speckles; soil/ditch and plank/floor details shift subtly per variant.
- Sanctuary grid rendering passes `getSanctuaryTerrainVariant(rowIndex, colIndex, tile as TileType)` into each tile.
- `validate:rpg` now guards detail profiles, deterministic variation support, and the grid variation callsite.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Inspect sanctuary grass, path, sand, tilled/wet soil, ditch, bridge, stone slab, wood tile, and portals to confirm stable non-repeating placeholder detail.
- Confirm leaving/re-entering sanctuary or re-rendering does not randomly reshuffle terrain visuals.
- Confirm collision, terrain editing, crop planting, object placement, persistence, inventory consumption, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 121 status:

- Verified.

### Phase 122 Audit

Intended behavior:

- Make Bridge/Path/Stone Slab/Wood Tile placement preview the terrain tile that will actually be painted.
- Reuse the shared `SanctuaryTerrainTile` renderer for terrain edit ghosts so placeholder and future real terrain art stay in one pipeline.
- Keep terrain mode as a one-cell build footprint with valid/invalid feedback and stable per-cell variation.
- Label terrain mode as painting/terrain paint in the build pad instead of generic object placement.

Negative guarantees:

- This phase must not change terrain edit validity rules, TileType values, collision, persistence, inventory consumption, terrain override semantics, crop planting, object placement, object movement, avatar movement, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not introduce final terrain sprite claims or new asset dependencies.
- This phase must not change build confirmation behavior; it remains the existing `setSanctuaryTile` path for terrain mode.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-121.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Terrain edit items already use the build-mode placement report and confirm flow, but the visual ghost path was object/seed-oriented.
- A one-tile `SanctuaryTerrainTile` ghost makes the target result legible without changing any placement or inventory logic.
- Using footprint anchoring keeps terrain previews in the same world transform and z-order family as other placement feedback.

Implementation attack findings:

- `buildTerrainTile` derives the target TileType from existing `TERRAIN_EDIT_TILE`.
- Build shared values treat terrain mode as `1x1`, preserving drag and nudge footprint behavior.
- The build preview branch includes `buildTerrainTile !== null` and renders a dedicated `terrainGhostTile`.
- The terrain ghost reuses `SanctuaryTerrainTile`, neighbor lookup, and deterministic terrain variant seed.
- Build pad copy now distinguishes terrain paint/painting from object placement and planting.
- `validate:rpg` now guards terrain tile preview state, dedicated styles, shared renderer reuse, and terrain-mode labels.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing Bridge Kit, Path, Stone Slab, and Wood Tile and confirm the ghost shows the target tile art.
- Drag/nudge terrain paint over valid and invalid cells and confirm the tile ghost dims while placement remains blocked.
- Confirm terrain edit confirmation still consumes the item, writes the same terrain override, and leaves object/crop/dungeon/non-RPG behavior unchanged.

Phase 122 status:

- Verified.

### Phase 123 Audit

Intended behavior:

- Make terrain painting clearer in the build pad by showing the current tile and target tile side by side.
- Reuse `SanctuaryTerrainTile` for both swatches so the pad, ghost, and grid share one terrain art pipeline.
- Use existing placement report and TileType state only; no new persistence or selection state.
- Keep labels readable through `getTileDisplayName`.

Negative guarantees:

- This phase must not change terrain edit validity rules, TileType values, collision, persistence, terrain override semantics, inventory consumption, crop planting, object placement, object movement, avatar movement, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not add final terrain sprite claims or asset dependencies.
- This phase must not change build confirmation behavior or placement report generation.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-122.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- The terrain ghost shows the target on the grid, but the build pad did not explain the transformation from current ground to target ground.
- A compact before/after row improves customization confidence without changing the placement model.
- Reusing the terrain renderer keeps placeholder and future real terrain art consistent.

Implementation attack findings:

- `terrainPaintFromTile` derives from `placementGroundType` only when terrain paint mode is active.
- The build pad renders `terrainPaintSwapRow` only for terrain mode.
- Both swatches use `SanctuaryTerrainTile`, `getSanctuaryTerrainNeighbors`, and `getSanctuaryTerrainVariant`.
- Swatch labels use `getTileDisplayName` for current and target TileType names.
- `validate:rpg` now guards the swatch derivation, rendering, shared tile art, and labels.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Start placing Bridge Kit, Path, Stone Slab, and Wood Tile and confirm the build pad shows current -> target terrain swatches.
- Move the paint target across different ground types and confirm the current swatch updates while the target stays the selected terrain.
- Confirm terrain edit confirmation, inventory consumption, terrain overrides, object/crop/dungeon behavior, and non-RPG behavior remain unchanged.

Phase 123 status:

- Verified.

### Phase 124 Audit

Intended behavior:

- Make terrain paint items understandable before entering build mode.
- Show the target terrain tile for Bridge Kit, Path, Stone Slab, and Wood Tile in Backpack, Shop, and Archive detail panels.
- Reuse the shared sanctuary terrain tile renderer so browse previews, build pad swatches, build ghosts, and grid tiles stay visually aligned.
- Keep Archive terrain target previews behind the same discovered/known gate as existing footprint previews.

Negative guarantees:

- This phase must not change terrain edit validity rules, TileType values, collision, persistence, terrain override semantics, inventory consumption, crop planting, object placement, object movement, avatar movement, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not add final terrain sprite claims or new external asset dependencies.
- This phase must not change filtering, sorting, purchase, sale, placement, planting, or archive unlock behavior.

Files changed:

- `app/src/engine/SanctuaryTerrainPaintPreview.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-123.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Terrain paint items had clear in-world previews, but browse/detail panels still treated them like ordinary 1x1 objects.
- A shared target preview is enough because these items paint a single known TileType and do not need current-ground context until placement.
- Keeping the target mapping inside a display component avoids touching gameplay terrain edit confirmation logic.

Implementation attack findings:

- `SanctuaryTerrainPaintPreview` maps the four terrain paint item IDs to target TileTypes.
- The component renders a compact target tile swatch with `SanctuaryTerrainTile` and `getTileDisplayName`.
- Backpack detail panel renders the shared preview for selected terrain paint stacks.
- Shop detail panel renders the shared preview for selected terrain paint catalog entries.
- Archive detail panel renders the shared preview only when the selected entry is previewable.
- `validate:rpg` now guards the shared component, target mappings, renderer reuse, and all three detail panel callsites.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `npm run test:all`
- Passed: `git diff --check`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Select Bridge Kit, Path, Stone Slab, and Wood Tile in Backpack and confirm target terrain previews render.
- Select terrain paint entries in Shop and confirm target terrain previews render without changing purchase behavior.
- Select discovered/known terrain paint entries in Archive and confirm previews render while locked entries remain gated.
- Confirm filtering, sorting, buying, selling, placing, terrain painting, inventory consumption, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 124 status:

- Verified.

### Phase 125 Audit

Intended behavior:

- Make terrain-paint items visually identifiable in browse/card surfaces, not only after selection.
- Use the same target TileType mapping and `SanctuaryTerrainTile` renderer as the Phase 124 detail previews.
- Show compact target-tile swatches for Bridge Kit, Path, Stone Slab, and Wood Tile in Backpack slots and Shop cards.
- Show compact target-tile swatches in discovered Archive entry rows while locked entries keep the normal lock treatment.
- Keep `RpgItemIcon` backward compatible for existing callers that do not have an item id.

Negative guarantees:

- This phase must not change terrain edit validity rules, TileType values, collision, persistence, terrain override semantics, inventory consumption, crop planting, object placement, object movement, avatar movement, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not add final terrain sprite claims or new external asset dependencies.
- This phase must not change filtering, sorting, purchase, sale, placement, planting, crafting, archive unlock, discovery, or research behavior.

Files changed:

- `app/src/engine/SanctuaryTerrainPaintPreview.tsx`
- `app/src/engine/RpgItemIcon.tsx`
- `app/src/engine/RpgBackpack.tsx`
- `app/src/engine/SanctuaryShop.tsx`
- `app/src/engine/RpgArchive.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-124.
- Unrelated files should remain untouched unless a later RPG phase explicitly owns them.

Design attack findings:

- Phase 124 made selected terrain-paint entries understandable, but the browse grids still showed terrain-paint items as generic object icons.
- The shared icon must stay id-driven because terrain-paint behavior is keyed by item id, not by item name or visual tags.
- Archive list art must respect discovery gating so locked entries do not reveal terrain target colors before discovery.

Implementation attack findings:

- `SanctuaryTerrainPaintIcon` now renders a compact target tile swatch using `SanctuaryTerrainTile`.
- `RpgItemIcon` accepts an optional `itemId` and swaps in `SanctuaryTerrainPaintIcon` only when the id maps to a terrain target.
- Backpack slots pass `slot.item_id` into `RpgItemIcon`.
- Shop cards pass catalog ids into `RpgItemIcon`.
- Archive entry art checks the entry item id and renders compact terrain swatches only after discovery; locked entries keep the existing lock path.
- `validate:rpg` now guards the compact icon export, item-icon override, and browse/card callsites.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Browse Backpack slots containing Bridge Kit, Path, Stone Slab, and Wood Tile and confirm they show target terrain swatches.
- Browse Shop cards for terrain-paint entries and confirm they show target terrain swatches without changing purchase behavior.
- Browse Archive entries and confirm discovered terrain-paint rows show swatches while locked entries keep the lock treatment.
- Confirm selected detail previews from Phase 124 still render.
- Confirm filtering, sorting, buying, selling, placing, terrain painting, inventory consumption, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 125 status:

- Verified.

### Phase 126 Audit

Intended behavior:

- Make build/edit placement easier to read at a glance while customizing the sanctuary.
- Show footprint size, clear-cell count, and hovered terrain inside the existing contextual build pad.
- Derive all placement stats from the shared `placementReport`, selected footprint dimensions, and terrain preview lookup.
- Keep the visible world footprint, ghost, nudge controls, and confirm/cancel actions unchanged.

Negative guarantees:

- This phase must not change placement validity, collision, avatar blocking, terrain edit rules, persistence, inventory consumption, crop planting, object placement, object movement, prices, XP, stats, dungeon behavior, or non-RPG behavior.
- This phase must not add new runtime state for placement stats or create a second placement source of truth.
- This phase must not change filtering, sorting, purchase, sale, crafting, archive unlock, discovery, or research behavior.

Files changed:

- `app/app/rpg.tsx`
- `app/scripts/validate-rpg-content.js`
- `RPG_SANDBOX_PHASE_PLAN.md`

Current dirty worktree separation:

- In-scope: files listed above plus earlier in-progress RPG sanctuary UI/build files from Phase 89-125.
- Existing non-RPG wallpaper crash guard remains separate and should not be mixed into RPG phase claims.

Design attack findings:

- Build mode already showed footprint cells in-world, but the pad did not summarize whether the footprint was mostly clear or what terrain it was hovering.
- A compact stat row improves direct-manipulation readability without changing the authoritative placement report.
- The clear-cell chip should reflect validity styling so invalid placements are readable even when the world footprint is partly obscured.

Implementation attack findings:

- `placementTotalCells` and `placementClearCells` derive directly from `placementReport.cells`.
- `buildFootprintSummary` derives from the selected footprint dimensions already used by placement and previews.
- `placementGroundLabel` derives from `getTileDisplayName(placementGroundType)`.
- The build pad now renders Size, Clear, and Ground chips above the footprint preview.
- `validate:rpg` now guards the derived stats, row rendering, chip labels, clear count, ground label, and validity styling.

Verification evidence:

- Passed: `npm run validate:rpg`
- Passed: `npx tsc --noEmit`
- Passed: `git diff --check`
- Passed: `npm run test:all`
- Passed: `npx expo export --platform ios --output-dir /private/tmp/prodewty-rpg-phase-check`

Manual test checklist:

- Enter sanctuary build mode for a 1x1 item and confirm the build pad shows Size 1x1, Clear 1/1 when valid, and the hovered ground label.
- Move a multi-tile object and confirm the Size and Clear counts update from the active footprint.
- Hover an invalid placement and confirm the Clear chip switches to warning styling without enabling Place.
- Confirm drag, nudge, cancel, place, move, stash, terrain paint, planting, collision, inventory consumption, dungeon behavior, and non-RPG behavior remain unchanged.

Phase 126 status:

- Verified.
