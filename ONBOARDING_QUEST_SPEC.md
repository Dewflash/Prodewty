# Onboarding & Adaptive Quest Engine — Working Spec

Status: **BUILT (2026-06-09)** — Phases A (onboarding), B (quest engine), and C (Insights)
are all implemented and typechecked. This remains the living source of truth for the
onboarding question bank, the interest→category lookup table, and the quest-generation
engine; §11 below logs the as-built state, final tuning values, and assumptions made
during the Phase B/C build that weren't explicitly re-confirmed with the user (see CLAUDE
memory `feedback_log_before_coding` — keep this in sync with the code going forward).

Companion reading: `MECHANICS.md` (live system docs), `LIFE_RPG_TRACKER_BLUEPRINT.md` (original vision).

---

## 1. Design principles (agreed)

- **Rules-based, not ML.** A transparent, hand-tunable weighted-scoring engine — same
  philosophy as the existing `DROP_TABLE` (game.ts:96) / `getCategoryWeight` (game.ts:271).
  Debuggable, balanceable, deterministic. Users can be told exactly how it works (see §5).
- **Fixed lookup tables, not free text/NLP.** Onboarding answers map through curated tag
  tables to concrete category/weight/attribute values — never parsed from open text.
- **Never gate.** Onboarding is fully skippable. A 3-layer fallback (baseline → onboarding
  answers → behavioral self-healing via "Insights") ensures the app is never empty or broken,
  regardless of how much someone skips. See `project_quest_engine_and_insights` memory §3.
- **Everything stays on-device.** No backend exists in this codebase. All computation —
  the "Player Snapshot," the stretch function, the mood rules — is local SQL + JS over the
  user's own `activity_logs`. This claim must appear in the privacy policy AND the onboarding
  front page.

---

## 2. The 7 RPG attributes (corrected — NOT a 5-stat system)

| Attribute | Abbr | Trains... | Fits activities like... |
|---|---|---|---|
| strength | STR | raw physical power | Lifting, workouts, manual trades |
| agility | AGI | speed/dexterity/reflexes | Sports, instrument practice, hands-on skill work |
| focus | FOC | precision/technical/deep work | Coding, study, strategy/planning |
| wisdom | WIS | depth of knowledge | Reading, writing, research, academic study |
| resilience (spirit) | SPR | emotional/creative/recovery | Journaling, music listening, meditation, devotion, art |
| perception | PER | awareness/observation/social attentiveness | Staying current on trends/news, socializing, networking |
| stamina | STA | endurance/sustained effort | Cardio, long study/work sessions, sustained projects |

(Confirmed against `CategoryGrid.tsx` / `StatsSection.tsx` / `game.ts:459` — these are the
canonical 7, replacing my earlier incorrect 5-stat assumption.)

---

## 3. Onboarding question bank (8 questions, draft)

> Numbering matches the design-conversation draft. Tune wording/options freely — this is v1.

### Q1 — "What field do you work or study in?" (multi-select, max 2)

Tags, grouped into 4 **clusters** that share a subtopic follow-up (see Q1b below) —
clustering keeps the option count manageable (~16-20 total subtopics instead of ~85
if every domain got a bespoke list):

| Cluster | Domains in it |
|---|---|
| **Knowledge fields** | Tech/Engineering · Business/Finance/Economics · Healthcare/Medicine · Education/Academia · Science/Research · Law/Legal · Government/Public service |
| **Hands-on/Physical** | Trades/Construction · Hospitality/Service · Sports/Athletics/Fitness industry |
| **Creative/Comms** | Creative/Arts/Design · Marketing/Media/Comms · Retail/Sales · Content creation/Influencing · Advertising |
| **Life-stage** | Student · Homemaker/Caregiver · Retired · Between roles/Exploring |

(User-confirmed: Engineering sits with Tech in Knowledge fields, Sports added to
Hands-on/Physical, Content creation/Influencing + Advertising added to Creative/Comms —
all three groupings explicitly approved 2026-06-08. Listing every domain name out in full,
per request, "so that people are aware" — i.e. the in-app picker should show each domain
as its own selectable label, not just the cluster name; clustering is an internal grouping
for shared follow-ups, invisible to the player.)

Plus: `Other` (no cluster, no follow-up — generic tag only)

### Q1b — Intent axis: "Within [your field], are you looking to...?"

REVISED 2026-06-08 — replaces the old "pick a subtopic, or bail to 'surprise me'" framing
with a single clean 3-way intent question. This both avoids presumptuously inferring a
topic from someone's job AND generalizes the escape hatch into a real, dignified option
rather than a buried "none of the above":

| Answer | What it attaches |
|---|---|
| **`Go deeper in my field`** | Full `compulsory-weekly` tag + a domain-relevant subtopic pick (the old per-cluster option sets below still apply HERE, as a follow-up only for this branch) |
| **`A bit of both`** | A *lighter* compulsory tag (lower weight/frequency than the full version) + a discovery-weight boost — best of both, no all-or-nothing cliff |
| **`Branch out — surprise me`** | NO `compulsory-weekly` tag, NO job-linked category at all — routes straight into the existing discovery/side-quest machinery (zero bespoke code; reuses what everyone already gets) |

Per-cluster subtopic option sets (only shown to people who picked "Go deeper" or "A bit of both"):

| Cluster | Subtopic options |
|---|---|
| Knowledge fields | `Industry news/trends` · `Skill-building/certs` · `Networking` |
| Hands-on/Physical | `Trade technique` · `People skills` · `Physical conditioning` |
| Creative/Comms | `Craft practice` · `Industry trends` · `Personal portfolio work` |
| Life-stage | `Personal growth` · `Routine/organization` · `New skills/exploration` |

This is strictly better than the old design: "branch out" is now a real, named choice
(dignified, not a fallback), "a bit of both" fills the gap that used to force an awkward
binary pick, and the mechanism for each is unambiguous and maps 1:1 onto existing systems
(full tag / lightened tag / no tag at all — three points on one dial, not three branches).

### Q2 — "How often do you exercise?" (single-select)
`Daily` / `A few times a week` / `Rarely` / `Never, but I'd like to`
→ Workout-type category, weight scales with answer (18/13/8/6), last option also tagged `discovery`

### Q3 — "What hobbies or skills do you actively practice?" (multi-select, max 3)

REVISED 2026-06-12 — generalized from the old music/creative-only yes/no into a
categorized hobby picker, since the underlying mechanism (a weight-11 "active
practice" category) generalizes to any hobby, not just music/art. Options are
grouped into 6 clusters (clustering is just UI organization here — unlike Q1,
each hobby gets its own dedicated category, not a shared cluster mapping):

| Cluster | Hobbies in it |
|---|---|
| **Music & Sound** | Guitar · Piano · Drums · Singing · Music Production |
| **Visual Arts & Crafts** | Drawing · Painting · Crochet & Knitting · Sewing & Textiles · Pottery & Ceramics · Photography |
| **Writing & Words** | Creative Writing · Poetry · Content Writing |
| **Movement & Performance** | Dance · Yoga & Pilates · Martial Arts · Acting & Theatre |
| **Culinary** | Baking · Cooking |
| **Games & Making** | Chess & Strategy Games · Tabletop & Board Games · Woodworking & Model Building · Gardening |

Each cluster also has its own `Other` chip. Picking it reveals a text input for
a custom hobby name — that name is shown on-screen (during onboarding and later
in Quest Preferences, pre-filled and editable), and drives a dedicated category
exactly like a named hobby, using that cluster's "Other" defaults (attribute,
phys/rec, theme tags, template) with the custom name substituted into the
category name and loggable template. See §4 for both lookup tables.

### Q4 — "How do you usually unwind?" (multi-select — feeds restoratives, not categories)
`Movies/TV` · `Gaming` · `Music` · `Reading` · `Socializing` · `Walking/Outdoors` ·
`Sleep/Napping` · `Food/Cooking` · `Bath/Self-care` · `Browsing/Shopping` ·
`Scrolling social media` · `Meditation/Mindfulness` · `Pets/Animals` · `Crafting/Hobbies` ·
`Spiritual practice`

### Q5 — "What else do you want to track?" (multi-select, cap ~5, from curated list)
`Journaling/Writing` · `Cooking/Meal prep` · `Side projects/Coding` · `Spiritual practice` ·
`Life admin` · `Social/Relationships` · `Language learning` · `Instrument practice` ·
`Art/Design` · `Volunteering` · `Personal finance/Budgeting` · `Career development` ·
`Health/Self-care routines` · `Pet care` · `Home/DIY projects` · `Travel planning`

### Q6 — "About how many hours a DAY do you expect to log activity?" (slider, 0.5–6+ in 0.5 steps)
**The single most load-bearing answer** — feeds directly into base-XP calibration for the
200-day → level-100 pacing target. Everything else gets scaled relative to this number.

User-confirmed mechanism (2026-06-08), stated plainly: someone who logs only ~2 activities
a day gets their **per-activity base XP accelerated** so those 2 logs still land near the
~450 XP/day average the 200-day pacing target assumes — fewer logs, each worth more, same
trajectory. **This IS the "onboarding multiplier / threshold scaling per user type" item**
flagged in an earlier audit ([[project_deferred_onboarding]] Phase-2 list) — same mechanism,
different name, now resolved as a single dial. Nothing further to design here; it's Q6's
calibration output, full stop.

### Q7 — "When you fall short of a goal, what helps more?" (slider: Gentle ↔ Balanced ↔ Push me)
→ sets the initial `difficulty_bias` constant the Stretch Function starts from before any
consistency data exists (cold-start problem — see memory §1, Stage 2)

### Q8 — "Want personalized quest suggestions based on your patterns over time?" (Yes/No)
→ Insights consent gate (mirrored + reversible in Settings; see `project_quest_engine_and_insights`)

---

## 4. Lookup table — schema + scope-baking rule

```ts
type InterestTagMapping = {
  categoryName: string;
  weight: number;            // 1-20 scale, matches existing `categories`
  attribute: AttributeKey;   // one of the 7 — see §2
  isPhysical: 0 | 1;
  isRecreational: 0 | 1;
  questThemeTags: string[];  // feeds the rules engine: 'compulsory-weekly', 'discovery', etc.
  loggableTemplate: string;  // <-- THE SCOPE-BAKING FIELD, see below
};
```

