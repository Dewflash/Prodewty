# Prodewty — Default XP System

> This document defines the locked default XP system for Prodewty. Use this as the source of truth when implementing or reasoning about XP calculations.

---

## 1. Base Rate

```
5 XP per minute (base, before any modifiers)
```

---

## 2. Per-Session XP Formula

Every activity log is calculated in two phases based on duration.
### Phase 1 — First 30 minutes (decay curve)

XP earned per minute decays exponentially — the first minutes are the most rewarding.

XP(t) = A(w) × e^(-0.1 × t)
where:
t    = minutes elapsed in session
w    = activity weight (1–20)
A(w) = 3.5 + (0.04 × w)

**Total XP for a session of duration T ≤ 30 minutes:**
XP = A(w) / 0.1 × (1 - e^(-0.1 × T))

### Phase 2 — After 30 minutes (flat rate)

Once the decay curve hits near-zero around 30 minutes, a flat per-minute rate kicks in. This rate is determined entirely by the activity weight — low weight activities earn near zero, high weight activities continue to compound meaningfully.

flat_rate(w) = 0.4 × e^(0.08 × w) - 0.4

**Total XP for a session of duration T > 30 minutes:**
XP = [A(w) / 0.1 × (1 - e^(-0.1 × 30))] + [flat_rate(w) × (T - 30)]

### Design intent

- **Weight 1–3:** Decay hits near zero by 30 minutes. Duration beyond 30 mins adds almost nothing. The app rewards showing up, not grinding.
- **Weight 5–9:** Small flat rate after 30 mins. Duration has modest value.
- **Weight 10–20:** Meaningful flat rate. Sustained effort is genuinely rewarded and compounds over long sessions.

---

## 3. Activity Weights

Weights are set on a scale of 1–20 representing perceived effort and discipline required to sustain the activity. The weight affects both the phase 1 starting rate and the phase 2 flat rate.

| Activity | Weight |
|---|---|
| Workout | 18 |
| News | 16 |
| Coding | 15 |
| Study | 12 |
| Devotion | 10 |
| Guitar | 8 |
| Reading | 6 |
| Journal | 5 |
| Admin | 3 |
| Meditate | 1 |

### Weight scale reference

| Score | Description | Post-30min behaviour |
|---|---|---|
| 1–3 | Effortless, low resistance | Near zero — first 15–20 mins is almost all the reward |
| 4–7 | Moderate effort, enjoyable | Small flat rate — duration has modest value |
| 8–12 | Sustained mental effort | Meaningful flat rate — effort compounds |
| 13–17 | High discipline required | Strong flat rate — duration genuinely rewarded |
| 18–20 | Maximum effort activities | Highest flat rate — every extra 30 mins adds significantly |

### Weight formula for custom activities

Users set their own weight during onboarding or category creation. The weight represents how much discipline the activity takes to sustain, not how beneficial it is.

flat_rate(w) = 0.4 × e^(0.08 × w) - 0.4
A(w)         = 3.5 + (0.04 × w)

---

## 4. XP Reference Table (per session duration)

| Activity | W | 10min | 30min | 1hr | 2hr | 3hr | 6hr |
|---|---|---|---|---|---|---|---|
| Run | 20 | 27 | 41 | 88 | 183 | 278 | 563 |
| Workout | 18 | 27 | 40 | 79 | 156 | 233 | 465 |
| News | 16 | 26 | 39 | 70 | 133 | 195 | 382 |
| Coding | 15 | 26 | 39 | 67 | 122 | 178 | 345 |
| Study | 12 | 25 | 38 | 57 | 96 | 135 | 251 |
| Devotion | 10 | 25 | 37 | 52 | 81 | 111 | 199 |
| Guitar | 8 | 24 | 36 | 47 | 69 | 90 | 155 |
| Reading | 6 | 24 | 36 | 43 | 58 | 72 | 117 |
| Journal | 5 | 23 | 35 | 41 | 53 | 65 | 100 |
| Admin | 3 | 23 | 34 | 38 | 44 | 51 | 70 |
| Meditate | 1 | 22 | 34 | 35 | 37 | 39 | 45 |

