# Prodewty — Customisation Interphase 1B

> Planned. Not yet implemented. Implement after Phase 1A (XP formula, health, coins, drop tables) is stable and tested.

---

## 1. Full Wipe / Reset Behaviour

The in-game wipe button currently only deletes `activity_logs`. It needs to become a true full reset.

### What gets wiped
| Table | Action |
|---|---|
| activity_logs, quests, quest_completions | Delete all |
| inventory, active_buffs, bible_notes | Delete all |
| game_logs, dungeon_runs | Delete all |
| habit_completions, habits | Delete all |
| rpg_state | Reset to all-zero defaults |
| health_state | Reset to 100 / 100 / 100 |
| custom_moods | Delete all → re-seed 6 defaults |
| categories | Delete all → re-seed personal 10 |
| restorative_activities | Delete all → re-seed 15 defaults |
| dungeons (definitions) | Keep — game content, not user data |

### Default state after wipe
```
Level 1, 0 / 450 XP
Coins: 0  Gems: 0  AP: 0
HP: 100  MP: 100
Vigor: 0  Blight: 0  Anima: 0
Self-destruct count: 0  Deaths: 0
Streak: 0
Emotional / Physical / Mental: 100%
```

### Re-seed on wipe (personal build)
- Activity categories: Workout(18), News(16), Coding(15), Study(12), Devotion(10), Guitar(8), Reading(6), Journal(5), Admin(3), Meditate(1)
- Recharge activities: 15-item list (Scroll → Pull-ups)
- Custom moods: 6 defaults (driven, burnout, reminiscing, lonely, overstimulated, relapsed)

> Note: In the future multi-user build, personal categories are removed from defaults and replaced by an onboarding flow. The wipe logic stays the same — only the re-seed list changes.

---

## 2. Mood Deletion

Add delete functionality to custom moods (named mood states).

- **Soft delete** via `is_active = 0` (already exists in schema)
- **Usage guard**: add `used INTEGER NOT NULL DEFAULT 0` column to `custom_moods`. Set to 1 the first time the mood is activated via `setCurrentMood`. Block deletion if `used = 1`.
- UI: show delete button on mood card. Show error if mood has been used.

> Mood weightage — deferred (see Phase 2 / future doc).

---

## 3. Info Tab Updates

### Update (values now explicitly defined in docs)

**`app/(tabs)/index.tsx` — health tier table**
Old xp column: `−50%` / `−35%` / `−25%` / `−15%` / `−5%` / `None`
New xp column: `0.93×` / `0.94×` / `0.95×` / `0.96×` / `0.98×` / `1.01×` / `1.02×` / `1.03×`

HP column: all values → `—` (health tiers no longer affect HP per HP mechanics doc)

**`app/(tabs)/insights.tsx` — health info sheet**
- Decay text: `−8%/day` → `−30%/day (active) / −20%/day (inactive)`
- Tier penalty strings: update to new multiplier values
- HP/day line: remove or mark `—`

**Drop tables**: update wherever displayed to match new E–Legend tables from xp doc.

### Put "to decide" (not in any doc yet)
- Named mood passive labels in `app/(tabs)/index.tsx`:
  - driven, burnout, reminiscing, lonely, overstimulated, relapsed passive effect strings

### Retain and notify (not covered by new docs)
- `app/store.tsx` — MP Boost description (mechanic TBD / to be repurposed)
- Any dungeon flavor text / objective text not in the new docs

---

## 4. Deferred to Phase 2 (do not touch in 1B)
- Dungeon unlock gates (natural unlock by level, early unlock XP cost)
- Custom mood passives (weightage, mechanical effects)
- Equipment stat buffs
- MP system
- Onboarding multiplier
- Anima coin multiplier repurposing
- HP damage formula (dungeon fail tier-based)
- HP recovery (Critical HP Boost gate at HP ≤ 30)
- Revival quest HP restore amount
- Job system