**Why `loggableTemplate` matters** (the "reading news ≠ writing an outlook report" problem):
a topic tag describes a *subject*; a habit needs a *subject + a realistically-scoped verb*.
If the generator improvises the activity around a bare topic, it risks landing on something
heavy/unrealistic. So the table itself pins the scope — deliberately light and repeatable —
at design time, e.g.:

```ts
'Market/economic news': {
  categoryName: 'Market News', weight: 13, attribute: 'perception',
  isPhysical: 0, isRecreational: 0,
  questThemeTags: ['compulsory-weekly', 'macro-econ'],
  loggableTemplate: 'Read/skim market news (10–15 min)',   // <- light, repeatable, designer-pinned
}
```

### Weight-assignment formula (LOCKED 2026-06-09)

So every `weight` value in the table below is traceable, not hand-picked — same
"show your work" principle as everything else here:

```
weight = round(tier_base × intent_multiplier)     // clamped to the existing 1-20 scale
```

**`tier_base`** — which kind of slot the answer came from (mirrors how the existing
`DEFAULT_CATEGORIES` already ranks things — Workout=18 down to Meditate=1, i.e.
"things people tend to prioritize" sit higher):

| Source | tier_base | Why |
|---|---|---|
| Q2 (exercise) | 16 | Physical activity dominates real-world logging — matches Workout=18 in defaults |
| Q1b "Go deeper" subtopic | 14 | Explicitly-declared priority (compulsory-weekly signal) |
| Q3 (hobby/practice) | 11 | Named hobby — meaningful but secondary to declared priorities |
| Q5 (tracking wishlist) | 9 | Real intent, but more exploratory by nature |
| Q1b "A bit of both" subtopic | 8 | Same subject as "go deeper," deliberately softened |

**`intent_multiplier`** — how strongly the specific answer signals frequency/commitment:

| Answer signal | multiplier |
|---|---|
| High-frequency/explicit ("Daily," "Go deeper") | ×1.0 |
| Moderate ("A few times a week," "A bit of both") | ×0.75 |
| Aspirational/low-frequency ("Rarely, but I'd like to") | ×0.5 |

Worked: Q2 = "A few times a week" → `16 × 0.75 = 12`. Q1b "Go deeper" on Knowledge
fields → `14 × 1.0 = 14`.

**Content note**: per user directive 2026-06-09 ("assume I'm no longer in the
picture, I'll do the onboarding like the average user"), the full table below is
written as **generic/average-user content** — not tailored to Kevin's personal
seed (see [[demo_and_customisation]]/`PERSONAL_SEED_REFERENCE.md`, which is fully
orthogonal and untouched by onboarding).

### Full table (LOCKED 2026-06-09 — generic/average-user content)

Written per user directive ("assume I'm no longer in the picture, I'll do the
onboarding like the average user") — every entry is generic, not Kevin-tailored.
Weights derived from the formula above; feel free to edit any cell directly.

#### Q1b — per-cluster subtopic (shown only to "Go deeper" / "A bit of both" pickers)

Each subtopic maps to ONE category; only the **weight** and **questThemeTags**
change between the two intent levels (full `compulsory-weekly` tag at tier_base
14×1.0=14, vs. lightened `light-compulsory`+`discovery` tag at 8×0.75=6 — see §4
formula). The category, attribute, and template stay identical either way.

| Cluster → Subtopic | categoryName | attribute | phys/rec | loggableTemplate | weight: Go deeper / A bit of both | tags: Go deeper / A bit of both |
|---|---|---|---|---|---|---|
| Knowledge → Industry news/trends | Industry Pulse | perception | 0/0 | "Read or skim industry news (10–15 min)" | 14 / 6 | `compulsory-weekly`,`industry-news` / `light-compulsory`,`discovery`,`industry-news` |
| Knowledge → Skill-building/certs | Skill Building | focus | 0/0 | "Study or practice a work-related skill (20–30 min)" | 14 / 6 | `compulsory-weekly`,`upskilling` / `light-compulsory`,`discovery`,`upskilling` |
| Knowledge → Networking | Networking | perception | 0/0 | "Reach out to or check in with a professional contact" | 14 / 6 | `compulsory-weekly`,`networking` / `light-compulsory`,`discovery`,`networking` |
| Hands-on → Trade technique | Hands-On Practice | agility | 1/0 | "Practice or refine a hands-on technique (20–30 min)" | 14 / 6 | `compulsory-weekly`,`trade-practice` / `light-compulsory`,`discovery`,`trade-practice` |
| Hands-on → People skills | People Skills | perception | 0/0 | "Practice a people-facing interaction or conversation (15 min)" | 14 / 6 | `compulsory-weekly`,`people-skills` / `light-compulsory`,`discovery`,`people-skills` |
| Hands-on → Physical conditioning | Conditioning | stamina | 1/0 | "Do a conditioning or fitness session (20–30 min)" | 14 / 6 | `compulsory-weekly`,`physical-stretch` / `light-compulsory`,`discovery`,`physical-stretch` |
| Creative/Comms → Craft practice | Craft Practice | resilience | 0/1 | "Spend focused time on your craft (20–30 min)" | 14 / 6 | `compulsory-weekly`,`creative-practice` / `light-compulsory`,`discovery`,`creative-practice` |
| Creative/Comms → Industry trends | Creative Trends | perception | 0/0 | "Browse or study current trends in your field (10–15 min)" | 14 / 6 | `compulsory-weekly`,`industry-news` / `light-compulsory`,`discovery`,`industry-news` |
| Creative/Comms → Personal portfolio work | Portfolio Work | focus | 0/0 | "Work on a personal portfolio piece (20–30 min)" | 14 / 6 | `compulsory-weekly`,`portfolio-building` / `light-compulsory`,`discovery`,`portfolio-building` |
| Life-stage → Personal growth | Personal Growth | resilience | 0/1 | "Spend time on a personal-growth practice (10–15 min)" | 14 / 6 | `compulsory-weekly`,`personal-growth` / `light-compulsory`,`discovery`,`personal-growth` |
| Life-stage → Routine/organization | Routine & Organization | focus | 0/0 | "Tend to a routine or organizational task (15 min)" | 14 / 6 | `compulsory-weekly`,`organization` / `light-compulsory`,`discovery`,`organization` |
| Life-stage → New skills/exploration | New Skills | wisdom | 0/0 | "Try or explore something new (15–20 min)" | 14 / 6 | `compulsory-weekly`,`discovery` / `light-compulsory`,`discovery` |

(`Branch out — surprise me` deliberately produces NO row here — see §3 Q1b: it
routes straight into the existing discovery machinery, zero bespoke mapping needed.)

#### Q2 — exercise frequency (single-select; weight scale was set directly during
design, anchored to the existing `Workout = 18` default — the §4 formula governs
the *other* question sources below, where no prior numbers existed yet)

| Answer | categoryName | attribute | phys/rec | loggableTemplate | weight | questThemeTags |
|---|---|---|---|---|---|---|
| `Daily` | Workout | strength | 1/0 | (their own logged description, scaled — see §6 target-derivation) | 18 | `compulsory-weekly`,`physical-stretch` |
| `A few times a week` | Workout | strength | 1/0 | (their own logged description, scaled) | 13 | `physical-stretch` |
| `Rarely` | Workout | strength | 1/0 | (their own logged description, scaled) | 8 | `physical-stretch`,`discovery` |
| `Never, but I'd like to` | Workout | strength | 1/0 | (their own logged description, scaled) | 6 | `discovery` |

#### Q3 — hobby/practice picks (multi-select, max 3; tier_base 11 × 1.0 — an explicit
"I actively do this" answer is full-commitment signal, weight = 11 across the board)

| Hobby | categoryName | attribute | phys/rec | loggableTemplate | weight | questThemeTags |
|---|---|---|---|---|---|---|
| `Guitar` | Guitar Practice | agility | 0/1 | "Practice guitar (15–20 min)" | 11 | `creative-practice` |
| `Piano` | Piano Practice | agility | 0/1 | "Practice piano (15–20 min)" | 11 | `creative-practice` |
| `Drums` | Drums Practice | agility | 0/1 | "Practice drums (15–20 min)" | 11 | `creative-practice` |
| `Singing` | Vocal Practice | resilience | 0/1 | "Spend time on vocal/singing practice (15–20 min)" | 11 | `creative-practice` |
| `Music Production` | Music Production | focus | 0/1 | "Work on a music production project (20–30 min)" | 11 | `creative-practice` |
| `Drawing` | Drawing Practice | resilience | 0/1 | "Sketch or draw freely (15–20 min)" | 11 | `creative-practice` |
| `Painting` | Painting Practice | resilience | 0/1 | "Spend time painting (20–30 min)" | 11 | `creative-practice` |
| `Crochet & Knitting` | Crochet & Knitting | agility | 0/1 | "Crochet or knit for a bit (15–20 min)" | 11 | `creative-practice` |
| `Sewing & Textiles` | Sewing & Textiles | agility | 0/1 | "Work on a sewing or textile project (20–30 min)" | 11 | `creative-practice` |
| `Pottery & Ceramics` | Pottery & Ceramics | agility | 0/1 | "Spend time on pottery or ceramics (20–30 min)" | 11 | `creative-practice` |
| `Photography` | Photography Practice | per_stat | 0/1 | "Go shoot or edit photos (15–20 min)" | 11 | `creative-practice` |
| `Creative Writing` | Creative Writing | resilience | 0/1 | "Write creatively for a bit (15–20 min)" | 11 | `creative-practice` |
| `Poetry` | Poetry Practice | resilience | 0/1 | "Write or work on a poem (15 min)" | 11 | `creative-practice` |
| `Content Writing` | Content Writing | focus | 0/1 | "Write or edit a piece of content (20–30 min)" | 11 | `creative-practice` |
| `Dance` | Dance Practice | agility | 1/1 | "Practice a dance routine or freestyle (20–30 min)" | 11 | `creative-practice` |
| `Yoga & Pilates` | Yoga & Pilates | resilience | 1/1 | "Do a yoga or pilates session (20–30 min)" | 11 | `creative-practice` |
| `Martial Arts` | Martial Arts Practice | agility | 1/1 | "Train martial arts technique (20–30 min)" | 11 | `creative-practice` |
| `Acting & Theatre` | Acting & Theatre | resilience | 0/1 | "Rehearse or work on a scene/script (20–30 min)" | 11 | `creative-practice` |
| `Baking` | Baking Practice | resilience | 0/1 | "Bake something (30–45 min)" | 11 | `creative-practice` |
| `Cooking` | Cooking Practice | resilience | 0/1 | "Cook with intention or try a new recipe (20–30 min)" | 11 | `creative-practice` |
| `Chess & Strategy Games` | Chess & Strategy | focus | 0/1 | "Play or study a strategy game (15–20 min)" | 11 | `creative-practice` |
| `Tabletop & Board Games` | Tabletop Games | per_stat | 0/1 | "Play or prep a tabletop/board game (20–30 min)" | 11 | `creative-practice` |
| `Woodworking & Model Building` | Woodworking & Building | agility | 1/1 | "Work on a woodworking or model project (20–30 min)" | 11 | `creative-practice` |
| `Gardening` | Gardening Practice | resilience | 1/1 | "Spend time in the garden (15–20 min)" | 11 | `creative-practice` |

