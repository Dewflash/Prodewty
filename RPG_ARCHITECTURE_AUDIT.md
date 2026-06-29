# RPG Architecture Audit (2026-06-28)

Written before any further implementation, at your request, to lay out
exactly what exists, what's live, what's dormant, and what's missing —
so the next round of architecture decisions is made with full information.

## TL;DR — the one finding that matters most

**There are two parallel, mostly-disconnected implementations of the same
game living in this codebase.**

- **System A ("Live")**: everything reachable from `app/rpg.tsx`. This is
  what actually runs when you open the RPG screen today. Built up over
  several sessions (mine and others), it has its own Crafting, its own
  tool-equip system, its own Sanctuary object/forage/shop loop, its own
  Dungeon combat.
- **System B ("Dormant")**: a much larger, more systemically "complete"
  Stardew-style game engine — farming plots with tilling/energy costs,
  fishing, cooking, equipment slots, tool tiers with upgrades, a shipping
  bin economy, a calendar/sleep system, full villager relationships with
  gift-taste, livestock, processors, automation generators, geodes, a
  separate procedural mine, separate procedural Expedition zones, and a
  proper turn-based combat engine with crit/defense. **None of it is
  imported by any screen.** The SQLite tables for all of it exist (schema
  migrations create them unconditionally on every app start), but zero UI
  reads or writes them.

This means: most of what you described today (masteries, buildings,
crafting gated by a building, tools, NPCs, archive/museum) **already has
backend code written for it** — just not the version I started building
this morning, and not connected to the screen you actually play.

Three concrete duplication conflicts I found, called out because they
matter for any reconciliation decision:

