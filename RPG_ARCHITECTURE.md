# RPG Architecture — Source of Truth

Forward-looking spec only. For how we got here / discovery notes, see
`RPG_ARCHITECTURE_AUDIT.md` (v0, historical). This doc is for
brainstorming and building against — keep it current, not chronological.

Progression sequencing, building levels, the villager→Language loop,
material tier gates, and the verified as-built baseline live in
`RPG_PROGRESSION_LATTICE.md` (2026-07-06) — read it alongside this doc.

## Regions

Three regions, all distinct from each other:

- **Sanctuary** — "home," safe. Includes a **Village** sub-area (Town
  Hall + Market) — Village is not a separate zone, it lives inside
  Sanctuary. Farming, forage, crafting, building, and villager
  interaction all happen here.
- **Dungeon** — unsafe, a fixed challenge. **Always accessible, entry
  gated purely by coins** (currently 20 coins). No travel/energy cost.
  Real-time engine (see Combat below).
- **Expedition** — unsafe, "real-world exploration." Biome zones: Forest,
  Beach, Mountain, Desert. **Not instantly accessible** — reached via
  energy cost + travel time. A map UI for this is future work; the
  underlying energy-gated travel mechanic is current work. Mines (a
  procedural ore+combat floor system, resets nightly) is a feature of the
  Mountain biome specifically, not a separate region.

## Masteries

Eleven categories: **crafting, farming, livestock, language, trading,
hunting, attacking, surviving, research, mining, fishing**. (`attacking`
is the same concept as the existing engine's `combat`. `mining` and
`fishing` are full masteries, not bonus/extra ones — confirmed once the
Real-Life Stats table started treating them as first-class.)

Each mastery has a points total → level, and levels group into named
tiers: **Bronze → Silver → Gold** (more tiers possible later). Mastery
gates two separate things almost everywhere in this game:

- **Discovery** — knowing a thing exists. Unlocked one tier *before* the
  thing's own tier (e.g. Bronze mastery unlocks discovery of Silver-tier
  things).
- **Understanding** — full knowledge/use of a thing. Requires reaching
  the tier that *matches* the thing's own tier.