##### Q3 "Other" per-cluster defaults (custom hobby name substituted as `{name}`; categoryName = the typed name, or "`<Cluster> Practice`" if left blank)

| Cluster | attribute | phys/rec | questThemeTags | loggableTemplate |
|---|---|---|---|---|
| Music & Sound | agility | 0/1 | `creative-practice`,`discovery` | "Practice {name} (15–20 min)" |
| Visual Arts & Crafts | resilience | 0/1 | `creative-practice`,`discovery` | "Spend time on {name} (15–20 min)" |
| Writing & Words | resilience | 0/1 | `creative-practice`,`discovery` | "Spend time writing — {name} (15–20 min)" |
| Movement & Performance | agility | 1/1 | `creative-practice`,`discovery` | "Spend time on {name} (20–30 min)" |
| Culinary | resilience | 0/1 | `creative-practice`,`discovery` | "Spend time on {name} (20–30 min)" |
| Games & Making | focus | 0/1 | `creative-practice`,`discovery` | "Spend time on {name} (15–20 min)" |

#### Q5 — "what else do you want to track" (multi-select from curated list; tier_base
9 × 1.0 — picking it FROM the list is itself the commitment signal, not aspirational,
so no softening multiplier; weight = 9 across the board)

| Answer | categoryName | attribute | phys/rec | loggableTemplate | weight | questThemeTags |
|---|---|---|---|---|---|---|
| `Journaling/Writing` | Journal | resilience | 0/0 | "Free-write or reflect (10 min)" | 9 | `discovery`,`reflection` |
| `Cooking/Meal prep` | Cooking & Meal Prep | resilience | 0/1 | "Cook or prep a meal with intention (20–30 min)" | 9 | `discovery`,`self-care` |
| `Side projects/Coding` | Side Projects | focus | 0/0 | "Work on a side project (20–30 min)" | 9 | `discovery`,`creative-practice` |
| `Spiritual practice` | Spiritual Practice | resilience | 0/1 | "Spend a few minutes in spiritual practice or reflection (10 min)" | 9 | `discovery`,`reflection` |
| `Life admin` | Life Admin | focus | 0/0 | "Knock out a small admin task (10–15 min)" | 9 | `discovery`,`organization` |
| `Social/Relationships` | Social Connection | perception | 0/1 | "Reach out to or spend time with someone you care about" | 9 | `discovery`,`people-skills` |
| `Language learning` | Language Practice | wisdom | 0/0 | "Practice a language for a bit (15 min)" | 9 | `discovery`,`upskilling` |
| `Instrument practice` | Instrument Practice | agility | 0/1 | "Practice an instrument (15–20 min)" | 9 | `discovery`,`creative-practice` |
| `Art/Design` | Art & Design | resilience | 0/1 | "Spend time sketching, designing, or making something (15–20 min)" | 9 | `discovery`,`creative-practice` |
| `Volunteering` | Volunteering | perception | 0/0 | "Spend time on a volunteering or community activity" | 9 | `discovery`,`community` |
| `Personal finance/Budgeting` | Budgeting | focus | 0/0 | "Review or plan your budget or finances (10–15 min)" | 9 | `discovery`,`organization` |
| `Career development` | Career Development | focus | 0/0 | "Spend time on a career-development task (15–20 min)" | 9 | `discovery`,`upskilling` |
| `Health/Self-care routines` | Self-Care | resilience | 1/1 | "Spend time on a self-care routine (10–15 min)" | 9 | `discovery`,`self-care` |
| `Pet care` | Pet Care | resilience | 0/0 | "Spend quality time caring for your pet (10–15 min)" | 9 | `discovery` |
| `Home/DIY projects` | Home Projects | agility | 1/0 | "Work on a home or DIY project (20–30 min)" | 9 | `discovery`,`organization` |
| `Travel planning` | Travel Planning | perception | 0/0 | "Spend time planning or researching a trip (10–15 min)" | 9 | `discovery` |

**Total: 12 Q1b subtopics (×2 intent variants = 24 logical mappings) + 4 Q2 + 24 Q3
(across 6 clusters) + 6 Q3 "Other" cluster defaults + 16 Q5 = 74 entries, covering
every single answer option in the §3 question bank (Q3 revised 2026-06-12 from a
6-entry music/creative pick to a 6-cluster categorized hobby picker, max 3 picks).**
Two earlier worked samples were reconciled to the now-locked formula: Market News
13→14 (Go-deeper tier_base 14×1.0), Side Projects 11→9 (Q5 tier_base 9×1.0 — it's
no longer special-cased above the rest of the Q5 list).

---

## 5. Transparency — the in-app explainer (info button under Quests)

User wants the generation logic to be honest and explainable, not a black box. Draft copy
for an info modal/button on the Quests screen:

> **HOW QUESTS ARE FORGED**
>
> Every quest you receive is drawn from your own Soul Record — what you log, how often,
> and how you've been feeling. Nothing here is scripted in advance.
>
> — **Consistency sharpens the blade.** The more steadily you show up for something, the
> more the Realm asks of you — quests stretch toward your edge, never past it.
>
> — **The Realm reads your state, not just your stats.** When your mood or health dips,
> quests ease off and lean toward rest instead of pushing harder.
>
> — **Revival is always the gentlest road back.** However demanding your quests have
> grown, the path back from death never is.
>
> All of this runs entirely on your device, from your own data. Nothing is ever sent
> anywhere — the Realm is simply paying attention to *you*.

This same "everything stays on your device" framing must also appear in the privacy policy
and the onboarding front page (per explicit user directive).

---

## 6. Quest dynamics — the 3 modes (mode-selector logic detailed in §7)

This lookup table only determines **WHAT** gets tracked (the category roster). It carries
zero difficulty information. Difficulty is a separate layer — 3 named modes that run on top
of whatever categories exist:

1. **Push mode** (doing well) — high consistency + healthy mood/health → Stretch
   Function multiplier climbs toward the 2.0x ceiling
2. **Support mode** (struggling) — low consistency, mood < 5, poor health → multiplier
   drops toward/below baseline, hard-stretch suppressed, rest-type quests injected
3. **Revival mode** (death state) — fixed, separate floor, ALWAYS the simplest possible
   version, completely bypasses the adaptive calculation (a hard override — someone in
   crisis should never get a "hard" revival just because they were on a streak before they crashed)

**Two dials, fed by the same multiplier:**
- `weight` → likelihood/frequency a category gets drawn at all (Weighted Draw stage)
- `multiplier` → how hard the target is, RELATIVE TO THE USER'S OWN RECENT BASELINE,
  once that category IS drawn (e.g. their 30min avg run × 1.5 multiplier = 45min target —
  not "more likely to get a running quest," but "the running quest asks more of you")

### The draw-from-logs formula (LOCKED 2026-06-09)

This is the concrete math behind "drawing quests from existing activity logs" —
two layers: which category gets pulled, and how hard the pulled quest is.

**Layer 1 — quest TARGET derivation** (stretches the user's own logged baseline,
not a fixed designer number):
```
avg_duration(category) = mean(duration of last K logs in category, trailing ~14-30 day window)
raw_target              = avg_duration(category) × stretch_multiplier
quest_target            = round_to_nice_increment(raw_target)
                          // e.g. nearest 5 min under 1hr, nearest 15 min above —
                          // so a quest reads "50 minutes," never "51.2 minutes"
```
Worked example: avg 32min runs, multiplier 1.6 → raw 51.2 → rounds to **50 min**.

**Layer 2 — WEIGHTED DRAW** (which category/quest_type surfaces at all — extends
the existing `DROP_TABLE`/`getCategoryWeight` weighted-random pattern, same
transparency principle, no new mechanism invented):
```
draw_weight(category) = base_category_weight
                       × stretch_multiplier_factor   // higher multiplier → category surfaces MORE often too
                       × mood_rule_adjustment        // §7 suppression / anti-cheese / mood-repair injections
                       × recency_decay               // last cycle's picks get a temporary down-weight, avoids repeats
```
Then a standard weighted-random pick of N quests from that distribution — identical
mechanism to `DROP_TABLE`, just a richer weight calc feeding it.

**Why this reconciles "two independent dials" above into one flow**: the multiplier
isn't separate from `weight` at draw time — it feeds BOTH the draw weight (how often
a category surfaces) AND the raw target (how hard the resulting quest is), just at
different pipeline stages. `weight` (designer/onboarding-assigned) stays the *base*
that the multiplier then modulates — the two dials combine, they don't compete.

---

## 7. Mode-selector logic (AGREED 2026-06-08)

