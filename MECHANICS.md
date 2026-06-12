# Prodewty — Mechanics Reference

> Snapshot of every live mechanic as of June 2026. Use this to reason about tuning without jumping between files. Two critical findings flagged with ⚠️ — read those first.

---

## Status Tracker

### Done
- Phase 1A: XP two-phase formula, category weights, level curve, multiplier tightening, health decay (30/20%), health-tier XP multipliers, weekly boost, formula-based dungeon/quest XP, coin system (mood/rank/level-up), drop tables E–Legend, rarity renamed Chromatic → Legendary
- HP system rebuild: removed HP-regen-from-XP and health-tier HP delta from code; added player-tier-from-level mapping (F–Legend, indices 1–10); `failDungeon()` now computes damage via `33 × tier_diff` (flat 33 at/below player tier); stale UI strings in `index.tsx` / `insights.tsx` / `game.tsx` (health tier table, info-sheet text, dungeon-fail HP description, fail-dungeon confirm alert) updated to match
- **Phase 1B — Full wipe/reset**: `performFullReset()` (schema.ts) wipes all user-data tables (logs, quests, inventory, dungeon runs, habits, moods, categories, recharge activities, dungeon_unlocks), keeps `dungeons` (game content), resets `rpg_state`/`health_state` to fresh-start defaults (Level 1, 0/450 XP, HP 100, MP 100, all currencies zero, health bars 100%), and re-seeds personal-build defaults (10 categories, 15 recharge activities, 6 moods). Wired into Settings → Danger Zone, replacing the old activity-log-only wipe.
- ~~**Phase 1B — Mood deletion**: `custom_moods.used` column (migration v33) flags a mood the moment it's activated via `setCurrentMood`; `deleteCustomMood()` soft-deletes (`is_active = 0`) and blocks if `used = 1`.~~ — **Superseded** (see "Mood deletion + Past History" entry below): used moods are no longer blocked from deletion, they archive instead.
- **Phase 1B — Info tab updates**: confirmed already complete from the HP rebuild pass — health tier multipliers, decay rates, and HP-removed text in `index.tsx`/`insights.tsx` all match this doc; drop tables render live from `DROP_TABLE` so they're always in sync.
- ~~**Phase 1B — Dungeon unlock system (mechanism)**: `dungeon_unlocks` table (migration v33) persists early-unlocked ranks; `isDungeonRankUnlocked()` checks natural-unlock-by-level OR early-unlock; `earlyUnlockDungeonRank()` spends Spendable XP...~~ — **Superseded** by the Rights & Keys system (Phase D follow-up section 2, see §11.6): `earlyUnlockDungeonRank` is gone, replaced by `purchaseDungeonRight`/`purchaseDungeonKey`, and the Shop now shows separate Right/Key cards instead of a single "Dungeon Rank Unlocks" list. The `dungeon_unlocks` table itself persists unchanged. ~~Only 5 hand-authored dungeons exist as permanent E-RANK GATES content — D–Legend ranks get content via Extra Gates (Dungeon Keys clone one of these 5 templates and stamp it with the Key's rank, §11.7/§13), so no D–Legend-specific content was ever needed.~~ — **Superseded again** (2026-06-11): those 5 templates are deleted; all dungeon content (Daily Gates and Extra Gates alike) is now drawn from the shared `dungeon_templates` pool, see §11.8.
- **Phase 1B — Cosmetic store purchases**: `purchaseCosmetic('standard' | 'premium')` sells a redeemable "Cosmetic Token" inventory entry for 5,000 / 10,000 coins (exact pricing from §6). Actual cosmetic content/visuals are still undesigned — tokens are a functional coin sink and placeholder to redeem against once content exists. Surfaced in Store → Global tab.
- **Category management pass (post-1B)**: added `is_communal` flag (migration v34) — a third per-category logging boost alongside `is_physical`/`is_recreational`, granting +5 Emotional health on log (mirrors the existing +5 Physical/+5 Mental pattern, see §3.3). Replaced the 1–5 weight picker with a horizontal 1–20 scroller matching the formula's actual clamp range (`Math.max(1, Math.min(20, weight))`), and added info-icon explainers next to "Weight" (in the New Activity Tag sheet) and "Duration" (in the Log screen) describing how each affects XP, including the 20-minute default applied when duration is left blank.
- **Attribute-driven stat gain (replaces hardcoded auto-gain)**: migration v35 adds `{attribute}_auto` columns to `rpg_state`; `grantAttributeStatGain()` directly adds +1 to the stat matching a logged category's chosen `attribute`, on every single log — see §9.3 for full details and the pacing-shift note (confirmed deliberate). Removed the old `logCount`/`totalActivityCount`-based thresholds entirely. Added an info icon next to "STATUS WINDOW" in the Game tab explaining both AP-allocation and activity-gain stat sources.
- **Category deletion + Past History**: `deleteCategory()` now archives categories that have been logged against (`is_active = 0`, kept visible in a read-only "Past History" viewer — name/weight/attribute) and purges never-used ones outright (`DELETE FROM categories`). This replaces the originally-planned hard delete-block for used categories.
- **Activity-row controls + Manage/delete UI (CategoryGrid polish)**: `CategoryGrid` is now a `forwardRef` exposing `openPastHistory`/`showWeightInfo`/`openManage`, so the Log screen's "Activity" section header carries an info icon (weight explainer), an archive icon (Past History viewer), and a settings/gear icon — all on the same row as the "Activity" label, to the right of it. The gear opens a "Manage Activities" list (mirrors `MoodSettingsSheet`'s mood list) with a trash icon per tag — the actually-discoverable way to delete activities (the long-press-to-delete from the prior pass remains but isn't the primary affordance). Replaced the 1–20 weight-pill scroller with a drag slider (`@react-native-community/slider`, added this pass) showing the live numeric value. Added an info icon next to "Attribute (for Game)" in the New Activity Tag sheet explaining that logging the activity grants +1 directly to that stat — and added the same explanation to the "Activity Effects — How it works" info sheet on the Journal tab (which also had a stale "weights (1–5)" line, now corrected to "1–20").
- **Restore (recharge) activity deletion + Past Restore**: migration v36 adds `used`/`is_active` columns to `restorative_activities` (mirrors categories/moods exactly). `purchaseRestoration()` now flags `used = 1` on first redemption. New `deleteRestorativeActivity()` archives used ones (`is_active = 0`, viewable read-only) and purges never-used ones outright; `getRestorativeActivities()` now filters to `is_active = 1`; new `getPastHistoryRestorativeActivities()` powers the viewer. UI on the Recharge tab: a "Past Restore" button sits beside the "Restore" section heading (opens an archive viewer showing name, restore amounts, and XP cost as last saved), and each `RestoreCard` carries a small trash icon next to its name for direct deletion — confirm alert notes archival for used ones.
- **Mood deletion + Past History**: reworked `deleteCustomMood()` to mirror the category pattern above — used moods (`used = 1`) now archive (`is_active = 0`) instead of being blocked with `'in_use'`; never-used moods purge outright (`DELETE FROM custom_moods`). Added `getPastHistoryMoods()` (`WHERE is_active = 0 AND used = 1`). UI: the "used" badge / blocking alert in `MoodSettingsSheet` is gone — delete now always proceeds, with a confirm alert noting archival for used moods. A "Past History" archive-icon button sits next to the mood-card's info icon on the Journal tab, opening a viewer listing each archived mood's name, colour swatch, passive effect, XP change, and MP rate exactly as last saved.
- **MP regen + dungeon MP-spend drop boost + mood XP/MP modifiers wired live (migration v37)**: `applyMpRegen()` (rpg.ts) gives MP a real 50/day natural regen, mood-modified by `mp_rate` (±50/day), running on every `checkState()` — see §17.1. The dungeon entry overlay gained a "Use MP" slider (0 → current MP, default 0, info icon explainer) that spends MP on embark and boosts item-drop luck via `rollDrop(rank, mpUsed)` — `bonus = mpUsed × 0.001` added to the lowest drop tier, which equally lowers the no-drop chance — see §17.2. `MoodSettingsSheet` gained a real numeric "XP change" field (±10%, `+`/`−` toggle) alongside a restructured "MP Rate" field (re-capped ±100 → ±50, same toggle); both are now stored in `custom_moods` (new `xp_change` column) and mechanically real: `getMoodXPMultiplier()` scales every `applyXP()` grant by `1 + xp_change/100` — see §1.5.
- **Phase D follow-up, section 2 (migrations v38/v39)** — full spec shipped in one pass:
  - **Dungeon natural-unlock remap + Game access gate**: ranks now unlock on a clean every-10-levels cadence `{E:11..Legend:91}` (was the old uneven `{E:1..Legend:100}`); the Game tab itself is now gated behind `MIN_GAME_LEVEL = 11` (`isGameUnlocked()`), with an "Unlockable only at level 11" alert on tap below that level — see §11.6.
  - **Rights & Keys system** replaces the old simple `earlyUnlockDungeonRank` flow — permanent "Right" items (bought for 5× Key price or auto-granted on natural level-up, materialized via `materializeDungeonRight`/surfaced via a dedicated "Gate Unlocked" toast) and consumable "Key" items (purchasable + ~15% drop chance from gate clears, generation effect stubbed pending the deferred rotation engine). Separate Shop cards for each (never bundled), `RANK_COLOR`-tinted `DungeonCard` borders/backgrounds, and Rights/Keys now surface in the inventory ribbon's new Game segment — see §11.6.
  - **Level-up modal now shows real AP+Coins** (was hardcoded "+10 AP earned") via transient `level_up_ap_gained`/`level_up_coins_gained` fields — see §2.2.
  - **Mood field validation hardened**: `MoodSettingsSheet` now hard-blocks (alert + refuse to save) XP-change magnitude > 10 or MP-rate magnitude > 50, instead of silently clamping.
  - **MP regen now keys off *yesterday's* logged mood**: new `activity_logs.mood_name` column + chip-selector wired into the daily log form; `_applyMpRegen` looks up the prior day's named mood via `getLoggedMoodName()` rather than the live sticky `current_mood`.
  - **Timezone sweep completed**: every remaining `toISOString().split('T')[0]` call site (rpg.ts, logs.ts, game.ts, bible.ts, milestones.tsx, index.tsx, history.tsx, log.tsx) converted to the local-calendar-day-correct `localDateStr()` — closes out the known UTC-vs-local streak/date-boundary risk noted in the prior MP-regen pass.
- **2026-06-10 follow-up batch** — full as-built logs in `ONBOARDING_QUEST_SPEC.md` §14–§16:
  - Quest snapshot recompute now also triggers when new activity/mood logs exist since the last snapshot (not just the 7-day timer) — fixes backfilled logs not generating new quests.
  - Extra Gates (Key-generated dungeons) are one-time: any finished attempt (clear/fail/abandon) deletes the gate, no cooldown retry.
  - Streak Freeze purchases now go to inventory and require pressing USE to arm, instead of activating instantly on purchase.
  - Active dungeon runs freeze `duration_mins` at start (schema v45) so the countdown timer and XP/log entry can't desync from a live-recomputed value mid-run.
  - Home XP bar gained a glowing player-rank badge (`getPlayerRankLabel`, F–Legend, muted "F" tier).
  - Onboarding-seeded categories can now have their XP weight retuned via "Manage Activities" (slider, 1–20).
  - The Effects row no longer shows a fake "driven" mood tag for the default `current_mood` when no matching custom mood (with real passive effects) exists.
  - Color consistency pass: "usable XP" / "today XP" now match the XP bar's blue (`colors.primary`, including the Recharge badge's border), Vigor matches across Soul Record/GlobalCurrencyBar (`colors.success`), Anima is a fixed silvery blue regardless of sign.