| Concern | System A (live) | System B (dormant) |
|---|---|---|
| Tool equipping | `equippedTool` React state in `rpg.tsx`, 5 hardcoded tools (shovel/bridge/path/plow/watering), no tiers, no persistence beyond a terrain-overrides table | `player_equipment` SQLite table + `EquipmentCatalog.ts`/`equipment.ts` — a real persisted equip-slot system (weapon/armor/accessory/**tool**) |
| Tools themselves | Flat list in `rpg.tsx`, no upgrade path | `ToolCatalog.ts` — Axe/Pickaxe/WateringCan/Hoe/Sword/FishingRod, each with Basic→Copper→Iron→Gold tiers and upgrade costs |
| Crafting | Inline `CRAFTING_RECIPES` array in `rpg.tsx`, instant-craft, 3 recipes | `CraftingCatalog.ts` + `crafting.ts` + `crafting_queue` table — timed jobs (`startCrafting`/`claimCrafting`), building-aware (`buildingObjectId` param already exists!) |
| Plots | `garden_plots` table, `garden.ts`, used live for planting/harvest | `farming_plots` table, `farming.ts` — `tillSoil`/`plantSeed` with energy costs, a different plot model entirely |

This morning's Plow-tool/tilled-soil work (which made planting require
tilling) was me **half-reinventing** what `farming.ts`'s `tillSoil` already
does properly, persisted, with energy cost — I didn't know it existed.

## System A — what's actually live in `app/rpg.tsx` today

Confirmed by reading the file directly, not inferred:

**Movement & world**
- Reanimated joystick, per-frame axis-independent collision, centered
  camera, pinch-zoom, responsive tile size (`getResponsiveTileSize`)
- Two zones: Sanctuary (20×20) and Dungeon (20×20), portal-linked
- Sanctuary terrain overrides table (dig→river, bridge, path, tilled soil)
  — persisted, but a different mechanism than `farming.ts`'s tilling

**Sanctuary sandbox**
- Drag-to-place building (`SanctuaryObject`/`SanctuaryShop`), 5 CraftPix
  object packs (forest/crystal/bush/cave/temple)
- Forage drops, crop growth (seed→sapling→tree) via `garden.ts`
- Object mechanisms: levers toggling linked gates/traps
- Weather (`isRaining`) tied to streak days, **seasons** (`SEASON_CONFIG`,
  4 seasons cycling off real calendar month) giving harvest bonuses
- **Clutter system**: weeds/twigs/rocks spawn at fixed coords, cost energy
  to clear (`CLUTTER_ENERGY_COST`)
- **Energy/MP**: `playerHp.mp`, 0-100, tools cost energy (`TOOL_ENERGY_COST`)
- **Crafting panel**: instant-craft, 3 hardcoded recipes (wood+leaves→
  planter, crystal+wood→lamp, wood+crystal→chest)
- **Tool-equip system** (built this morning): Shovel/Bridge Kit/Path/Plow/
  Watering Can, real Backpack items (`kind:'tool'`), Equip button, a
  5-slot hotbar, avatar badge
- **Character panel** (`isCharacterOpen`) — portrait, HP/Energy bars, a
  tool-slot selector. This already covers a good chunk of "character
  screen where he has tools" — built on top of my `equippedTool` state,
  not a separate system
- Coin Mine (Test) — the explicit free-money testing item from earlier

**Dungeon**
- Enemies (`Enemies.ts`): orc, brute, boss — chase AI, contact damage to
  real `rpg_state.hp`, persistent kills (`dungeon_enemy_kills` table)
- Attack button computes ATK from real stats, kills drop loot/coins
- Real tileset art for ground/walls (Dungeon only — Sanctuary uses flat
  colors, fixed this morning after finding the wrong-tileset bug)

**Economy**
- Coins on real `rpg_state.coins`; resources (leaves/wood/water drops/
  crystal shards) sellable from Backpack at fixed prices
- Dungeon entry costs 20 coins

## System B — dormant, fully coded, zero UI wiring

Grouped by domain. Every function listed is real, exported code — I read
each file's exports directly, this isn't guessed from filenames.

**Farming & resources**
- `farming.ts` — `tillSoil`, `plantSeed`, energy-gated, own `farming_plots` table
- `resources.ts` — `RESOURCE_CATALOG`, `spawnResourceNode`, `resource_nodes` table
- `geodes.ts` — `breakGeode`

**Animals & processing**
- `animals.ts` — `buyAnimal`, `feedAnimal`, `petAnimal`, `rpg_animals` table
- `livestock.ts` — `registerLivestock`/`getLivestock`, `sanctuary_livestock` table
- `processors.ts` — `registerProcessor`, `startProcessing` (input→output, timed), `sanctuary_processors` table
- `automation.ts` — `GENERATOR_CATALOG`, `tickGenerators` (passive resource generators)
- `BuildingCatalog.ts` — Coop/Barn/Furnace, priceCoins/Wood/Stone, footprint (colWidth×colHeight)
- `cooking.ts` / `CookingCatalog.ts` — `cookRecipe`
- `food.ts` — `FOOD_CATALOG`, `consumeFood`

**Crafting, tools & equipment**
- `crafting.ts` / `CraftingCatalog.ts` — timed `startCrafting`/`claimCrafting`, building-aware, `crafting_queue` table
- `equipment.ts` / `EquipmentCatalog.ts` — `equipItem`, 4 slots (weapon/armor/accessory/**tool**), `player_equipment` table
- `ToolCatalog.ts` / `tools.ts` — tool tiers (Basic→Copper→Iron→Gold), `upgradeTool`
- `upgrades.ts` — generic building-upgrade system, `UPGRADE_CATALOG`

**Villagers & social**
- `villagers.ts` / `VillagerCatalog.ts` / `VillagerAI.ts` — spawn, schedule, movement AI
- `relationships.ts` — friendship points (max 2500), gift-taste (loved/liked/neutral/disliked/hated), max 2 gifts/week
- `villager_dialogue_log` table — dialogue already has a "shown before" tracking mechanism

**Construction**
- `construction.ts` / `ConstructionCatalog.ts` — timed builds (e.g. Blacksmith Hut 4hrs, Explorer Tent 2hrs "grants access to uncharted worlds", Villager House "might attract a villager")

**Combat & exploration**
- `combat.ts` — turn-based combat with crit/defense, per-zone state
- `grid_combat.ts` — `swingWeapon` against `mine_entities`
- `mines.ts` — `getOrGenerateMineFloor`, `resetMinesOvernight` — a whole separate procedural mine, distinct from the Dungeon
- `exploration.ts` / `zones.ts` / `ZoneCatalog.ts` — `travelToZone`, `exploration_zones`/`zone_progress`/`zone_loot_claims` tables — this is almost certainly meant to be your "Expedition" region
- `EnemyCatalog.ts`, `CombatEngine.ts`, `SpawningEngine.ts`, `BiomeCatalog.ts`, `BiomeGenerator.ts` — supporting infrastructure for the above

**Economy & progression**
- `shipping.ts` — `depositToShippingBin`, `processShippingBin` (sell while you sleep, Stardew-style)
- `museum.ts` — `donateToMuseum` — likely where "archive redaction" logic should live
- `skills.ts` — mastery system, **but 5 categories (farming/mining/combat/foraging/fishing), not your 9**
- `MarketEngine.ts` — unread in detail, name suggests NPC trading

**Time**
- `time.ts` / `Calendar.ts` / `TimeEngine.ts` / `GameTicker.tsx` / `EventGenerator.ts` — `getCalendarState`, `sleepOvernight`, `fastForwardTime` — a full day/season clock, separate from `rpg.tsx`'s lightweight `SEASON_CONFIG`

## Full schema table inventory

~60 tables total in `schema.ts`. Most are unrelated to RPG (activity
logs, bible, finance, onboarding, etc. — the main app's existing
features). RPG-relevant ones, marked by which system actually uses them:

**System A (live)**: `rpg_state`, `garden_plots`, `sanctuary_objects`,
`sanctuary_terrain_overrides`, `sanctuary_object_interactions`,
`sanctuary_object_relations`, `sanctuary_reward_claims`,
`dungeon_enemy_kills`, `user_inventory`, `rpg_discoveries`

**System B (dormant)**: `farming_plots`, `resource_nodes`, `rpg_animals`,
`sanctuary_livestock`, `sanctuary_processors`, `sanctuary_constructions`,
`sanctuary_generators`, `crafting_queue`, `player_equipment`, `villagers`,
`rpg_relationships`, `villager_relationships`, `villager_dialogue_log`,
`mine_floors`, `mine_entities`, `exploration_zones`, `zone_progress`,
`zone_loot_claims`, `rpg_museum_donations`, `shipping_bin`, `bounties`,
`rpg_quests`

**Unclear / likely migration artifacts** (named like duplicates of live
tables — worth checking if these are stale or a half-finished migration):
`user_inventory_normalized`, `garden_plots_normalized`

## What's missing from BOTH systems (genuine gaps)

Nothing in either system matches what you described today exactly:

- **Your 9-mastery taxonomy** (crafting/farming/livestock/language/
  trading/hunting/attacking/surviving/research) — `skills.ts` has a
  *different* 5-category system. Needs reconciling, not building fresh.
- **Your 6 named buildings** (Town Hall/Workshop/Tool Shed/Factory/
  Library/Market) — don't exist in `BuildingCatalog.ts` or
  `ConstructionCatalog.ts` (which has Blacksmith Hut, Explorer Tent,
  Villager House, Barn, Coop, Furnace, Cheese Press, Loom, Mayonnaise
  Machine — a different building roster entirely).
- **Archive `???`-until-Library+Research+rarity redaction** — `museum.ts`
  exists (`donateToMuseum`) but I haven't read deep enough to know if it
  already redacts names; the live Archive (`RpgArchive.tsx`) shows full
  names with no redaction at all today.
- **Your 3-region split** (open fields / Dungeon / Expedition as separate
  named regions) — System B's `exploration.ts`/`zones.ts` is the closest
  match for "Expedition" but isn't connected to anything, including the
  live Sanctuary/Dungeon pair.
- **4×4 building footprints with a 2×2 working core, map-scale increase**
  — no building in either system uses a 4×4/2×2 footprint convention; the
  closest precedent (`BuildingCatalog.ts`) uses irregular sizes (Coop
  6×3, Barn 7×4, Furnace 1×1).

## Decisions made (2026-06-28, after this doc was first read)

- **System B is source of truth.** Reuse System A pieces where they're
  good; otherwise rebuild against System B's tables/catalogs.
- **Exception: keep System A's real-time engine for the Dungeon** —
  joystick movement, chase AI, contact damage. System B's `combat.ts`/
  `grid_combat.ts` is turn-based (one-call `attackEnemy` resolution) and
  would be a worse-feeling downgrade for the one combat loop that's
  already built and plays well.
- **Backend/frontend naming is now a deliberate split** — internal code
  uses generic role names; the player sees flavorful Stardew-ish names.
  This needs to be a maintained table, not tribal knowledge:

  | Backend term (code, gating logic) | Frontend name (what the player sees) | Notes |
  |---|---|---|
  | Workshop | "Blacksmith Hut" | Already exists in `ConstructionCatalog.ts`, just needs the backend role recognized |
  | Expedition Gate | "Explorer Tent" | Already exists ("grants access to uncharted worlds"); placed at corners of the Sanctuary map |
  | Archive | "Museum" | Same system, two names depending on context |
  | Donate (`museum.ts`'s `donateToMuseum`) | "Inspect" | Re-flavored: bring the item back in your inventory, submit it to the Library, research on it |
  | ToolShed | "Tinker's Hollow" | Set 2026-06-28 in `BuildingCatalog.ts` |
  | Factory | "Artisan Mill" | Already set in `BuildingCatalog.ts` |
  | Library | "Forgotten Chamber" | Already set in `BuildingCatalog.ts` |
  | Market | "Wanderer's Bazaar" | Already set in `BuildingCatalog.ts` |
  | TownHall | "Village Hearth" | Already set in `BuildingCatalog.ts` |

  This table should grow as more buildings/mechanics get frontend names —
  treat it as the single source of truth for "what does the code call this
  vs. what does the player see."

- **Archive/Museum mechanic, fully specified:**
  - "Donate" is reframed as **Inspect** — you keep owning the item; it's
    not consumed-once like `museum.ts` currently does. Bringing it to the
    Library and inspecting it is what starts the research process.
  - **Discovery and Understanding are two separate gates**, not one:
    - *Discovery* = the item is logged in the Archive, visible as `???`
      (you know it exists). Unlocked by reaching the mastery tier **one
      below** the item's own rarity tier.
    - *Understanding* = the `???` resolves to the real name/identity.
      Requires reaching the mastery tier that **matches** the item's own
      rarity tier.
  - Example given: tiers are Bronze (mastery rank 1) → Silver (rank 2) →
    Gold (rank 3). Reaching Bronze unlocks *discovery* of Silver-rarity
    items (you can see them logged as `???`), but you need to actually
    reach Silver mastery to *understand* (reveal) them. You can own a
    `???` item for a long time without ever understanding it.
  - Assumption I'm carrying forward (not yet confirmed): this Bronze/
    Silver/Gold discovery/understanding ladder is checked against
    **Research mastery specifically** for Archive purposes, not
    independently per-mastery-type. Flagging this as an assumption rather
    than a 3rd question, since you asked for 2.
- **Mines** (`mines.ts`): explained above in chat — a separate procedural
  ore+combat mini-dungeon themed around a `'mountain'` zone from System
  B's full 6-zone Stardew-style overworld (Farm/Town/Forest/Beach/
  Mountain/Desert with energy-cost travel). Resets nightly. Distinct from
  both the Dungeon and `exploration_zones` ("Expedition").

## Region model — confirmed (2026-06-28)

- **Sanctuary** = "home," safe. Contains a **Village** sub-area (Town Hall
  + Market/trading) inside it — Village is not a separate travel-gated
  zone, it's part of Sanctuary. This is where buildings get built,
  farming/forage/crafting/villager interaction all happen.
- **Dungeon** = unsafe, "a challenge." **Always accessible, entry gated
  purely by coins** (no travel/energy cost) — this matches what's already
  built (20-coin entry). No change needed here.
- **Expedition** = unsafe, "real-world exploration." Biome zones — Forest,
  Beach, Mountain, Desert (System B's `ZoneCatalog` minus `farm`/`town`,
  since those two collapse into Sanctuary instead of being separate
  zones). **Not instantly accessible** — reached via energy cost + travel
  time. A map UI for this is explicitly deferred ("later"), but the
  underlying travel-cost mechanic (`zones.ts`'s `travelToZone`,
  energy-gated) is the right foundation to build on now. Travel time will
  later be shortenable by paid "travel potions" (a future shop item, not
  built yet).
- **Mines** = one specific Expedition zone (the Mountain biome's
  feature) — not a 4th region, not folded into Sanctuary. Keeps its
  procedural ore+combat floor mechanic, reached via the same
  travel/energy gate as any other Expedition biome.

This means `ZoneCatalog.ts` needs adjusting: drop `farm`/`town` as
travel-gated zones (they become Sanctuary/Village instead), keep
`forest`/`beach`/`mountain`/`desert` as the 4 Expedition biomes.

## Migration drafts — the actual reconciliation plan

This is now the source of truth for how System A's live pieces and System
B's dormant pieces get reconciled. Each draft below states current state,
the recommended resolution, and what's still open. Nothing here is code
yet — this is the spec to build against once you sign off.

### Energy/stamina: a third naming collision, found while drafting

`rpg_state.mp` (System A — `playerHp.mp`, tool energy costs) vs.
`rpg_state.energy`/`energy_max` (System B — `zones.ts` travel cost,
`farming.ts`, `fishing.ts`, `grid_combat.ts` all read/write this one).
**Recommendation: adopt `energy`/`energy_max` as the single stamina pool,
retire `mp`.** Every place in `rpg.tsx` currently reading/writing
`playerHp.mp` needs to switch to `energy`/`energy_max`. This is small
mechanically (rename a column reference everywhere) but touches a lot of
call sites, so it's worth doing as its own isolated pass before anything
else.

### 1. Masteries — extend, don't replace

`skills.ts` has `farming | mining | combat | foraging | fishing`.
Your list: crafting, farming, livestock, language, trading, hunting,
attacking, surviving, research.

- `combat` ≡ your `attacking` — no rename needed, just treat as the same.
- `farming` already matches.
- `mining` isn't in your list but `museum.ts` already awards it
  (`addSkillPoints('mining', 25)` on inspect) — keep it; it's the natural
  category for ore/mineral discovery work even if you didn't name it
  explicitly.
- `fishing` isn't in your list either, but `fishing.ts` is real, working
  code that depends on it — keep it dormant-but-present rather than
  orphaning that feature.
- **Net new columns needed**: `crafting`, `livestock`, `language`,
  `trading`, `hunting`, `surviving`, `research` (7 new `_points` columns
  + extending `SkillType`, `SkillState`, `getSkillState()`,
  `hasRequiredMastery()` in `skills.ts`).
- Tier naming (Bronze/Silver/Gold) needs mapping onto the existing
  `calculateMasteryLevel()` (1 level per 100 points) — open question: is
  Bronze literally level 1, Silver level 2, Gold level 3, or do they span
  multiple levels each (e.g. Bronze = levels 1-3, Silver = 4-6)? Not
  blocking — flagging for when we actually build the Archive
  understanding-gate logic.

### 2. Buildings — corrected model: buildings are empty containers, stations go inside

Correction from the first draft: **Furnace/Cheese Press/Loom/Mayonnaise
Machine are not buildings at all — they're placeable "station" items that
go *inside* a building's working area.** A building is an empty shell
with a footprint; what you place inside it determines what it can do.
Confirmed examples: Market has different vendor "stalls" placeable inside
it; Tool Shed has irrigation tools / fertiliser-making tools placeable
inside it; Workshop has Furnace (and other crafting stations) placeable
inside it. Same container pattern for all of them.

This also corrects my first guess: **Furnace goes in Workshop** (it's a
crafting station — smelting ore into bars), **not Factory.** Factory is
specifically for animal/food produce processing — Cheese Press,
Mayonnaise Machine, Loom (wool→cloth) belong there.

| Backend role (building, empty shell) | Existing match? | What goes inside (stations) |
|---|---|---|
| Workshop | "Blacksmith Hut" (`ConstructionCatalog.ts`) | Furnace (exists) + other crafting stations |
| Factory | None as a building — but its stations already exist as standalone `ConstructionCatalog.ts` entries (Cheese Press, Mayonnaise Machine, Loom) that need converting from "building" to "placeable station inside Factory" | Cheese Press, Mayonnaise Machine, Loom |
| Tool Shed | None | Irrigation tools, fertiliser-making tools — **net new station types, don't exist in any catalog yet** |
| Market | None — "Villager_house_1" exists but that's for villager attraction, not trading | Vendor "stalls" — **net new station types, don't exist in any catalog yet** |
| Town Hall | None | "No tied mastery and no plans there first" — cheapest/earliest building, no stations described yet |
| Library | None | Gates Archive/Museum understanding, tied to Research mastery — no stations described yet |
| Expedition Gate | "Explorer Tent" (`ConstructionCatalog.ts`) | Not one of the 6 buildings — a 7th structure, the Sanctuary-corner gate to Expedition |

Implementation consequence: `sanctuary_processors` (System B,
`registerProcessor`/`startProcessing`) is exactly the "station placed
inside a building" mechanic already — it just needs a new placement-
validity rule (below) requiring the target cell to be inside a completed
building's footprint, and a role-match check (Furnace only valid inside
Workshop, Cheese Press/Loom/Mayo only valid inside Factory, etc.).

Footprint sizes are **not** a fixed 4×4 convention — that was my mistake
in the first draft. Sizes vary per building ("7×7 or whatever size"),
same as existing irregular footprints (Coop 6×3, Barn 7×4, Furnace 1×1).
Each building gets whatever footprint makes sense for it; no universal
size rule.

## Universal placement rule

Confirmed, applies to **all items in the Sanctuary that can be moved**
(not Dungeon enemies, not Expedition loot — placeable Sanctuary content
specifically): seeds, finished crafted goods, Bridge Kit, Path, stations
(Furnace/Loom/etc.), and buildings all follow the same placement pattern:

1. **Equip** the item (select it from the Backpack) — this already exists
   as the `buildItem` build-mode flow in `rpg.tsx`.
2. **Walk to / stand near the target grid cell.**
3. **Confirm placement** (Interact) — same `analyzePlacement` validity
   engine already used for objects and seeds, generalized to cover
   stations and buildings too.

This means Bridge Kit and Path (previously modeled as "equipped tools" in
today's now-being-retired tool system) become Backpack items placed via
this exact same flow as planting a seed — not a separate tool-equip
concept at all. That resolves the open question from Migration Draft #3
below.

**Buildings get a two-phase version of this same rule**, because of their
larger footprint:
1. **Phase 1 — select the footprint location on the map** (a ghost-preview
   step, like existing object placement, just bigger).
2. **Phase 2 — physically travel there and "lay the foundations"** (the
   actual confirm action) — maps directly onto the existing
   `sanctuary_constructions`/`startConstruction` timer system. Until the
   timer completes, the building is under construction; once complete,
   it's a real placed structure whose interior can receive stations.

**Movability/storage rule**: all placeable Sanctuary items are shiftable
(can be picked up and repositioned later — this already exists via the
"Stash" action in the object edit-bar). **Buildings are shiftable too
(can be relocated) but can never be stored** — once built, a building
always exists somewhere on the map; it can never be picked back up into
the Backpack the way a regular object or station can.

### 3. Equipment/Tools — retire today's version, adopt System B's

Plan: remove `equippedTool` React state + the `TOOLS` array in `rpg.tsx`;
wire the hotbar and Character panel to `equipItem()`/`getEquipment('tool')`
(`equipment.ts`, persisted in `player_equipment`) instead.

Open problem: today's 5 tools (Shovel/Bridge Kit/Path/Plow/Watering Can)
don't map cleanly onto `ToolCatalog.ts`'s existing `ToolType`s (Axe,
Pickaxe, WateringCan, Hoe, Sword, FishingRod):
- Plow → Hoe (type exists in the union, but **no actual Hoe item is
  defined in `TOOL_CATALOG` yet** — needs adding)
- Watering Can → WateringCan (same gap — type exists, no item defined yet)
- Shovel (digging grass into a river) → no equivalent at all. Pickaxe is
  for ore/rock, not terrain-digging.
- Bridge Kit, Path → no equivalent. These are world-terrain edits, not
  really "tools that get worn down/upgraded" the way Axe/Pickaxe/Sword
  are. Open question: should Bridge/Path stop being "equipped tools" at
  all, and instead become craftable/placeable Backpack items (build-mode
  placement, like the existing shop-object flow) rather than living in
  the equipment-slot system?

### 4. Crafting — adopt System B's timed system

Retire inline `CRAFTING_RECIPES` (instant-craft) in `rpg.tsx`. Adopt
`CraftingCatalog.ts` + `crafting.ts`'s `startCrafting`/`claimCrafting`
(timed jobs, `crafting_queue` table) — it already accepts a
`buildingObjectId` parameter, so gating crafting behind Workshop is a
short step once this is wired in. Real behavior change to flag: crafting
becomes a wait-then-claim job instead of instant, even before any UI work.

### 5. Farming/tilling — adopt System B, clarify scope split

Retire this morning's terrain-override tilled-soil mechanic. Adopt
`farming.ts`'s `tillSoil`/`plantSeed` against `farming_plots`.
Recommendation (not yet confirmed with you): `farming_plots` becomes the
real food-crop farming system tied to Farming mastery; `garden_plots`
stays as-is for decorative CraftPix tree/flower placement bought from the
Shop — these serve different purposes (food vs. decoration), not true
duplicates. Flag if that's wrong.

### 6. Villagers + Town Hall

Spawn via Villager House construction (already exists, already says
"might attract a villager"). New gate to add: talking/gift-giving require
Town Hall built + a Language mastery threshold (not yet defined — needs a
number once Language mastery exists from Migration Draft #1).

### 7. Archive/Museum/Inspect — implementation needs

Per the confirmed mechanic (see "Region model" section above this one):
need a new way to track, per item, both *discovered* (logged as `???`)
and *understood* (name revealed) as separate booleans/timestamps — neither
`rpg_museum_donations` (one timestamp, consumes the item) nor
`rpg_discoveries` (System A, no redaction concept at all) currently models
this. Likely needs a new table or extending one of these two. Also needs:
rarity tier per item (already exists, `RpgItemRarity` in
`RpgObjectCatalog.ts`) compared against Research mastery tier, per the
Bronze-unlocks-discovery-of-Silver ladder.

### 8. Calendar/Seasons — adopt System B, drop the inline version

Retire `rpg.tsx`'s inline `SEASON_CONFIG`/`getCurrentSeason()`. Adopt
`TimeEngine.ts`/`Calendar.ts` (`getCalendarState`, `sleepOvernight`,
`fastForwardTime`) so `MarketEngine.ts`'s seasonal pricing (which already
depends on `TimeEngine`, not the inline version) is correct, and so sleep
becomes a real mechanic rather than decorative. Real behavior change to
flag: a day/sleep cycle is a bigger addition than swapping a color
config — worth its own testing pass once built.

### 9. Region model implementation note

`ZoneCatalog.ts` needs `farm`/`town` removed as travel-gated zones
(Sanctuary/Village absorb them) — keep `forest`/`beach`/`mountain`/
`desert` as the 4 Expedition biomes, reachable via `zones.ts`'s existing
energy-cost `travelToZone`. The map UI itself is deferred; the
energy+travel-cost data model is worth building now since it already
exists and matches.

## Status

The "A or B" question this doc opened with is resolved: **System B is
source of truth**, System A's real-time movement/Dungeon-combat engine is
the one explicit exception. Everything below "Migration drafts" above is
the live reconciliation spec — that's the section to keep extending as
more decisions get made. This closing section is just a marker that the
original open question has been answered; no more "which system" debate
needed, only "how exactly do we wire X" per draft.
