# Garden & Expedition — Design Notes (RPG Phase 2)

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

## Open items / not yet decided

- **Scope confirmation**: is this background/cosmetic-only, or does it feed
  back into core mechanics (coins, stats)? Changes how much to build now —
  unresolved, discuss before building the Expedition *screen* (the
  `SpriteAnimator` component itself is useful either way).
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