> Health contributions per activity (which bars each activity passively restores on log) to be defined separately in the health system document.

---

## 5. Daily Average XP

**Locked baseline: 450 XP/day**

Based on a realistic student day with 6–7 hours logged and one or two activities missed:

| Activity | Duration | XP |
|---|---|---|
| Workout | 30min | 40 |
| Journal | 30min | 35 |
| Reading | 1hr | 43 |
| Study | 3hr | 135 |
| Coding | 2hr | 122 |
| News | 1hr | 70 |
| Guitar | 10min | 24 |
| Admin | 20min | 31 |
| **Total** | **~7hr** | **500 XP** |

Average accounting for missed activities and lighter days: **450 XP/day**

> Note: 450 XP/day is the floor assuming bare activity logging with no bonuses. Mood/energy/productivity multipliers, habit bonuses, dungeon clears, quest completions, weekly log bonuses, and health tier bonuses will naturally push engaged users higher.

---

## 6. Level Curve

```text
XP required to clear level N = (7.5 × N) + 435

*Design rule: Always round up to the nearest 10 XP.*

// Calculates the XP required to clear Level N
const calculateLevelXP = (N) => {
  const rawXP = (7.5 * N) + 435;
  const roundedXP = Math.ceil(rawXP / 10) * 10;
  return Math.max(10, roundedXP); // Enforces a minimum of 10 XP
};
```

### Cumulative XP reference table

| Level | XP to clear level | Cumulative XP |
|---|---|---|
| 1 | 450 | 450 |
| 5 | 480 | 2,310 |
| 10 | 510 | 4,800 |
| 15 | 550 | 7,480 |
| 20 | 590 | 10,350 |
| 25 | 630 | 13,410 |
| 30 | 660 | 16,650 |
| 35 | 700 | 20,080 |
| 40 | 740 | 23,700 |
| 45 | 780 | 27,510 |
| 50 | 810 | 31,500 |
| 55 | 850 | 35,680 |
| 60 | 890 | 40,050 |
| 65 | 930 | 44,610 |
| 70 | 960 | 49,350 |
| 75 | 1,000 | 54,280 |
| 80 | 1,040 | 59,400 |
| 85 | 1,080 | 64,710 |
| 90 | 1,110 | 70,200 |
| 95 | 1,150 | 75,880 |
| 100 | 1,190 | 81,750 |

### Milestone targets (at 450 XP/day, no bonuses)

| Day | XP accumulated | Expected level |
|---|---|---|
| 3 | 1,350 | ~2 (10 XP shy of Level 3) |
| 60 | 27,000 | ~44 |
| 120 | 54,000 | ~74 |
| 180 | 81,000 | ~99 |


---

## 7. Onboarding Multiplier (threshold scaling)

