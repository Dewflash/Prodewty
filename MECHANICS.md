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

**Inputs → Formula:**

```
base        = sum(category.weight × 10)   [fallback: 20 if no categories]
durBonus    = floor(duration_mins / 30) × 8
habitBonus  = sum(habit.weight × 5)

moodMult    = 0.80 + ((mood  - 1) / 9) × 0.40   → range 0.80 – 1.20
energyMult  = 0.90 + ((energy - 1) / 9) × 0.20  → range 0.90 – 1.10
prodMult    = 0.95 + ((prod   - 1) / 9) × 0.10  → range 0.95 – 1.05

raw         = (base + durBonus + habitBonus) × moodMult × energyMult × prodMult
healthMult  = [see Health Tiers below]
xp_awarded  = max(floor(raw × healthMult), 1)

Weekly log modifier: raw × 1.5 before healthMult
```

**Category default weights (weight × 10 = base XP per category):**

| Category | Weight | Base XP |
|---|---|---|
| Workout  | 4 | 40 |
| Coding   | 4 | 40 |
| Study    | 3 | 30 |
| Reading  | 3 | 30 |
| Devotion | 3 | 30 |
| Journal  | 2 | 20 |
| Admin    | 1 | 10 |

**Duration bonus:** Every 30 min adds 8 XP. 60 min = +16, 90 min = +24, 120 min = +32.

**Habit bonus:** Each completed habit adds `habit.weight × 5` XP. Weight 1 = +5, Weight 5 = +25.

**Multiplier extremes (all combined):**
- Best case: mood 10, energy 10, prod 10 → 1.20 × 1.10 × 1.05 = 1.386×
- Worst case: mood 1, energy 1, prod 1 → 0.80 × 0.90 × 0.95 = 0.684×

**Example:** Workout (40 base) + 60 min (+16) + Mood 7, Energy 7, Prod 7 × healthMult 1.0
= (40+16) × 1.067 × 1.067 × 1.017 ≈ **64 XP**

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
| Dungeon clear | 45 | Fixed. |
| Quest complete | 30 | Fixed. |
| Revival quest complete | 15 | Fixed. |

### 1.4 XP Blocked When Dead
`applyXP()` returns early without modifying anything if `isInDeathState()` is true (HP ≤ 0 or any health bar = 0).

---

## 2. Level System

### 2.1 XP Thresholds

```
XP to next level = 500 + (level - 1) × 250
```

| Level | XP needed | Cumulative XP |
|---|---|---|
| 1 | 500 | 500 |
| 2 | 750 | 1,250 |
| 5 | 1,500 | 5,000 |
| 10 | 2,750 | 16,250 |
| 20 | 5,250 | 61,250 |
| 50 | 12,750 | 381,250 |

### 2.2 Level-Up Rewards

| Reward | Amount |
|---|---|
| AP (Ability Points) | +10 per level gained |
| Coins (rare drop) | 20% chance × +10 coins per level gained |

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

### 2.4 HP Regen on XP Grant
Every time XP is applied: `hp += floor(xp × 0.1)`, capped at `hp_max`.
- 30 XP → +3 HP, 45 XP → +4 HP, 100 XP → +10 HP.

---

## 3. Health System (3 Bars)

Bars: **Emotional**, **Physical**, **Mental**. Each 0–100%. All effects are based on the **minimum** of all 3 bars.

### 3.1 Decay (runs on every app open and XP grant)

```
physicalDecay  = (8 + [5 if last physical activity ≥ 1 day ago]) × days_passed
mentalDecay    = (8 + [5 if last recreational activity ≥ 1 day ago]) × days_passed
emotionalDecay = (8 + [5 if last any activity ≥ 1 day ago]) × days_passed

Max days_passed capped at 30. Skip if < ~1 hour since last update.
```

**Per-day rates:**
- Active (did relevant log within 24h): −8%/day
- Inactive (no relevant log): −13%/day

### 3.2 Health Tiers → XP Multiplier and HP Effect

Based on the **lowest** of the 3 bars:

| Tier | Min bar | XP multiplier | HP per day |
|---|---|---|---|
| Depleted | ≤ 0% | 0.50× (−50%) | −20 HP |
| Critical | < 10% | 0.65× (−35%) | −10 HP |
| Danger | < 20% | 0.75× (−25%) | −5 HP |
| Weakened | < 30% | 0.85× (−15%) | −2 HP |
| Worn | < 50% | 0.95× (−5%) | Neutral |
| Stable | < 70% | 1.00× | +2 HP |
| Strong | < 90% | 1.00× | +5 HP |
| Peak | ≥ 90% | 1.00× | +5 HP |