**Architecture: continuous math underneath, discrete labels on top.** The actual
generation engine stays a smooth dial (no cliff-edges in what quests get drawn — someone
at consistency 0.49 shouldn't get a wildly different experience than 0.51). But the user
wants a **discrete, named mode** surfaced in the UI next to Quests, with an info affordance
explaining how it was determined — same transparency principle as §5. So: compute
continuously, *label* discretely for display purposes only.

### The underlying continuous mechanics (drive actual quest generation)
- Base difficulty = Stretch Function output (`clamp(1.1 + consistency_score × scaling_factor, 1.1, 2.0)`)
- **Suppression** is an independent flag the Mood-Reactive Rules Layer can raise regardless
  of where the base multiplier sits (a high-streak player having a rough week still gets
  eased off — that's the whole point of the mood-rules table). When active, it: (a) caps
  the effective multiplier (e.g. `min(multiplier, 1.3)`), (b) forces ≥1 drawn quest to carry
  `restorative`, (c) temporarily boosts discovery weight / cuts compulsory-weekly weight.
- Trigger conditions for suppression (draft numbers — tune freely):
  - Any of the 3 current moods rated < 5 for ≥ 3 consecutive days → ON
  - Emotional-health bar < 30% AND mood < 5 → ON, plus extra rest-injection weight (compounding signal)
  - XP-penalty mood pinned over rolling 14-day window → separate `mood-repair` injection (independent of suppression — can co-occur)
  - XP-bonus mood pinned over rolling 14-day window AND completion-volume doesn't track the
    self-reported high (anti-cheese, behavioral-mismatch gated so genuinely-thriving people
    aren't punished) → raise the multiplier *floor* (e.g. min 1.4), cut easy/discovery weight

### The discrete display label (what the player actually sees)

Purely a presentation-layer summary of the state above — never drives generation directly:

| Label (working name) | Condition (display-only bucketing) | Player-facing framing |
|---|---|---|
| **Ascending** | multiplier > 1.5 AND suppression OFF | "You're in your stride — the Realm is asking more of you because you've earned it." |
| **Steady** | the default middle ground (neither Ascending nor Easing Off conditions met) | "Holding a steady pace — quests are tracking your normal rhythm." |
| **Easing Off** | suppression ON, OR multiplier < 1.3 | "The Realm has eased the pace — your recent mood/health called for it." |
| **Revival** | `isInDeathState()` (hard override — bypasses all of the above) | "The road back is always the gentlest one. No stretch goals here." |

*(Working names — happy to adjust flavor/wording; the bucketing logic is the locked part.)*

### Explaining "the multiplier" to the player (added 2026-06-08, per request)
The mode badge's info panel needs to explain not just *which* mode someone's in, but
*what the multiplier actually is* — in plain, non-engine-jargon terms:

> **The Multiplier** — think of it as how far the Realm stretches past your usual pace.
> At 1.0×, a quest just mirrors what you already do. Above that, it nudges you a little
> further than your comfort zone — and the more consistently you've shown up, the further
> that nudge reaches (up to roughly double your usual). It never leaps straight to your
> limit; it grows step by step, in time with your own rhythm.

This pairs with the existing snapshot-driven framing (e.g. *"Your consistency on Workout
has held for 12 days — that's what's pushing your multiplier toward 1.6×"*) so the player
sees both the *concept* (what a multiplier is) and the *cause* (why theirs is what it is
right now) in one place.

### Cold-start non-issue (verified 2026-06-08)
No "day-1 quest" design is needed. Quests live inside the **Game tab**
(`app/(tabs)/game.tsx`), which is hard-gated behind `isGameUnlocked()` /
`MIN_GAME_LEVEL = 11` (`game.ts:146-149`, enforced at the tab-press level in
`_layout.tsx:101-105` with the "Unlockable only at level 11" alert). By the time anyone
can see a quest, they're already ~11 levels in with real `activity_logs` history — the
"empty snapshot" problem the Player Snapshot job would otherwise need to handle on day 1
simply doesn't occur. **Layer 1 (universal baseline) only needs to seed enough
*categories* to make leveling to 11 possible pre-onboarding** — it does not need to
seed any quest content.

### UI placement
Surfaced as a small badge/tag near the Quests section header (mirrors how mood/health
states are already surfaced elsewhere). Tapping it opens an info panel that explains —
**using the player's own current snapshot numbers**, not generic copy — *why* they're in
that mode right now (e.g. "Your consistency on Workout has held steady for 12 days, and
your mood's been steady too — that's what's keeping you in Steady"). This is the same
"show your work" transparency principle as the §5 quest-generation explainer, just scoped
to the mode specifically.

---

## 8. Quest text generation — how the English actually gets composed (AGREED 2026-06-08)

The engine decides WHAT to generate (category + numeric target + quest_type). Separately,
a small **frame-template library** decides how that gets phrased into a sentence — same
"plain array of objects, weighted/picked" pattern as `DROP_TABLE` (game.ts:96), just
producing text instead of items. Fully deterministic and traceable: for any quest on
screen, you can point at exactly which frame + which data slot produced that exact
sentence. No LLM, no black box — matches the transparency principle running through
the whole engine.

**Two slot sources, picked by quest_type:**
- *Stretch quests* pull `{activity}` from the player's own **category name**
  (`categories.name` — e.g. "Workout," "Side Projects") — NOT the free-text
  `activity_logs.description` field. ⚠️ Correction made 2026-06-08: description is
  whatever someone happens to type per session ("ugh gym again," "ran lol") — embedding
  that verbatim would produce broken-looking quest text. Category names are stable,
  deliberate, created once — "Evening run — push for 45 minutes this time" reads as
  personal ("yours," because it names YOUR category) without ever risking "ugh gym
  again — push for 45 minutes this time."
- *Onboarding-interest / discovery / restorative quests* pull `{loggableTemplate}` from
  the lookup table (§4) — the designer-pinned, realistically-scoped phrase

### ⚠️ Correction 2026-06-08: needs a POOL of phrasings per type, not one fixed frame each
My first draft had exactly ONE frame per `quest_type` — that would get repetitive fast
("Workout — push for 45 minutes this time," verbatim, every single week, forever). To be
precise about what's actually meant to stay fixed: just the **category name** — that's the
user's own name for their own thing, and it's *what makes the quest feel personal/theirs*,
not a flaw to route around. What keeps the *sentence around it* feeling alive is a small
**pool of phrasings per type**, randomly picked each generation — same weighted-random
pattern as `DROP_TABLE`, just producing text instead of items:

```
STRETCH (pick 1 at random):
  - "{activity} — push for {target} this time"
  - "Your {activity} streak says you're ready for {target}"
  - "Can you stretch {activity} to {target} today?"

COMPULSORY:
  - "{loggableTemplate}, {frequency}× this week"
  - "This week's focus: {loggableTemplate} ({frequency}× target)"

DISCOVERY:
  - "Something new: {loggableTemplate}"
  - "Worth a try: {loggableTemplate}"

RESTORATIVE:
  - "Take a breather: {loggableTemplate}"
  - "No rush — just {loggableTemplate}"

DUNGEON:
  - "{activity} — {duration} gate"

REVIVAL (deliberately ONE frame only):
  - "Log one thing today — anything counts, no pressure"
```
*(Revival stays single-frame on purpose — variety here would undercut the "always the
simplest, gentlest, most predictable floor" promise; that one IS the point.)*

So "Workout" might read as *"Workout — push for 45 minutes this time"* one week and
*"Your Workout streak says you're ready for 45 minutes"* the next: same stable name (still
recognizably *yours*), same freshly-computed number, different shape — never copy-paste,
never generic.

**Worked examples — what a player actually sees:**
| Situation | Generated quest text |
|---|---|
| Logged "Evening run" avg 30min, Stretch multiplier 1.5× | *"Evening run — push for 45 minutes this time"* |
| Picked "Market news" via Q1b "Go deeper" | *"Read/skim market news (10–15 min), 5× this week"* |
| Discovery draw | *"Something new: Try a 10-minute meditation session"* |
| Easing Off / suppression active | *"Take a breather: Watch something that makes you laugh (20 min)"* |
| Revival mode | *"Log one thing today — anything counts, no pressure"* |

### ✅ RESOLVED: quest completion WILL grant attribute stat gain
User confirmed 2026-06-08: `completeQuest` (`game.ts:824-848`) should additionally call
`grantAttributeStatGain(quest.category)` — mirroring the manual-logging path
(`logs.ts:202`) so finishing a quest gives the same `+1` stat bump as logging the
underlying activity directly. Currently it does NOT (it only calls `applyXP` for XP+coins
and writes its own `activity_logs` row via raw SQL, bypassing `grantAttributeStatGain`)
— a one-line fix to add at implementation time, now locked in as the agreed behavior.

### Why category names are safe to embed in generated quest text (verified 2026-06-08)
`categories.name` is `TEXT NOT NULL UNIQUE` and there is **no rename/update function
anywhere in the codebase** (grepped — only create + guarded-delete paths exist; can't
delete a category that's ever been used in `activity_logs`, per [[demo_and_customisation]]).
So the guarantee is "exists permanently once created, or never existed" — a generated
quest referencing a category name can never go stale or point at something renamed out
from under it. This is what makes the §8 `{activity}` slot design (pulling the *category*
name, never the free-text per-entry `description`) durable long-term.

This also retires the current placeholder copy: `"Log: {category}"` in `generateQuests()`
and the hardcoded `"DAILY QUEST"` tag in `PendingQuestCard` (which should read
`quest.quest_type` once real types exist) — both listed in [[demo_and_customisation]] as
customisation debt, and both are direct dependencies of this system rather than standalone
cleanup items.

---

## 9. Reset → onboarding flow (AGREED 2026-06-08)

Resolves the open thread from [[project_launch_prep]] item 0 ("a full reset would also
trigger onboarding — wiring deferred until onboarding's design was ready"):

1. `performFullReset()` completes (true blank slate, per the 2026-06-08 redesign) → onboarding launches automatically
2. **First prompt: "Retain your previous answers, or start fresh?"**
   - **Retain** → re-derive `categories`/`custom_moods`/`restorative_activities` from the
     *saved onboarding answers* (NOT from the wiped derived rows — this means raw onboarding
     answers must persist in their own table, separate from their derived output, so a
     reset can regenerate cleanly without the original answers having survived the wipe)
   - **Start fresh** → blank onboarding flow, previous answers discarded
3. **Either path**: if the saved answers had blanks/skips, surface a targeted callout —
   e.g. *"Last time you skipped the hobbies question — want to fill it in now?"* — giving
   a second chance without forcing it. This doubles as the natural on-ramp for someone who
   skipped onboarding entirely the first time and is now resetting.

**Bonus reset option — read-only history archive (AGREED 2026-06-08, simple to build):**
Offer a choice during the reset flow: *"Keep your activity history as an archive?"*
- **Retain** → add one nullable `archived_at TEXT` column to `activity_logs`; instead of
  `DELETE FROM activity_logs`, run `UPDATE activity_logs SET archived_at = datetime('now')`
  — tags every existing row (description/notes/xp_awarded/mood_rating, everything, frozen
  as-is) as "previous era." The rest of the true-blank-slate wipe (rpg_state/categories/
  moods/restoratives) proceeds exactly as before — archive is independent of live state.
- New post-reset logs naturally get `archived_at IS NULL` → "current era"
- **Purely read-only, by explicit choice** (simpler than building edit-guards for archived
  rows — the UI just never renders edit controls where `archived_at IS NOT NULL`)
- **Calendar mood-coloring needs zero special handling** — it queries by date, and
  archived/current rows never overlap by date, so both eras render seamlessly together.
  Optional polish only: a thin visual divider on the reset-date boundary.
- History/Journal screens get a light filter: current-era by default, with an
  "archived"/"expired" section to browse the old ones
- This is cheap specifically *because* `activity_logs` is a flat table with no FK
  dependents — nothing else needs to change to support it

**Architectural consequence**: implies a dedicated `onboarding_answers` table (raw Q1-Q8
responses) that `categories`/`custom_moods`/`restorative_activities` get *derived from* —
not generated once and discarded. This is what makes "retain," "redo," AND the §10
"Quest Preferences" page below all work off the same source of truth.

### Migration plan (LOCKED 2026-06-09)

Verified against the live migration ladder in `schema.ts` — current head is
`PRAGMA user_version = 39` (line 1201-1209, the level-up-reward-display migration).
The onboarding work becomes **migration 40**, following the exact established
pattern (`if (version < N) { ALTER/CREATE ... ; PRAGMA user_version = N; }`):

```ts
if (version < 40) {
  // onboarding_answers — raw Q1-Q8 responses, the single source of truth that
  // categories/moods/restoratives get DERIVED from (never generated-once-and-discarded —
  // this is what makes retain/redo/Quest-Preferences all work off one table)
  db.execSync(`CREATE TABLE IF NOT EXISTS onboarding_answers (
    id INTEGER PRIMARY KEY DEFAULT 1,
    answers TEXT NOT NULL DEFAULT '{}',
    completed_at TEXT,
    updated_at TEXT
  )`);

  // read-only history archive (§9 bonus option) — nullable, so existing rows default
  // to NULL ("current era"); tagging via UPDATE replaces DELETE on archive-reset
  try { db.execSync(`ALTER TABLE activity_logs ADD COLUMN archived_at TEXT`); } catch {}

  // Layer-1 vs Layer-3 distinction flagged as an open question in
  // [[project_quest_engine_and_insights]] §3 — resolving it here: generic
  // baseline rows get is_baseline=1 so Insights/Layer-3 knows "this is a
  // generic stand-in worth refining" vs. "user explicitly chose this, leave it alone"
  try { db.execSync(`ALTER TABLE categories ADD COLUMN is_baseline INTEGER NOT NULL DEFAULT 0`); } catch {}

  db.execSync('PRAGMA user_version = 40');
}
```

**Why `answers TEXT` (option c, JSON blob) over rigid columns or normalized rows**:
mirrors the existing `activity_logs.categories` JSON-in-TEXT pattern already in the
schema (line 83) — the app is single-user/no-backend, so there's no query-by-answer
need that would justify normalized rows; a blob keeps the question bank free to
evolve (add/reorder/reword Q1-Q8) without a migration each time, at the cost of
needing `JSON.parse`/`JSON.stringify` at the read/write boundary (same cost the
`categories` column already pays).

**`id INTEGER PRIMARY KEY DEFAULT 1` singleton pattern** mirrors `rpg_state`
(`schema.ts:54`) and `health_state` (`schema.ts:140`) verbatim — there is exactly
one onboarding-answers record per (single-user) install; "redo" and "retain" both
`UPDATE` this row, never insert a second.

---

## 10. Quest Preferences — living, editable settings page (UPGRADES the old "Redo onboarding button")

User-proposed 2026-06-08, and it's a strictly better design than the simple one-shot
"Redo onboarding" button logged in [[project_quest_engine_and_insights]] §4: instead of
a redo-from-scratch flow, make the Q1-Q8 question set **always accessible and editable**
as a living preferences surface — so someone can tweak just the bits that drifted (e.g.
picked up a new hobby) without re-running the whole sequence.

- **Where**: new section in Settings, pre-filled with the user's current saved answers
  (reads straight from the `onboarding_answers` table — §9's source of truth)
- **What editing does**: saving a change re-derives `categories`/`custom_moods`/
  `restorative_activities` the same way "retain on reset" does — same regeneration
  pathway, just triggered from a different entry point
- **Gated behind biometrics**: there's already a working pattern to lift verbatim —
  `settings.tsx:69` uses `expo-local-authentication`'s `authenticateAsync` to gate the
  Delete & Reset flow. This page reuses that exact gate (consistent with treating
  "things that reshape your experience" as sensitive, alongside "things that destroy
  your data")
- **Warning banner required**: *"Changing these may affect the quests and
  recommendations you receive."* — sets expectations before someone fiddles with it
  mid-stride and wonders why their quest mix shifted

This single page now covers: the old "redo onboarding" need (just edit everything), the
"fill in what I skipped" need (blanks show as empty/unanswered fields, editable in place),
AND ongoing light tuning (drop one interest, add another) — three asks, one surface, one
source of truth. **This replaces the simple redo-button design** in
[[project_quest_engine_and_insights]] §4 — that memory should be updated to point here
when this gets built.

---

## 11. AS-BUILT LOG — Phase B (quest engine) & Phase C (Insights), 2026-06-09

Phase A (onboarding, §3-§10 above) was built in a prior session. Phases B and C were
built in this session, fully delegating to the architecture agreed in
[[project_quest_engine_and_insights]]. This section is the as-built record — final
tuning values, file locations, and every assumption made that wasn't explicitly
re-confirmed with the user before being coded.

### Where things live
- `src/db/questEngine.ts` — Phase B engine: `QUEST_ENGINE_TUNING`, Player Snapshot,
  stretch function, mood rules (incl. anti-cheese), recency decay, weighted draw,
  template fill. `game.ts:generateQuests()` now fully delegates to it.
- `src/db/insights.ts` — Phase C engine: `INSIGHTS_TUNING`, suggestion generation
  (new_category / tier_ready / mood_trend), personalization gate, accept/dismiss +
  accept side-effects (Option A: real `addCategory` write on `new_category` accept).
- `app/(tabs)/recommendations.tsx` — the Insights screen (list, accept/dismiss,
  new-category name-entry modal, resolved-history toggle, off-state).
- `app/settings.tsx` — "INSIGHTS" section with the reversible personalization `Switch`.
- `src/components/TopRibbon.tsx` — flag icon now routes to `/recommendations` (was
  `/milestones`), shows a quiet badge dot when suggestions are pending, and the
  hamburger drawer gained an "About" entry (version + on-device privacy blurb).
- Migrations v41 (`quest_engine_state`, `quest_templates` + `DEFAULT_QUEST_TEMPLATES`)
  and v42 (`insight_suggestions`) in `src/db/schema.ts`.

### Final tuning values (user-approved during the build, 2026-06-08/09)
`QUEST_ENGINE_TUNING`: `recompute_interval_days: 7, consistency_window_days: 14,
scaling_factor: 0.9, mood_low_threshold: 5, mood_high_threshold: 8,
anti_cheese_min_high_streak: 10, anti_cheese_activity_floor: 0.3,
mood_rule_weight_mult: 1.5, recency_decay_half_life_days: 14, candidate_pool_limit: 3`.
Stretch-worthiness threshold in `buildCandidates`: `consistency_score >= 0.4` (user
explicitly requested 0.4 over the initial 0.5 draft).

`INSIGHTS_TUNING`: `overuse_min_logs: 6, tier_ready_threshold: 1.9,
tier_ready_min_cycles: 2, mood_trend_min_delta: 1.0, mood_trend_min_cycles: 2`.

### Bug found + fixed during the build (not a design change, a correctness fix)
`generateTierReadySuggestions`/`generateMoodTrendSuggestions` need to compare the
*current* Player Snapshot against the *prior cycle's* snapshot to enforce
"N consecutive cycles." But `getOrRefreshSnapshot()` overwrites the stored snapshot
in place the moment its 7-day gate elapses — so calling `getStoredSnapshot()` after
it had often returned the same row as "current," making the consecutive-cycle check
trivially true (could fire ~1 week early). Fixed by capturing the prior snapshot
+ its timestamp *before* calling `getOrRefreshSnapshot()`, and only running the
cycle-comparison generators when `snapshot.computed_at !== priorAt` (i.e. an actual
fresh recompute just happened — ties suggestion-generation cadence to the same
7-day cycle boundary as the snapshot itself, which the user confirmed should "link").

### Assumptions made without an explicit re-check (flag if any should change)
1. **Personalization-gate precedence** — restructured so the Settings toggle
   (`personalization_enabled`) is the sole, always-reversible source of truth, with
   `q8_personalization` only seeding its *initial* value on first read. This was the
   fix for a real bug (the original ordering would have permanently locked out anyone
   who answered "No" at onboarding from ever turning it back on), but the precedence
   model itself was my call, not a re-confirmed design decision.
2. **No snapshot-history table** — the "2 consecutive cycles" check compares only
   against the immediately-prior cycle (captured pre-refresh), not a longer rolling
   history. Kept deliberately simple/transparent per the no-ML philosophy (§1), but
   it does mean the comparison opportunity only exists at the exact moment a 7-day
   refresh fires — if the user isn't in the app then, that check effectively waits
   for the *next* boundary.
3. **UI copy & iconography** — suggestion-kind icons (`tag` / `trending-up` /
   `activity`), the "Acknowledge" accept-label for pure-observation suggestions
   (`tier_ready`, `mood_trend` — which have no real side-effect besides marking
   resolved), empty-state copy, and the About-sheet privacy blurb were all written
   without a copy-review pass.
4. **Kept the old ribbon sound** — `playSound('milestonetopribbon')` still fires on
   the flag-icon press despite the destination changing; renaming felt like it would
   require a new audio asset (out of scope for a routing swap).
5. **Left `/milestones` route + `milestones` table orphaned** — unreachable from the
   UI now, but not deleted; that's a more destructive cleanup than "swap the
   destination" and wasn't asked for.
6. **Hardcoded version string** — the About sheet shows a static `"Version 1.0.0"`
   rather than reading `app.json`/`package.json` dynamically; no `expo-constants`
   precedent existed in the codebase to extend.

## 12. AS-BUILT LOG — Dungeon time-limit derivation, 2026-06-10

**What changed**: dungeon `duration_mins` (used as both the attempt countdown
timer and the XP-calc input — MECHANICS.md §11.7) is no longer a static seeded
value. For most dungeons it's now derived live, every time `getDungeons()` /
`getActiveDungeonRun()` is called (game.ts `withLiveDuration()`):

```
duration_mins = round(recommendedDurationMinutes(snapshot, dungeon.category, fallback) × DUNGEON_RANK_DURATION_MULT[dungeon.rank])
```

`recommendedDurationMinutes()` (questEngine.ts) is the exact same
`avg_duration_mins × stretchMultiplier(consistency_score)` formula already used
for stretch-tier quests (§1/MECHANICS.md §12.1) — same 1.1–2.0x relative cap,
no new formula. `DUNGEON_RANK_DURATION_MULT` is a small new per-rank table
(E=0.9 ... Legend=1.5, user-specified, updated 2026-06-10) layered on top.

**The `time_mode` escape hatch (schema.ts v43)**: while designing this, the
user pointed out that "more time = harder" only holds for activities phrased
as "do X for N minutes." One existing E-rank dungeon, **Hunter's Run**
("Complete a 2.4 km run before the gate closes"), is a fixed-distance task with
a *deadline* — more time there makes it *easier*, not harder. Added
`dungeons.time_mode TEXT NOT NULL DEFAULT 'duration'`, set to `'time_trial'`
only for Hunter's Run. `withLiveDuration()` skips `time_trial` rows entirely —
they keep their static seeded `duration_mins`, and rank differentiation for
them stays in `difficulty`/`coin_reward`/drop-table only (unchanged).

**Why this doesn't need revisiting when the dungeon-rotation engine (item G,
deferred — §11.6 Known Gaps) gets built**: every `DEFAULT_QUEST_TEMPLATES` row
(schema.ts) is phrased as "log/spend N minutes of {category}" — the quest
engine has no fixed-task/time-trial candidate type at all. So any
engine-generated dungeon content is automatically `'duration'`-mode-compatible.
`time_trial` is reserved for hand-authored exceptions like Hunter's Run; if
more get added later, just set `time_mode = 'time_trial'` on that row — no
formula changes needed.

**Assumption made**: snapshot lookup uses `getOrRefreshSnapshot()` (cheap
no-op read unless the recompute gate trips — §14 below — same cadence as quest
generation), not a forced recompute. "Live" therefore means "live relative to
the current snapshot," not "recomputed from raw logs on every render."

## 13. AS-BUILT LOG — Dungeon Key consumption ("Extra Gates"), 2026-06-10

**What changed**: Dungeon Keys (`item_type='dungeon_key'`) were purchasable/
droppable but unusable — "this consumption/generation step is intentionally
stubbed" (MECHANICS.md §11.6 Known Gaps, pre-this-build). Added
`useDungeonKey(rank)` (game.ts) + a "USE" button on Key items in
`app/inventory.tsx` (GAME tab).

**Resolves the D–Legend content gap differently than expected**: earlier in
this session I'd flagged that using a D–Legend Key has nothing to clone, since
only 5 E-rank templates exist. The user corrected this: **dungeon rank only
ever applied a multiplier on top of a shared template pool** — "D is
essentially E with the multiplier" (coin/drop tables are already keyed purely
by `rank`, §11.1/§11.3, and §11.7's new `DUNGEON_RANK_DURATION_MULT` is the
same idea for duration). So `useDungeonKey()` picks a random one of the 5
base templates (`is_generated=0`) regardless of rank, clones it, and stamps
the clone with the Key's rank — no new content needed for any rank.

**Mechanism** (`useDungeonKey`, game.ts):
1. Requires the rank's Right already owned (`isDungeonRankUnlocked`) — a Key
   doesn't grant early rank access by itself. User's framing: "the key cannot
   be used unless the right has been earned... if the right has been earned
   then [the gate is] playable immediately."
2. Picks a random base template, computes its `duration_mins` ONCE via the
   §11.7 live formula (`recommendedDurationMinutes × DUNGEON_RANK_DURATION_MULT[rank]`,
   or the static value unchanged for `time_mode='time_trial'` templates), then
   freezes it — `withLiveDuration()` now also skips any row with
   `is_generated=1`, regardless of `time_mode`. This is the "no longer adapts
   to player behaviour once created" requirement.
3. Sets `expires_at` via SQL `datetime('now','localtime','+N seconds')` (same
   format as the cooldown timestamps elsewhere, so string comparison in
   `getDungeons()`'s WHERE clause works) — 1–10 days normal, 1–3 days for
   `HIGH_TIER_RANKS` (S/SS/SSS/Legend), per the existing
   `dungeonKeyExpiryRangeText` copy.
4. Consumes the Key (decrement/delete inventory row).

**New schema (v44)**: `dungeons.is_generated INTEGER DEFAULT 0`,
`dungeons.expires_at TEXT` (null = permanent). `getDungeons()` now runs
`cleanupExpiredDungeons()` (deletes lapsed `is_generated=1` rows that aren't
mid-attempt) and filters `is_generated=0 OR expires_at > now`.

**UI**: generated gates render in a new "EXTRA GATES" section in
`app/(tabs)/game.tsx` (separate from the rank-grouped permanent list, per
user's choice), with a `DungeonCard` expiry badge ("EXPIRES IN 6H"/"2D") via
new `getDungeonExpiryRemaining()`.

**The `time_mode` constraint, restated for future difficulty work** (see
MECHANICS.md §11.7 callout): `time_mode` is the permanent switch for *any*
difficulty-scaling mechanic. `'duration'` dungeons scale via `duration_mins`
(this build + §11.7). `'time_trial'` dungeons (Hunter's Run) must scale via a
different, not-yet-designed axis — increasing their time limit would make them
*easier*. If a time-trial-style `quest_templates` row is ever added, it needs
the same tag and the same exclusion from `{minutes}`/stretch logic.

**Assumption made**: "USE" is shown on every `dungeon_key` item with
`quantity > 0` regardless of rank-unlock status — pressing it on a
not-yet-unlocked rank shows an alert ("Right Required") rather than hiding the
button. Felt more transparent than silently hiding a button the player may not
understand the absence of.

**Global 12-hour cooldown on Key usage (schema v47, added 2026-06-11)**: separate
from the generated gate's own `expires_at` above — `useDungeonKey()` now
checks `getKeyUsageCooldownRemaining()` (new `rpg_state.last_key_used_at`
column) and returns `'on_cooldown'` if < 12h have passed since the last
successful use of *any* rank's Key; `app/inventory.tsx`'s `handleUseKey`
shows "Key On Cooldown — you can use another Dungeon Key in Nh/Nm." On a
successful use, `last_key_used_at` is stamped via `sqlNow()` (local-time
string, same convention as `dungeon_runs.started_at` — see §16's
`getActiveDungeonRun` note for why this format is used consistently).

## 14. AS-BUILT LOG — Quest snapshot recompute on backfilled logs, 2026-06-10

**The bug**: a player who backfills several days of activity logs in one
sitting (e.g. logging the past 7 days of activity right after onboarding) saw
no new quests/dungeons reflecting that data — `getOrRefreshSnapshot()`
(questEngine.ts) only recomputed the Player Snapshot once
`recompute_interval_days` (7) had elapsed since `last_snapshot_at`, regardless
of how much new log data existed. The 7-day timer itself was a deliberate,
user-confirmed cadence (§1) — the gap was that it was the *only* trigger.

**The fix**: `getOrRefreshSnapshot()` now also recomputes immediately if the
count of snapshot-input logs (`activity_logs` rows with
`entry_type IN ('activity','mood') AND archived_at IS NULL`) differs from the
count captured at the last snapshot (`quest_engine_state.last_snapshot_log_count`,
new column, schema v46). Either condition — the 7-day timer elapsing, or the
log count having changed (more from new logs, fewer from archiving) — triggers
a fresh `computePlayerSnapshot()`.

**Why a row-count instead of a timestamp comparison**: `activity_logs.created_at`
is `datetime('now','localtime')` (`'YYYY-MM-DD HH:MM:SS'`, local time), while
`last_snapshot_at`/`computed_at` are `new Date().toISOString()`
(`'YYYY-MM-DDTHH:MM:SS.sssZ'`, UTC). Comparing these directly would require
reconciling both the separator and timezone formats — fragile, and easy to get
subtly wrong across DST/timezone edge cases. A plain `count(*)` of relevant logs
sidesteps the whole problem: any insert or archive changes the count, with no
date parsing at all.

**Side effects checked**: `insights.ts`'s `generateInsightSuggestions()` reads
`getStoredSnapshot()`/`getOrRefreshSnapshot()` and compares
`snapshot.computed_at !== priorAt` to detect "did a recompute just happen" —
this still works unchanged, since `computed_at`/`last_snapshot_at` formats and
semantics are untouched; only the *trigger* for recomputing changed. The new
`last_snapshot_log_count` field on `getStoredSnapshot()`'s return type is
additive (destructured callers ignore it).

## 15. AS-BUILT LOG — Extra Gates as one-time quests, streak freeze inventory flow, color cleanup, 2026-06-10

**Extra Gates are now one-time** (§13's Key-generated `is_generated=1` gates):
any finished attempt — clear, fail, *or* abandon — deletes the dungeon row via
new `consumeIfGenerated()` (game.ts), called from `submitDungeonClear`,
`failDungeon`, and `abandonDungeon` (which now also takes a `dungeon: Dungeon`
param so it can check `is_generated`). User confirmed: "any finished attempt
removes it" — a failed attempt still costs the HP penalty (§11.2) *and* the
gate, no retry. Cooldown/`expires_at` no longer matter for these rows since
they're gone immediately. See MECHANICS.md §11.5.

**Streak Freeze: buy → inventory → USE to arm**. Previously
`purchaseStreakFreeze()` directly incremented `rpg_state.streak_freezes` (the
pool `checkStreakFreeze()` auto-consumes on a missed day) — i.e. it activated
the instant you bought it. Now it adds/increments a `category='global',
item_type='consumable', item_name='Streak Freeze'` inventory row (same pattern
as Revival Potion), and a new `useStreakFreeze()` (rpg.ts) — wired to a USE
button in `app/inventory.tsx` (Global tab) — moves one unit from inventory into
`rpg_state.streak_freezes`. `checkStreakFreeze()` itself, and the home page's
"Streak Freeze × N" / frozen-streak-icon display (both keyed off
`rpg_state.streak_freezes`), are unchanged — they represent the *armed* count.
Store's "N owned" now reads inventory quantity (`getStreakFreezeInventoryCount()`)
instead of the armed count.

**Streak Freeze cost mismatch — RESOLVED 2026-06-11**: the Store listed Streak
Freeze at 300 coins (`store.tsx`) but `purchaseStreakFreeze()`'s `COST`
constant was 50 — `buy()` only gated on the displayed 300, then
`purchaseStreakFreeze()` deducted just 50. Fixed by changing `COST` to 300 to
match the displayed/gated price.

**Color cleanup** ("usable XP" = `spendable_xp`, the Recharge-tab balance,
`insights.tsx` `xpText`): both `spendable_xp` displays — the Recharge-tab badge
and the "today N logs · M XP" stat above the Week/Month/Year filter on the
Progress page (`index.tsx` `todayXPOn`) — now use `colors.primary` (the XP
bar's fill color) instead of `colors.success`. The Recharge-tab badge's pill
*border* (`insights.tsx` `xpBadge.borderColor`) was also switched from
`colors.success` to `colors.primary` to match — previously only the text
inside the oval had changed, leaving a green outline around blue text. `Vigor`
in `GlobalCurrencyBar.tsx` (previously a hardcoded `#15803D`) now uses
`colors.success` — the color "usable XP" used to have, freed up by the above
change. The Soul Record block on the home page (`index.tsx`) defines its own
`VIGOR_COLOR` constant (previously `#15803D`, same green as the old
GlobalCurrencyBar value) — updated to `colors.success` too, so Soul Record and
GlobalCurrencyBar show Vigor in the same color. Finally, GlobalCurrencyBar's
Anima value text was sign-dependent (green/red/grey via a now-removed
`animaColor` helper); Soul Record's `ANIMA_COLOR` (`#60A5FA`, a fixed silvery
blue regardless of sign) is the source of truth for Anima's color, so
GlobalCurrencyBar's Anima text now also uses the fixed `'#60A5FA'` — only the
`+`/`-`/zero numeric label changes, not the color.

## 16. AS-BUILT LOG — Dungeon timer freeze, rank badge, category weight editing, mood tag fix, 2026-06-10

**Active dungeon runs now freeze `duration_mins` at start (schema v45)**:
§12's `withLiveDuration()` recomputes `duration_mins` on every
`getDungeons()`/`getActiveDungeonRun()` call, which could desync an
in-progress attempt if the player logged another activity in that category
before the timer ran out (returning to the Game tab triggers `reload()`).
`startDungeon(dungeonId, durationMins, mpUsed)` (game.ts) gained a required
`durationMins` param and now stores it on the new `dungeon_runs.duration_mins`
column; `getActiveDungeonRun()` returns this frozen value for any
`status='active'` run instead of a fresh `withLiveDuration()` call (falls back
to a live recompute only if the column is `NULL`, i.e. runs started before
v45). `app/(tabs)/game.tsx`'s reload effect changed from
`if (activeRun && activeRunId === null)` to `if (activeRun)` — it now
*always* resyncs `selectedDungeon`/`timerSeconds` from
`started_at + activeRun.duration_mins` on every reload, using a `runDungeon =
{...dungeon, duration_mins: activeRun.duration_mins}` object so the XP/log
entry written on clear (`sessionXP(dungeon.duration_mins, ...)`, §11.1) also
uses the frozen value — not whatever `withLiveDuration()` would derive at
clear-time. `handleStartTimer` now passes `selectedDungeon.duration_mins`
(the live-derived value shown when the player tapped "Start") into
`startDungeon`, so what's frozen is exactly what the player saw before
starting.

**Player rank badge on the home XP bar**: `getPlayerRankLabel(level)` (game.ts,
new) maps a level to its Player Tier letter via the existing
`DUNGEON_TIER_INDEX`/§4 table, plus a new `PLAYER_RANK_BY_TIER[1] = 'F'` for
levels 1–10 (below `MIN_GAME_LEVEL`). `XPBar` (`src/components/XPBar.tsx`) now
renders this as a bordered badge to the left of the LVL badge, colored via
`RANK_COLOR` (`DungeonCard.tsx`, gained a new `F: '#475569'` muted-slate
entry). Ranked badges (E and above) get a looping pulsing glow
(`Animated.loop`, 1.1s in/out, opacity 0.18→0.5 + scale 1→1.18); the F badge
is deliberately dormant — no glow, and both border/text rendered at reduced
alpha (`${rankColor}66`/`${rankColor}AA`) — "unranked" shouldn't read as an
achievement.

**Onboarding-seeded categories can now have their XP weight retuned**: new
`updateCategoryWeight(name, weight)` (`src/db/categories.ts`, clamps 1–20)
fixes a gap where categories created during onboarding were seeded with a
fixed weight and had no UI to adjust it afterward (the 1–20 weight slider in
the "New Activity" sheet only applies at creation time). `CategoryGrid`'s
"Manage Activities" sheet (gear icon, §-prior pass) gained a sliders icon per
row, next to the trash icon — tapping it expands an inline 1–20 drag slider
(`@react-native-community/slider`, same component as the New Activity sheet)
pre-filled with the category's current weight; `onSlidingComplete` calls
`updateCategoryWeight` and reloads. The row also now shows the live/current
weight as `w{N}` next to the `used` badge.

**Effects row no longer shows a fake "driven" mood tag**: `rpg_state.current_mood`
defaults to the placeholder string `'driven'` (schema.ts, `DEFAULT 'driven'`)
and the personal build deliberately seeds **no** custom moods (schema.ts:468 —
"driven"/"burnout" would be presumptuous; players add their own via Mood
Settings). Previously, the home page's Effects row always rendered an effect
tag for `currentMoodState` regardless of whether it corresponded to a real
`custom_moods` row — so a fresh install (or any player who never picked a
mood) showed a "driven" tag with a fallback color and implied passive effects
(`MOOD_FALLBACK_PASSIVE['driven']`, display-only) that `getMoodXPMultiplier()`
doesn't actually grant (no matching `custom_moods` row → `xp_change = 0`). The
tag is now gated on `customMoods.some(m => m.name === currentMoodState)` —
only moods the player has actually created (and which therefore have real
`xp_change`/`mp_rate` effects wired, §1.5/§17.1) appear as Effects tags.

## 17. AS-BUILT LOG — Daily Quests + Daily Gates (shared pool), 2026-06-11

**What changed**: the old weekly-cadence quest engine (`generateQuests()`,
fill-empty-category-slots, `quest_type='weekly'`) is retired entirely.
`generateDailyContent()` (game.ts, full replacement) generates exactly **3
Daily Quests + 3 Daily Gates** once per local day, drawn from one shared
candidate pool. `quest_type='daily'` is now the only quest type. This closes
out `[[project_phase_d_followup]]` item G's last open piece — the "natural
daily-spawn rotation job" that §13 deferred when Extra Gates shipped.

**Idempotency**: new `rpg_state.last_daily_gen_date` column (migration v48,
`ALTER TABLE rpg_state ADD COLUMN last_daily_gen_date TEXT`) is compared
against `localDateStr()` at the top of `generateDailyContent()`. If they
match, the function returns immediately — so calling it on every `reload()`
(as `app/(tabs)/game.tsx` now does, replacing the old `generateQuests()` call)
only does work on the first reload of a new local day.

**Wipe + regenerate**:
- `DELETE FROM quests WHERE quest_type = 'daily'` — unconditional. Daily
  Quests have no "active run" concept, so anything not completed by day's end
  is simply gone; no `expired` status was added (§12.3).
- `cleanupExpiredDungeons()` (existing, unchanged) runs next, dropping any
  `is_generated=1` dungeon rows whose `expires_at` has lapsed and which have
  no row in `dungeon_runs` with `status='active'`.

**Shared pool draw — `drawDailyPool(snapshot)` (questEngine.ts, new)**:
```ts
export function drawDailyPool(snapshot: PlayerSnapshot): { questCandidates: QuestCandidate[]; dungeonCandidates: QuestCandidate[] } {
  const pool = weightedSample(buildCandidates(snapshot), QUEST_ENGINE_TUNING.candidate_pool_limit * 2);
  return {
    questCandidates: pool.slice(0, QUEST_ENGINE_TUNING.candidate_pool_limit),
    dungeonCandidates: pool.slice(QUEST_ENGINE_TUNING.candidate_pool_limit, QUEST_ENGINE_TUNING.candidate_pool_limit * 2),
  };
}
```
`weightedSample` was made `export`ed (previously module-private) for this.
Since `buildCandidates` already yields **at most one candidate per category**
(its core invariant from §11), drawing 6 distinct candidates and slicing
`[0:3]`/`[3:6]` guarantees the 3 Daily Quests and 3 Daily Gates never share a
category — no extra de-dup pass needed. If fewer than 6 categories exist
(e.g. a brand-new account), `dungeonCandidates` may come up short and
`generateDailyContent()` simply inserts fewer than 3 gates that day.

**New `dungeon_templates` table (migration v48)** — the shared content bank
for both Daily Gates and Extra Gates:
```sql
CREATE TABLE IF NOT EXISTS dungeon_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  name_template TEXT NOT NULL,
  flavor_template TEXT NOT NULL,
  objective_template TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 1
)
```
Seeded via `INSERT OR IGNORE` from `DEFAULT_DUNGEON_TEMPLATES` (schema.ts) — 8
rows, 1-2 per `kind` (`maintain`/`stretch`/`discovery`/`restorative`/
`mood_repair`, the same `kind` vocabulary as `quest_templates`/`buildCandidates`),
each with `{category}`/`{minutes}` placeholders, e.g.:
- `maintain` → "{category} Gate" / "A familiar trial. Steady ground, no
  surprises — just {category}." / "Complete a {category} session to hold the
  line."
- `stretch` → "Greater {category} Gate" / "...ready for more {category} than
  usual." / "Push to {minutes} min of {category} before the gate closes."
- `restorative`/`mood_repair` → "Quiet Gate"/"Resting Gate"/"Gentle Gate"
  variants with no pressure/targets.

**`fillDungeonTemplate(candidate)` (questEngine.ts, new)** — picks a random
matching-`kind` row (`ORDER BY RANDOM() LIMIT 1`, falling back to a generic
`{category} Gate` template if `dungeon_templates` is somehow empty), fills
`{category}`/`{minutes}` (defaulting `{minutes}` to 30 if the candidate has
none), and returns `{ name, flavor_text, objective_text, primary_stat:
candidate.attribute, secondary_stat: null }`. `secondary_stat` is always
`null` — `DungeonCard.tsx` already renders `dungeon.secondary_stat?.toUpperCase()
?? '—'`, so this displays cleanly as "—" with no UI change needed.

**Daily Gate rank/duration/coin — reuses existing rank multipliers, "nothing
else" per spec**:
- New `getCurrentDungeonRank(playerLevel)` (game.ts) walks
  `DUNGEON_TIER_INDEX` (E:2...Legend:10) descending and returns the first rank
  where `isDungeonRankUnlocked(rank, playerLevel)` is true, defaulting to
  `'E'`. All 3 Daily Gates in a batch get this single rank.
- Duration: `recommendedDurationMinutes(snapshot, candidate.category,
  candidate.minutes ?? 30) * DUNGEON_RANK_DURATION_MULT[rank]`, `time_mode =
  'duration'` — identical formula to §11.7's live-derived duration for
  ordinary dungeons, just computed once at generation time and frozen (same
  as Extra Gates already did, §13).
- Coin reward at clear time uses the existing `DUNGEON_RANK_COIN_MULT[rank]`
  unchanged (`submitDungeonClear`, §11.1) — no new reward logic.

**Insert shape**: each Daily Gate is `INSERT INTO dungeons (..., is_generated,
is_daily, expires_at) VALUES (..., 1, 1, <start of tomorrow, local>)`. The
vestigial `item_name`/`item_description`/`coin_reward`/`item_drop_chance`/
`difficulty` columns (confirmed unused by actual gameplay — drops come from
`rollDrop(rank, mpUsed)` + `pickSlot(category)`, which has a `'default'`
fallback, §11.3/§11.4) are omitted and left at schema defaults, same as Extra
Gates already did.

**Stale-cleanup mechanism, "except active runs"**: Daily Gates get
`expires_at = start of tomorrow (local)` at generation time. The *next* day's
`generateDailyContent()` call runs `cleanupExpiredDungeons()` first — the
existing `DELETE FROM dungeons WHERE is_generated = 1 AND expires_at <= now
AND id NOT IN (SELECT dungeon_id FROM dungeon_runs WHERE status = 'active')`
(unchanged from §13) — so a Daily Gate the player is mid-run on survives past
midnight until the run resolves (clear/fail/abandon all call
`consumeIfGenerated()`, which deletes the row regardless of `expires_at`,
§15). No new cleanup logic was needed; giving Daily Gates a real `expires_at`
was sufficient to fold them into the existing mechanism.

**Extra Gates (Dungeon Keys) migrated to the same pool**: `useDungeonKey(rank)`
previously cloned a random one of 5 hand-authored `is_generated=0` template
rows (§13). It now does:
```ts
const snapshot = getOrRefreshSnapshot();
const candidate = weightedSample(buildCandidates(snapshot), 1)[0];
const { name, flavor_text, objective_text, primary_stat, secondary_stat } = fillDungeonTemplate(candidate);
const recommended = recommendedDurationMinutes(snapshot, candidate.category, candidate.minutes ?? 30);
const durationMins = Math.round(recommended * (DUNGEON_RANK_DURATION_MULT[rank] ?? 1.0));
```
Everything downstream — the 1-10 day / 1-3 day (`HIGH_TIER_RANKS`) random
`expires_at`, Key inventory decrement, `last_key_used_at` cooldown stamp,
Right-ownership check — is unchanged from §13. Net effect: Daily Gates and
Extra Gates are now generated by the exact same code path
(`buildCandidates` → `weightedSample` → `fillDungeonTemplate` →
`recommendedDurationMinutes`), differing only in *rank source* (current
unlocked rank vs. the specific Key's rank), *expiry* (tomorrow vs. random
multi-day), and the `is_daily` flag.

**Removed entirely**:
- The 5 old `is_generated=0` dungeon rows (Hunter's Run, Iron Will, Intel
  Report, Sacred Grounds, Mirror Protocol — migration v10, confirmed
  Kevin-personal test content) and their `dungeon_runs` rows:
  ```sql
  DELETE FROM dungeon_runs WHERE dungeon_id IN (SELECT id FROM dungeons WHERE is_generated = 0);
  DELETE FROM dungeons WHERE is_generated = 0;
  ```
- `quest_type = 'weekly'` rows: `DELETE FROM quests WHERE quest_type = 'weekly'`.
- The "E-RANK GATES" UI section in `app/(tabs)/game.tsx` (was
  `dungeons.filter(d => !d.is_generated)`) — gone, since no permanent
  `is_generated=0` dungeons exist anymore.

**New UI structure** (`app/(tabs)/game.tsx`): "DAILY GATES"
(`dungeons.filter(d => d.is_generated && d.is_daily)`) always renders; "EXTRA
GATES" (`dungeons.filter(d => d.is_generated && !d.is_daily)`) only renders
its heading when at least one exists (`dungeons.some(...)`). Both use the
same `DungeonCard` + `getDungeonExpiryRemaining` + rarity-info-sheet wiring as
before.

**Time mode note**: all Daily Gates and Extra Gates are `time_mode='duration'`
— `fillDungeonTemplate`'s templates are all phrased as "spend N minutes of
{category}" (mirroring `DEFAULT_QUEST_TEMPLATES`'s engine-safety guarantee,
§11.7), so `withLiveDuration()`'s `time_mode='time_trial'` branch is now
unreachable for any *generated* dungeon — it remains reserved for
hand-authored exceptions, of which none currently exist post-migration.

**Schema migration v48 summary** (schema.ts): creates `dungeon_templates` +
seeds `DEFAULT_DUNGEON_TEMPLATES`; `ALTER TABLE dungeons ADD COLUMN is_daily
INTEGER NOT NULL DEFAULT 0`; `ALTER TABLE rpg_state ADD COLUMN
last_daily_gen_date TEXT`; deletes the 5 old templates + their runs; deletes
`quest_type='weekly'` quests.

**Verification**: `npx tsc --noEmit` clean across `rpg.ts`, `schema.ts`,
`questEngine.ts`, `game.ts`, `game.tsx` (pre-existing, unrelated `suitup.tsx`
errors — `Rarity`/`RARITY_COLOR`/`RARITY_BG` not found — left untouched, see
`[[demo_and_customisation]]`). No runtime/simulator testing performed yet for
this feature.

## 18. AS-BUILT LOG — Q3 redesign: categorized hobby/practice picker, 2026-06-12

**What changed**: Q3 (`onboarding_answers.q3_creative`) went from a single
yes/no music/creative pick (6 options) to a multi-select hobby picker capped
at 3, organized into 6 clusters (Music & Sound, Visual Arts & Crafts, Writing
& Words, Movement & Performance, Culinary, Games & Making — 24 named hobbies
total). Each cluster has its own `Other` chip; picking it reveals a text input
for a custom hobby name.

**Type change**: `q3_creative?: string | null` → `q3_creative?: Q3Pick[]`
where `Q3Pick = { key: string; custom?: string }`. `key` is either a Q3_MAP
hobby key or a cluster sentinel `"<Cluster>:Other"`; `custom` holds the typed
name for `:Other` picks. `src/db/onboarding.ts`'s `deriveQ3()` resolves both
forms into `InterestTagMapping`s — named hobbies via the expanded `Q3_MAP`,
`:Other` picks via `Q3_OTHER_DEFAULTS[cluster]` with the custom name (or
`"<Cluster> Practice"` if left blank) substituted into `categoryName` and
`loggableTemplate`. Both feed the same additive, dedup-by-categoryName path in
`deriveAndApplyAnswers` as every other Q1b/Q2/Q5 mapping — no special-casing.

**Backward compatibility**: pre-redesign saved answers may have `q3_creative`
as a string or `null`. `deriveQ3()` and both UI screens guard with
`Array.isArray(answers.q3_creative) ? answers.q3_creative : []`, so old values
are silently ignored (no crash, no migration) — acceptable since this is local
dev/test data, not production user data.

**UI**: `app/onboarding.tsx` and `app/quest-preferences.tsx` both render
`Q3_CLUSTERS` (questionBank.ts) the same way Q1 renders `Q1_CLUSTERS` —
per-cluster chip groups plus an `Other` chip; selecting `Other` reveals a
`TextInput` (new `customInput` style) bound to that pick's `custom` field, so
the typed name is visible immediately and pre-filled/editable later in Quest
Preferences.

**Verification**: `npx tsc --noEmit` clean. No runtime/simulator testing
performed yet for this feature.
