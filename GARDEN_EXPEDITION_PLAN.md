# Garden & Expedition — Design Notes (RPG Phase 2)

## Session Log (2026-06-27) — read this first

Everything below this section is the running design narrative (dated
sub-sections, oldest first). This section is the structured summary of
today's two work passes: (1) Dungeon combat/economy, (2) Sanctuary terrain
tools + tool-equip redesign. `npx tsc --noEmit` was run and came back clean
after every change described here — that verifies the code compiles and
types check out, **not** that it behaves correctly in the running app. None
of this has been manually tested in the app yet (build/install issues this
session — see "What you should check" below).

### What was done (concrete, in code right now)

**Dungeon / combat:**
- Real enemies in the Dungeon: regular orc, tougher "Orc Brute", and one
  boss ("Orc Chieftain") — fixed spawn positions, chase AI within an aggro
  range, contact damage to your real `rpg_state.hp`.
- Attack button computes real ATK from your stats and damages whatever
  enemy you're facing; kills drop loot/coins into your real inventory/coins.
- Dungeon entry costs 20 coins. Enemy kills persist in SQLite permanently
  (`dungeon_enemy_kills` table) — killed enemies stay dead across restarts.
- Real dungeon tileset art for ground/walls/water (previously flat colors).

**Sanctuary / economy:**
- Trees drop a new `rpg_wood` resource via Interact (chop-for-wood), instead
  of mostly leaves/seeds.
- Resources (leaves, wood, water drops, crystal shards) can now be sold for
  coins from the Backpack ("Sell 1" / "Sell all").
- Garden plots show a live growth progress bar.
- A free "Coin Mine (Test)" shop item was added at your explicit request —
  gives +200 coins per Interact, repeatable, no cooldown. Flagged everywhere
  as a temporary dev/testing aid.