HP changes are `floor(rate × days_passed)`.

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
| Leisure Walk | 25 | — | +15% | +5% |
| Movie / Show | 30 | +5% | — | +15% |
| Read for Fun | 25 | +5% | — | +10% |
| Social Time | 35 | +20% | — | +5% |
| Meditation | 40 | +10% | — | +10% |
| Full Workout | 60 | — | +25% | +10% |
| Good Sleep | 50 | +10% | +10% | +10% |
| Treat Yourself | 35 | +20% | — | +5% |

**Blocked** if any bar is at 0% (revival quest must be completed first).

---

## 4. HP System

- Starting: 35 / 100 (hp / hp_max)
- Gain: `floor(xp × 0.1)` per XP grant + health tier daily restore (+2 or +5/day at Stable+)
- Loss: Dungeon fail −20, health tier daily penalty (−2 to −20/day below Worn)
- Death trigger: HP ≤ 0

**Store item: Critical HP Boost** — +30 HP for 100 coins. Only available if HP ≤ 30.

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
| Dungeon clear | dungeon.coin_reward | × getCoinMultiplier() |
| Quest complete | quest.coin_reward (default 30) | × getCoinMultiplier() |
| Level-up | 10 (20% chance per level) | No modifier |
| Starter quests | 20 (First Activity), 15 (Record Mood) | — |

**Coin multiplier:** ×1.0 normally. ×0.8 if Anima < −10.

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
| XP | 45 (fixed) |
| Coins | dungeon.coin_reward × getCoinMultiplier() |
| Item drop | See drop table |

### 11.2 Fail

- HP: −20
- Triggers death check

### 11.3 Item Drop Table (by dungeon rank)

| Rank | Drop chances | No-drop |
|---|---|---|
| E | E 30%, D 12%, C 3% | 55% |
| D | D 40%, C 20%, B 8%, A 2% | 30% |
| C | C 40%, B 25%, A 10%, S 3% | 22% |
| B | B 40%, A 25%, S 15%, SS 5% | 15% |
| A | A 35%, S 25%, SS 10%, SSS 3% | 27% |
| S | S 30%, SS 20%, SSS 8%, Chromatic 2% | 40% |

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

**Starter quests** (only if total logs = 0 and no quests exist):
- "First Activity" — 20 coins
- "Record Your Mood" — 15 coins

### 12.2 Rewards

| Reward | Amount |
|---|---|
| XP | 30 (fixed) |
| Coins | quest.coin_reward × getCoinMultiplier() (default 30 coins) |

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
  → calculateXP(categories, duration, habits, mood, energy, prod)
  → × healthMult (from min health bar tier)
  → applyXP(xp)
      → total_xp + spendable_xp + total_xp_earned += xp
      → hp += floor(xp × 0.1)
      → streak update
      → level-up check → AP += 10, 20% chance coins += 10
  → applyLoggingHealthBoost(isPhysical, isRecreational)
      → physical += 5 if physical; mental += 5 if recreational

Mood Log Submit
  → flat 20 XP (+ 15 if new journal)
  → applyMoodHealthEffects(mood, energy, prod)
      → emotional, physical, mental shift (see §3.4)
  → applyXP(xpFlat)

Health Decay (on every applyXP call and app open)
  → each bar decays by (8 or 13)%/day
  → min bar → tier → XP multiplier updated
  → min bar → HP daily delta applied

Self-Destruct
  → health: physical −45, emotional −20, mental −10
  → vigor (if first SD today): −1
  → blight: +1 always
  → → triggers health decay → may trigger death check
  → → if bar hits 0: death state → XP blocked

Dungeon Clear
  → 45 XP → applyXP
  → coin_reward × getCoinMultiplier() → coins
  → rollDrop(rank) → pickSlot(category) → item inserted to inventory

Quest Complete
  → 30 XP → applyXP
  → coin_reward × getCoinMultiplier() → coins

Coin Multiplier
  ← getAnima() = vigor − blight
  ← if anima < −10 → ×0.8, else ×1.0

Recharge Activity
  ← costs spendable_xp
  → health bars += restore amounts

Level-Up
  → AP += 10
  → 20% chance coins += 10
  → title updated
  → level_up_pending set → modal shown

Streak Freeze (auto)
  ← triggered on app open if 2-day gap detected
  ← streak_freezes > 0
  → streak_freezes −= 1
  → last_active_date backdated to yesterday
```