- **Daily Quests + Daily Gates (shared pool), 2026-06-11** — full as-built log in `ONBOARDING_QUEST_SPEC.md` §17, full design in §11.8/§12.1. `generateDailyContent()` replaces `generateQuests()`: once per local day, wipes and regenerates exactly 3 Daily Quests (`quest_type='daily'`, the only quest type now — `'weekly'` retired) + 3 Daily Gates, drawn from one shared 6-candidate pool (`drawDailyPool`) with guaranteed zero category overlap. Daily Gates use the player's current unlocked rank (`getCurrentDungeonRank`) and the existing rank multipliers. Extra Gates (Dungeon Keys) migrated to the same `dungeon_templates` pool; the 5 old hand-authored E-RANK templates and the "E-RANK GATES" UI section are deleted.
- **Q3 onboarding redesign — categorized "Hobbies & Practices" picker, 2026-06-12**: full as-built log in `ONBOARDING_QUEST_SPEC.md` §18. Q3 went from a single yes/no creative-work question to a 6-cluster, ~22-hobby multi-select (max 3 picks) with a per-cluster "Other" + custom name option, mirroring the Q1 cluster UI in both `onboarding.tsx` and `quest-preferences.tsx`.
- **Manage Activities — rename, recolour, attribute & health-flag editing (CategoryGrid)**: the per-category edit panel (toggled via the existing edit-icon) now also supports inline rename (`renameCategory`, cascades to `activity_logs.category`/`categories` JSON), recolour from the 16-colour `COLOR_PALETTE` (`updateCategoryColor`), changing the attribute it feeds (`updateCategoryAttribute`), and toggling Physical/Recreational/Communal flags (`updateCategoryFlags`) — previously only the XP weight slider was editable here. `COLOR_PALETTE` was also reordered into a clean hue gradient (red→orange→yellow→green→cyan→blue→violet→pink→slate).
- **"Stamina" → "Resilience" UI rename (STA → RES), 2026-06-12**: every user-facing occurrence of "Stamina"/"STA" (StatsSection, InventorySection, CategoryGrid attribute pills, suitup consumable slot, Game tab fatigue copy, seeded item names/descriptions) now reads "Resilience"/"RES". The underlying DB columns/keys (`sta_stat`, `sta`, `catalyst_sta`, `stat_buff` `"sta:N"`) are unchanged — too deeply tangled into `game.ts`/`xpEngine.ts` formulas to rename. A new migration v49 retroactively renames the already-seeded "Stamina Core"/"Stamina Brew" inventory/active-buff rows (and their `STA`-text descriptions) to "Resilience Core"/"Resilience Brew" for existing installs.
- **Mood cards — full inline editing + palette gradient (MoodSettingsSheet), 2026-06-12**: each entry in "Your Moods" now has an edit icon that expands an inline panel for renaming (new `renameCustomMood()`, cascades to `activity_logs.mood_name` and `rpg_state.current_mood`, duplicate-name guarded), recolouring, editing the passive-effect text, and adjusting XP change (±10%) and MP rate (±50/day) — all via a new `updateCustomMood()` partial-update helper, committed immediately/on-blur exactly like the CategoryGrid pattern. `PALETTE_COLORS` was expanded from 10 to 16 colours and reordered into the same red→orange→…→slate hue gradient as `COLOR_PALETTE`, using lighter shades so mood colours stay visually distinct from activity colours.
- **Effects row layout fix (Progress tab), 2026-06-12**: the mood-name tag in the XP bar's "Effects" row could get clipped by the card edge for longer mood names — `s.effectsTags` was `flexShrink: 0` (never shrinks, can overflow); changed to `flex: 1` so it claims the remaining row width and wraps its tag pills within that space instead of overflowing.

### Next / planned (not yet implemented)
- Actual cosmetic content/visuals — pricing is implemented (§6) but what a "cosmetic" actually looks like/does is still undefined

