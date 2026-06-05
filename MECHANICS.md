# Prodewty — Mechanics Reference

> Snapshot of every live mechanic as of June 2026. Use this to reason about tuning without jumping between files. Two critical findings flagged with ⚠️ — read those first.

---

## ⚠️ Critical Findings (Not Yet Wired)

### 1. Custom Mood Passive Effects are cosmetic only
The mood states (driven, burnout, relapsed, etc.) show flavour text like "+10% XP gain" or "−20% XP". **None of this actually runs.** The `passive_effect` column is stored and displayed, but nothing in the XP formula reads it. The `mp_rate` column is the same — stored, shown in the settings sheet, never applied. The only real mood effect on XP is the 1–10 slider rating on each log.

**Impact:** Players see "driven = +10% XP" and believe it matters. It doesn't.

### 2. Equipment stat buffs are cosmetic only
Items in inventory have a stat bonus value (e.g. "+5 STR"). Equipping an item writes `is_equipped = 1` to the DB and the game shows the bonus in the item card. But `getComputedStats()` in `game.ts` only adds AP allocations + lifetime-log auto-gains. It never reads equipped items or active consumable buffs. The `active_buffs` table is written to when a consumable is used but nothing ever reads it to modify a stat.

**Impact:** All stat bonuses from equipment and consumables are purely visual.

---

## 1. XP Engine

### 1.1 Activity Log XP

**Two-phase sessionXP formula (Phase 1A):**

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
| 10 | 520 |
| 20 | 590 |
| 50 | 810 |
| 100 | 1,190 |

### 2.2 Level-Up Rewards

| Reward | Amount |
|---|---|
| AP (Ability Points) | +10 per level gained |
| Coins | level × 10 per level gained (e.g. level-up to 5 → +50 coins) |

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

### 2.4 HP Regen on XP Grant — SCRAPPED (Phase 2)
XP no longer restores HP. The `hpRegen = floor(xp × 0.1)` line remains dormant in `applyXP()` — to be removed in Phase 2. Health tiers also no longer affect HP per day (see §3.2).

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

Based on the **lowest** of the 3 bars. HP daily delta — **scrapped** (Phase 2 removal).

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
| Log a physical-flagged category | +5% Physical (capped at 100%) |
| Log a recreational-flagged category | +5% Mental (capped at 100%) |

Physical / recreational flags are per-category, set when creating a category.

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
- Loss: Dungeon fail — see Phase 2 damage formula below (not yet implemented)
- Death trigger: HP ≤ 0

**Scrapped mechanics (not in code):** XP → HP regen (`floor(xp × 0.1)`), health tier HP daily delta. See §2.4 and §3.2.

**Phase 2 (not implemented):** Dungeon fail damage = `33 × max(1, tier_diff)` where tier_diff = dungeon tier index − player tier index (E=1…Legend=10). At or below player tier: flat 33 damage.

---

## 5. Death System

**Death triggers when:** HP = 0 **or** any health bar = 0.

| Cause | What happens |
|---|---|
| HP death | HP set to 0. XP blocked. Death screen shown. |
| Health bar death | Bar stays at 0. HP untouched. XP blocked. Death screen shown. |

**Revival quests** restore zero bars (and HP if at 0) by `quest.hp_restore %`, award 15 XP.

**Ignoring death** (`death_acknowledged = 1`) dismisses the screen but the death state persists — XP still blocked.

---

## 6. Coins

### Earn Sources

| Source | Amount | Modifier |
|---|---|---|
| Dungeon clear | floor(rand(50–100) × rankMult × moodMult) | rankMult: E=1.0…Legend=1.8 |
| Quest complete | floor(50 × moodMult) | — |
| Level-up | level × 10 per level gained | No modifier |

**Dungeon rank coin multipliers:** E=1.0, D=1.1, C=1.2, B=1.3, A=1.4, S=1.5, SS=1.6, SSS=1.7, Legend=1.8

**Mood coin multiplier:** 0.95 + ((mood − 1) / 9) × 0.10 from most recent mood log. Range 0.95–1.05.

**Anima coin multiplier:** ×0.8 if Anima < −10 (currently dormant — to be repurposed Phase 2).

### Spend Sinks

| Item | Cost | Effect |
|---|---|---|
| Streak Freeze | 50 coins | +1 streak freeze (banked, auto-uses on 2-day gap) |
| MP Boost | 75 coins | +25 MP (MP mechanic not active — see ⚠️) |
| Critical HP Boost | 100 coins | +30 HP (only purchasable if HP ≤ 30) |

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

### 9.3 Auto-Gain Thresholds (from all-time activity log count)

| Stat | Category | Threshold |
|---|---|---|
| STR (Strength) | Workout | +1 per 5 logs |
| STA (Stamina) | Workout | +1 per 7 logs |
| AGI (Agility) | Admin | +1 per 7 logs |
| FOC (Focus) | Coding | +1 per 5 logs |
| WIS (Wisdom) | Study + Reading + Devotion | +1 per 5 combined |
| SPR (Resilience) | Journal + Devotion | +1 per 5 combined |
| PER (Perception) | Any activity | +1 per 15 total |

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
| Chromatic | #FFFFFF |

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
| A | A 20%, S 22.5%, SS 10%, SSS 0.5% | 47% |
| S | A 20%, S 22.5%, SS 10%, SSS 0.5% | 47% |
| SS | S 22.5%, SS 22.5%, SSS 4.9%, Chromatic 0.1% | 50% |
| SSS | S 15%, SS 20%, SSS 10.35%, Chromatic 0.25% | 54.4% |
| Legend | S 10%, SS 30%, SSS 12.5%, Chromatic 0.5% | 47% |

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

---

## 12. Quest System

### 12.1 Generation Algorithm

Runs on game tab reload. Produces at most 3 new quests.

**Condition for a quest to be generated:**
- Category logged ≥ 2× in the last 28 days
- Category absent from logs in the last 7 days
- No existing pending or accepted quest for that category

**Starter quests** — removed. Deferred to onboarding flow for multi-user launch.

### 12.2 Rewards

| Reward | Amount |
|---|---|
| XP | sessionXP(quest.duration_mins ?? 30, categoryWeight) × 1.10 |
| Coins | floor(50 × moodCoinMult) |

### 12.3 Status Flow

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

**Effect at Anima < −10:** coin multiplier drops to ×0.8.

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

- Stored on rpg_state (0 by default, seeds show 40).
- Boosted by store item: +25 for 75 coins.
- `mp_rate` on custom moods would modify it — but is not applied.
- **Nothing currently consumes or reads MP for gameplay.** Fully dormant.

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

Coin Multiplier (Anima) — dormant
  ← getAnima() = vigor − blight
  ← if anima < −10 → ×0.8 (to be repurposed Phase 2)

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