**Sanctuary terrain + tools (today's second pass):**
- Fixed a real bug: Sanctuary ground/walls were rendering the Dungeon's
  stone tileset. Sanctuary now has its own flat colors again; stone art is
  Dungeon-only.
- New terrain types: river (dig), bridge, path, tilled soil — all persisted
  to SQLite (`sanctuary_terrain_overrides` table), all affect real movement
  collision immediately.
- New tool-equip system: Shovel (dig, 5 coins), Bridge Kit (3 wood), Path
  (1 wood), Plow (free, required before planting). Tools are real Backpack
  items (`kind: 'tool'`), granted automatically to every player, with an
  Equip button in the Backpack and a persistent on-screen hotbar (tap to
  switch, no popup menu). Equipped tool shows as a badge on the avatar.
- Planting now requires tilled soil (Plow first) instead of plain grass —
  a real behavior change from before today.

### What should be done (known gaps, not yet built)

- No water/plank art for bridges, path, or tilled soil — all flat colors.
- No `rpg_wood` icon (letter-badge fallback).
- Digging has no resource limit beyond coins, no undo, and only one guard
  rail (can't dig next to the portal) — you can still landscape yourself
  into an awkward layout elsewhere.
- Only one boss, one loot tier per enemy — no rare/elite variety.
- Tool equip is "always all 4, no scarcity" — no upgrade path, no
  durability, no sound/haptic feedback on use.
- **The Coin Mine (Test) item is still in the game** — it was an explicit,
  intentional request for testing, but it's a 200-coins-per-tap free money
  exploit. It must be removed or re-priced before this goes anywhere near
  real users.

### What was assumed (decisions made without asking you first)

These are calls I made unilaterally because the work was in motion and
re-confirming every number would have stalled progress. None are
load-bearing architecture — all are easy to change if you don't like them:

- **Costs/prices**: dig 5 coins, bridge 3 wood, path 1 wood, plow free,
  dungeon entry 20 coins, sell prices 2/3/4/8 coins (leaves/wood/water/
  crystal). All arbitrary placeholder balance, not playtested.
- **Enemy numbers**: orc 30 HP/4 ATK, brute 60 HP/8 ATK, boss 120 HP/14 ATK,
  aggro ranges 5-7 tiles, contact-damage tick every 1.2s, chase step every
  700ms. Arbitrary, not playtested.
- **Planting now gated behind Plow** — this is a real mechanical change
  (Stardew-style) that you asked for via the tool system, but I inferred
  "plow required to plant" rather than you stating it explicitly. If you
  actually just wanted Plow to be a cosmetic/optional tool, this needs
  reverting.
- **Tools are free starter gear**, not something you unlock, buy, or could
  ever lose. Assumed because nothing was said about scarcity or
  progression.
- **No sound on tool equip/use** — skipped on purpose due to the
  pre-existing "audio suddenly not playing" bug elsewhere in the project,
  not because sound wasn't worth adding.
- Kept the "background vs. core feature" scope question (from the very
  original pitch at the top of this doc) as **resolved = core feature**,
  carried forward from the 2026-06-25 decision — not re-asked today.

### What you should check and confirm

1. **You haven't actually run any of today's code yet** — the last two
   install attempts hit an Expo CLI USB-transfer bug unrelated to this
   code (`devicectl` workaround was given). Confirm the app actually
   launches and the Sanctuary/Dungeon look and play the way described
   above before trusting this log as "working," not just "compiles."
2. **Decide on the Coin Mine (Test) item now**, while it's fresh — keep it
   for testing a while longer, re-price it, or delete it. It's the single
   biggest "don't ship this accidentally" risk in the current build.
3. **Confirm the Plow-gates-planting change is what you wanted.** This is
   the one mechanic change today that alters existing behavior (you could
   plant on any grass before; now you can't). If that's not the intended
   feel, say so and I'll revert it to optional.
4. **Sanity-check the economy numbers** once you can actually play — coin
   costs/enemy stats above were never balanced against how fast you
   actually earn coins from real-life logging.
5. **Decide if/when to commit this to git** — nothing from this entire RPG
   session has been committed yet; it's all sitting as uncommitted working
   changes.


> Captured 2026-06-25 from conversation. This is a plan/reference doc, not a
> build log — nothing here is implemented yet beyond the `app/rpg.tsx`
> prototype (garden canvas + basic planting), `src/db/garden.ts`
> (`garden_plots`/`user_inventory` tables), and `src/utils/GameAssets.ts`.

## Raw idea (the original pitch)

A "forest x alto adventure" concept: the player customises their own garden,
unlocks new plants, and has a character that goes on game expeditions using
their real-life stats to collect, customise, and gain in-game material.
Open question raised alongside this: if the garden is positioned as a
**background/cosmetic-only** feature (no mechanical effect on the rest of the
app), can the full vision below still be built on top of that framing? —
i.e. confirm scope/ambition before committing engineering time, since
"background only" vs "core feature" changes how much of this is worth
building now vs. deferring (see `project_deferred_onboarding` precedent for
Phase 2 bucket items).

Either way: all art (equipment, plants, decorations, backgrounds) needs to be
designed/sourced — currently sourced from CraftPix packs in
`app/assets/game/` (trees + winter backgrounds only checked in so far; ~18
other unused packs exist on disk, untracked, for crystals/orcs/swordsman/
slimes/ruins/etc. — see commit `01a0a9c`).

## The core gameplay loop

1. **Work (real life)** — logging activities grants stats (STR/WIS/RES/FOC/
   etc.) and Coins, same as today.
2. **Expedition (Phase 2)** — spend Coins or STA to send an Avatar on a run.
   Higher stats → runs further, beats harder mobs, returns rarer
   seeds/decorations (drawn from the CraftPix item pool).
3. **Garden Sanctuary (Phase 1)** — loot from expeditions customises the
   Sanctuary. Total real-life XP governs plant growth speed (sapling → tree).

## 1. The Garden (visual sanctuary)

- **Canvas**: `react-native-gesture-handler` `PanGestureHandler` +
  `Animated.View` for a draggable/zoomable map, strategy-game style.
- **Background**: CraftPix parallax layers, `position: 'absolute'`, stacked
  for depth (same technique as `GameAssets.bg_winter` today).
- **Grid system**: hidden 2D coordinate grid — dragging a seed from inventory
  snaps it to the grid.
- **Persistence**: `garden_plots` table stores `item_type`/`x`/`y`. On load,
  loop the rows and render `<Image>` at each coordinate (this part is already
  scaffolded in `app/rpg.tsx`/`src/db/garden.ts`).
- **Growth logic**: 3 stages (Seed → Sapling → Tree). Compute total XP earned
  since each plot's `planted_at` timestamp; crossing a threshold swaps e.g.
  `Tree3.png` → `Tree1.png`.

## 2. The Expedition (auto-runner)

- **Engine**: `react-native-reanimated` for 60fps run animation — camera
  stays fixed, background layers + mobs slide right-to-left to fake forward
  motion.
- **Avatar**: custom hand-rolled `SpriteAnimator` using `react-native-reanimated`
  (decided 2026-06-25 — see vetting note below, replaces the originally
  proposed `react-native-sprite-sheet`). An `overflow: 'hidden'` window View
  holds the spritesheet Image; `translateX`/`translateY` shared values offset
  it frame-by-frame, driven on the UI thread.
- **Combat math**:
  - HP ties directly to the player's real `rpg_state` HP.
  - ATK = average of all 7 core stats: `(STR+FOC+AGI+WIS+RES+SPR+PER) / 7`.
  - Future: specific stats gate/boost specific items (e.g. high WIS unlocks
    magical seeds).
  - Enemy HP vs. player ATK decides each encounter; losing all HP ends the
    run and shows a Loot Screen.
- **Loot**: winning rolls an item id (e.g. `flower_seed`) into
  `user_inventory`, making it plantable back in the Garden.

## 3. UI / state management

- **HUD**: inventory bottom-sheet using CraftPix UI icons, floats over both
  Garden and Expedition screens.
- **Global state**: hook into the existing `rpg_state` table directly, so a
  level-up in the main app instantly buffs the Expedition Avatar's ATK — no
  separate game-specific stat store.

## Why split it this way (rationale, as pitched)

Garden = slow, relaxing, permanent home-building. Expedition = the
dopamine/gamble loop (combat, loot rolls). Splitting them lets each lean into
a different feeling instead of compromising on one tone.

## Vetting: react-native-sprite-sheet (done 2026-06-25) — rejected

Checked both real candidates:
- `rn-sprite-sheet` (the actual npm package usually meant by this name): has
  native iOS/Android code, README says *"I don't have time to maintain this
  package"*, no New Architecture/Fabric mention, 11 open issues. Given how
  much effort went into stabilizing gesture-handler/reanimated/worklets under
  the New Architecture this session, adding an unmaintained native module on
  top is a real risk of repeating that pain.
- `react-native-sprites` (dcavalcante): pure JS, no native code, but thin and
  unclear maintenance — barely saves anything over hand-rolling it.

**Decision: hand-roll a `SpriteAnimator` with `react-native-reanimated`**
(already installed, proven working, UI-thread driven, immune to native
module deprecation since it adds zero new native code).

Sources: https://github.com/MiLeung/rn-sprite-sheet ,
https://github.com/dcavalcante/react-native-sprites

## Pivot (2026-06-25): Zelda / Stardew-style top-down Action RPG

Scope expanded from "auto-runner mini-game" to a full top-down action-RPG
engine, built natively (no third-party game engine, no native modules beyond
`react-native-reanimated` + `react-native-gesture-handler`, both already
installed and stable in this project).

**Decisions (confirmed 2026-06-25):**
- **Scope**: Core feature — real stats/coins feed into it meaningfully,
  justifying the larger build (supersedes the earlier "background-only?"
  open question above).
- **Map generation**: Static, handcrafted layout (Sanctuary + Dungeon are
  fixed, like classic Zelda) — not procedural. Procedural generation can be
  layered in later without changing the underlying engine.
- **Combat**: Zelda-style directional sword swing — Attack button swings in
  the direction the Avatar is currently facing and hits the adjacent tile,
  using the ATK math already defined above (`(STR+FOC+AGI+WIS+RES+SPR+PER)/7`).
  Requires tracked facing-direction state + attack-animation timing/hitbox
  logic (more engineering than bump-to-attack, but was the preferred feel).

### Engine architecture (as proposed, not yet built)

1. **World/Tilemap**: 2D JS integer array (`0` = walkable grass, `1` = blocked
   rock, etc.), rendered from CraftPix tilesets.
2. **Camera**: Avatar stays fixed at screen center; the World Container's
   `translateX`/`translateY` (Reanimated shared values) move inversely to the
   Avatar's world coordinates — buttery 60fps scroll, UI-thread driven.
3. **Collision**: each frame, check intended destination (`pos + velocity`)
   per axis against the tilemap; block movement on that axis only if the
   destination tile is solid — gives correct wall-sliding for diagonal moves.
4. **Controls**: a `Gesture.Pan()` joystick (bottom-left) drives
   `velocityX`/`velocityY` shared values; "Interact" (plant/harvest) and
   "Attack" (sword) buttons sit bottom-right. UI re-anchors to screen corners
   on `Dimensions` change so portrait/landscape both work, recalculating the
   camera center each time.
5. **Two zones, one engine**: Sanctuary (safe, plant/harvest/decorate) and
   Dungeon/Expedition (hostile, mobs+loot) are both just tilemaps loaded into
   the same engine; a portal/cave-entrance tile transitions between them
   rather than swapping to a separate screen.
6. **Sprites**: built on the previously-decided hand-rolled `SpriteAnimator`
   (Reanimated, `Easing.steps` frame-snapping, 2D-grid offsetting — see
   vetting note above). Joystick movement plays `walk.png`; Attack button
   temporarily overrides with `attack.png` and resolves damage against any
   enemy on the adjacent tile.

### Asset note
Editor ran a cleanup pass stripping PSD/marketing-PDF cruft from the newly
added CraftPix assets — folder is down to ~58MB, safe to commit (same
precedent as commit `01a0a9c`).

## Build status (2026-06-27)

This doc had drifted badly from the actual code — `app/rpg.tsx` is ~2300 lines,
not a prototype. Status as of today:

**Already built (found while auditing, not new):**
- Full Sanctuary sandbox: drag-to-place building with pinch-zoom, a shop
  (`SanctuaryShop`) sourced from 5 CraftPix packs (forest/crystal/bush/cave/
  temple), backpack/inventory, an archive/encyclopedia (`RpgArchive`), forage
  drops, crop growth (seed → sapling → tree), and object mechanisms (levers
  toggling linked gates/traps).
- Movement engine: Reanimated joystick, per-frame axis-independent tile
  collision (correct wall-sliding), centered camera, pinch-zoom.
- Avatar sprite animation (`SpriteAnimator`, swordsman pack, facing-direction
  row, walk/attack frame swap) — fully wired, not just scaffolded.
- Coins tied to the real `rpg_state` table.

**Built this session:**
- Dungeon enemies (`src/engine/Enemies.ts`): two orc types (regular + tougher
  "Orc Brute"), fixed spawn positions, static idle sprite per type, HP bar.
- Combat resolution: Attack button now computes real ATK from
  `STR/FOC/AGI/WIS/RES` and damages whatever enemy tile you're facing; kills
  roll loot via the existing forage drop-roll logic into the real inventory
  table, and award coins to real `rpg_state.coins`.
- Enemy aggro: while in the Dungeon, adjacent live enemies deal contact
  damage on a ~1.2s tick directly to the real `rpg_state.hp` — this plugs
  into the **existing, already-built** death/revival system
  (`src/db/game.ts` `getDeathCause`/`handleDeath`), so dying in the Dungeon
  now triggers the real death screen. A player HP pill shows in the header
  while in the Dungeon.
- Dungeon entry now costs 20 coins (charged once per Sanctuary→Dungeon
  transition), per the original "spend Coins or STA to send an Avatar on a
  run" pitch.
- Real tileset art for ground/wall tiles (`src/engine/TileArt.tsx`, CraftPix
  `walls_floor.png`, 16px source tiles scaled 2x to the engine's 32px grid).
  Water tiles are still flat color — no clean tileable water tile was found
  in the pack without more time sourcing one.

- Enemy chase AI: enemies step one tile toward the avatar every ~700ms when
  within their `aggroRange` (5-6 tiles), respecting wall collision and not
  stacking on each other; once adjacent they deal contact damage instead of
  moving. Two enemy types (regular orc vs. tougher "Orc Brute") have
  different range/HP/ATK.

- Enemy kills now persist permanently in SQLite (`dungeon_enemy_kills` table,
  migration v62) — re-entering the Dungeon, or restarting the app, won't
  respawn anything already killed. Cleared on full reset.
- **Sanctuary terrain editing**: new `sanctuary_terrain_overrides` table
  (migration v63, row/col/tile_type, persisted, cleared on full reset).
  Pressing Interact on an empty grass tile (no object/plot/portal there)
  digs it into a Water tile permanently — a basic "dig a river" tool. The
  Sanctuary tilemap is now `SanctuaryMap` + overrides merged at render time
  (`applyTerrainOverrides`), and movement collision recomputes immediately
  on dig so the new water tile blocks movement right away.
- **Tree chopping**: trees now drop `rpg_wood` (new resource item) as the
  primary forage result via Interact (55% chance, 1-3 wood), with leaves and
  a rare seed as secondary outcomes — reusing the existing forage-cooldown
  system rather than building a new "chop down/respawn" mechanic. Forage
  toast copy updated to "Chopped tree" / "No wood came loose" framing.
- **Growth progress bars**: garden plots now show a thin fill bar under the
  seed/sprite icon while growing (0-100% of the current stage's duration,
  computed from `getPlotGrowthInfo`'s `remainingMinutes` vs. the crop's
  `stageMinutes`), not just the static seed/+/! stage badge.
- **Water tile art**: found a clean tileable deep-water tile in the same
  CraftPix dungeon pack (`Water_coasts_animation.png`, col0/last-row).
  Correction to an earlier note: neither base map actually placed any
  `TileType.WATER` tiles — water only ever appears via dug rivers, so this
  art only matters for those.
- **Bridges**: added `TileType.BRIDGE` (walkable, brown flat-color tile —
  no art sourced yet). Interacting with a dug river tile spends 3 wood
  (from the new chop-for-wood resource) to convert it into a walkable
  bridge, persisted the same way as digging. Gives the wood resource an
  actual use and lets players control their own river layout instead of
  permanently blocking paths.
- **Sell resources**: resources (leaves, wood, water drops, crystal shards)
  had no economic sink beyond bridges. Added `getResourceSellPrice()` in
  `RpgObjectCatalog.ts` (2/3/4/8 coins respectively) and a "Sell 1 for N"
  button in the Backpack's resource detail panel (previously just said
  "Resource" with no action) — sells one unit at a time straight to
  `rpg_state.coins`, plus a "Sell all N for total" button when quantity > 1.
- **Coin Mine (dev/testing aid, explicitly requested as temporary)**: new
  free (0-coin) shop item `rpg_coin_mine`, reuses the temple animated chest
  visual. Unlike real chests (one-time `claimSanctuaryReward`), this has
  `interactLoot.repeatable: true` — a new flag on `RpgInteractionLoot` —
  so every Interact press gives +200 coins with no cooldown or claim
  limit. Buy it from the shop, place it, then spam Interact for coins
  while testing. Should be removed or re-priced before this ever ships.

- **Boss enemy**: added "Orc Chieftain" (`dungeon_orc_chieftain`), a single
  fixed deep-dungeon spawn at 4x the regular orc's HP, bigger ATK/aggro
  range, and a guaranteed-ish multi-resource drop table (crystal shards +
  wood + water drops). Renders 1.5x scale with a gold HP bar and a name
  label so it reads as a distinct encounter, not just a recolor.

**Still open / next increments:**
- Only one boss; no further loot-tier/rare-spawn variety beyond that.
- ~~No stamina-based alternative to the coin entry cost~~ — checked: `sta_stat`
  isn't a spendable energy pool, it was renamed to "Resilience" and is a
  permanent core attribute (see `xpEngine.ts`/`CategoryGrid.tsx`). There's no
  stamina resource left in the data model to spend, so coins-only is correct
  as implemented, not a gap.
- Digging is unlimited/free (no tool requirement, no cost, no undo). Added
  one guard rail: can't dig within 1 tile of the Dungeon portal (the one
  real softlock risk — sealing your only way to the Dungeon). No protection
  yet against digging yourself into a smaller unreachable pocket elsewhere.
- `rpg_wood` has no dedicated icon yet — falls back to a letter badge.

## Pivot (2026-06-27): Tool-equip system, replacing overloaded Interact

The single Interact button had grown too many implicit behaviors (forage,
harvest, dig-if-grass, bridge-if-water, open portal, talk to objects). User
asked for Stardew-style tool switching instead: unequipped = generic
Interact; equipping a tool makes the action button do that tool's specific
thing exclusively.

- **`ToolId`**: `'shovel' | 'bridge' | 'path' | 'plow'`, defined in `rpg.tsx`
  (`TOOLS` array) — not its own file, scope didn't justify it yet.
- **Equip state**: `equippedTool` (null = Interact mode), toggled via a new
  wrench-icon HUD button (Sanctuary only) that opens a small `toolsPanel`
  chip list (None + 4 tools). Selecting a tool closes the panel and changes
  the action button's icon/label/hint to match (e.g. "Dig" instead of
  "Interact").
- **Dig and Bridge moved out of generic Interact** — they used to fire
  implicitly when facing grass/water with nothing else to interact with.
  Now they only fire when the matching tool is equipped, via
  `useEquippedTool(row, col)`. Same costs as before (5 coins dig, 3 wood
  bridge), same portal-adjacency dig guard.
- **Path tool** (new): lays `TileType.PATH` on grass or tilled soil for
  1 wood. Flat tan color, no art sourced.
- **Plow tool** (new): tills grass into `TileType.TILLED` (flat brown,
  free, no resource cost — matches Stardew's hoe having no material cost).
- **Planting now requires tilled soil** — `analyzePlacement`'s plant-mode
  terrain check changed from `=== TileType.GRASS` to `=== TileType.TILLED`.
  This is a real behavior change: you must equip Plow and till a tile
  before the Backpack's "Plant" button will accept it there. Existing
  already-planted plots are unaffected (the check only runs at placement
  time). Build-mode hint text updated to say so when blocked.

### Asset-correctness fix (same session)
Caught and fixed a real bug: Sanctuary ground/walls were rendering the
**Dungeon's** stone tileset (`walls_floor.png`), making the outdoor
Sanctuary look like a dungeon interior. `TilesetTile` art is now gated to
`activeZone === 'dungeon'` only; Sanctuary GRASS/WALL fall back to their
original flat colors (green/dark-green). Searched every sourced CraftPix
pack for a real grass-ground or wood-plank-bridge tile — neither exists
(the one asset named "Liana_bridges" turned out to be a hanging vine prop,
not a walkable bridge). Built `BridgeTile` from plain styled `View`s
(brown fill + 3 dark plank-line strips) instead of a flat color, since no
real asset was available — a deliberate "good enough" call, not a
placeholder left by accident.

## Tool-equip redesign (2026-06-27, same day as the pivot above)

User pushback, paraphrased: the wrench-button-opens-popup-chip-list from
the first pass wasn't "practical" — tools should be real items you choose
from the Backpack, not an abstract always-available list disconnected from
inventory. Rebuilt properly:

- **Tools are now real inventory items** — `RpgInventoryItem.kind` gained
  `'tool'`, 4 new catalog entries (`rpg_tool_shovel/bridge/path/plow`), each
  with a `toolId` (maps to the `ToolId` used by the engine) and a new
  `featherIcon` field. No shovel/plow/hoe sprite exists in any sourced
  CraftPix pack, so `RpgItemIcon` now also renders a clean Feather vector
  icon when `item.featherIcon` is set, rather than forcing a mismatched
  fantasy-sword icon or a meaningless letter badge.
- **Granted automatically** on first load (`INSERT ... ON CONFLICT DO
  NOTHING`, qty 1 each) so every player has them in the Backpack without a
  shop step — they're starter gear, not purchasable equipment (yet).
- **Backpack gets an Equip button** for tool-kind items (new `Tools` filter
  chip too), parallel to Place/Plant/Sell — this is the literal "choose
  tools I have in my backpack" ask.
- **Persistent hotbar replaces the popup**: a row of 5 always-visible
  slots (None + 4 tools) above the action buttons whenever you're in the
  Sanctuary. Single tap to switch — no open-panel-then-tap-then-close
  cycle. The equipped slot highlights green.
- **Equipped tool shows on the avatar** — a small badge icon at the
  avatar's top-right corner, so the character visibly "holds" something,
  not just a label on the action button.
- Considered but not done: tool upgrades/durability, a sound/haptic cue on
  equip or tool-use (this app has a known pending "audio suddenly not
  playing" bug from earlier in the project — didn't want to touch the
  audio system while debugging that is still outstanding), tools occupying
  a deliberately limited equip slot (currently all 4 are always equippable,
  no scarcity).

## Open items / not yet decided

- **Sprite sheet is a 2D grid, not a 1D strip**: confirmed
  `Swordsman_lvl1_Run_with_shadow.png` is 512×256px. The pack ships 4
  directions (front/back/left/right, per the ASEPRITE source folders), so
  this is almost certainly an 8-cols × 4-rows grid of 64×64 frames — needs
  offsetting on **both** `translateX` (frame) and `translateY` (direction
  row), not just `translateX`. Open the PNG and confirm exact frame
  width/height/grid-size before hardcoding numbers into `SpriteAnimator`.
- **Frame-snapping, not gliding**: plain `withRepeat(withTiming(...))` read
  directly will interpolate smoothly between frames (looks like motion blur,
  not a sprite flipping frames). Use `Easing.steps(frameCount, false)` as the
  timing easing so the value jumps discretely — bake this into
  `SpriteAnimator` from the start rather than discovering the glide artifact
  after building it.
- Most of the 18 unused CraftPix packs on disk are untracked — decide per
  feature which ones actually get used/committed (see commit `01a0a9c`'s
  precedent of trimming PSD/license/marketing cruft before committing).
