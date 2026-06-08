// Onboarding — persistence + lookup-table derivation logic.
// Source of truth for the question bank / lookup table / formulas: ONBOARDING_QUEST_SPEC.md
//
// `onboarding_answers` is a singleton (id=1, mirrors rpg_state/health_state) holding the
// raw Q1-Q8 responses as a JSON blob. categories/custom_moods/restorative_activities get
// DERIVED from these answers via the lookup table below — never generated-once-and-discarded.
// This is what makes "retain on reset," "redo," and the Quest Preferences page all work
// off the same source of truth (ONBOARDING_QUEST_SPEC.md §9/§10).

import { db } from './schema';
import { addCategory, getCategories } from './categories';
import { addRestorativeActivity, getRestorativeActivities } from './health';
import { getRPGState } from './rpg';

// ─── Types ────────────────────────────────────────────────────────────────────

// DB storage keys for the 7 attributes (categories.attribute / VALID_ATTRIBUTES in game.ts).
// Spec §2 uses the friendly names "perception"/"stamina" — they store as per_stat/sta_stat.
export type AttributeKey = 'strength' | 'wisdom' | 'focus' | 'agility' | 'resilience' | 'per_stat' | 'sta_stat';

export type Q1bIntent = 'deeper' | 'both' | 'branch';

export type OnboardingAnswers = {
  q1_fields?: string[];          // Q1 — up to 2 cluster-domain picks (or 'Other')
  q1b_intent?: Q1bIntent;        // Q1b — 3-way intent axis
  q1b_subtopic?: string;         // Q1b follow-up — only when intent is 'deeper' or 'both'
  q2_exercise?: 'daily' | 'few_times_week' | 'rarely' | 'never_want_to';
  q3_creative?: string | null;   // 'Guitar' | 'Piano' | 'Writing' | 'Drawing' | 'Production' | 'Other' | null
  q4_unwind?: string[];          // multi-select — feeds restoratives, not categories
  q5_track?: string[];           // multi-select, cap ~5 — feeds categories via lookup table
  q6_hours_per_day?: number;     // 0.5–6+ in 0.5 steps — base-XP calibration input
  q7_difficulty_bias?: number;   // -1 (gentle) .. 0 (balanced) .. 1 (push me)
  q8_personalization?: boolean;  // Insights consent gate
};

export type OnboardingRecord = {
  answers: OnboardingAnswers;
  completed_at: string | null;
  updated_at: string | null;
};

type InterestTagMapping = {
  categoryName: string;
  weight: number;
  attribute: AttributeKey;
  isPhysical: 0 | 1;
  isRecreational: 0 | 1;
  questThemeTags: string[];
  loggableTemplate: string;
};

// ─── Persistence (singleton row, mirrors rpg_state/health_state pattern) ─────

function nowISO(): string {
  return new Date().toISOString();
}

export function getOnboardingAnswers(): OnboardingRecord {
  const row = db.getFirstSync<{ answers: string; completed_at: string | null; updated_at: string | null }>(
    'SELECT answers, completed_at, updated_at FROM onboarding_answers WHERE id = 1',
  );
  if (!row) return { answers: {}, completed_at: null, updated_at: null };
  let parsed: OnboardingAnswers = {};
  try { parsed = JSON.parse(row.answers) ?? {}; } catch {}
  return { answers: parsed, completed_at: row.completed_at, updated_at: row.updated_at };
}

