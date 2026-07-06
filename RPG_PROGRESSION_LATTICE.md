# RPG Progression Lattice — Spec & Build Order

Created 2026-07-06. Companion to `RPG_ARCHITECTURE.md` (which stays the
source of truth for regions/buildings/masteries definitions). This doc
adds the three things the architecture doc lacks — **building levels**,
the **villager→Language loop**, and **material/content tier gates** —
and sequences implementation against the verified as-built baseline
below. Vision statement it serves: *Hay Day/CoC UI feel, Stardew
gameplay feel, real-life productivity drives all progression; deliberate
cross-dependencies (e.g. tougher materials ← world knowledge ← Library
lvl 2 ← Language mastery ← talking to locals).*

## As-built baseline (gap audit, 2026-07-06)

Verified by import-chain tracing from `app/app/rpg.tsx` + `app/app/biome.tsx`:

| System | Status |
|---|---|
| Mastery accrual | Only **farming** (till/plant/water/harvest) and **mining** (Furnace craft) accrue. Other 9 masteries never gain points. |
| Mastery gating | `hasRequiredMastery()` has **zero callers** — masteries gate nothing. |
| Archive Discovery/Understanding | Live and correct, but starved (Research never accrues → frozen at Bronze). No Inspect action; passive browse only. |
| Buildings | Shells + stations + two-phase timed construction **live**. Library/TownHall shells have **no function**. `ConstructionCatalog.ts` is a disconnected legacy catalog vs `BuildingCatalog.ts` (needs unifying). All prices zeroed by `TESTING_FREE_*` flags. |
| Blueprints | Drop live (20% from villager stub). **No decode step** — they sit inert in Backpack. |
| Villagers | **Three** unconnected implementations; none live. `VillagerCatalog.ts` (Brog, Elara — full dialogue + gift preferences) is the best and is never read. Live game has one hardcoded stub villager. |
| Language | Column + UI exist; no grant path anywhere. |
| Trading/Market | Static sell prices + flat VendorStall +20%. `MarketEngine.ts` seasonal pricing dormant. |
| Town Hall / Bundles | Missing entirely (shell only). |
| Tools/equipment | Tool equip + tiers **live** (`player_equipment`). Weapon/armor bonuses computed only by dormant `db/combat.ts`; live Dungeon loop is hand-rolled and doesn't use them. |
| Crafting | Timed jobs **live** (start/claim, `crafting_queue`). |
| Calendar/sleep/seasons | Live via `db/time.ts` (3rd independent impl; `Calendar.ts`/`TimeEngine.ts` dormant). |
| Energy | One live pool. ✅ matches spec. |
| Biomes | Simplified `biome.tsx` live (chop/net-critters/guardians). Procedural `exploration.ts`/`mines.ts` dormant. Pond fishing + finite ores live, Sanctuary-only. |
| Real-life stats → game | **Broken**: `getComputedStats()` never reaches rpg.tsx; Dungeon attack reads 5 of 7 AP-only columns, ignores `_auto` (activity-earned) gains. Working hooks: Water Drops (per activity log), streak rain (≥3-day streak). |
| Selling | Instant from Backpack. `shipping_bin` dormant. |

**Planning rule:** legacy "System A" db modules (villagers.ts, museum.ts,
livestock.ts, processors.ts, shipping.ts, exploration.ts, mines.ts, …)
are treated as **missing**, not "quick wiring" — their data models
predate System B conventions. Reuse their *content* (dialogue text, gift
tables, recipes) freely; never their tables/flows wholesale.

## Design

### D1. The core law
Every gate in the game must be crossable **through real-life
productivity**, and every mastery level must unlock something **visible
in the sanctuary**. Life → stats/resources → masteries → unlocks →
visual/spatial growth. No dead-end unlocks, no gate that grinding
in-game alone can cross faster than living well.

### D2. Stats power, masteries permit
- The **7 stats** (STR/AGI/FOC/WIS/SPR/PER/RES — AP + activity-earned
  `_auto`, always summed via `getComputedStats()`) are **continuous
  multipliers**: damage, speed, energy, prices, timers. They never
  hard-gate content.
