# Personal Seed Reference — Kevin's setup

Pulled directly from `app/src/db/schema.ts` on 2026-06-08, for personal reference / manual
re-setup if ever needed (e.g. after a true full reset, or setting up a fresh device before
onboarding exists). This is YOUR content, not demo/placeholder — onboarding will never
touch or overwrite it (it only activates on an empty state).

---

## Categories (10) — `DEFAULT_CATEGORIES`, schema.ts:9-20

| Name | Weight | Attribute | Physical | Recreational |
|---|---|---|---|---|
| Workout | 18 | strength | ✓ | |
| News | 16 | wisdom | | |
| Coding | 15 | focus | | |
| Study | 12 | wisdom | | |
| Devotion | 10 | resilience | | ✓ |
| Guitar | 8 | resilience | | ✓ |
| Reading | 6 | wisdom | | ✓ |
| Journal | 5 | resilience | | |
| Admin | 3 | agility | | |
| Meditate | 1 | resilience | | ✓ |

## Custom moods (6) — `defaultMoods`, schema.ts:480-487

| Name | Color | Effect text | XP modifier |
|---|---|---|---|
| driven | `#34D399` | +10% XP gain | +10 |
| burnout | `#EF4444` | −20% XP · −10% coins earned | −20 |
| reminiscing | `#A855F7` | +5% XP gain | +5 |
| lonely | `#64748B` | −5% XP gain | −5 |
| overstimulated | `#F97316` | −10% XP · restlessness penalty | −8 |
| relapsed | `#EF4444` | −30% XP · −15% coins earned | −30 |

## Restorative activities (15) — `DEFAULT_RESTORATIVE`, schema.ts:22-38

Columns: cost = Spendable XP cost, e/p/m = emotional/physical/mental restore amounts

| Name | Description | Cost | Emo | Phys | Mental |
|---|---|---|---|---|---|
| Scroll | Mindless scroll session | 100 | 10 | 0 | 0 |
| Music | Listen to music | 80 | 5 | 0 | 5 |
| Netflix | Watch a show or movie | 65 | 10 | 0 | 10 |
| Youtube | Watch YouTube | 60 | 0 | 0 | 10 |
| Game | Play a game | 55 | 0 | 0 | 5 |
| Journal | Free-write or reflect | 50 | 5 | 0 | 5 |
| Jam | Play guitar or noodle | 40 | 5 | 0 | 5 |
| Good meal | Proper sit-down meal | 35 | 5 | 5 | 0 |
| Good sleep | 7–9 hours quality sleep | 30 | 5 | 5 | 5 |
| Walk | Outdoor or casual walk | 30 | 0 | 5 | 5 |
| Bath | Shower or bath | 25 | 5 | 0 | 5 |
| Talk | Conversation with someone | 20 | 5 | 0 | 0 |
| Meal | Regular meal | 20 | 5 | 5 | 0 |
| Sleep | Rest or nap | 20 | 0 | 5 | 5 |
| Pull-ups | Quick bodyweight set | 20 | 0 | 5 | 0 |

## Revival quests (3) — schema.ts:380-387

| Title | Description | Category | HP restore |
|---|---|---|---|
| Morning Sprint | A quick 10-minute run. Get your blood moving. | Workout | 25 |
| Cold Shower | 3 minutes of cold water. Shock your system back online. | Workout | 20 |
| Breathwork | 5 minutes of deep diaphragmatic breathing. Reset. | Devotion | 15 |

---

## Note on the 14-day fake activity log seed
There's also a `seedRealisticData()` 30-day demo log generator (schema.ts:1251+,
migration v25) — confirmed 2026-06-08 that this is **fake/demo data, not yours**, purely
to make a fresh install look populated during development. Not included here; it's listed
in [[demo_and_customisation]] as something to delete entirely before launch.