### To do before Phase 2 — pre-existing tsc errors (not caused by HP work)
- ~~`history.tsx`~~ — fixed: removed 3 stale `|| log.category` fallbacks (categories now live solely in the `categories` JSON array, parsed via `parseCategories`) and deleted the dead `danger: colors.danger` entry sitting inside the `StyleSheet.create()` object
- ~~`insights-feed.tsx`~~ — fixed: deleted the file; it was orphaned (imported nonexistent `getInsights`/`Insight` from `src/db/logs.ts`, likely a leftover from the `getRevelations`/`Revelation` rename) and unreachable — nothing routed to `/insights-feed`
- ~~`DeathScreen.tsx`~~ — fixed: retyped `STAT_ICON` in `src/constants/stats.ts` from `Record<StatKey, string>` to `Record<StatKey, ComponentProps<typeof Feather>['name']>` so it satisfies `Feather`'s `name` prop union
- Remaining: `suitup.tsx` errors (`Rarity`/`RARITY_COLOR`/`RARITY_BG` not found) — left untouched, this is the demo/dead screen already slated for full replacement in Phase 2 (see `demo_and_customisation` notes)

### Phase 2 (deferred)
- Dormant/cosmetic-only systems: equipment stat buffs, consumable buff application — see ⚠️ Critical Findings and §16 (mood passives `xp_change`/`mp_rate`, the MP system, and the Anima coin multiplier are now wired, see §1.5/§13/§17)
- Suitup screen replacement (currently demo/dead code — see `demo_and_customisation` notes)

---

## ⚠️ Critical Findings (Not Yet Wired)

### 1. ~~Custom Mood Passive Effects are cosmetic only~~ — RESOLVED for `xp_change`/`mp_rate` (migration v37)
~~`passive_effect` flavour text, `xp_change`, and `mp_rate` were all stored and displayed but never read by game logic.~~ **`xp_change` and `mp_rate` are now fully wired** — see §17.1 and §1.5 below:
- `xp_change` (±10%, custom `+`/`−` toggle in `MoodSettingsSheet`): applied as a multiplier inside `applyXP()` itself — `getMoodXPMultiplier()` reads the active mood's `xp_change` and scales every XP grant by `1 + xp_change/100`. Because `applyXP` is the single funnel for all XP sources (activity logs, mood/journal logs, dungeon clears, quests, habits), this one hook covers everything uniformly.
- `mp_rate` (±50/day, same toggle pattern): additive on top of the 50/day MP regen baseline — see §17.1.

