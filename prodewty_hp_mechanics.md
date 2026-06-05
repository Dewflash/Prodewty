# Prodewty — HP Mechanics Reference

> Phase 2 mechanic. Do not implement until phase 1 (XP, health bars, coin economy) is complete and stable.

---

## 1. HP Overview

HP is a single value representing the player's overall vitality. Unlike the 3 health bars (Emotional, Physical, Mental) which track lifestyle balance, HP is purely a consequence of dungeon engagement — it goes down when you fail dungeons and recovers through the store.

```
Starting HP: 100
Maximum HP: 100
Minimum HP: 0 (triggers death state)
```

---

## 2. HP Loss — Dungeon Fail

### 2.1 Tier Mapping

Player tier is determined by current level. 10 levels per tier across 100 levels:

| Level Range | Player Tier |
|---|---|
| 1–10 | E |
| 11–20 | D |
| 21–30 | C |
| 31–40 | B |
| 41–50 | A |
| 51–60 | S |
| 61–70 | SS |
| 71–80 | SSS |
| 81–90 | Chromatic |
| 91–100 | Legend |

### 2.2 Damage Formula

```
tier_index(E) = 1, tier_index(D) = 2 ... tier_index(Legend) = 10

tier_diff = dungeon_tier_index - player_tier_index

if tier_diff <= 0:
    damage = 33        (flat, dungeon at or below player tier)
if tier_diff > 0:
    damage = 33 × tier_diff
```

**No cap on max damage. HP is floored at 0.**

### 2.3 Damage Reference Table

| Player tier | Dungeon tier | Tier diff | HP loss |
|---|---|---|---|
| E | E | 0 | 33 |
| E | C | 2 | 66 |
| E | S | 5 | 165 |
| E | Legend | 9 | 297 |
| C | E | −2 | 33 (flat) |
| C | C | 0 | 33 |
| C | S | 3 | 99 |
| S | SS | 1 | 33 |
| S | Legend | 4 | 132 |

> Attempting a dungeon far above your tier is extremely punishing — a level 1 player failing a Legend dungeon loses 297 HP, instantly hitting 0 from full HP.

---

## 3. Death State

**Triggers when:** HP ≤ 0 **or** any health bar = 0.

| Cause | What happens |
|---|---|
| HP death | HP set to 0. XP blocked. Death screen shown. |
| Health bar death | Bar stays at 0. HP untouched. XP blocked. Death screen shown. |

**Ignoring death** (`death_acknowledged = 1`) dismisses the screen but death state persists — XP still blocked.

**Revival:** Revival quests restore zero bars (and HP if at 0). Award 15 XP on completion.

---

## 4. HP Recovery

### 4.1 Critical HP Boost (Store Item)

| Item | Cost | Effect | Condition |
|---|---|---|---|
| Critical HP Boost | 100 coins | +30 HP | Only purchasable if HP ≤ 30 |

This is the only HP recovery mechanic outside of revival quests. There are no passive HP regen sources.

---

## 5. Design Notes

- HP gain from XP (`floor(xp × 0.1)`) — **scrapped**. XP no longer restores HP.
- HP daily delta from health tiers — **scrapped**. Health tiers only affect XP multiplier, not HP.
- HP is intentionally sparse in recovery options — dungeons are the primary risk, the store is the safety valve.
- Dungeon tier gates (level-based unlock) were designed but **not implemented**. Players can attempt any dungeon rank at any level — the damage multiplier is the natural deterrent against punching above your tier.

---

## 6. What is not yet defined

- Revival quest hp_restore % — how much HP does completing a revival quest restore?
- Whether multiple revival quests can be stacked or only one exists at a time
- Whether HP cap of 100 can ever be increased (e.g. through progression milestones)