- The **12 masteries** are **discrete permissions** (Bronze→Silver→Gold
  →Platinum, every 3 levels): what you may mine, decode, build, buy,
  understand. They accrue from in-game actions, whose *rates* are
  boosted by linked stats per the `RPG_ARCHITECTURE.md` mapping table.
- Stat→mastery earn bonus: linked masteries earn `+2% points per stat
  point` (tunable constant, single helper `masteryEarnMultiplier(skill)`).

### D3. Mastery accrual map (every live action grants points)
| Mastery | Granting actions (all already-reachable handlers) |
|---|---|
| farming | till/plant/water/harvest (live today) |
| mining | ore-vein mining (`mineRockVein`), Furnace smelts (live today) |
| combat | Dungeon enemy defeat, biome guardian defeat |
| foraging | sanctuary/biome forage & tree-chop collection |
| fishing | pond catch (per rarity) |
| crafting | claim non-smelt crafting job |
| hunting | net critter catch (per rarity) |
| surviving | biome expedition entered + guardian survived + breach repaired |
| trading | selling (points ∝ log of sale value, capped/day) |
| research | first-discovery of any item; Inspect at Library (Wave 3) |
| language | villager conversation (first/day per villager), gifts, later runes |
| livestock | deferred until livestock ships (Wave 5) |

### D4. Material & content tier gates (the "tougher materials" lattice)
- Ore veins get tiers: Stone/Copper (Bronze), Iron (Silver), Gold
  (Gold), Mythril (Platinum). Mining a vein requires **Mining mastery
  tier ≥ vein tier** AND **Understanding of the previous tier's bar**
  in the Archive (= "basic knowledge of the world"). Tool tier upgrades
  (Basic→Copper→Iron→Gold) require the same tier's bars + coins.
- Shop stock, blueprint decode, and recipe quality use the same
  Discovery/Understanding tier pattern already live in the Archive.

### D5. Villagers & Language (the "locals" loop)
- Wire `VillagerCatalog.ts` (Brog, Elara) into the live villager stub:
  tap → dialogue line chosen by friendship band; daily first-chat grants
  Language points + friendship; gifting consults `giftPreferences`
  (love/like/neutral/dislike/hate → friendship & Language deltas).
- New System-B table `rpg_villager_state` (villager id, friendship,
  last_chat_day, gifts_today) via migration. Ignore legacy villager tables.
- Language tiers unlock: Bronze = trade small-talk (unlock 1 extra
  vendor stock slot); Silver = **Library lvl 2 prerequisite**; Gold =
  rune translation in biomes (rune stones → research/lore drops);
  Platinum = parley with guardians (skip fight for a toll, once/day).

### D6. Building levels
- `sanctuary_constructions` gains `level` (default 1). Upgrade = same
  two-phase timed build, consuming materials + coins, gated by a
  prerequisite predicate per (building, level) in `BuildingCatalog.ts`.
- **Library**: lvl 1 = Inspect + decode Bronze blueprints. lvl 2
  (requires **Language Silver** + planks/bars) = decode Silver, +research
  speed, reveals rare shop stock hints. lvl 3 (Wisdom-heavy) = Gold decode.
- **Town Hall**: lvl gates bundle pages (Wave 4).
- Workshop/Factory/ToolShed: level gates which stations may be placed
  inside (station tier ≤ building level).

### D7. Library function (research made real)
- **Inspect**: stand in Library, open Archive, Inspect a Discovered item
  → starts a timed research job (like crafting); claim → item becomes
  Understood + Research points. Wisdom reduces research time.
- **Blueprint decode**: consumes blueprint item at Library → unlocks its
  station in the build catalog, gated by Research tier + Library level.

### D8. Fix the stat pipeline (prerequisite for everything above)
- Dungeon/guardian damage, energy_max, craft timers, fishing catch
  window, sell prices all read `getComputedStats()` (all 7 stats,
  AP + `_auto`). Direct effects per the architecture mapping table:
  STR→damage; AGI→move speed + catch window; RES→energy_max
  (+1/point, tunable); FOC→craft & research timer reduction (cap 30%);
  PER→sell price bonus (cap 15%) + rare-forage highlight (Wave 5);
  WIS→research speed + Understanding cost; SPR→livestock/language rates.