The free-text `passive_effect` flavour string itself remains cosmetic/display-only (it's user-authored prose, not a structured value a formula could read) — only the two numeric fields beside it (`xp_change`, `mp_rate`) are now mechanically real.

### 2. Equipment stat buffs are cosmetic only
Items in inventory have a stat bonus value (e.g. "+5 STR"). Equipping an item writes `is_equipped = 1` to the DB and the game shows the bonus in the item card. But `getComputedStats()` in `game.ts` only adds AP allocations + lifetime-log auto-gains. It never reads equipped items or active consumable buffs. The `active_buffs` table is written to when a consumable is used but nothing ever reads it to modify a stat.

**Impact:** All stat bonuses from equipment and consumables are purely visual.

### 3. ~~Custom category `attribute` field is cosmetic only~~ — RESOLVED (migration v35)
~~Was stored but never read; auto-gain was keyed off hardcoded category-name matches instead.~~ **Now fully wired** — see §9.3. Every activity log directly grants +1 to the stat matching its category's chosen `attribute`, stored in new `{attribute}_auto` columns on `rpg_state`. The picker now does exactly what it visually implies.

---

## 1. XP Engine

### 1.1 Activity Log XP

**Two-phase sessionXP formula (Phase 1A):**

If `duration_mins` is left blank (null/undefined), it defaults to **20 minutes** for XP purposes (`xpEngine.ts` → `dur = input.duration_mins ?? 20`) — not 0.

```
a           = 3.5 + 0.04 × weight           [weight 1–20]
phase1      = (a / 0.1) × (1 − exp(−0.1 × min(duration, 30)))
  if duration ≤ 30: baseXP = floor(phase1)
  if duration > 30:
    flatRate = 0.4 × exp(0.08 × weight) − 0.4
    baseXP   = floor(phase1 + flatRate × (duration − 30))

Activity log takes EXACTLY ONE category. Fallback weight = 5 if no category.

moodMult    = 0.95 + ((mood   − 1) / 9) × 0.10   → range 0.95 – 1.05
energyMult  = 0.95 + ((energy − 1) / 9) × 0.10   → range 0.95 – 1.05
prodMult    = 0.95 + ((prod   − 1) / 9) × 0.10   → range 0.95 – 1.05

habitBonus  = sum(habit.weight × 3)   [flat, added AFTER multipliers]

raw         = baseXP × moodMult × energyMult × prodMult
healthMult  = [see Health Tiers §3.2]
weeklyMult  = 1.05 if weekly_boost_until ≥ today, else 1.0
xp_awarded  = max(floor(raw × healthMult × weeklyMult) + habitBonus, 1)

Weekly log: activates 7-day 1.05× boost on ALL subsequent activity logs (not the weekly log itself).
```

**Category weights (Kevin personal profile — remove before multi-user build):**

| Category | Weight | Stat |
|---|---|---|
| Workout  | 18 | str |
| News     | 16 | wis |
| Coding   | 15 | foc |
| Study    | 12 | wis |
| Devotion | 10 | spr |
| Guitar   |  8 | spr |
| Reading  |  6 | wis |
| Journal  |  5 | spr |
| Admin    |  3 | agi |
| Meditate |  1 | spr |

**Multiplier extremes (all combined, no habits):**
- Best case: mood 10, energy 10, prod 10 → 1.05 × 1.05 × 1.05 = 1.158×
- Worst case: mood 1, energy 1, prod 1 → 0.95 × 0.95 × 0.95 = 0.857×

**Example:** Coding (weight 15, 30 min) → a = 4.1 → phase1 ≈ 25.9 → baseXP = 25; mood 7, energy 7, prod 7 each ≈ 1.017× → raw ≈ 27; + healthMult 1.0 = **27 XP**

### 1.2 Mood Log XP

| Situation | XP |
|---|---|
| New mood log, no journal | 20 |
| New mood log, with journal | 35 (20 + 15) |
| Update existing mood log, journal was empty → now has content | 15 |
| Update existing mood log, journal already existed | 0 |

Mood log XP does NOT pass through the `calculateXP` formula — it's a flat value. No healthMult applied.

### 1.3 Other XP Sources

| Source | XP | Notes |
|---|---|---|
| Bible note (first real save) | 10–200 (default 50) | Configurable in Settings. Refunded on delete. |
| Dungeon clear | sessionXP(dungeon.duration_mins, categoryWeight) × 1.20 | Formula-based. |
| Quest complete | sessionXP(quest.duration_mins ?? 30, categoryWeight) × 1.10 | Formula-based; weight from categories table, fallback 5. |
| Revival quest complete | 15 | Fixed. |

### 1.4 XP Blocked When Dead
`applyXP()` returns early without modifying anything if `isInDeathState()` is true (HP ≤ 0 or any health bar = 0).

### 1.5 Active Mood XP Modifier (±10%)
Inside `applyXP(xp)`, after the death-state check, the raw XP is scaled by `getMoodXPMultiplier()`:

```
mult = 1 + (activeMood.xp_change / 100)     // xp_change ∈ [−10, +10]
xp   = max(1, round(xp × mult))
```

This runs *inside* `applyXP` — the single funnel every XP source passes through (activity logs,
mood/journal logs, dungeon clears, quests, habit completions, revival quests) — so a mood's
"XP change" passive uniformly scales all XP gain while it's active, not just activity logs.
Set via the `+`/`−` toggle next to the "XP change" field in `MoodSettingsSheet` (capped ±10%).

---

## 2. Level System

### 2.1 XP Thresholds

```
XP to next level = ceil((7.5 × level + 435) / 10) × 10
```

| Level | XP needed |
|---|---|
| 1 | 450 |
| 2 | 460 |
| 5 | 480 |
| 10 | 510 |
| 20 | 590 |
| 50 | 810 |
| 100 | 1,190 |

### 2.2 Level-Up Rewards

| Reward | Amount |
|---|---|
| AP (Ability Points) | +10 per level gained |
| Coins | level × 10 per level gained (e.g. level-up to 5 → +50 coins) |

The level-up modal (`app/_layout.tsx`) displays the actual AP+Coins granted (read from the transient `level_up_ap_gained`/`level_up_coins_gained` fields populated by `applyXP`, paired with `level_up_pending` and cleared together by `clearLevelUpPending()`).

If the level-up also crosses a dungeon rank's natural-unlock threshold, the auto-granted "Right" does **not** appear on the level-up modal — it surfaces via a separate "Gate Unlocked — {RANK}-Rank dungeons are now permanently accessible" toast (reads `level_up_right_rank`, animates in independently of the gem banner). See §11.6 for the Rights & Keys system.

### 2.3 Titles

| Title | Level |
|---|---|
| Unranked | 1 |
| Apprentice | 5 |
| Journeyman | 10 |
| Adept | 20 |
| Expert | 35 |
| Master | 50 |
| Grandmaster | 75 |
| Shadow Monarch | 100 |

### 2.4 HP Regen on XP Grant — Removed
XP no longer restores HP. The `hpRegen = floor(xp × 0.1)` line has been removed from `applyXP()`. Health tiers also no longer affect HP per day (see §3.2). HP now changes only via dungeon fail damage and the Critical HP Boost store item — see §4.

---

## 3. Health System (3 Bars)

Bars: **Emotional**, **Physical**, **Mental**. Each 0–100%. All effects are based on the **minimum** of all 3 bars.

### 3.1 Decay (runs on every app open and XP grant)

All 3 bars (Emotional, Physical, Mental) use the same unified decay rate based on whether any activity log exists today. Bible logs do NOT count toward active status.

```
if any_activity_log_today:
    decay = 30% × days_passed      [Active]
else:
    decay = 20% × days_passed      [Inactive]

Max days_passed capped at 30. Skip if < ~1 hour since last update.
```

**Per-day rates:**
- Active (any activity log today, bible logs excluded): −30%/day
- Inactive (no activity log today): −20%/day

### 3.2 Health Tiers → XP Multiplier

Based on the **lowest** of the 3 bars. Health tiers affect XP only — they no longer move HP (the old HP daily delta has been removed; see §4).

| Tier | Min bar | XP multiplier |
|---|---|---|
| Depleted | ≤ 0%  | 0.93× |
| Critical | < 10% | 0.94× |
| Danger   | < 20% | 0.95× |
| Weakened | < 30% | 0.96× |
| Worn     | < 50% | 0.98× |
| Stable   | < 70% | 1.01× |
| Strong   | < 90% | 1.02× |
| Peak     | ≥ 90% | 1.03× |

### 3.3 Health Restoration from Logging

| Action | Effect |
|---|---|
| Log any activity | Resets emotional inactivity clock (prevents emotional −5%/day bonus decay) |
| Log a physical-flagged category | +5 Physical (capped at 100) |
| Log a recreational-flagged category | +5 Mental (capped at 100) |
| Log a communal-flagged category | +5 Emotional (capped at 100) |

Physical / recreational / communal flags are per-category, set when creating a category (`is_physical`, `is_recreational`, `is_communal` columns; communal added in migration v34). This is the only way activity logging — as opposed to mood logging — can raise the Emotional bar.

### 3.4 Mood Log Health Effects (runs on every mood log submit)

| Rating | Emotional | Physical | Mental (partial) |
|---|---|---|---|
| mood ≥ 8 | +4 | — | +2 |
| mood 5–7 | +2 | — | +2 |
| mood < 5 | −5 | — | −2 |
| energy ≥ 8 | — | +4 | — |
| energy 5–7 | — | +2 | — |
| energy < 5 | — | −5 | — |
| prod > 7 | — | — | −3 |
| prod 5–7 | — | — | +3 |
| prod < 5 | — | — | −4 |

Mental delta = mood-part + prod-part. Examples:
- mood 7 + prod 6: +2 + 3 = **+5 mental**
- mood 7 + prod 8: +2 − 3 = **−1 mental**
- mood 3 + prod 3: −2 − 4 = **−6 mental**

### 3.5 Recharge Activities (spend Spendable XP)

| Activity | XP cost | Emotional | Physical | Mental |
|---|---|---|---|---|
| Scroll     | 100 | +10% | — | — |
| Music      |  80 | +5%  | — | +5% |
| Netflix    |  65 | +10% | — | +10% |
| Youtube    |  60 | —    | — | +10% |
| Game       |  55 | —    | — | +5% |
| Journal    |  50 | +5%  | — | +5% |
| Jam        |  40 | +5%  | — | +5% |
| Good meal  |  35 | +5%  | +5% | — |
| Good sleep |  30 | +5%  | +5% | +5% |
| Walk       |  30 | —    | +5% | +5% |
| Bath       |  25 | +5%  | — | +5% |
| Talk       |  20 | +5%  | — | — |
| Meal       |  20 | +5%  | +5% | — |
| Sleep      |  20 | —    | +5% | +5% |
| Pull-ups   |  20 | —    | +5% | — |

**Blocked** if any bar is at 0% (revival quest must be completed first).

---

## 4. HP System

- Starting: 100 / 100 (hp / hp_max)
- Gain: Store item only — Critical HP Boost (+30 HP, 100 coins, requires HP ≤ 30)
- Loss: Dungeon fail — tier-difference damage formula below
- Death trigger: HP ≤ 0
- HP no longer changes from XP grants or from health bar levels (see §2.4, §3.2) — dungeons are the only source of HP loss, the store the only source of HP gain besides revival quests.

### Player Tier (derived from level)

10 clean brackets of 10 levels. Adds an "F" tier below E (rather than reusing/duplicating a rarity name) so the scale stays unambiguous against item rarities and dungeon ranks:

| Level Range | Player Tier | Tier Index |
|---|---|---|
| 1–10 | F | 1 |
| 11–20 | E | 2 |
| 21–30 | D | 3 |
| 31–40 | C | 4 |
| 41–50 | B | 5 |
| 51–60 | A | 6 |
| 61–70 | S | 7 |
| 71–80 | SS | 8 |
| 81–90 | SSS | 9 |
| 91–100 | Legend | 10 |

Dungeon ranks (E…Legend, 9 ranks) map to indices 2–10 on this same scale — "F" only ever appears as a player tier, never a dungeon rank.

**Rank badge (home XP bar)**: `getPlayerRankLabel(level)` (game.ts) maps the
above table to a letter, shown as a glowing, `RANK_COLOR`-tinted badge to the
left of the LVL badge in `XPBar`. `RANK_COLOR` (DungeonCard.tsx) gained an `F`
entry (`#475569`, muted slate) for tier 1 — the F badge is dimmed (`66`/`AA`
alpha border/text) and skips the pulsing glow animation the other ranks have,
since "unranked" shouldn't look like an achievement. See
`ONBOARDING_QUEST_SPEC.md` §16.

### Dungeon Fail Damage Formula

```
tier_diff = dungeon_tier_index − player_tier_index

if tier_diff <= 0:
    damage = 33                  (flat — dungeon at or below player tier)
if tier_diff > 0:
    damage = 33 × tier_diff
```

No cap on max damage. HP is floored at 0.

### Damage Reference (examples)

| Player tier | Dungeon tier | Tier diff | HP loss |
|---|---|---|---|
| F | F | 0 | 33 |
| F | D | 2 | 66 |
| F | A | 5 | 165 |
| F | Legend | 9 | 297 |
| D | F | −1 | 33 (flat) |
| D | D | 0 | 33 |
| D | A | 3 | 99 |
| A | S | 1 | 33 |
| A | Legend | 4 | 132 |

> Attempting a dungeon far above your tier is extremely punishing — a level-1 player failing a Legend dungeon loses 297 HP, instantly hitting 0 from full HP.

---

## 5. Death System

**Death triggers when:** HP = 0 **or** any health bar = 0.

| Cause | What happens |
|---|---|
| HP death | HP set to 0. XP blocked. Death screen shown. |
| Health bar death | Bar stays at 0. HP untouched. XP blocked. Death screen shown. |

**Revival quests** restore zero bars (and HP if at 0) by `quest.hp_restore %`, award 15 XP.

**Ignoring death** (`death_acknowledged = 1`) dismisses the screen but the death state persists — XP still blocked.

**Open questions (not yet defined):**
- Revival quest `hp_restore %` — exact value not yet set
- Whether multiple revival quests can be active/stacked at once, or only one at a time
- Whether the 100 HP cap can ever be raised (e.g. progression milestones)

---

## 6. Coins

### Earn Sources

| Source | Amount | Modifier |
|---|---|---|
| Dungeon clear | floor(rand(50–100) × rankMult × moodMult × animaMult) | rankMult: E=1.0…Legend=1.8 |
| Quest complete | floor(50 × moodMult × animaMult) | — |
| Level-up | level × 10 per level gained | No modifier |

**Dungeon rank coin multipliers:** E=1.0, D=1.1, C=1.2, B=1.3, A=1.4, S=1.5, SS=1.6, SSS=1.7, Legend=1.8

**Mood coin multiplier:** 0.95 + ((mood − 1) / 9) × 0.10 from most recent mood log. Range 0.95–1.05.

**Anima coin multiplier:** `1 + Anima × 0.005`, clamped to 0x–3x. E.g. Anima −50 → 0.75x (25% drop), Anima +50 → 1.25x (25% boost). See §13.

### Spend Sinks

| Item | Cost | Effect |
|---|---|---|
| Streak Freeze | 300 coins | Adds to global inventory; USE from Inventory to arm (banked, auto-uses on 2-day gap) |
| MP Boost | 200 coins | +25 MP — spend it before a dungeon run to boost item-drop luck, see §17.2 |
| Critical HP Boost | 100 coins | +30 HP (only purchasable if HP ≤ 30) |
| Standard Cosmetic | 5,000 coins | Grants a redeemable "Standard Cosmetic Token" — content/visuals not yet designed |
| Premium Cosmetic | 10,000 coins | Grants a redeemable "Premium Cosmetic Token" — content/visuals not yet designed |

Cosmetic pricing implemented exactly per spec — saving targets: ~10/8 days (standard) and ~20/16 days (premium) at ordinary/deliberate daily coin-earn rates. The tokens are a functional coin sink placeholder; what an actual cosmetic looks like / does is still undefined.

---

## 7. Gems

**Earn:** +1 gem per confirmed clean day.
- On each new day login: if yesterday had zero self-destruct logs AND this is not the first ever login → gem awarded + banner shown.

**Spend:** No spend sinks implemented.

---

## 8. Spendable XP

A separate running total that mirrors `total_xp` — every XP grant increments both.

**Used for:** Recharge activities (health restoration — see §3.5).

**Decremented by:** Recharge activity purchases. Never goes below 0. When a log is deleted its XP is deducted from spendable_xp.

---

## 9. AP (Ability Points) and 7-Stat System

### 9.1 AP

- **Earn:** +10 AP per level-up.
- **Spend:** 1 AP → +1 permanently to one chosen stat.

### 9.2 Stat Computation

Each stat = **AP layer** + **Auto-gain layer**. Equipment bonuses are NOT applied (see ⚠️).

```
total_stat = ap_allocation + auto_gain
```

### 9.3 Activity Gain — attribute-driven (replaces the old hardcoded auto-gain)

**Implemented (migration v35, replacing the prior name-matched thresholds):** every activity log directly grants **+1** to the stat matching that category's chosen `attribute` — stored permanently in a new `{attribute}_auto` column on `rpg_state` (e.g. `strength_auto`, `focus_auto`, `per_stat_auto`). `grantAttributeStatGain()` in `game.ts` looks up the logged category's `attribute` and increments the matching column by 1, once per log (activity logs take exactly one category — §1.1).

```
total_stat = ap_allocation (rpg_state.{stat}, spent via AP) + activity_gain (rpg_state.{attribute}_auto, earned via logging)
```

This makes the `attribute` picker **fully functional** — no longer cosmetic (superseding the Critical Finding #3 note below, which described the old behavior). Tag a custom category "Boxing" with attribute `strength`, and every log of it now adds +1 STR directly — immediately, every single time, no thresholds.

**Pacing note:** this is a significant speed-up versus the old per-5/per-7/per-15-log thresholds — stats now grow roughly 5–15× faster from logging alone. This was an explicit, confirmed design choice (not a balance oversight).

~~Old system (removed):~~ auto-gain used to be keyed off hardcoded category-name string matches (Workout → STR/STA, Coding → FOC, Admin → AGI, Study+Reading+Devotion → WIS, Journal+Devotion → SPR, any activity → PER) at thresholds like "+1 per 5 logs". `logCount()`/`totalActivityCount()` helpers and the live-computed thresholds were deleted from `getComputedStats()`.

---

## 10. Equipment / Inventory

### 10.1 Rarity Tiers

| Rarity | Colour |
|---|---|
| E | #5C3317 |
| D | #4B5563 |
| C | #22C55E |
| B | #00B7B7 |
| A | #3B82F6 |
| S | #A855F7 |
| SS | #EF4444 |
| SSS | #FFD700 |
| Legendary | #FFFFFF |

### 10.2 Stat Bonus (stat_buff field)

Items store a bonus string like `"str:5"`, shown as "+5 STR" in the UI.
**⚠️ Not applied to computed stats.** (See Critical Findings.)

### 10.3 Consumable Buffs

Using a consumable writes a timed entry to `active_buffs` (1 hour expiry).
**⚠️ active_buffs are never read back to modify stats.** (See Critical Findings.)

---

## 11. Dungeon System

### 11.1 Clear Rewards

| Reward | Value |
|---|---|
| XP | sessionXP(dungeon.duration_mins, categoryWeight) × 1.20 |
| Coins | floor(rand(50–100) × rankMult × moodMult) |
| Item drop | See drop table |

### 11.2 Fail

- HP damage — Phase 2 formula (not yet implemented, see §4)
- Triggers death check

### 11.3 Item Drop Table (by dungeon rank)

| Rank | Drop chances | No-drop |
|---|---|---|
| E | E 30%, D 15%, C 7.5%, B 0.5% | 47% |
| D | D 30%, C 15%, B 7.5%, A 0.5% | 47% |
| C | C 30%, B 15%, A 7.5%, S 0.5% | 47% |
| B | B 30%, A 15%, S 7.5%, SS 0.5% | 47% |
| A | A 30%, S 15%, SS 7.5%, SSS 0.5% | 47% |
| S | A 20%, S 22.5%, SS 10%, SSS 0.5% | 47% |
| SS | S 22.5%, SS 22.5%, SSS 4.9%, Legendary 0.1% | 50% |
| SSS | S 15%, SS 20%, SSS 10.35%, Legendary 0.25% | 54.4% |
| Legend | S 10%, SS 30%, SSS 12.5%, Legendary 0.5% | 47% |

### 11.4 Item Slot by Dungeon Category

| Dungeon category | Possible slots |
|---|---|
| Workout | top, pants, coat, gloves, shoes, sword |
| Study | ring, necklace, grimoire, scepter |
| Devotion | goblet, bracelet, necklace, scepter |
| Journal | ring, necklace, dagger, bracelet |
| default | top, ring, necklace, dagger, sword, shield |

### 11.5 Cooldown

Cooldown per dungeon (stored in `dungeons.cooldown_hours`). Currently 2 minutes in dev build.

**Generated gates are exempt** — Daily Gates and Extra Gates (both
`is_generated=1`, see §11.8) are one-time quests: any finished attempt (clear,
fail, or abandon) deletes the gate row immediately (`consumeIfGenerated()` in
game.ts), regardless of `cooldown_hours` or `expires_at`. There is no retry.

### 11.6 Unlock System — Rights & Keys

Players naturally unlock dungeon ranks as they level up. The Game itself is gated behind **Level 11** (`MIN_GAME_LEVEL`/`isGameUnlocked()` in game.ts — tapping the Game tab below this level shows "Unlockable only at level 11"), and ranks now unlock on a clean every-10-levels cadence starting there, so E becomes available the instant the Game does.

**Natural unlock levels** (`DUNGEON_NATURAL_UNLOCK_LEVEL`, canonical copy lives in rpg.ts and is re-exported to game.ts to avoid a circular import with `applyXP`):

| Dungeon Rank | Natural unlock |
|---|---|
| E | Level 11 |
| D | Level 21 |
| C | Level 31 |
| B | Level 41 |
| A | Level 51 |
| S | Level 61 |
| SS | Level 71 |
| SSS | Level 81 |
| Legend | Level 91 |

**Right** — a permanent, non-usable writ of passage that grants lasting access to a dungeon rank. Either:
1. **Bought early** from the Shop (Store → GAME → "Dungeon Rights") for **5× the rank's Key price**, paid in Spendable XP — `purchaseDungeonRight()`/`getDungeonRightPrice()` in game.ts, persisted in `dungeon_unlocks`; or
2. **Auto-granted** the instant a level-up crosses a rank's natural-unlock threshold — detected inline in `applyXP` (rpg.ts), which calls `materializeDungeonRight()`. **Crucial asymmetry vs. purchases**: a level-up grant is never partial — if a single XP jump crosses *multiple* thresholds at once (e.g. a big catch-up grant takes someone from level 50 straight to 95, crossing A/S/SS/SSS), **every** crossed rank's Right is granted, not just the highest. Buying a Right, by contrast, unlocks *only* the specific tier purchased — there's no "buy SSS, get the lower ones free."

Either path materializes a permanent inventory item (`category='game'`, `item_type='dungeon_right'`, name `"{RANK}-Tier Dungeon Right"`, colored via `RANK_COLOR`) and removes the rank from the Shop's Rights list (`getDungeonUnlockInfo().unlocked`). Auto-grants surface via a dedicated "Gate(s) Unlocked" toast in `app/_layout.tsx` (separate from the level-up modal — see §2.2) — listing every newly-accessible rank from that jump, comma-separated in the transient `level_up_right_rank` field (e.g. `"A,S,SS,SSS"`), colored to the highest rank reached.

> E needs no Right purchase path — it unlocks at exactly `MIN_GAME_LEVEL` (11), so no player can ever reach the Game before E is already accessible.

**Key** — a consumable, `category='game'`/`item_type='dungeon_key'`, name `"{RANK}-Tier Dungeon Key"`. Purchasable from the Shop (Store → GAME → "Dungeon Keys", priced per the table below) and drops at a **~15% chance from clearing a gate of that same rank** (`submitDungeonClear` in game.ts, surfaced as a "Bonus Drop" on the clear screen). Using one (`useDungeonKey()`) generates an extra gate ("Extra Gate") of its rank with a random expiry, drawn from the same shared content pool as Daily Gates — see §11.8.

**Right/Key Spendable-XP pricing** (`DUNGEON_KEY_PRICE` in game.ts — Right price = Key price × 5):

| Dungeon Rank | Key cost | Right cost |
|---|---|---|
| D | 50 | 250 |
| C | 100 | 500 |
| B | 175 | 875 |
| A | 250 | 1,250 |
| S | 375 | 1,875 |
| SS | 625 | 3,125 |
| SSS | 1,000 | 5,000 |
| Legend | 1,500 | 7,500 |

> Costs are intentionally low — the grind is in the runs and drop rates, not the unlock. E has neither a Key nor a Right price (see above).

### 11.7 Time Limit (`duration_mins`) — live-derived, 2026-06-10

`duration_mins` serves double duty: it's the **countdown timer** for an attempt (`game.tsx`: `setTimerSeconds(dungeon.duration_mins * 60)`, `fmtTimer(...)`) and the **XP-calc input** (§11.1: `sessionXP(dungeon.duration_mins, categoryWeight)`). As of v43, it is no longer a static seeded value for most dungeons — `getDungeons()`/`getActiveDungeonRun()` (game.ts) compute it live on every call via `withLiveDuration()`, gated by a new `dungeons.time_mode` column:

- **`time_mode = 'duration'` (default, all dungeons except Hunter's Run)**: the dungeon's task is "do this activity for N minutes" — more time = more work = harder. Time limit = `recommendedDurationMinutes(snapshot, dungeon.category, fallback)` (questEngine.ts — same `avg_duration_mins × stretchMultiplier(consistency_score)` formula used for stretch-tier quests, §12.1) × a per-rank multiplier (`DUNGEON_RANK_DURATION_MULT` in game.ts):

  | Rank | E | D | C | B | A | S | SS | SSS | Legend |
  |---|---|---|---|---|---|---|---|---|---|
  | Mult | 0.9 | 0.95 | 1.0 | 1.05 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 |

  Falls back to the dungeon's static seeded `duration_mins` (still 30 for the current E-rank set) if the player hasn't logged that category yet.

- **`time_mode = 'time_trial'` (Hunter's Run only)**: the task is a *fixed* objective with a deadline ("Complete a 2.4 km run before the gate closes") — more time would make it *easier*, so the formula is inverted/inapplicable. These dungeons are skipped by `withLiveDuration()` and keep their static seeded `duration_mins` untouched. Rank differentiation for `time_trial` dungeons stays in `difficulty`/`coin_reward`/drop-table only, same as before.

**Active runs freeze `duration_mins` at start (schema v45)**: `withLiveDuration()`
recomputes on every `getDungeons()`/`getActiveDungeonRun()` call, so a
`'duration'`-mode dungeon's derived value can shift mid-run (e.g. the player
logs another activity in that category before the timer ends). To stop this
from desyncing the on-screen countdown from the XP/log entry written on clear,
`startDungeon(dungeonId, durationMins, mpUsed)` now stores the
already-computed `duration_mins` on the `dungeon_runs` row, and
`getActiveDungeonRun()` returns that frozen value for any `status='active'`
run instead of a fresh `withLiveDuration()` call (falls back to a live
recompute only for pre-v45 runs with `duration_mins IS NULL`). `game.tsx`
resyncs the timer from `started_at + frozen duration_mins` on every reload
(not just on first detecting the run), and uses this frozen-duration dungeon
object for the rest of the attempt. See `ONBOARDING_QUEST_SPEC.md` §16.

**Why this is engine-safe long-term**: every template in `DEFAULT_QUEST_TEMPLATES` (`schema.ts`) is phrased as "log/spend N minutes of {category}" — the quest engine has no concept of a fixed-task/time-trial candidate. So any future dungeon content generated by the engine is automatically `'duration'`-mode-compatible. `time_trial` is reserved for hand-authored exceptions like Hunter's Run; if more are added later, just set `time_mode = 'time_trial'` on that row.

> **⚠️ Constraint for future difficulty work**: `time_mode` is the permanent switch for *any* difficulty-scaling mechanic, not just this one. `'duration'` dungeons scale difficulty by increasing `duration_mins` (more time = more work). `'time_trial'` dungeons must NEVER scale difficulty this way — for a fixed task with a deadline, more time makes it *easier*, which would defeat the point of a higher-rank gate. If/when `time_trial` difficulty scaling is designed (different axis — e.g. tightening a pace/distance target, not yet specced), it must branch on `time_mode === 'time_trial'` and leave `duration_mins`/the countdown untouched. Same applies if a time-trial-style `quest_templates` row is ever added — it would need the same tag and the same exclusion from `{minutes}`/stretch logic (§12.1).

### 11.8 Daily Quests + Daily Gates (Shared Pool) — 2026-06-11

Once per local day, `generateDailyContent()` (game.ts, replaces the old `generateQuests()`) generates **3 Daily Quests + 3 Daily Gates** in a single batch:

- **Idempotent**: gated by `rpg_state.last_daily_gen_date` vs `localDateStr()` — runs at most once per local day, on the first `reload()` of the day.
- **Wipe + regenerate**: deletes all `quest_type='daily'` quest rows outright (the old weekly engine and `quest_type='weekly'` are retired entirely — `'daily'` is now the only quest type), then calls `cleanupExpiredDungeons()` to drop any expired generated gates not mid-attempt.
- **Shared candidate pool**: `drawDailyPool(snapshot)` draws **6** distinct-category candidates from the same `buildCandidates()` pool that powers regular quests (`weightedSample(buildCandidates(snapshot), candidate_pool_limit * 2)`), then splits `[0:3]` → Daily Quests, `[3:6]` → Daily Gates. Since `buildCandidates` yields at most one candidate per category, the two halves are guaranteed to share zero categories — no extra de-dup logic needed.
- **Daily Quests**: filled via the existing `fillTemplate()` (§12.1), inserted with `quest_type='daily'`, status `pending`.
- **Daily Gates**: filled via `fillDungeonTemplate(candidate)`, which picks a random row from the new `dungeon_templates` table (migration v48, seeded by `DEFAULT_DUNGEON_TEMPLATES` — one or more per `kind`: `maintain`/`stretch`/`discovery`/`restorative`/`mood_repair`) and substitutes `{category}`/`{minutes}`. `secondary_stat` is always `null` (renders as "—" in `DungeonCard`).
- **Rank**: all 3 Daily Gates use `getCurrentDungeonRank(playerLevel)` — the player's *highest currently-unlocked* dungeon rank (walks `DUNGEON_TIER_INDEX` descending via `isDungeonRankUnlocked`, defaults `'E'`). Nothing else scales with rank for Daily Gates beyond the existing `DUNGEON_RANK_DURATION_MULT`/`DUNGEON_RANK_COIN_MULT` tables (§11.7/§11.1).
- **Duration**: `recommendedDurationMinutes(snapshot, candidate.category, candidate.minutes ?? 30) × DUNGEON_RANK_DURATION_MULT[rank]` — same formula as `'duration'`-mode dungeons (§11.7), `time_mode='duration'`.
- **Expiry & cleanup**: each Daily Gate row gets `is_generated=1, is_daily=1, expires_at = start of tomorrow (local)`. The next day's `generateDailyContent()` call runs `cleanupExpiredDungeons()` first, which deletes any `is_generated=1` row past its `expires_at` **unless** it has an active `dungeon_runs` entry — so an in-progress Daily Gate survives into the next day until the run finishes, with zero new logic (this is the existing function from §11.5/§11.7, unchanged).
- **Extra Gates (Dungeon Keys) migrated to the same pool**: `useDungeonKey(rank)` no longer clones one of the 5 old hand-authored `is_generated=0` templates (deleted in migration v48, along with their `dungeon_runs`). It now draws a single candidate the same way (`weightedSample(buildCandidates(snapshot), 1)[0]` → `fillDungeonTemplate`), computes duration the same way, and inserts with `is_generated=1, is_daily=0` and the existing 1–10 day (1–3 day for `S`/`SS`/`SSS`/`Legend`) random expiry (§11.6) — unchanged.
- **UI**: the Game tab shows a "DAILY GATES" section (`is_generated && is_daily`) and, only when at least one exists, an "EXTRA GATES" section (`is_generated && !is_daily`). The old "E-RANK GATES" section (the 5 permanent hand-authored dungeons) is removed entirely.

Full as-built log: `ONBOARDING_QUEST_SPEC.md` §17.

---

## 12. Quest System

### 12.1 Generation Algorithm — REPLACED 2026-06-09 by the adaptive quest engine, daily cadence 2026-06-11

The old static rule ("category logged ≥2× in 28 days, absent 7 days, no existing
pending/accepted quest for it") is gone. `generateDailyContent()` (`game.ts`, replaces
the old `generateQuests()`) delegates to `src/db/questEngine.ts` — a rules-based
weighted-scoring engine (NOT ML; same transparent/tunable philosophy as
`DROP_TABLE`/`getCategoryWeight`). Full design + as-built log:
`ONBOARDING_QUEST_SPEC.md` §11/§17 and `[[project_quest_engine_and_insights]]`.

As of 2026-06-11, generation is **daily**, not on-demand: once per local day,
`generateDailyContent()` wipes all `quest_type='daily'` rows (the only quest type —
the old `'weekly'` fill-empty-slots engine is retired) and regenerates exactly 3
Daily Quests, alongside 3 Daily Gates drawn from the same pool — see §11.8 for the
shared-pool draw (`drawDailyPool`, 6-candidate split) and dungeon-side details.

**4-stage pipeline, gated by a 7-day recompute cycle (`quest_engine_state` table):**
1. **Player Snapshot** (`computePlayerSnapshot`/`getOrRefreshSnapshot`) — per-category
   stats (times logged, avg duration, consistency score over a 14-day window), mood
   distribution + streaks, behavioral signal (logged-days ratio), health trend. Shared
   read by both the quest engine and Insights (siblings, not a pipeline).
2. **Stretch function** (`stretchMultiplier`) — `clamp(1.1 + consistency_score × 0.9,
   1.1, 2.0)`; sporadic logging → gentle 1.1-1.3x duration bump, strong streaks → up
   to ~2x. A category counts as "stretch-worthy" once `consistency_score >= 0.4`.
3. **Mood-reactive rules** (`applyMoodRules`) — ordered condition→action list: low
   mood/emotional-health forces `restorative` quests and suppresses stretch; sustained
   low-mood streak forces `mood_repair`; an **anti-cheese check** compares self-reported
   mood (sustained high ratings, `high_streak_days >= 10`) against actual behavior
   (`logged_days_ratio < 0.3`) — on mismatch, raises the difficulty floor (forces
   stretch-tier, starves easy/discovery candidates) rather than injecting anything
   restorative, since the "problem" here is coasting, not distress.
4. **Weighted draw** (`buildCandidates`/`drawQuestCandidates`/`drawDailyPool`) — combines
   base category weight × stretch × mood-rule multiplier × **recency decay**
   (`0.5^(ageDays/14)` — fades a logged category's pull the longer since last logged)
   into a score, then a ticket-based weighted-random draw without replacement (same
   mechanism as `DROP_TABLE`). `drawDailyPool` draws 6 candidates
   (`candidate_pool_limit * 2`) and splits 3 → Daily Quests, 3 → Daily Gates (§11.8);
   categories that exist but weren't logged this window surface as gentle `discovery`
   material (withheld during mood-repair / anti-cheese states).

Quest text is composed by filling `quest_templates` rows (`{category}`/`{minutes}`
placeholders, `DEFAULT_QUEST_TEMPLATES`, migration v41) keyed by candidate `kind`
(`maintain` / `stretch` / `discovery` / `restorative` / `mood_repair`), picked at
random from the matching pool — never one fixed phrasing per type.

**Starter quests** — removed. Deferred to onboarding flow for multi-user launch.

### 12.2 Rewards

| Reward | Amount |
|---|---|
| XP | sessionXP(quest.duration_mins ?? 30, categoryWeight) × 1.10 |
| Coins | floor(50 × moodCoinMult × animaMult) |

### 12.3 Status Flow

`quest_type` is always `'daily'` — the full batch of 3 is wiped and regenerated
once per local day by `generateDailyContent()` (§11.8/§12.1), so `pending` quests
that were never accepted/completed simply don't survive to the next day (no
`expired` status needed).

```




pending → accepted → completed
pending → skipped  (re-evaluated on next generation run)
pending → deleted  (permanent, never reappears)
```

---

## 13. Soul Record: Vigor / Blight / Anima

### Vigor (clean day counter)

- +1 on first app open each new day (optimistic today)
- If yesterday was clean (no self-destruct logged) AND not first ever login: that +1 becomes a confirmed gem + vigour
- Self-destruct (first press of the day only): vigor −1

### Blight

= `self_destruct_count` (all-time total presses, never decrements)

### Anima

= `vigor − self_destruct_count`

**Coin multiplier:** `1 + Anima × 0.005`, clamped to 0x–3x (0.5% swing per Anima point in either direction). Applies to dungeon-clear and quest-complete coin rewards (`getCoinMultiplier()` in `rpg.ts`).

---

## 14. Self-Destruct

| Effect | Value |
|---|---|
| Blight | +1 always |
| Vigor | −1 (first press of day only) |
| Physical health | −45% |
| Emotional health | −20% |
| Mental health | −10% |
| Triggers death check | Yes |
| Logs to activity_logs | Yes (entry_type = 'self_destruct', 0 XP) |

---

## 15. Streak System

- Increments by 1 when XP is applied and `last_active_date` was exactly yesterday.
- Resets to 1 if gap > 1 day (and no freeze bridges it).
- **Streak Freeze:** auto-consumes when a 2-day gap is detected on app open. Backdates `last_active_date` to yesterday so the next XP grant sees a 1-day gap and extends the streak.

---

## 16. Custom Mood States (Passive Effects — ⚠️ Display Only)

These are selectable mood states on the Log and Progress pages. The stored values below are labels only — the XP/coin modifiers are **not computed**.

| Mood | Displayed effect | mp_rate stored |
|---|---|---|
| driven | +10% XP gain | +10 |
| burnout | −20% XP · −10% coins | −20 |
| reminiscing | +5% XP gain | +5 |
| lonely | −5% XP gain | −5 |
| overstimulated | −10% XP · restlessness | −8 |
| relapsed | −30% XP · −15% coins | −30 |

The 1–10 mood/energy/productivity sliders on each log **do** affect XP (via moodMult/energyMult/prodMult in §1.1). The named mood state does not.

---

## 17. MP (Mana Points)

- Stored on `rpg_state.mp` (0–100, clamped). Boosted by store item: +25 for 75 coins.

### 17.1 Natural Regeneration
`applyMpRegen()` (rpg.ts) — daily-tick pattern mirroring `applyHealthDecay`, driven by
`rpg_state.last_mp_regen` (migration v37). Runs on every `checkState()` (app open / focus):

```
daysPassed = min((now − last_mp_regen) / 1 day, 30)     // capped at 30 days
dailyRate  = 50 + activeMood.mp_rate                     // baseline 50/day, mood-modified
delta      = round(dailyRate × daysPassed)
mp         = clamp(mp + delta, 0, 100)
```

The active custom mood's `mp_rate` (±50/day, set via `MoodSettingsSheet`) is additive on top
of the 50/day baseline — this is what gives the previously-cosmetic `mp_rate` field a real effect.

### 17.2 Spending MP — Dungeon Drop-Luck Boost
Before starting a dungeon timer, the entry overlay shows a "Use MP" slider (range 0 → current
MP balance, default 0). The chosen amount is deducted from `rpg_state.mp` the moment the timer
starts (win or lose — it's a luck investment, not a guarantee) and persisted on the run
(`dungeon_runs.mp_used`, migration v37).

`rollDrop(rank, mpUsed)` (game.ts) applies the spend as a flat percentage-point bonus to the
gate's lowest (most common) drop tier:

```
bonus = mpUsed × 0.001        // mp_used × 0.1 percentage points, as a fraction
table[0].chance += bonus      // raises lowest-tier chance...
                              // ...and equally lowers no-drop, since no_drop = 1 − Σ(table chances)
```

**Example (E-rank gate):** spending 100 MP adds +0.10 (10 percentage points) to the E-tier
chance — 30% → 40% — which simultaneously drops the no-drop chance from 47% → 37%, exactly
mirroring the dual effect described when this was speced.

### 17.3 Dependency Chain
```
checkState() (app open/focus)
  → applyMpRegen() — 50/day baseline + active mood's mp_rate, clamped [0,100]

Dungeon entry overlay
  → "Use MP" slider (0 → current MP) → handleStartTimer()
      → startDungeon(dungeonId, mpUsed) — deducts mp, persists dungeon_runs.mp_used
      → submitDungeonClear(runId, dungeon)
          → rollDrop(dungeon.rank, mpUsed) — bonus = mpUsed × 0.001 to lowest tier / no-drop
```

---

## 18. Mechanic Dependency Map

```
Activity Log Submit
  → calculateXP({ category (×1), duration, habits, mood, energy, prod })
      → sessionXP(duration, weight) → baseXP
      → × moodMult × energyMult × prodMult (each 0.95–1.05)
      → + habitBonus (weight × 3 flat, after multipliers)
  → × healthMult (from min health bar tier, §3.2)
  → × weeklyMult (1.05 if weekly_boost_until active, else 1.0)
  → applyXP(xp)
      → total_xp + spendable_xp + total_xp_earned += xp
      → streak update
      → level-up check → AP += 10, coins += level × 10 per level gained
  → applyLoggingHealthBoost(isPhysical, isRecreational)
      → physical += 5 if physical; mental += 5 if recreational
  → if log_type === 'weekly': activateWeeklyBoost() (7-day 1.05× stored)

Mood Log Submit
  → flat 20 XP (+ 15 if new journal)
  → applyMoodHealthEffects(mood, energy, prod)
      → emotional, physical, mental shift (see §3.4)
  → applyXP(xpFlat)

Health Decay (on every applyXP call and app open)
  → all 3 bars decay by 30%/day (active) or 20%/day (inactive)
    (active = any activity log today; bible logs excluded)
  → min bar → tier → XP multiplier updated

Self-Destruct
  → health: physical −45, emotional −20, mental −10
  → vigor (if first SD today): −1
  → blight: +1 always
  → triggers health decay → may trigger death check
  → if bar hits 0: death state → XP blocked

Dungeon Clear
  → sessionXP(duration, weight) × 1.20 → applyXP
  → floor(rand(50–100) × rankMult × moodMult) → coins
  → rollDrop(rank) → pickSlot(category) → item inserted to inventory

Quest Complete
  → sessionXP(duration ?? 30, weight) × 1.10 → applyXP
  → floor(50 × moodMult) → coins

Coin Multiplier (mood)
  ← most recent mood log: 0.95 + ((mood−1)/9) × 0.10

Coin Multiplier (Anima)
  ← getAnima() = vigor − blight
  ← multiplier = clamp(1 + anima × 0.005, 0, 3)

Recharge Activity
  ← costs spendable_xp
  → health bars += restore amounts

Level-Up
  → AP += 10
  → coins += current_level × 10 (per level gained)
  → title updated
  → level_up_pending set → modal shown

Streak Freeze (auto)
  ← triggered on app open if 2-day gap detected
  ← streak_freezes > 0
  → streak_freezes −= 1
  → last_active_date backdated to yesterday
```
