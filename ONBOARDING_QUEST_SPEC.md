# Onboarding & Adaptive Quest Engine — Working Spec

Status: DESIGN DRAFT — not yet implemented. Edit freely; this is the living source of truth
for the onboarding question bank, the interest→category lookup table, and the quest-generation
engine. Once implementation starts, keep this in sync with the code (see CLAUDE memory
`feedback_log_before_coding`).

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

### Q3 — "Do you play music or do creative work?" (yes/no → tag pick if yes)
`Guitar` / `Piano` / `Writing` / `Drawing` / `Production` / `Other`

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
| Q3 (creative/instrument) | 11 | Named hobby — meaningful but secondary to declared priorities |
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

#### Q3 — creative/instrument pick (yes/no → tag; tier_base 11 × 1.0 — an explicit
"yes I do this" answer is full-commitment signal, weight = 11 across the board)

| Answer | categoryName | attribute | phys/rec | loggableTemplate | weight | questThemeTags |
|---|---|---|---|---|---|---|
| `Guitar` | Guitar Practice | agility | 0/1 | "Practice guitar (15–20 min)" | 11 | `creative-practice` |
| `Piano` | Piano Practice | agility | 0/1 | "Practice piano (15–20 min)" | 11 | `creative-practice` |
| `Writing` | Creative Writing | resilience | 0/1 | "Write creatively for a bit (15–20 min)" | 11 | `creative-practice` |
| `Drawing` | Drawing Practice | resilience | 0/1 | "Sketch or draw freely (15–20 min)" | 11 | `creative-practice` |
| `Production` | Music Production | focus | 0/1 | "Work on a music production project (20–30 min)" | 11 | `creative-practice` |
| `Other` | Creative Practice | resilience | 0/1 | "Spend time on your creative practice (15–20 min)" | 11 | `creative-practice`,`discovery` |

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

**Total: 12 Q1b subtopics (×2 intent variants = 24 logical mappings) + 4 Q2 + 6 Q3
+ 16 Q5 = 50 entries, covering every single answer option in the §3 question bank.**
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