This Discovery/Understanding split applies to the Archive (see below) and
should be treated as a general pattern other systems can reuse (e.g.
understanding a recipe, an enemy type, a building's purpose) — not
Archive-specific plumbing.

## Buildings

A building is an **empty shell with a footprint** (footprint size varies
per building — no fixed convention, whatever fits the building). Six
backend roles, each may have its own frontend flavor name:

| Backend role | Frontend name | Contains (placeable stations) |
|---|---|---|
| Workshop | Blacksmith Hut | Furnace, other crafting stations |
| Factory | Artisan Mill | Cheese Press, Mayonnaise Machine, Loom — animal/food produce processing |
| Tool Shed | Tool Shed | Irrigation tools, fertiliser-making tools |
| Market | Wanderer's Bazaar | NPC-run vendor stalls — each stall is a villager selling a specific category, tied to Trading mastery and villager relationships, not a player-run shop |
| Town Hall | Village Hearth | No tied mastery, no prerequisite — earliest/cheapest building; first building of the Village. Also the Bundle System's home (see below) |
| Library | Forgotten Chamber | Gates Archive/Museum Understanding, tied to Research mastery; also where Blueprints get decoded |

Plus a 7th non-building structure: the **Expedition Gate** ("Explorer
Tent" frontend name) — sits at a Sanctuary corner, the entry point to
Expedition.

**Buildings don't do anything by themselves** — what you place inside
their footprint (a station) determines their function. Placing a station
requires the target cell to be inside a *completed* building, and the
station's type must match the building's role (Furnace only valid inside
Workshop, Cheese Press only valid inside Factory, etc.).

## Universal placement rule

Applies to **every placeable item in the Sanctuary** — seeds, finished
crafted goods, stations, Bridge Kit, Path tiles, buildings:

1. **Equip** the item (select it from the Backpack).
2. **Walk to / stand near the target grid cell.**
3. **Confirm placement** (Interact).

Buildings use a two-phase version of this because of their larger
footprint:
1. Select the footprint location on the map (ghost-preview).
2. Physically travel there and confirm ("lay the foundations") — this
   starts a build timer; the building is unusable until it completes.

**Movability**: every placed Sanctuary item can be picked up and
repositioned later. **Storage**: everything except buildings can be
picked back into the Backpack. Buildings can be relocated but never
stored — once built, a building always exists somewhere on the map.

Bridge Kit and Path are **placeable Backpack items**, not equipped tools
— they go through this same flow, identical to planting a seed.

## Tools & Equipment

A small, fixed set of true equippable tools — things that get worn,
upgraded, and used repeatedly, distinct from one-time placeable items:
Axe, Pickaxe, Hoe, Watering Can, Sword, Fishing Rod. Each has tiers
(Basic → Copper → Iron → Gold...) with upgrade costs. Equipping is a
persisted action (one tool per "tool" slot at a time), not just UI state.

## Crafting

Crafting is a **timed job**, not instant: start a job, wait, claim the
result. Crafting requires being at/inside a built Workshop (or whichever
building owns that craft category).

Recipe **availability** is gated by Blueprints (see "Blueprints as loot"
above), not by Crafting mastery level — without the decoded blueprint,
the recipe doesn't exist for you at all. Crafting **mastery** instead
controls job speed and the odds of a "quality"-tier result. Both apply
independently: blueprint = can you craft it, mastery = how fast/how well.

## Farming

Tilling a plot, then planting, are both real actions with energy costs.
Farming plots are a distinct concept from decorative Sanctuary plant
placement (buying a CraftPix tree/flower from the Shop and placing it is
not "farming" — it doesn't need tilled soil or a Farming mastery tie-in).

## Archive / Museum / Inspect

"Archive" (backend name) and "Museum" (frontend name) are the same
system. Bringing a discovered item to the Library and **Inspecting** it
(not consuming it — you keep the item) starts research on it. Items log
into the Archive automatically on first encounter, shown as `???` once
*Discovered*; the real name/identity only shows once *Understood* (see
Masteries' Discovery/Understanding rule above — checked against Research
mastery specifically).

Implemented using the Archive's existing fields rather than new ones —
**Discovered = Discovery** (seen it, can own it), **Known = Understanding**
(name revealed). No separate "Understood" field exists; `known` *is* that
concept now (it previously meant "purchasable in the Shop," repurposed).

## Combat

Real-time, not turn-based: joystick movement, chase-AI enemies, contact
damage, direct stat-based attack resolution. This applies to the Dungeon
today and should be the model for Expedition/Mines combat too, rather
than a turn-based "resolve in one call" alternative.

## Time & Economy

One stamina/energy pool (`energy`/`energy_max`), not split across
multiple systems. A real calendar with seasons and a sleep/day-advance
cycle drives both crop growth and seasonal market pricing. Coins are the
core currency; Dungeon entry and Backpack resource sales already use it
correctly.

## Backend ↔ Frontend naming

Internal code uses generic role names; players see flavorful names.
Building names live in the Buildings table above — this table is just
the non-building mappings:

| Backend term | Frontend name |
|---|---|
| Expedition Gate | Explorer Tent |
| Archive | Museum |
| Donate/inspect action | "Inspect" |
| Discovery | `discovered` field / "Seen" |
| Understanding | `known` field / "Known" |

Town Hall (Village Hearth) is the first building of the Village,
confirmed — cheapest/earliest, no prerequisites.

## Lore

The player is isekai'd into this world; that transportation is what syncs
their real-life stats/activity into the game. This is the narrative
justification for the Real-Life Stats ↔ Mastery mapping below.

## Death/failure penalty (Dungeon & Expedition)

Soft penalty, not punishing: on fainting, equipped tools are never lost.
Instead, half of gathered-but-not-yet-banked resources drop into a
"recovery backpack" that stays on that floor/zone until the next day,
retrievable on a return trip. For procedural zones (Mines, Expedition
biomes) that reset nightly, the recovery backpack rides the same clock —
if it's not retrieved before that zone's nightly reset, it's gone. No
separate expiry system needed.

## Blueprints as loot

Crafting unlocks aren't purely mastery-level-gated. "Unknown Blueprints"
drop in the Dungeon/Expedition; bringing one to the Library and decoding
it (Research mastery) is what unlocks building the corresponding station
(e.g. a Loom) in its owning building (e.g. Factory). Makes exploration a
prerequisite for crafting progression, not just a separate loot loop.

## The Bundle System (Town Hall / Village Hearth)

Stardew Community-Center-style: donate specific item sets (e.g. "Spring
Forage Bundle", "Bronze Weapons Bundle") to the Town Hall to upgrade the
Sanctuary's visual tier or unlock permanent perks — e.g. a minecart for
fast travel to the Expedition Gate. Gives Town Hall an ongoing purpose
beyond just being the first building built.

## Future (explicitly deferred, not current scope)

- An "Adventurer's Guild" — flagged as part of a future intro/onboarding
  pass, not current building roster.
- NPC variety from different parts of the world — future update.

## Real-Life Stats ↔ Mastery Mapping

| Real-Life Stat | Linked Masteries | In-Game Translation & Benefit |
| :--- | :--- | :--- |
| **Strength** | Attacking, Mining | Increases base damage in the Dungeon. Reduces hits required to break rocks in the Mines. |
| **Agility** | Hunting, Fishing, Mining | Increases movement speed dodging Dungeon enemies / chasing targets. Widens the "catch bar" or slows fish movement in the fishing minigame. |
| **Resilience** | Surviving, Hunting, Fishing, Mining | Increases `energy_max`. Reduces stamina drain when tilling soil or chopping trees. |
| **Perception** | Research (magic — an as-yet-untouched component that comes with the Library) | Highlights rare forageable items in Expeditions (glowing aura). Unlocks better sell prices or rare vendor stock at the Market. |
| **Spirituality** | Livestock, Language | Increases animal happiness/yield quality (faster livestock bonding). Helps translate ancient runes or parley with non-hostile Expedition creatures. |
| **Wisdom** | Research, Language, Trading | Reduces time/resources to turn a *Discovered* item into an *Understood* item at the Library. Unlocks deeper lore. |
| **Focus** | Crafting, Farming | Reduces real-time wait for crafting jobs at the Workshop and Factory. Increases chance to craft "quality"-tier goods. |

Note: Mining/Fishing/Hunting/Surviving appear under multiple stats above
— that's a many-to-many mapping (a mastery can be boosted by more than
one real-life stat), not a typo to resolve.