> **Implementation note:** The default profile is set to the student baseline (Kevin's profile). All values in this document — 450 XP/day, level curve, multipliers — are calibrated for this profile. The onboarding multiplier system is designed but not yet active. It should only be implemented when the app is opened up to other users. Until then, threshold_multiplier = 1.0× and personal_threshold(N) = 4.1 × N^1.48 with no adjustment.

### How it works (future implementation)

To normalise progress across user types, the level thresholds are scaled per user based on expected daily hours and activity types declared during onboarding. XP earned is never modified — only the thresholds adjust.

**Onboarding collects two inputs:**

1. Daily hours commitment:
```
< 1hr / 1–2hr / 2–4hr / 4–6hr / 6hr+
```

2. Primary activity type in broad buckets:
```
Mostly physical    (avg weight ~16)
Mostly mental      (avg weight ~12)
Mostly creative    (avg weight ~8)
Mostly lifestyle   (avg weight ~5)
Mixed              (avg weight ~10)
```

**Expected daily XP estimates:**
Because users log a mix of short and long sessions, daily expected XP is estimated using an average of 5–7 activity logs per day. The resulting baseline anchor maps to the 1.00× multiplier.

```text
threshold_mult = expected_xp / 450
personal_threshold(N) = (7.5 × N + 435) × threshold_mult
```

**Reference table:**

Hours	Activity type	Avg weight	Expected XP	Multiplier
6hr+	Mostly mental	12	~450	1.00×
4–6hr	Mixed	10	~335	0.74×
2–4hr	Mixed	10	~240	0.53×
1–2hr	Mostly lifestyle	5	~120	0.26×
< 1hr	Any	—	~55	0.12×

The multiplier scales personal thresholds so all user types reach level 100 in roughly the same timeframe regardless of how much they log daily.

> Note: The multiplier should be recalibratable from settings after onboarding, in case a user's lifestyle changes significantly.

---

## 8. XP Multipliers

### 8.1 Mood / Energy / Productivity (per log)

Applied to each activity log based on the 1–10 slider ratings at time of logging.

```
moodMult   = 0.95 + ((mood - 1) / 9) × 0.10
energyMult = 0.95 + ((energy - 1) / 9) × 0.10
prodMult   = 0.95 + ((prod - 1) / 9) × 0.10

All three range: 0.95× (rating 1) → 1.05× (rating 10)
```

Applied as:
```
session_xp = raw_xp × moodMult × energyMult × prodMult
```

**Design intent:** Extremes (all 1 or all 10) are theoretical. Realistic daily ratings of 5–8 keep combined multiplier within ±5% of baseline. The system is a gentle nudge, not a punishment mechanism.

| All ratings | Combined multiplier | XP at 450 base |
|---|---|---|
| 1 / 1 / 1 | 0.857× | 386 XP |
| 5 / 5 / 5 | 0.983× | 443 XP |
| 8 / 7 / 7 | 1.063× | 478 XP |
| 10 / 10 / 10 | 1.158× | 521 XP |

---

### 8.2 Habit Bonus (flat XP, added after session)

Habits are fully customisable by the user. Each habit is assigned a weight of 1–5 during onboarding or habit creation, representing how meaningful or difficult the habit is to maintain.

```
habit_xp = habit_weight × 3
```

| Habit weight | XP per completed habit |
|---|---|
| 1 | 3 XP |
| 2 | 6 XP |
| 3 | 9 XP |
| 4 | 12 XP |
| 5 | 15 XP |

- Maximum 5 habits
- Typical setup: 3 habits per day (recommended during onboarding)
- Habit XP is added as a flat bonus after all session multipliers are applied

**Reference totals:**
- 3 habits at weight 3: +27 XP
- 5 habits at weight 5: +75 XP

---

### 8.3 Weekly Log Bonus

Submitting a weekly reflection log applies a 7-day XP boost to all subsequent activity logs.

```
weeklyLogMult = 1.05×
Duration: 7 days from submission
```

At 450 XP/day baseline: +22.5 XP/day, +157 XP over the full week. Encourages a regular weekly reflection rhythm. Users who submit every week maintain the boost continuously.

---

## 9. Quest and Dungeon XP

### 9.1 Formula

Quests and dungeons inherit the same XP formula as activity logs. XP is calculated based on the duration and the weight of the activity category the quest/dungeon is built on. No new formula needed.

```
quest_xp   = session_xp(duration, weight) × 1.10
dungeon_xp = session_xp(duration, weight) × 1.20
```

Where `weight` is inherited from the associated activity category:
- A study quest uses weight 12
- A workout dungeon uses weight 18
- etc.

### 9.2 Design intent

- Quests are self-set accountability tasks, system-prompted based on recent activity gaps in SQL. The 1.10× premium rewards intentional commitment on top of normal logging.
- Dungeons are system-generated timed challenges carrying HP loss risk on fail. The 1.20× premium reflects the added risk and structured nature of the challenge.
- The premium is small enough that quests and dungeons never replace normal activity logging as the primary XP source — they supplement it.

### 9.3 Important notes

- Quest and dungeon XP is logged separately from activity log XP in the database. No double-dipping with activity logs.
- Dungeon rank (E through S) does **not** affect the XP premium multiplier. Rank affects **item drop rate** only.
- Bible note XP remains flat at 50 XP default (configurable 10–200 in settings). Refunded on delete.

---

## 10. Health Tier Multiplier

Applied to activity log XP only. Based on the **lowest** of the three health bars (Emotional, Physical, Mental). Mood logs, bible notes, quest XP and dungeon XP are unaffected.

### Design intent

Health tier is a quiet background signal — not a punishment mechanism. The ±5% spread from average means it nudges without compounding aggressively on top of mood/energy/productivity multipliers which already capture day-to-day state.

| Tier | Bar % | Multiplier | Daily XP at 450 base |
|---|---|---|---|
| Depleted | 0% | 0.93× | 419 XP |
| Critical | 1–9% | 0.94× | 423 XP |
| Danger | 10–19% | 0.95× | 428 XP |
| Weakened | 20–29% | 0.96× | 432 XP |
| Worn | 30–49% | 0.98× | 441 XP |
| Stable | 50–69% | 1.01× | 455 XP |
| Strong | 70–89% | 1.02× | 459 XP |
| Peak | 90%+ | 1.03× | 464 XP |

```
health_mult = tier multiplier based on min(emotional, physical, mental)
activity_xp = raw_xp × moodMult × energyMult × prodMult × health_mult
```

---

## 11. Spendable XP and Recharge Activities

### 11.1 Overview

Spendable XP mirrors total XP earned — every XP grant increments both. It is spent on two things:
- **Recharge activities** (daily living expenses, 70–80% of daily XP)
- **Big ticket purchases** (cosmetic unlocks, see §11.3)

Unspent spendable XP accumulates as savings toward bigger purchases. When a log is deleted its XP is deducted from spendable XP.

### 11.2 Recharge Activities

Recharge activities restore health bars and represent daily rest and recovery. They have no duration input — each has a fixed flat cost derived from its weight (1–20 scale, same as activities).

**Cost formula:**
```
weight 1–9:   recharge_cost = floor(19 × e^(0.08 × weight) / 10) × 10
weight 10–20: recharge_cost = floor(19 × e^(0.10 × weight) / 10) × 10

Minimum cost: 20 XP regardless of weight
All costs rounded to nearest 10 XP
```

**Recharge menu:**

| Activity | Weight | Cost |
|---|---|---|
| Scroll | 17 | 100 XP |
| Music | 15 | 80 XP |
| Netflix | 13 | 65 XP |
| Youtube | 12 | 60 XP |
| Game | 11 | 55 XP |
| Journal | 10 | 50 XP |
| Jam | 8 | 40 XP |
| Good meal | 7 | 35 XP |
| Good sleep | 6 | 30 XP |
| Walk | 5 | 30 XP |
| Bath | 4 | 25 XP |
| Talk | 3 | 20 XP |
| Meal | 2 | 20 XP |
| Sleep | 1 | 20 XP |

**Typical recovery day spend:**

| Activity | Cost |
|---|---|
| Good sleep | 30 XP |
| Good meal × 2 | 80 XP |
| Bath | 20 XP |
| Scroll | 100 XP |
| Music | 80 XP |
| Talk | 20 XP |
| Meal | 20 XP |
| **Total** | **350 XP (78% of 450)** |

Remaining ~100 XP saved daily toward big ticket purchases.

**Recharge health restoration (flat 5% base, exceptions noted):**

| Recharge | Emotional | Physical | Mental |
|---|---|---|---|
| Good sleep | +5% | +5% | +5% |
| Sleep | — | +5% | +5% |
| Good meal | +5% | +5% | — |
| Meal | +5% | +5% | — |
| Bath | +5% | — | +5% |
| Walk | — | +5% | +5% |
| Pull ups | — | +5% | — |
| Talk | +5% | — | — |
| Music | +5% | — | +5% |
| Jam | +5% | — | +5% |
| Journal | +5% | — | +5% |
| Netflix | +10% | — | +10% |
| Youtube | — | — | +10% |
| Game | — | — | +5% |
| Scroll | +10% | — | — |

**Health decay rate:**
```
Active decay (logged relevant activity today): 30%/day for all three bars
Inactive decay (no relevant log today):        20%/day for all three bars
```

> Inactive decay is intentionally lower than active decay to avoid punishing users who take breaks from the app. 20%/day means a fully neglected bar hits zero in 5 days, giving users time to return without immediately dying.

> Typical day recharge restoration (good sleep + good meal × 2 + bath + scroll + music + talk + meal):
> - Emotional: +40% vs −30% decay = +10% net ✓
> - Physical: +20% vs −30% decay = −10% net (needs workout/run activity log to break even)
> - Mental: +15% vs −30% decay = −15% net (needs devotion/guitar activity log to break even)

### 11.3 Rounding Rule

All XP values throughout the entire system use:
```
Math.floor() at point of award
Minimum 1 XP regardless of multipliers
```

Applies to: session XP, mood/energy/prod multipliers, health tier multiplier, weekly log multiplier, quest/dungeon premium, recharge costs, habit flat bonus.

---

## 12. Big Ticket Spendable XP Purchases

Spendable XP big ticket purchases are limited to one-time dungeon unlocks only. Quests are free and not purchasable. Cosmetics are purchased with coins, not spendable XP.

### 12.1 One-Time Dungeon Unlocks

Players naturally unlock dungeons at or below their current rank as they level up. Spending spendable XP allows early access to higher rank dungeons before naturally reaching that level.

Unlock costs are intentionally low to compensate for punishing drop rates — the real grind is in the runs themselves, not the unlock.

**Natural unlock levels:**

| Dungeon Rank | Natural unlock |
|---|---|
| E | Level 1 |
| D | Level 10 |
| C | Level 25 |
| B | Level 40 |
| A | Level 60 |
| S | Level 75 |
| SS | Level 85 |
| SSS | Level 95 |
| Legend | Level 100 |

**Early unlock XP cost:**

| Dungeon Rank | XP cost | Days saving (at ~100 XP/day saved) |
|---|---|---|
| D | 50 XP | 0.5 days |
| C | 100 XP | 1 day |
| B | 175 XP | 1.75 days |
| A | 250 XP | 2.5 days |
| S | 375 XP | 3.75 days |
| SS | 625 XP | 6.25 days |
| SSS | 1,000 XP | 10 days |
| Legend | 1,500 XP | 15 days |

> These are one-time unlocks per dungeon rank. Once unlocked, the dungeon is permanently accessible.

---

### 12.2 Dungeon Drop Tables

Each dungeon has exactly 4 drop tiers plus no drop. The drop table structure depends on dungeon rank — E through A follow a fixed cascade, S through Legend have custom tables.

**E through A dungeons — fixed cascade:**

Ceiling tier = 30%, next = 15%, next = 7.5%, next = 0.5%, no drop = 47%. Tiers shift up with each dungeon rank.

| Dungeon | No drop | Tier 1 (30%) | Tier 2 (15%) | Tier 3 (7.5%) | Tier 4 (0.5%) |
|---|---|---|---|---|---|
| E | 47% | E | D | C | B |
| D | 47% | D | C | B | A |
| C | 47% | C | B | A | S |
| B | 47% | B | A | S | SS |
| A | 47% | A | S | SS | SSS |

**S through Legend dungeons — custom tables:**

**S dungeon:**
| Tier | Chance |
|---|---|
| No drop | 47% |
| A | 20% |
| S | 22.5% |
| SS | 10% |
| SSS | 0.5% |

**SS dungeon:**
| Tier | Chance |
|---|---|
| No drop | 50% |
| S | 22.5% |
| SS | 22.5% |
| SSS | 4.9% |
| Legend | 0.1% |

**SSS dungeon:**
| Tier | Chance |
|---|---|
| No drop | 54.6% |
| S | 15% |
| SS | 20% |
| SSS | 10.35% |
| Legend | 0.25% |

**Legend dungeon:**
| Tier | Chance |
|---|---|
| No drop | 47% |
| S | 10% |
| SS | 30% |
| SSS | 12.5% |
| Legend | 0.5% |

> Dungeon rank affects item drop table only. XP premium is fixed at 1.20× regardless of rank. Item slot availability per category is defined separately in the dungeon system. Drop rate customisation is configurable in settings.

---

## 14. Coin Economy

### 14.1 Earn Sources

| Source | Amount | Notes |
|---|---|---|
| Quest complete | 50 coins flat | Mood multiplier applies |
| Dungeon clear | rand(50–100) × rank_mult | Mood multiplier applies |
| Level-up | level × 10 coins | No mood multiplier |
| Starter quest — First Activity | 20 coins | One time |
| Starter quest — Record Mood | 15 coins | One time |

### 14.2 Dungeon Rank Coin Multiplier

| Rank | Multiplier | Avg coins |
|---|---|---|
| E | 1.0× | 75 |
| D | 1.1× | 83 |
| C | 1.2× | 90 |
| B | 1.3× | 98 |
| A | 1.4× | 105 |
| S | 1.5× | 113 |
| SS | 1.6× | 120 |
| SSS | 1.7× | 128 |
| Legend | 1.8× | 135 |

### 14.3 Mood Coin Multiplier

```
moodCoinMult = 0.95 + ((mood - 1) / 9) × 0.10
range: 0.95× (mood 1) → 1.05× (mood 10)
Applies to quest and dungeon coins only, not level-up coins
```

### 14.4 Level-Up Coin Scaling

```
level_up_coins = level × 10
Total payout levels 1–100: 50,500 coins
Daily average across 181.7 days: ~278 coins/day
```

> Non-linear in feel — early game produces frequent small rewards, late game produces infrequent large rewards. The 278/day figure is a mathematical average across the full journey.

### 14.5 Spend Sinks

| Item | Cost | Frequency | Notes |
|---|---|---|---|
| Streak Freeze | 50 coins | ~1/week | Auto-uses on 2-day gap |
| HP Boost | 100 coins | ~1/week | Only if HP ≤ 30 |
| MP Boost | 75 coins | ~1/week | To be repurposed when MP system defined |
| Standard cosmetic | 5,000 coins | — | See saving targets below |
| Premium cosmetic | 10,000 coins | — | See saving targets below |

**Daily spend average: ~32 coins/day**

### 14.6 Daily Earn Scenarios

| Scenario | Quests | Dungeons | Mood | Level-up avg | Total | Net after spend |
|---|---|---|---|---|---|---|
| Ordinary | 2 × 50 = 100 | 2 × 75 = 150 | 1.0× | 278 | 528 | 496 |
| Deliberate | 3 × 50 = 150 | 3 × 75 = 225 | 1.028× (mood 8) | 278 | 663 | 631 |
| Bad day | 1 × 50 = 50 | 1 × 75 = 75 | 0.95× (mood 1) | 278 | 397 | 365 |

### 14.7 Cosmetic Saving Targets

| Tier | Cost | Ordinary (496/day) | Deliberate (631/day) |
|---|---|---|---|
| Standard | 5,000 coins | ~10 days | ~8 days |
| Premium | 10,000 coins | ~20 days | ~16 days |

> Cosmetic pricing covers two tiers. Additional tiers can be added later.
> Anima coin multiplier (×0.8 if Anima < −10) to be repurposed — new mechanic TBD.

---

## 15. What is not included here

The following systems are referenced but defined separately or deferred:

- Health contributions per activity log (which bars each activity passively restores — to be defined in health system document)
- HP system (gain, loss, death trigger, revival quests)
- Death state XP block
- Rank system (every 100 levels, unlocks, titles)
- Custom mood state passives (currently cosmetic only — defer to v2)
- Equipment stat buffs (currently cosmetic only — defer to v2)
- MP system (fully dormant — defer to v2, MP Boost coin sink to be repurposed)
- Streak multiplier (discussed, not yet decided)
- Self-destruct penalties (confirmed 0 XP, full penalty review pending)
- Anima coin multiplier repurposing (×0.8 mechanic to be redesigned)

