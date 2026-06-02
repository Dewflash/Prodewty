# Prodewty — Dev Setup Reference

## The Stack, Plain English

**TypeScript / React Native** — the actual app code. TypeScript is just JavaScript with types (catches bugs before they happen). React Native lets you write one codebase that runs on iPhone.

**Metro** — a bundler. It takes all your TypeScript files and smashes them into one JavaScript bundle that the phone can run. Runs on your Mac in the background when you do `npx expo start`.

**CocoaPods** — a dependency manager for iOS native code. Your app uses native iPhone features (SQLite storage, safe area detection, etc.) that are written in Swift/ObjC. CocoaPods links all of those together before Xcode compiles. Think of it like `npm install` but for native Apple code.

**Homebrew** — a package manager for your Mac. Lets you install developer tools with one command. You used it to install CocoaPods. You'll use it for other things in the future.

**Xcode** — Apple's compiler. It takes everything (your JS bundle + native code linked by CocoaPods) and builds a real `.ipa` file — the actual iPhone app binary. You don't open Xcode directly, Expo drives it for you.

**expo-sqlite** — SQLite running inside the app itself on your phone. All your logs, XP, RPG state — stored locally, no internet needed, no server.

---

## How the Build Works

```
Your code (TypeScript files)
        ↓
    Metro bundler
    (npx expo start)
        ↓
    CocoaPods
    (links native iOS libraries — runs once)
        ↓
    Xcode compiler
    (builds the .ipa — runs once per native change)
        ↓
    Installs on iPhone via USB
        ↓
    After that: WiFi hot reload
    (save a file → phone updates in ~2 seconds)
```

---

## Day-to-Day Commands

| What you want | Command |
|---|---|
| Start developing | `npx expo start` |
| First time build / after native changes | `npx expo run:ios --device` |
| Clear Metro cache (when things are weird) | `npx expo start --clear` |

---

## The Two Modes

**Hot reload mode (daily use)**
- Run `npx expo start`
- Phone and Mac on same WiFi
- Edit code → phone updates automatically
- No cable needed

**Full build mode (first time or after adding new native packages)**
- Run `npx expo run:ios --device`
- Phone plugged into Mac via USB
- Takes 5-10 min
- Only needed when you install a new package that has native code (like a camera library, new SQLite version, etc.)

---

## Common Issues & Fixes

### "Metro bundler is already running"
Something's hogging port 8081.
```bash
npx expo start --port 8082
```

### "Unable to find device" during `expo run:ios`
- Make sure phone is plugged in
- Make sure you tapped "Trust" on the phone
- Try unplugging and replugging

### App crashes on launch after installing a new package
Some packages have native code. After `npm install`, you need a full rebuild:
```bash
npx expo run:ios --device
```

### "CocoaPods not found" after restarting terminal
Your PATH reset. Run:
```bash
eval "$(/opt/homebrew/bin/brew shellenv zsh)"
```
Then add it permanently if not already in `~/.zprofile`.

### "No space left on device" during npm install
Node modules are huge. Clear some disk space, then:
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### TypeScript errors in VS Code but app runs fine
Run `npx tsc --noEmit` in the terminal. If no errors there, it's a VS Code config issue — usually resolves after restarting the TS server (Cmd+Shift+P → "Restart TS Server").

### App installed but showing old version
Metro cache is stale.
```bash
npx expo start --clear
```

---

## Why No Backend Server?

Earlier versions of this project had a Python/FastAPI server running on the Mac. That meant:
- Mac had to be on and running for the app to work
- App needed WiFi to your Mac at all times
- Not a real phone app

The proper version uses **expo-sqlite** — SQLite runs inside the iPhone app itself. Your data never leaves your phone. The app works offline, anywhere, forever.

If you ever want to add cloud sync or multi-device support later, you add a backend then. The database schema is already designed for it (`user_id` is in every table).

---

## File Structure Reference

```
Prodewty/
├── app/                        ← React Native frontend
│   ├── app/                    ← Expo Router pages
│   │   ├── _layout.tsx         ← Root layout (fonts, DB init)
│   │   └── (tabs)/             ← Tab screens
│   │       ├── index.tsx       ← Home (logger)
│   │       ├── stats.tsx       ← Activity log list
│   │       ├── journal.tsx     ← Calendar (Phase 4)
│   │       ├── game.tsx        ← RPG page (Phase 3)
│   │       └── recommendations.tsx ← Insights (Phase 5)
│   └── src/
│       ├── theme/              ← Colors, fonts, spacing
│       ├── components/         ← XPBar, CategoryGrid, MoodSelector
│       ├── db/                 ← SQLite queries (on-device)
│       │   ├── schema.ts       ← Table creation
│       │   ├── logs.ts         ← Log CRUD
│       │   └── rpg.ts          ← RPG state CRUD
│       ├── services/
│       │   └── xpEngine.ts     ← XP formula, leveling, titles
│       └── store/
│           └── useAppStore.ts  ← Global state (Zustand)
│
└── backend/                    ← Archived. Not used.
```

---

## XP System Quick Reference

**Formula:** `(BASE_XP + duration_bonus) × mood_multiplier`

| Category | Base XP | Attribute |
|---|---|---|
| Workout | 75 | Strength |
| Coding | 60 | Focus |
| Study | 55 | Wisdom |
| Reading | 50 | Wisdom |
| Devotion | 40 | Wisdom |
| Journal | 30 | Resilience |
| Admin | 20 | Agility |

Duration bonus: +15 XP per hour logged.
Bad day bonus: Mood 1 = 1.25x, Mood 2 = 1.15x (pushing through earns more).

**Level titles:** Unranked → Apprentice (5) → Journeyman (10) → Adept (20) → Expert (35) → Master (50) → Grandmaster (75) → Shadow Monarch (100)