// Upserts the singleton row. `complete: true` stamps completed_at (only on first
// completion — re-saves via Quest Preferences don't reset the original timestamp).
export function saveOnboardingAnswers(answers: OnboardingAnswers, complete: boolean): void {
  const existing = db.getFirstSync<{ completed_at: string | null }>(
    'SELECT completed_at FROM onboarding_answers WHERE id = 1',
  );
  const completedAt = complete ? (existing?.completed_at ?? nowISO()) : (existing?.completed_at ?? null);
  db.runSync(
    `INSERT INTO onboarding_answers (id, answers, completed_at, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET answers = excluded.answers, completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
    JSON.stringify(answers), completedAt, nowISO(),
  );
}

// Empty-account check — ONE objective rule, no special-casing. A fresh install
// (or a freshly-reset account) has zero XP, sits at level 1, and has no logs yet.
// This naturally resolves correctly for everyone: a brand-new player sees onboarding;
// an account with any real history (regardless of whose it is) does not.
function isAccountEmpty(): boolean {
  const rpg = getRPGState();
  if (rpg.current_level > 1 || rpg.total_xp > 0) return false;
  const row = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM activity_logs');
  return (row?.c ?? 0) === 0;
}

export function shouldShowOnboarding(): boolean {
  const { completed_at } = getOnboardingAnswers();
  if (completed_at) return false;
  return isAccountEmpty();
}

// ─── Weight-assignment formula (ONBOARDING_QUEST_SPEC.md §4, LOCKED 2026-06-09) ──
//   weight = round(tier_base × intent_multiplier), clamped to the existing 1-20 scale

const TIER_BASE = {
  q2Exercise: 16,
  q1bDeeper: 14,
  q3Creative: 11,
  q5Track: 9,
  q1bBoth: 8,
} as const;

const INTENT_MULTIPLIER = {
  high: 1.0,     // "Daily," "Go deeper," explicit yes/active-pick signals
  moderate: 0.75,// "A few times a week," "A bit of both"
  low: 0.5,      // "Rarely, but I'd like to"
} as const;

function computeWeight(tierBase: number, multiplier: number): number {
  return Math.max(1, Math.min(20, Math.round(tierBase * multiplier)));
}

// ─── Lookup table — Q1b per-cluster subtopics (ONBOARDING_QUEST_SPEC.md §4) ──────
// Category/attribute/template stay identical across intent levels; only weight and
// questThemeTags change (full compulsory-weekly tag vs. lightened tag + discovery boost).

type Q1bSubtopicMapping = {
  categoryName: string;
  attribute: AttributeKey;
  isPhysical: 0 | 1;
  isRecreational: 0 | 1;
  loggableTemplate: string;
  topicTag: string;
};

const Q1B_SUBTOPIC_MAP: Record<string, Record<string, Q1bSubtopicMapping>> = {
  'Knowledge fields': {
    'Industry news/trends': { categoryName: 'Industry Pulse', attribute: 'per_stat', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Read or skim industry news (10–15 min)', topicTag: 'industry-news' },
    'Skill-building/certs': { categoryName: 'Skill Building', attribute: 'focus', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Study or practice a work-related skill (20–30 min)', topicTag: 'upskilling' },
    'Networking': { categoryName: 'Networking', attribute: 'per_stat', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Reach out to or check in with a professional contact', topicTag: 'networking' },
  },
  'Hands-on/Physical': {
    'Trade technique': { categoryName: 'Hands-On Practice', attribute: 'agility', isPhysical: 1, isRecreational: 0, loggableTemplate: 'Practice or refine a hands-on technique (20–30 min)', topicTag: 'trade-practice' },
    'People skills': { categoryName: 'People Skills', attribute: 'per_stat', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Practice a people-facing interaction or conversation (15 min)', topicTag: 'people-skills' },
    'Physical conditioning': { categoryName: 'Conditioning', attribute: 'sta_stat', isPhysical: 1, isRecreational: 0, loggableTemplate: 'Do a conditioning or fitness session (20–30 min)', topicTag: 'physical-stretch' },
  },
  'Creative/Comms': {
    'Craft practice': { categoryName: 'Craft Practice', attribute: 'resilience', isPhysical: 0, isRecreational: 1, loggableTemplate: 'Spend focused time on your craft (20–30 min)', topicTag: 'creative-practice' },
    'Industry trends': { categoryName: 'Creative Trends', attribute: 'per_stat', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Browse or study current trends in your field (10–15 min)', topicTag: 'industry-news' },
    'Personal portfolio work': { categoryName: 'Portfolio Work', attribute: 'focus', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Work on a personal portfolio piece (20–30 min)', topicTag: 'portfolio-building' },
  },
  'Life-stage': {
    'Personal growth': { categoryName: 'Personal Growth', attribute: 'resilience', isPhysical: 0, isRecreational: 1, loggableTemplate: 'Spend time on a personal-growth practice (10–15 min)', topicTag: 'personal-growth' },
    'Routine/organization': { categoryName: 'Routine & Organization', attribute: 'focus', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Tend to a routine or organizational task (15 min)', topicTag: 'organization' },
    'New skills/exploration': { categoryName: 'New Skills', attribute: 'wisdom', isPhysical: 0, isRecreational: 0, loggableTemplate: 'Try or explore something new (15–20 min)', topicTag: 'discovery' },
  },
};

function deriveQ1b(answers: OnboardingAnswers): InterestTagMapping[] {
  const { q1b_intent, q1b_subtopic } = answers;
  if (!q1b_intent || q1b_intent === 'branch' || !q1b_subtopic) return [];

  let m: Q1bSubtopicMapping | undefined;
  for (const cluster of Object.values(Q1B_SUBTOPIC_MAP)) {
    if (cluster[q1b_subtopic]) { m = cluster[q1b_subtopic]; break; }
  }
  if (!m) return [];

  const deeper = q1b_intent === 'deeper';
  const weight = deeper
    ? computeWeight(TIER_BASE.q1bDeeper, INTENT_MULTIPLIER.high)
    : computeWeight(TIER_BASE.q1bBoth, INTENT_MULTIPLIER.moderate);
  const questThemeTags = deeper
    ? ['compulsory-weekly', m.topicTag]
    : ['light-compulsory', 'discovery', m.topicTag];

  return [{
    categoryName: m.categoryName, weight, attribute: m.attribute,
    isPhysical: m.isPhysical, isRecreational: m.isRecreational,
    questThemeTags, loggableTemplate: m.loggableTemplate,
  }];
}

// ─── Lookup table — Q2 exercise frequency (weight scale anchored to existing
// `Exercise` baseline weight=14 during design; kept as its own explicit scale —
// the §4 formula governs the question sources below where no prior numbers existed) ──

const Q2_MAP: Record<string, InterestTagMapping> = {
  daily: {
    categoryName: 'Exercise', weight: 18, attribute: 'strength', isPhysical: 1, isRecreational: 0,
    questThemeTags: ['compulsory-weekly', 'physical-stretch'],
    loggableTemplate: '', // their own logged description, scaled — see §6 target-derivation
  },
  few_times_week: {
    categoryName: 'Exercise', weight: 13, attribute: 'strength', isPhysical: 1, isRecreational: 0,
    questThemeTags: ['physical-stretch'], loggableTemplate: '',
  },
  rarely: {
    categoryName: 'Exercise', weight: 8, attribute: 'strength', isPhysical: 1, isRecreational: 0,
    questThemeTags: ['physical-stretch', 'discovery'], loggableTemplate: '',
  },
  never_want_to: {
    categoryName: 'Exercise', weight: 6, attribute: 'strength', isPhysical: 1, isRecreational: 0,
    questThemeTags: ['discovery'], loggableTemplate: '',
  },
};

// ─── Lookup table — Q3 creative/instrument (tier_base 11 × 1.0 — an explicit
// "yes I do this" answer is full-commitment signal) ───────────────────────────

const Q3_MAP: Record<string, InterestTagMapping> = {
  'Guitar':     { categoryName: 'Guitar Practice',   weight: 11, attribute: 'agility',    isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice'], loggableTemplate: 'Practice guitar (15–20 min)' },
  'Piano':      { categoryName: 'Piano Practice',    weight: 11, attribute: 'agility',    isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice'], loggableTemplate: 'Practice piano (15–20 min)' },
  'Writing':    { categoryName: 'Creative Writing',  weight: 11, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice'], loggableTemplate: 'Write creatively for a bit (15–20 min)' },
  'Drawing':    { categoryName: 'Drawing Practice',  weight: 11, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice'], loggableTemplate: 'Sketch or draw freely (15–20 min)' },
  'Production': { categoryName: 'Music Production',  weight: 11, attribute: 'focus',      isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice'], loggableTemplate: 'Work on a music production project (20–30 min)' },
  'Other':      { categoryName: 'Creative Practice', weight: 11, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['creative-practice', 'discovery'], loggableTemplate: 'Spend time on your creative practice (15–20 min)' },
};

// ─── Lookup table — Q5 "what else do you want to track" (tier_base 9 × 1.0 —
// picking it FROM the curated list IS the commitment signal, not aspirational) ──

const Q5_MAP: Record<string, InterestTagMapping> = {
  'Journaling/Writing':          { categoryName: 'Journal',            weight: 9, attribute: 'resilience', isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'reflection'],      loggableTemplate: 'Free-write or reflect (10 min)' },
  'Cooking/Meal prep':           { categoryName: 'Cooking & Meal Prep',weight: 9, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['discovery', 'self-care'],       loggableTemplate: 'Cook or prep a meal with intention (20–30 min)' },
  'Side projects/Coding':        { categoryName: 'Side Projects',      weight: 9, attribute: 'focus',      isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'creative-practice'], loggableTemplate: 'Work on a side project (20–30 min)' },
  'Spiritual practice':          { categoryName: 'Spiritual Practice', weight: 9, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['discovery', 'reflection'],      loggableTemplate: 'Spend a few minutes in spiritual practice or reflection (10 min)' },
  'Life admin':                  { categoryName: 'Life Admin',         weight: 9, attribute: 'focus',      isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'organization'],    loggableTemplate: 'Knock out a small admin task (10–15 min)' },
  'Social/Relationships':        { categoryName: 'Social Connection',  weight: 9, attribute: 'per_stat',   isPhysical: 0, isRecreational: 1, questThemeTags: ['discovery', 'people-skills'],   loggableTemplate: 'Reach out to or spend time with someone you care about' },
  'Language learning':           { categoryName: 'Language Practice',  weight: 9, attribute: 'wisdom',     isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'upskilling'],      loggableTemplate: 'Practice a language for a bit (15 min)' },
  'Instrument practice':         { categoryName: 'Instrument Practice',weight: 9, attribute: 'agility',    isPhysical: 0, isRecreational: 1, questThemeTags: ['discovery', 'creative-practice'], loggableTemplate: 'Practice an instrument (15–20 min)' },
  'Art/Design':                  { categoryName: 'Art & Design',       weight: 9, attribute: 'resilience', isPhysical: 0, isRecreational: 1, questThemeTags: ['discovery', 'creative-practice'], loggableTemplate: 'Spend time sketching, designing, or making something (15–20 min)' },
  'Volunteering':                { categoryName: 'Volunteering',       weight: 9, attribute: 'per_stat',   isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'community'],       loggableTemplate: 'Spend time on a volunteering or community activity' },
  'Personal finance/Budgeting':  { categoryName: 'Budgeting',          weight: 9, attribute: 'focus',      isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'organization'],    loggableTemplate: 'Review or plan your budget or finances (10–15 min)' },
  'Career development':          { categoryName: 'Career Development', weight: 9, attribute: 'focus',      isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery', 'upskilling'],      loggableTemplate: 'Spend time on a career-development task (15–20 min)' },
  'Health/Self-care routines':   { categoryName: 'Self-Care',          weight: 9, attribute: 'resilience', isPhysical: 1, isRecreational: 1, questThemeTags: ['discovery', 'self-care'],       loggableTemplate: 'Spend time on a self-care routine (10–15 min)' },
  'Pet care':                    { categoryName: 'Pet Care',           weight: 9, attribute: 'resilience', isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery'],                    loggableTemplate: 'Spend quality time caring for your pet (10–15 min)' },
  'Home/DIY projects':           { categoryName: 'Home Projects',      weight: 9, attribute: 'agility',    isPhysical: 1, isRecreational: 0, questThemeTags: ['discovery', 'organization'],    loggableTemplate: 'Work on a home or DIY project (20–30 min)' },
  'Travel planning':             { categoryName: 'Travel Planning',    weight: 9, attribute: 'per_stat',   isPhysical: 0, isRecreational: 0, questThemeTags: ['discovery'],                    loggableTemplate: 'Spend time planning or researching a trip (10–15 min)' },
};

// ─── Lookup table — Q4 unwind → restoratives (NOT categories). Baseline already
// covers the most universal unwind types (Scroll/Music/Watch something/Walk/Talk/
// Sleep/Meal) — Q4 only ADDS net-new ones so we don't create near-duplicates. ──

type RestorativeMapping = { name: string; description: string; cost: number; e: number; p: number; m: number };

const Q4_MAP: Record<string, RestorativeMapping | null> = {
  'Movies/TV': null,               // covered by baseline "Watch something"
  'Gaming': { name: 'Game', description: 'Play a game', cost: 55, e: 0, p: 0, m: 5 },
  'Music': null,                   // covered by baseline "Music"
  'Reading': { name: 'Read for pleasure', description: 'Read something just for you', cost: 40, e: 5, p: 0, m: 5 },
  'Socializing': null,             // covered by baseline "Talk"
  'Walking/Outdoors': null,        // covered by baseline "Walk"
  'Sleep/Napping': null,           // covered by baseline "Sleep"/"Good sleep"
  'Food/Cooking': { name: 'Cook something nice', description: 'Cook or bake just for the joy of it', cost: 35, e: 5, p: 0, m: 0 },
  'Bath/Self-care': { name: 'Bath or self-care', description: 'Shower, bath, or a self-care routine', cost: 25, e: 5, p: 0, m: 5 },
  'Browsing/Shopping': { name: 'Browse or window-shop', description: 'No-pressure browsing or window-shopping', cost: 30, e: 5, p: 0, m: 0 },
  'Scrolling social media': null,  // covered by baseline "Scroll"
  'Meditation/Mindfulness': { name: 'Meditate or breathe', description: 'A few minutes of meditation or breathing', cost: 20, e: 5, p: 0, m: 5 },
  'Pets/Animals': { name: 'Time with a pet', description: 'Spend time with an animal you love', cost: 20, e: 10, p: 0, m: 0 },
  'Crafting/Hobbies': { name: 'Hobby time', description: 'No-pressure time on a hobby project', cost: 40, e: 5, p: 0, m: 5 },
  'Spiritual practice': { name: 'Spiritual practice', description: 'Quiet time in spiritual practice or reflection', cost: 25, e: 5, p: 0, m: 5 },
};

// ─── Derivation — applies answers on top of the Layer-1 baseline ─────────────
// Additive only: never replaces baseline rows, never duplicates existing names.
// This is what Layer 2 ("Lookup-table answers") means in the spec's layered-fallback
// model — sparse answers degrade gracefully, no branching needed for "what's missing."

export function deriveAndApplyAnswers(answers: OnboardingAnswers): void {
  const mappings: InterestTagMapping[] = [
    ...deriveQ1b(answers),
    ...(answers.q2_exercise ? [Q2_MAP[answers.q2_exercise]] : []),
    ...(answers.q3_creative ? [Q3_MAP[answers.q3_creative]] : []),
    ...(answers.q5_track ?? []).map(tag => Q5_MAP[tag]).filter((m): m is InterestTagMapping => !!m),
  ].filter((m): m is InterestTagMapping => !!m);

  const existingCategoryNames = new Set(getCategories().map(c => c.name));
  for (const m of mappings) {
    if (existingCategoryNames.has(m.categoryName)) continue; // additive only — never duplicate
    addCategory(m.categoryName, m.weight, m.attribute, !!m.isPhysical, !!m.isRecreational, false);
    existingCategoryNames.add(m.categoryName);
  }

  const existingRestorativeNames = new Set(getRestorativeActivities().map(r => r.name));
  for (const tag of answers.q4_unwind ?? []) {
    const r = Q4_MAP[tag];
    if (!r || existingRestorativeNames.has(r.name)) continue;
    addRestorativeActivity(r.name, r.description, r.cost, r.e, r.p, r.m);
    existingRestorativeNames.add(r.name);
  }
}

// Full pipeline: persist raw answers (source of truth) then derive+apply on top
// of the baseline. Used by the onboarding flow itself, "retain" on reset, and redo.
export function completeOnboarding(answers: OnboardingAnswers): void {
  saveOnboardingAnswers(answers, true);
  deriveAndApplyAnswers(answers);
}
