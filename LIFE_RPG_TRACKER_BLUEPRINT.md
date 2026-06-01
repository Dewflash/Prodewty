# ⚔️ LIFE RPG TRACKER — Project Blueprint
### *Turn your real life into a Solo Leveling dashboard*

> **Who this is for:** You. A solo developer (with AI doing the heavy lifting) building a personal iOS productivity app with RPG mechanics. Local-first. Python-friendly. Designed to scale into SaaS later without a full rewrite.

---

## Table of Contents

1. [What You're Building](#1-what-youre-building)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Project Folder Structure](#3-project-folder-structure)
4. [Database Schema](#4-database-schema)
5. [The 5 Pages — Spec by Spec](#5-the-5-pages)
6. [The XP & Leveling Engine](#6-the-xp--leveling-engine)
7. [The AI Recommendation Engine](#7-the-ai-recommendation-engine)
8. [Colour & Theme System (Customisable)](#8-colour--theme-system)
9. [Build Order (What to Build First)](#9-build-order)
10. [iOS Deployment (Local → TestFlight → App Store)](#10-ios-deployment)
11. [Scaling to SaaS Later](#11-scaling-to-saas-later)
12. [Glossary for Beginners](#12-glossary)

---

## 1. What You're Building

A **5-page iOS app** that is equal parts:

- **Productivity tracker** — log activities, mood, time spent
- **RPG dashboard** — earn XP, level up, allocate stat points, clear dungeons
- **AI strategist** — surface patterns and recommendations from your own data

The core philosophy: **logging must be frictionless, rewards must feel real.**

### The 5 Pages at a Glance

| # | Page | One-line Purpose |
|---|------|-----------------|
| 1 | 🏠 Home | Quick-log activities in 2 taps |
| 2 | 📊 Stats | Visual performance mirror + player card |
| 3 | 📅 Journal / Calendar | Mood calendar + daily detail view |
| 4 | ⚔️ Game | RPG attributes, dungeons, titles |
| 5 | 🤖 Recommendations | AI-driven insight cards from your data |

---

## 2. Tech Stack Decision

Given you know Python basics and are targeting iOS (local-first), this is the recommended stack.

### Frontend (The App UI)
**React Native + Expo**

- Builds a real native iOS app from JavaScript/TypeScript
- Expo handles the iOS build toolchain so you don't need to wrestle with Xcode
- Hot reload — change a colour, see it instantly on your phone
- One codebase for iOS (and Android later if you want)

> **Why not Swift/SwiftUI?** You'd need to learn a whole new language. React Native lets AI generate and iterate much faster, and Expo ships to iOS without a Mac developer account for local testing.

### Backend (The Brain)
**Python + FastAPI**

- You already know Python — this is just Python with a web server wrapper
- FastAPI auto-generates API documentation (great for understanding what each endpoint does)
- Runs locally on your machine; the app talks to it over your home WiFi

### Database (Where Data Lives)
**SQLite (local) → PostgreSQL (SaaS)**

- SQLite: a single file on your computer, zero setup, perfect for solo use
- Swap to PostgreSQL when you want multi-user SaaS — the code barely changes

### AI / Embeddings
**OpenAI API (text-embedding-3-small) + ChromaDB**

- OpenAI embeddings convert your activity logs into vectors (mathematical fingerprints)
- ChromaDB stores those vectors locally and can find similar ones — this powers recommendations
- Cost: fractions of a cent per log entry

### Summary Table

| Layer | Technology | Why |
|-------|-----------|-----|
| App UI | React Native + Expo | Python-friendly, iOS-native output |
| API Server | Python + FastAPI | You know Python; fast to build |
| Database | SQLite → PostgreSQL | Zero setup locally; scalable |
| Vector Store | ChromaDB | Local-first embeddings |
| AI Embeddings | OpenAI API | Cheap, best-in-class |
| Charts | Victory Native | Best charting lib for React Native |

---

## 3. Project Folder Structure

```
life-rpg-tracker/
│
├── app/                        ← React Native frontend (what you see)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx          ← Page 1: Quick logger
│   │   │   ├── StatsScreen.tsx         ← Page 2: Charts + player card
│   │   │   ├── JournalScreen.tsx       ← Page 3: Calendar + mood
│   │   │   ├── GameScreen.tsx          ← Page 4: RPG attributes + dungeons
│   │   │   └── RecommendationsScreen.tsx  ← Page 5: AI insight cards
│   │   │
│   │   ├── components/
│   │   │   ├── PlayerCard.tsx          ← The XP bar / level badge
│   │   │   ├── QuickTapGrid.tsx        ← The preset activity buttons
│   │   │   ├── MoodSlider.tsx          ← Emoji mood selector
│   │   │   ├── XPPopup.tsx             ← "+50 XP" micro-animation
│   │   │   ├── DungeonCard.tsx         ← Dungeon challenge cards
│   │   │   └── InsightCard.tsx         ← AI recommendation cards
│   │   │
│   │   ├── theme/
│   │   │   ├── colors.ts               ← ALL colour variables here (easy to change)
│   │   │   ├── typography.ts           ← Font sizes and weights
│   │   │   └── spacing.ts              ← Padding/margin system
│   │   │
│   │   ├── api/
│   │   │   └── client.ts               ← All calls to the backend go here
│   │   │
│   │   └── store/
│   │       └── useAppStore.ts          ← Global state (Zustand)
│   │
│   ├── app.json                        ← Expo config
│   └── package.json
│
├── backend/                    ← Python FastAPI server (the brain)
│   ├── main.py                         ← Entry point; starts the server
│   ├── database.py                     ← SQLite connection
│   ├── models.py                       ← Database table definitions
│   │
│   ├── routers/
│   │   ├── logs.py                     ← POST /logs, GET /logs
│   │   ├── stats.py                    ← GET /stats/weekly, /stats/monthly
│   │   ├── rpg.py                      ← GET /rpg/state, POST /rpg/allocate
│   │   ├── dungeons.py                 ← GET /dungeons, POST /dungeons/complete
│   │   └── recommendations.py         ← GET /recommendations
│   │
│   ├── services/
│   │   ├── xp_engine.py                ← XP calculation logic
│   │   ├── rpg_engine.py               ← Leveling + stat allocation
│   │   ├── embedding_service.py        ← Converts logs → vectors
│   │   └── recommendation_engine.py   ← Finds patterns, generates insights
│   │
│   └── requirements.txt                ← Python dependencies
│
└── README.md                   ← Setup instructions
```

---

## 4. Database Schema

Three clean, decoupled tables. The Activity Logs table doesn't know anything about your RPG stats. They communicate only through a service layer.

### Table 1: `activity_logs`
*The raw truth. Every log you ever create lives here.*

```sql
CREATE TABLE activity_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER DEFAULT 1,          -- Always 1 for solo use; multi-user ready
    created_at      DATETIME DEFAULT NOW(),
    category        TEXT NOT NULL,              -- "fitness", "coding", "reading", etc.
    description     TEXT,                       -- Free text: "ran 5km at Bedok reservoir"
    duration_mins   INTEGER,                    -- How long (optional)
    mood_rating     INTEGER CHECK(mood_rating BETWEEN 1 AND 5),
    xp_awarded      INTEGER DEFAULT 0,          -- Stored after XP engine calculates
    embedding_id    TEXT                        -- ChromaDB vector reference
);
```

### Table 2: `rpg_state`
*Your character. Completely separate from your logs.*

```sql
CREATE TABLE rpg_state (
    id                  INTEGER PRIMARY KEY,
    user_id             INTEGER UNIQUE DEFAULT 1,
    current_level       INTEGER DEFAULT 1,
    total_xp            INTEGER DEFAULT 0,
    xp_to_next_level    INTEGER DEFAULT 1000,
    unallocated_points  INTEGER DEFAULT 0,
    -- Core RPG attributes
    strength            INTEGER DEFAULT 1,  -- Physical activity
    wisdom              INTEGER DEFAULT 1,  -- Learning / reading
    focus               INTEGER DEFAULT 1,  -- Deep work / coding
    agility             INTEGER DEFAULT 1,  -- Flexibility / quick tasks
    resilience          INTEGER DEFAULT 1,  -- Consistency / streaks
    -- Meta
    title               TEXT DEFAULT 'Unranked',
    cosmetic_theme      TEXT DEFAULT 'default',
    streak_days         INTEGER DEFAULT 0,
    last_active_date    DATE
);
```

### Table 3: `dungeons`
*Challenges. Independent of both logs and character state until completed.*

```sql
CREATE TABLE dungeons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,              -- "The Deep Work Dungeon"
    description     TEXT,
    requirement     TEXT NOT NULL,              -- JSON: {"category": "coding", "duration_mins": 240}
    reward_xp       INTEGER DEFAULT 500,
    reward_title    TEXT,                       -- Unlock a title on completion
    reward_theme    TEXT,                       -- Unlock a cosmetic theme
    difficulty      TEXT DEFAULT 'normal',      -- "easy", "normal", "hard", "legendary"
    is_active       BOOLEAN DEFAULT true,
    completed_at    DATETIME                    -- NULL until beaten
);
```

### How They Connect (The Service Layer)

```
User logs "Coded 3 hours" on Home screen
          │
          ▼
  [activity_logs] ← record saved here
          │
          ▼
  [xp_engine.py] ← calculates XP based on category + duration
          │
          ├──► [rpg_state] ← total_xp updated, level-up check triggered
          │
          ├──► [dungeons] ← check if any dungeon requirements are now met
          │
          └──► [embedding_service.py] ← log text converted to vector, stored in ChromaDB
```

---

## 5. The 5 Pages

### Page 1 — 🏠 Home (The Frictionless Logger)

**Goal:** Log in 2 taps maximum. Never open a keyboard unless you want to.

**UI Elements:**
- Top status bar: Level badge, XP progress bar, streak flame icon
- Quick-Tap Grid: 8–12 preset buttons (customisable categories + emojis)
- Mood selector: 5 emoji buttons (😫 😕 😐 😊 🔥)
- Optional text field: "Add a note..." (expandable, not forced)
- Submit button: Large, satisfying. Triggers the XP popup animation.

**Data Flow:**
```
Tap "🏋️ Worked Out"  →  Select mood  →  Hit Submit
                                              │
                                    POST /logs  { category, mood, timestamp }
                                              │
                                    Response: { xp_awarded: 75 }
                                              │
                                    Show "+75 XP" floating animation
```

**Customisable:**
- Quick-tap presets: edit labels, emojis, and XP multipliers in `colors.ts` / a config file
- Grid layout: 2-column or 3-column toggle

---

### Page 2 — 📊 Stats (The Performance Mirror)

**Goal:** Make your effort visible. Dopamine through data.

**UI Elements:**
- **Player Card** (top): Avatar placeholder, Level, Title (e.g. "The Focused One"), XP bar, Streak counter
- **Time toggle:** Week / Month / Year buttons
- **Category Breakdown:** Horizontal bar chart showing hours per category
- **Productivity vs. Mood Scatter Plot:** Dots for each day; X = total XP, Y = avg mood. See patterns.
- **Contribution Heatmap:** GitHub-style 52-week grid. Green = active, grey = inactive.

**Data Flow:**
```
Load page  →  GET /stats/weekly
           →  GET /rpg/state
           →  Render charts with Victory Native
```

---

### Page 3 — 📅 Journal / Calendar (The Context Layer)

**Goal:** See how you felt across time. Click any day for the full story.

**UI Elements:**
- **Monthly Mood Matrix:** Standard calendar grid. Each day cell is colour-coded:
  - 🔴 Mood 1 / 🟠 Mood 2 / 🟡 Mood 3 / 🟢 Mood 4 / 💚 Mood 5
  - Grey = no entry
- **Day Detail Panel:** Tap any day → slide-up panel with:
  - Chronological activity log entries
  - Journal note (editable, freeform text)
  - Total XP earned that day
  - Mood trend for the day

**Customisable:**
- Mood colours defined in `colors.ts`
- Panel animation speed adjustable in `spacing.ts`

---

### Page 4 — ⚔️ Game (The Solo Leveling Loop)

**Goal:** Make real-life effort feel like an RPG. Tangible, visual, rewarding.

**UI Elements:**

**A. Attribute Panel:**
```
STRENGTH    ████████░░  8/10  (+2 pts pending)
WISDOM      ██████░░░░  6/10
FOCUS       █████████░  9/10
AGILITY     ████░░░░░░  4/10
RESILIENCE  ███████░░░  7/10

[ ALLOCATE POINTS ]  ← button active only when unallocated_points > 0
```

Each attribute maps to real log categories:
- Strength ← fitness / physical
- Wisdom ← reading / learning
- Focus ← coding / deep work
- Agility ← quick tasks / admin
- Resilience ← consistent logging streak

**B. Dungeon Deck:**
Cards showing active challenges. Each card has:
- Dungeon name + difficulty badge
- Requirement progress bar (e.g. "3/4 hours of Focus logged today")
- Reward preview (XP + title or theme)
- Timer if time-bound

**C. Titles & Achievements:**
A locked/unlocked grid of earned titles and cosmetic themes.

---

### Page 5 — 🤖 Recommendations (The AI Insights Engine)

**Goal:** Let your data talk back to you. Actionable, not generic.

**UI Elements:**
Scrollable feed of **Insight Cards**, each with:
- Pattern type tag (e.g. "Mood Alert", "Peak Performance", "Streak Risk")
- The insight in plain English
- A suggested action

**Example Cards:**
```
┌─────────────────────────────────────┐
│ 🔴 MOOD ALERT                       │
│ Your focus output drops ~40% on     │
│ days after a mood rating below 3.   │
│ Today looks like one of those days. │
│                                     │
│ → Try a light "Agility" task today  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚡ PEAK PERFORMANCE                 │
│ Your 5 highest XP weeks all include │
│ at least one outdoor physical log.  │
│                                     │
│ → Log a physical activity today     │
└─────────────────────────────────────┘
```

**How it works (simplified):**
1. Your logs are stored as text vectors in ChromaDB
2. The backend queries for patterns: mood-to-output correlations, activity clusters, streak risks
3. FastAPI returns pre-formatted insight cards
4. The app renders them — no AI logic in the frontend

---

## 6. The XP & Leveling Engine

File: `backend/services/xp_engine.py`

### XP Calculation Formula

```python
BASE_XP = {
    "fitness":    75,
    "coding":     60,
    "reading":    50,
    "journaling": 30,
    "admin":      20,
    # Add your own categories here
}

MOOD_MULTIPLIER = {
    1: 1.2,   # Pushed through a bad day — bonus
    2: 1.1,
    3: 1.0,   # Baseline
    4: 1.0,
    5: 0.95,  # Easy day, slight penalty (optional — disable if you hate this)
}

DURATION_BONUS = duration_minutes / 60 * 15  # +15 XP per hour logged

def calculate_xp(category, mood_rating, duration_minutes):
    base = BASE_XP.get(category, 30)
    mood_mult = MOOD_MULTIPLIER.get(mood_rating, 1.0)
    duration_bonus = (duration_minutes or 0) / 60 * 15
    return round((base + duration_bonus) * mood_mult)
```

### Leveling Curve

```python
def xp_required_for_level(level):
    return 500 + (level - 1) * 250
# Level 1→2: 500 XP
# Level 2→3: 750 XP
# Level 5→6: 1500 XP
# Level 10→11: 2750 XP
```

### Attribute Mapping

When XP is awarded, the corresponding attribute also gains a fractional point:

```python
CATEGORY_TO_ATTRIBUTE = {
    "fitness":    "strength",
    "coding":     "focus",
    "reading":    "wisdom",
    "admin":      "agility",
    "journaling": "resilience",
}
```

---

## 7. The AI Recommendation Engine

File: `backend/services/recommendation_engine.py`

### How Embeddings Work (Plain English)

Think of each activity log as a sentence. The embedding model reads that sentence and converts it into a list of ~1500 numbers — a mathematical fingerprint that captures its *meaning*. Logs that are semantically similar end up with similar fingerprints.

```
"Coded for 3 hours, felt anxious, mood 2"   →  [0.23, -0.87, 0.14, ...]
"Worked on backend API, stressed, mood 2"   →  [0.21, -0.85, 0.16, ...]
← These two vectors are close together — the system knows they're similar
```

ChromaDB stores all these vectors. When we want recommendations, we query it:
*"Find me all logs similar to 'low mood days' and tell me what happened to XP output next day."*

### Insight Generation Flow

```
1. Every new log → embed → store in ChromaDB

2. Nightly job (or on page load):
   a. Query: "low mood logs" → get similar historical logs
   b. Look up what XP/output looked like the day AFTER those logs
   c. If pattern exists → generate insight card

3. Return top 3–5 insight cards to the app
```

### Current Insight Templates

| Insight Type | Trigger | Message |
|---|---|---|
| Mood Alert | Mood ≤ 2 today + historical pattern | "Focus drops on low mood days. Light task recommended." |
| Streak Risk | No log in 20+ hours | "You're 4 hours from breaking your streak." |
| Peak Pattern | Cluster analysis of top XP weeks | "Your best weeks include [X category]. Do one today." |
| Overwork Warning | >5h logged, mood trending down | "Long sessions are followed by 2-day dips. Rest?" |

---

## 8. Colour & Theme System

All colours live in ONE file: `app/src/theme/colors.ts`

Change a single variable and the entire app updates.

```typescript
// app/src/theme/colors.ts

export const THEMES = {
  default: {
    // Backgrounds
    bg_primary:    '#0D0D0D',   // Near-black main background
    bg_secondary:  '#1A1A2E',   // Dark navy cards
    bg_card:       '#16213E',   // Card backgrounds

    // Accents
    accent_primary:   '#00D4FF',  // Cyan — XP bars, highlights
    accent_secondary: '#7B2FBE',  // Purple — level badges
    accent_danger:    '#FF4757',  // Red — alerts
    accent_success:   '#2ED573',  // Green — completions

    // Text
    text_primary:   '#FFFFFF',
    text_secondary: '#A0A0B0',
    text_muted:     '#505060',

    // Mood colours (for calendar)
    mood_1: '#FF4757',
    mood_2: '#FF7F50',
    mood_3: '#FFD700',
    mood_4: '#7BED9F',
    mood_5: '#2ED573',
  },

  // Unlock via dungeon completion — swap entire palette
  shadow_realm: {
    bg_primary:       '#000000',
    bg_secondary:     '#0A0A0A',
    accent_primary:   '#8B00FF',
    accent_secondary: '#FF00FF',
    // ... etc
  },

  sunrise: {
    bg_primary:       '#FFF8F0',   // Light mode option
    bg_secondary:     '#FFE8D0',
    accent_primary:   '#FF6B35',
    accent_secondary: '#F7C59F',
    // ... etc
  }
};

export const activeTheme = THEMES.default;  // ← Change this one line to switch themes
```

### Layout Customisation

```typescript
// app/src/theme/spacing.ts
export const LAYOUT = {
  quicktap_columns: 3,       // Change to 2 for bigger buttons
  card_border_radius: 16,    // Rounder or squarer cards
  animation_speed: 'normal', // 'slow' | 'normal' | 'fast'
  show_xp_popup: true,       // Toggle the floating XP animation
};
```

---

## 9. Build Order

Build in this sequence. Each phase is independently usable.

### Phase 1 — The Core Logger (2–3 weeks with AI assistance)
**Goal:** Be able to log activities and see them saved.

1. Set up Expo project + FastAPI backend
2. Create SQLite database with `activity_logs` table
3. Build Home screen (Quick-Tap Grid + mood selector)
4. Wire up `POST /logs` endpoint
5. Basic Stats page showing log history as a list

✅ **Milestone:** You can log "Worked out" + mood, hit submit, and see it saved.

---

### Phase 2 — The RPG Layer (2–3 weeks)
**Goal:** Make it feel like a game.

1. Add `rpg_state` table
2. Implement XP engine in Python
3. Add XP popup animation to Home screen
4. Build Player Card component
5. Add Contribution Heatmap to Stats page
6. Add charts (bar chart, scatter plot)

✅ **Milestone:** You earn XP when you log, see your level and XP bar, and stats visualise your week.

---

### Phase 3 — The Game Page (1–2 weeks)
**Goal:** Allocate points. Clear dungeons.

1. Add `dungeons` table + seed with 5 starter dungeons
2. Build Attribute Panel with allocation UI
3. Build Dungeon Card components
4. Implement dungeon completion checker in Python

✅ **Milestone:** Completing real tasks unlocks dungeon rewards. Leveling up gives you points to allocate.

---

### Phase 4 — Calendar + Journal (1 week)
**Goal:** Mood calendar with day detail.

1. Build Calendar component with mood colour coding
2. Build Day Detail panel (slide-up modal)
3. Add journal note field (saved to `activity_logs.description`)

✅ **Milestone:** Tap any day on the calendar, see everything you logged.

---

### Phase 5 — AI Recommendations (2–3 weeks)
**Goal:** Your data gives you advice.

1. Set up ChromaDB locally
2. Integrate OpenAI embeddings API
3. Write embedding service (runs on every new log)
4. Write 4 insight template generators
5. Build Recommendations screen with cards

✅ **Milestone:** The app tells you something true about your behaviour you didn't notice yourself.

---

## 10. iOS Deployment

### Local Testing (Free — Your Phone Only)

```bash
# 1. Install Expo Go on your iPhone from the App Store

# 2. Start the development server
cd app
npx expo start

# 3. Scan the QR code with your iPhone camera
# Your app loads instantly. No Mac needed for this step.
```

### Running the Backend on Your Phone (Local Network)

```bash
# On your Mac/PC, start the FastAPI backend
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# In the app, set the API base URL to your computer's local IP
# e.g. http://192.168.1.5:8000
# iPhone and computer must be on the same WiFi
```

### When You Want It on Your iPhone Permanently (Without Expo Go)

This requires an Apple Developer account ($99/year USD).

```
Option A: EAS Build (Easiest)
  npx eas build --platform ios --profile preview
  → Install via TestFlight on your phone
  → No App Store submission needed for personal use

Option B: App Store (If you want to sell it)
  npx eas build --platform ios --profile production
  → Submit to App Store via EAS Submit
  → Requires review (1–3 days)
```

---

## 11. Scaling to SaaS Later

Because of the strict separation of concerns in this architecture, selling this is a configuration change, not a rewrite.

### What Changes for Multi-User SaaS

| What | Change Required | Effort |
|------|----------------|--------|
| Database | SQLite → PostgreSQL (hosted on Supabase or Railway) | Low |
| Authentication | Add Supabase Auth (email / Google login) | Low |
| user_id | Already in every table — just stop defaulting to 1 | Trivial |
| Backend hosting | Deploy FastAPI to Railway or Fly.io | Low |
| App distribution | Submit to App Store | Medium |
| RPG module toggle | Wrap GameScreen in a feature flag | Low |

### The SaaS Pricing Model (When Ready)

```
Free Tier    → 30 logs/month, no AI recommendations
Pro ($5/mo)  → Unlimited logs, AI recommendations, all themes
Team ($15/mo)→ Shared dungeons, team leaderboards
```

The `cosmetic_theme` field in `rpg_state` and the feature flag pattern mean you can gate
features per subscription tier without touching the core data model.

---

## 12. Glossary

| Term | What it means in this project |
|------|-------------------------------|
| **API** | A channel between the app (frontend) and the Python server (backend). The app asks the backend for data, the backend replies. |
| **FastAPI** | A Python library that makes it easy to create an API server. You write a Python function, it becomes a URL the app can call. |
| **SQLite** | A database that lives as a single file on your computer. No separate server needed. |
| **React Native** | A framework for building phone apps using JavaScript. Expo is a toolset on top of it that makes setup much easier. |
| **Embedding** | A way to convert text into a list of numbers that captures its meaning. Semantically similar text → similar numbers. |
| **ChromaDB** | A local database for storing and searching those number-lists (vectors/embeddings). |
| **Vector** | The list of numbers that represents a piece of text after embedding. |
| **Endpoint** | A URL on the backend that does something. `POST /logs` means "send a new log to the server". |
| **Service Layer** | The Python files (xp_engine.py, etc.) that sit between the database and the API. They contain business logic. |
| **Feature Flag** | A variable that turns a feature on or off without deleting code. Used for SaaS tier gating. |
| **Zustand** | A simple state manager for React Native. Think of it as a shared memory space all app screens can read from. |
| **EAS Build** | Expo's cloud build service. It compiles your app into a real .ipa file that installs on iPhones. |
| **TestFlight** | Apple's official app for installing beta iOS apps on your phone. No App Store submission needed. |

---

## Next Steps

When you're ready, tell AI (Claude) to start with:

> *"Build Phase 1: Set up the Expo React Native project and FastAPI backend with the SQLite database and the Home Screen quick-log UI."*

Then after each phase:

> *"Phase 1 is done. Explain how the Home Screen, POST /logs endpoint, and SQLite table work together, then start Phase 2."*

This gives you working code + a lesson after every milestone.

---

*Blueprint version 1.0 — built for solo iOS use, designed to scale.*
