// Q1-Q8 question-bank copy (ONBOARDING_QUEST_SPEC.md §3) — shared between the
// onboarding wizard (app/onboarding.tsx) and the Quest Preferences edit form
// (app/quest-preferences.tsx) so both surfaces show identical wording/options.
// Wording/options are tunable per the spec ("v1, tune freely") — edit here only.

import type { OnboardingAnswers, Q1bIntent } from '../../db/onboarding';

export const Q1_CLUSTERS: { cluster: string; domains: string[] }[] = [
  { cluster: 'Knowledge fields', domains: ['Tech/Engineering', 'Business/Finance/Economics', 'Healthcare/Medicine', 'Education/Academia', 'Science/Research', 'Law/Legal', 'Government/Public service'] },
  { cluster: 'Hands-on/Physical', domains: ['Trades/Construction', 'Hospitality/Service', 'Sports/Athletics/Fitness industry'] },
  { cluster: 'Creative/Comms', domains: ['Creative/Arts/Design', 'Marketing/Media/Comms', 'Retail/Sales', 'Content creation/Influencing', 'Advertising'] },
  { cluster: 'Life-stage', domains: ['Student', 'Homemaker/Caregiver', 'Retired', 'Between roles/Exploring'] },
];
export const Q1_OTHER = 'Other';
export const Q1_CAP = 2;

export const DOMAIN_TO_CLUSTER: Record<string, string> = {};
for (const { cluster, domains } of Q1_CLUSTERS) for (const d of domains) DOMAIN_TO_CLUSTER[d] = cluster;

export const Q1B_SUBTOPICS: Record<string, string[]> = {
  'Knowledge fields': ['Industry news/trends', 'Skill-building/certs', 'Networking'],
  'Hands-on/Physical': ['Trade technique', 'People skills', 'Physical conditioning'],
  'Creative/Comms': ['Craft practice', 'Industry trends', 'Personal portfolio work'],
  'Life-stage': ['Personal growth', 'Routine/organization', 'New skills/exploration'],
};

export const INTENT_OPTIONS: { key: Q1bIntent; label: string; hint: string }[] = [
  { key: 'deeper', label: 'Go deeper in my field', hint: 'Adds a focused weekly habit built around it' },
  { key: 'both', label: 'A bit of both', hint: 'A lighter nudge, plus room to explore elsewhere' },
  { key: 'branch', label: 'Branch out — surprise me', hint: "Skips work-linked habits — you'll get discovery quests instead" },
];

export const Q2_OPTIONS: { key: NonNullable<OnboardingAnswers['q2_exercise']>; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'few_times_week', label: 'A few times a week' },
  { key: 'rarely', label: 'Rarely' },
  { key: 'never_want_to', label: "Never, but I'd like to" },
];

export const Q3_CLUSTERS: { cluster: string; hobbies: string[] }[] = [
  { cluster: 'Music & Sound', hobbies: ['Guitar', 'Piano', 'Drums', 'Singing', 'Music Production'] },
  { cluster: 'Visual Arts & Crafts', hobbies: ['Drawing', 'Painting', 'Crochet & Knitting', 'Sewing & Textiles', 'Pottery & Ceramics', 'Photography'] },
  { cluster: 'Writing & Words', hobbies: ['Creative Writing', 'Poetry', 'Content Writing'] },
  { cluster: 'Movement & Performance', hobbies: ['Dance', 'Yoga & Pilates', 'Martial Arts', 'Acting & Theatre'] },
  { cluster: 'Culinary', hobbies: ['Baking', 'Cooking'] },
  { cluster: 'Games & Making', hobbies: ['Chess & Strategy Games', 'Tabletop & Board Games', 'Woodworking & Model Building', 'Gardening'] },
];
export const Q3_OTHER = 'Other';
export const Q3_CAP = 3;
export const q3OtherKey = (cluster: string) => `${cluster}:Other`;

export const Q4_OPTIONS = [
  'Movies/TV', 'Gaming', 'Music', 'Reading', 'Socializing', 'Walking/Outdoors',
  'Sleep/Napping', 'Food/Cooking', 'Bath/Self-care', 'Browsing/Shopping',
  'Scrolling social media', 'Meditation/Mindfulness', 'Pets/Animals', 'Crafting/Hobbies',
  'Spiritual practice',
];

export const Q5_OPTIONS = [
  'Journaling/Writing', 'Cooking/Meal prep', 'Side projects/Coding', 'Spiritual practice',
  'Life admin', 'Social/Relationships', 'Language learning', 'Instrument practice',
  'Art/Design', 'Volunteering', 'Personal finance/Budgeting', 'Career development',
  'Health/Self-care routines', 'Pet care', 'Home/DIY projects', 'Travel planning',
];
export const Q5_CAP = 5;

export const Q7_LABELS = ['Gentle', 'Balanced', 'Push me'];