### D9. Asset-backed content rule (added 2026-07-06, owner directive)
No new player-facing item may enter a gameplay flow unless its icon is
`verified: true` in `RpgAssetRegistry.ts`, OR it is explicitly flagged
in `RPG_ASSET_ATLAS.md` "Open Asset Issues" as **NEEDS EXTERNAL ART**
with the flow noted. Before flagging, an in-repo sweep (visually Read
candidate PNGs across all packs) is mandatory. Items flagged external
go to the owner's sourcing list — never silently shipped as placeholder.

### D10. Theme test (added 2026-07-06, owner directive)
Every mechanic must pass the *cozy rustic sanctuary* test: hearths,
looms, presses, gardens — not machines or industrial processing.
Stardew is a genre-feel benchmark, not a content checklist; reject
Stardew imports that fail the theme (first casualty: the Mayonnaise
Machine — unwired, pending reflavor as a Kitchen/Cooking station).
Prefer basic, legible transformations of things the player raised or
grew (milk→cheese, wool→cloth, egg→cooked dish at a hearth).

### D11. Identity: discovery-first (added 2026-07-06, owner directive)
This game is NOT a Stardew copy — Stardew was only the template used to
explain the vision. Its own identity: **cozy but adventurous; simple,
forgiving mechanics; centered on world-building, discovery, and
exploration**, with a leveling system that borrows the app's gamified
real-life language (7 stats, Bronze→Platinum masteries, XP). Priority
consequence: discovery/exploration systems (Archive completion,
research, biomes, critters, guardians, Mines, runes) outrank farm-sim
depth (seasonal pricing, deeper artisan chains) whenever they compete
for a wave slot. Difficulty stays gentle — gates inform, never punish.

## Build order (waves = one agent work order each)

- **Wave 1 — Make the engine honest** (no new UI): D8 stat pipeline fix +
  D3 mastery accrual for all 11 wireable masteries + stat→earn-rate
  multiplier. Tests for every accrual site. *Unblocks: Research/Archive
  thaw, every later gate.*
- **Wave 2 — Locals & Language**: D5 villager wiring (dialogue, gifts,
  friendship, daily Language grant) + first mastery **gates** via
  `hasRequiredMastery` (vein tiers per D4, tool upgrade gating).
- **Wave 3 — The Library lives**: D7 Inspect + blueprint decode, D6
  building levels with Library 1→2 (Language Silver prerequisite —
  completing the user's canonical example chain end-to-end).
- **Wave 4 — Town Hall & economy truth**: bundles v1 (3 starter bundles →
  sanctuary visual tier + minecart perk), remove `TESTING_FREE_*` flags,
  Trading mastery vendor-stock tiers, unify `ConstructionCatalog` into
  `BuildingCatalog`.
- **Wave 5 — Breadth** (re-cut 2026-07-06 per D9/D10/D11, discovery
  first): livestock v1 ✅, processors v1 (cheese+cloth; mayo cut),
  then in this order:
  1. **Asset verification sweep** (D9 debt: in-repo frames or
     NEEDS-EXTERNAL-ART flags for unverified icons in active flows —
     stone, coal, crop products, truffle first).
  2. **Wave 6 — Discovery & exploration expansion** (the identity
     wave): procedural Mines under the Mountain biome (ore floors,
     nightly reset — the adventure spike), 1-2 new
     critters/guardians per biome from existing verified pack art,
     rune stones in biomes (Language Gold hook: translate → lore-free
     "world knowledge" notes + Research points), PER rare-forage glow,
     and an **Archive "world completion" meter** surfaced in the HUD
     (X/Y discovered · understood — discovery AS the progression face).
  3. **Cooking v1 at a hearth/Kitchen** (egg→omelet, cabbage→salad) —
     art-gated on the owner's sourcing.
  4. Seasonal pricing (polish tier; port MarketEngine content, delete
     the dormant module).
- **HUD juice pass** runs parallel after icon purge (WO4): mastery
  progress rings, +N fly-ups, level-up toasts — the lattice must be
  *felt*, Hay-Day-style.

Every wave: `npx tsc --noEmit`, `npm run test:all`, `npm run
validate:rpg` (no new failures), expo export, then commit.
