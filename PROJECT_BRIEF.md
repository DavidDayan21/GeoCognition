# GeoCognition — Adaptive Geography Mastery (Desktop App)

## ⚠️ READ THIS BEFORE WRITING ANY CODE ⚠️

This is a strict-mode brief. Previous attempts at this project failed because the assistant deviated from the stack. The rules below are NON-NEGOTIABLE.

### Hard Rules

1. **Stack is Tauri 2 + Rust + React + TypeScript.** Not Python. Not Electron. Not Flutter. Not Qt. If you are tempted to suggest another stack, STOP and ask me.
2. **This is a DESKTOP app with a GUI.** Not a CLI. Not a terminal app. Not a web app. If you find yourself writing `print()`, `println!` in a main loop, or anything that runs in a terminal as the user-facing interface, STOP.
3. **Run Phase 0 (environment check) BEFORE touching any code.** If anything fails Phase 0, stop and report.
4. **At every phase boundary, STOP and wait for my explicit "go" before continuing.**
5. **Never push to git without explicit confirmation.** Commit locally; I push myself.
6. **Platform: Windows native + PowerShell.** Do not use WSL, bash, or Unix-specific commands. Use `pnpm`, `cargo`, PowerShell-compatible paths.
7. **Language for everything (UI, code, comments, commits, docs): English only.**
8. **No `any` in TypeScript. No `unwrap()` in Rust production paths.**

---

## 1. Vision

A premium, calm, focused desktop application that helps a single user master world geography (capitals + flags) using the **SuperMemo-2 (SM-2)** spaced repetition algorithm.

Aesthetic: Apple HIG + Notion + Linear. Light theme default, dark theme available. Generous whitespace. Subtle animations. No gamification clutter.

Single user, fully offline, no cloud, no accounts.

---

## 2. Core Behavior (CRITICAL — READ TWICE)

### 2.1 No "sessions of N questions"

The previous attempt built a session-of-20-questions model. **THAT IS WRONG.**

The app runs as a **continuous, infinite practice loop**. The user starts practicing and keeps going until they decide to stop. There is no fixed length. There is no "session report" at a fixed point — stats are always available on the Stats page.

### 2.2 The intelligent queue

Every time the user answers a question, the app picks the next country to ask using this priority logic:

1. **First**, any country that was answered incorrectly in the current run that is now "due to come back" (see drill rule below).
2. **Then**, the country with the oldest `next_review` timestamp from the user's persistent SM-2 state (across runs).
3. **If nothing is due**, the country with the lowest `easiness_factor` (least mastered).
4. **Tiebreak**: random among the lowest.

### 2.3 Drill rule (in-run re-asking of failures)

When the user gets a country wrong, push it onto an in-memory "re-ask queue" tagged with a counter = current question index + **8** (configurable: between 7 and 9, randomized per failure to feel less mechanical).

At every new question, before applying the priority logic above, check the re-ask queue: if any country has `reappear_at_index <= current_index`, ask that one. If multiple, ask the oldest failure first.

The re-ask queue is **NOT persisted**. It exists only for the current app run. SM-2 state IS persisted as usual.

### 2.4 Mode mixing

The user has two independent toggles in the UI: **"Capitals"** and **"Flags"**. At all times, at least one must be ON (UI enforces this).

- Only Capitals ON → every question asks for a capital
- Only Flags ON → every question asks "which country is this flag?"
- Both ON → for each question, pick mode randomly weighted by how much the user has practiced each (rarer mode chosen slightly more often to balance)

SM-2 state is **per (country, mode)** pair. The Japan-capital card and the Japan-flag card are independent.

### 2.5 Continent selection

The user selects **continents only** (not individual countries) via the interactive world map. Clicking a continent toggles all its countries in/out. The selection is **persisted** in settings. On first launch, all 6 continents are selected by default.

Continents: `Africa`, `North America`, `South America`, `Asia`, `Europe`, `Oceania`. (Antarctica excluded.)

The user must always have at least one continent selected.

---

## 3. Tech Stack (LOCKED)

### Backend (Rust, in `src-tauri/`)

- **Tauri 2.x** (latest stable)
- `tauri-plugin-sql` with SQLite for persistence
- `serde` + `serde_json`
- `chrono` for timestamps (UTC, ISO 8601 strings in DB)
- `thiserror` for error types
- `strsim` for Levenshtein distance
- `rand` for shuffling and weighted picks

### Frontend (TypeScript, in `src/`)

- **React 18** (strict mode)
- **TypeScript** (strict, no `any`)
- **Vite**
- **Tailwind CSS 3.x**
- **Framer Motion** (animations)
- **react-simple-maps** + **d3-geo** (interactive world map)
- **Recharts** (stats charts)
- **Zustand** (state management — no Redux, no Context overuse)
- **React Router 6**
- **Lucide React** (icons)

### Tooling

- **pnpm** (not npm, not yarn)
- **ESLint** + **Prettier** (strict)
- **Vitest** (frontend unit tests)
- **Playwright** (E2E)
- **cargo test** (Rust)

### DevOps

- **GitHub Actions**: CI on PR (lint + test + build smoke), Release on tag
- **Dockerfile.dev** for contributors (optional)

---

## 4. Phase 0 — Environment Check (DO THIS FIRST, STOP AFTER)

Run these in PowerShell and show output:

```powershell
rustc --version
cargo --version
node --version
pnpm --version
git --version
cargo tauri --version
```

Expected:

- rustc ≥ 1.78
- cargo ≥ 1.78
- node ≥ v20
- pnpm ≥ 9
- cargo tauri ≥ 2.0

Also verify:

```powershell
Get-Location
Get-ChildItem -Force
```

The repo directory should be empty (or close to — only `.git/` and possibly `PROJECT_BRIEF.md`).

If anything is missing or wrong, **STOP** and list exactly what needs fixing.

If everything is green:

1. Print "✅ Phase 0 complete. Awaiting 'go' for Phase 1."
2. **STOP. Do not proceed.**

---

## 5. Project Architecture

```
geocognition/
├── README.md
├── LICENSE                            (MIT)
├── PROJECT_BRIEF.md                   (this file)
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── quiz.rs                (next_question, submit_answer)
│   │   │   ├── stats.rs               (get_mastery_map, get_progression, get_global_stats)
│   │   │   ├── settings.rs            (get_settings, update_settings)
│   │   │   └── data.rs                (get_all_countries, get_continents)
│   │   ├── domain/
│   │   │   ├── mod.rs
│   │   │   ├── sm2.rs                 (PURE function, no I/O)
│   │   │   ├── models.rs              (Country, UserStats, Settings, Question, Answer)
│   │   │   ├── queue.rs               (priority + drill queue logic, pure)
│   │   │   ├── grading.rs             (input → quality 0/3/5)
│   │   │   └── question_mode.rs       (QuestionMode enum: Capital | Flag)
│   │   ├── infra/
│   │   │   ├── mod.rs
│   │   │   ├── db.rs                  (SQLite repo)
│   │   │   ├── migrations/
│   │   │   │   └── 001_init.sql
│   │   │   └── seed.rs                (load countries.json on first run)
│   │   ├── state.rs                   (AppState: db pool + in-memory drill queue)
│   │   └── error.rs
│   ├── tests/
│   │   ├── sm2_test.rs
│   │   ├── queue_test.rs
│   │   └── grading_test.rs
│   └── data/
│       └── countries.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── api/
│   │   └── tauri-api.ts               (typed wrappers around invoke)
│   ├── components/
│   │   ├── ui/                        (design system)
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   └── Toast.tsx
│   │   ├── map/
│   │   │   ├── WorldMap.tsx           (continent-level selection)
│   │   │   ├── MasteryHeatmap.tsx     (color-coded EF map)
│   │   │   └── map-utils.ts
│   │   ├── practice/
│   │   │   ├── PracticeView.tsx       (the main infinite loop screen)
│   │   │   ├── CapitalPrompt.tsx
│   │   │   ├── FlagPrompt.tsx
│   │   │   ├── AnswerField.tsx
│   │   │   └── FeedbackLayer.tsx
│   │   └── stats/
│   │       ├── ProgressionChart.tsx
│   │       ├── ForgettingCurve.tsx
│   │       ├── ContinentRadar.tsx
│   │       └── GlobalStatsStrip.tsx
│   ├── pages/
│   │   ├── HomePage.tsx               (entry + continent selection on world map)
│   │   ├── PracticePage.tsx           (infinite practice loop)
│   │   ├── StatsPage.tsx              (heatmap + charts)
│   │   └── SettingsPage.tsx
│   ├── store/
│   │   ├── practice-store.ts          (current question, mode, in-run streak)
│   │   └── settings-store.ts          (continents, modes, theme, fuzzy tolerance)
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css
│   ├── lib/
│   │   ├── format.ts
│   │   ├── animations.ts
│   │   └── normalize.ts               (case/accent stripping for client display only)
│   └── types/
│       └── domain.ts                  (mirrors of Rust types via tauri-specta if used)
├── public/
│   └── flags/                         (downloaded SVGs, ~195 files)
├── tests/
│   └── e2e/
│       ├── practice-flow.spec.ts
│       └── continent-selection.spec.ts
├── scripts/
│   ├── download-flags.ts              (one-shot: pulls SVGs from flagcdn.com)
│   └── build-countries-json.ts        (one-shot: REST Countries API → countries.json)
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── playwright.config.ts
└── .eslintrc.cjs
```

---

## 6. Data Model

### `countries.json` (bundled, ~195 entries)

```json
{
  "id": 142,
  "name": "Japan",
  "capital": "Tokyo",
  "continent": "Asia",
  "iso_alpha2": "jp",
  "iso_alpha3": "jpn",
  "lat": 36.2048,
  "lng": 138.2529
}
```

Generated once via `scripts/build-countries-json.ts` from `https://restcountries.com/v3.1/all`. Filter to UN-recognized sovereign states. Normalize continents into: `Africa`, `North America`, `South America`, `Asia`, `Europe`, `Oceania`.

### Flags

Run `scripts/download-flags.ts` once. Source: `https://flagcdn.com/{iso_alpha2}.svg`. Save to `public/flags/{iso_alpha2}.svg`. Bundled into the Tauri binary for offline use.

### SQLite Schema (`migrations/001_init.sql`)

```sql
CREATE TABLE countries (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  capital TEXT NOT NULL,
  continent TEXT NOT NULL,
  iso_alpha2 TEXT NOT NULL UNIQUE,
  iso_alpha3 TEXT NOT NULL UNIQUE,
  lat REAL,
  lng REAL
);

CREATE TABLE user_stats (
  country_id INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('capital', 'flag')),
  ef REAL NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review TEXT NOT NULL,
  last_reviewed TEXT,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (country_id, mode),
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

CREATE TABLE answers_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  user_input TEXT,
  is_correct INTEGER NOT NULL,
  quality INTEGER NOT NULL,
  response_time_ms INTEGER,
  answered_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_user_stats_next_review ON user_stats(next_review, mode);
CREATE INDEX idx_answers_log_answered_at ON answers_log(answered_at);
```

Settings are stored as JSON strings under named keys: `selected_continents`, `modes_enabled`, `theme`, `fuzzy_tolerance`.

---

## 7. Domain Core (Rust, all pure functions)

### 7.1 SM-2 (`domain/sm2.rs`)

```rust
pub struct Sm2State {
    pub ef: f64,
    pub repetitions: u32,
    pub interval_days: u32,
}

pub fn update(state: Sm2State, quality: u8) -> Sm2State {
    debug_assert!(quality <= 5);
    let q = quality as f64;
    let new_ef = (state.ef + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02))).max(1.3);

    if quality < 3 {
        return Sm2State { ef: new_ef, repetitions: 0, interval_days: 1 };
    }

    let new_reps = state.repetitions + 1;
    let new_interval = match new_reps {
        1 => 1,
        2 => 6,
        _ => (state.interval_days as f64 * new_ef).ceil() as u32,
    };

    Sm2State { ef: new_ef, repetitions: new_reps, interval_days: new_interval }
}
```

**Required tests** (`tests/sm2_test.rs`):

- Fresh card, q=5 → reps=1, interval=1, EF up
- q=5 twice → reps=2, interval=6
- q=5 three times from default → reps=3, interval = ceil(6 × new_ef)
- q=0 from any state → reps=0, interval=1, EF down
- EF floor at 1.3
- Repeated q=5 grows EF monotonically

### 7.2 Grading (`domain/grading.rs`)

```rust
pub fn grade(user_input: &str, correct: &str) -> u8 {
    let a = normalize(user_input);
    let b = normalize(correct);
    if a == b { return 5; }
    let max_len = a.chars().count().max(b.chars().count()) as f64;
    if max_len == 0.0 { return 0; }
    let dist = strsim::levenshtein(&a, &b) as f64;
    let ratio = dist / max_len;
    if ratio <= 0.15 { 3 } else { 0 }
}

fn normalize(s: &str) -> String {
    // lowercase, strip accents (use unicode-normalization), trim
}
```

### 7.3 Queue (`domain/queue.rs`)

Pure function that, given:

- list of candidate cards (country_id, mode, ef, next_review)
- in-memory drill queue [(country_id, mode, reappear_at_index)]
- current question index
- current time

Returns the next `(country_id, mode)` to ask, according to section 2.2 + 2.3 logic.

**Required tests:**

- Drill queue takes priority when ready
- Overdue cards beat lowest-EF cards
- Tiebreak is deterministic with seeded RNG

---

## 8. Tauri Commands (Backend → Frontend API)

```rust
// commands/quiz.rs
#[tauri::command] async fn next_question(state: State<AppState>) -> Result<QuestionPayload, AppError>;
#[tauri::command] async fn submit_answer(state: State<AppState>, country_id: i64, mode: String, user_input: String, response_time_ms: i64) -> Result<AnswerResult, AppError>;

// commands/stats.rs
#[tauri::command] async fn get_mastery_map(state: State<AppState>, mode: String) -> Result<Vec<CountryMastery>, AppError>;
#[tauri::command] async fn get_progression(state: State<AppState>, days: i64) -> Result<Vec<DailyStat>, AppError>;
#[tauri::command] async fn get_forgetting_curve(state: State<AppState>) -> Result<Vec<ForgettingPoint>, AppError>;
#[tauri::command] async fn get_continent_breakdown(state: State<AppState>) -> Result<Vec<ContinentStat>, AppError>;
#[tauri::command] async fn get_global_stats(state: State<AppState>) -> Result<GlobalStats, AppError>;

// commands/settings.rs
#[tauri::command] async fn get_settings(state: State<AppState>) -> Result<Settings, AppError>;
#[tauri::command] async fn update_settings(state: State<AppState>, settings: Settings) -> Result<(), AppError>;

// commands/data.rs
#[tauri::command] async fn get_all_countries() -> Result<Vec<Country>, AppError>;
```

All commands return typed `Result<T, AppError>`. Frontend wrappers in `src/api/tauri-api.ts` provide typed promises.

---

## 9. UI Pages

### 9.1 HomePage (`/`)

- Hero with app name in Instrument Serif, tagline in Inter
- Big primary CTA: **"Start practicing"** → goes to `/practice`
- Below: secondary tiles for **Stats**, **Settings**
- Bottom strip: current streak, total mastered, last practiced date
- Calm staggered entrance animation

### 9.2 SettingsPage (`/settings`) — includes the world map for selection

- **Continent selection** via interactive world map (full-width)
  - Each continent is a clickable group with subtle tint
  - Selected continents: filled with accent color, slightly elevated
  - Unselected: faded gray
  - Smooth fade transitions
- **Mode toggles**: two large iOS-style toggles for "Capitals" and "Flags". At least one must be on.
- **Theme**: light / dark / system (segmented control)
- **Fuzzy matching tolerance**: strict / normal / lenient
- **Reset all stats** (double-confirm modal)
- **About**: version, GitHub link, MIT license

### 9.3 PracticePage (`/practice`) — THE MAIN SCREEN

**This is the infinite loop. There is no fixed length.**

Layout:

- Top bar: thin, minimal
  - Left: current mode badge (Capital / Flag)
  - Center: in-run counters — questions answered, accuracy %, current streak
  - Right: pause button (opens overlay), exit button (returns home)
- Center: the question card
  - **Capital mode**: country name in large serif (~64px), input below
  - **Flag mode**: flag SVG (max 280px height, soft shadow, rounded corners), input below "Which country?"
  - Single text input, autofocus, placeholder "Type your answer…"
  - Submit on Enter
- Below input: small "I don't know" link → graded as quality 0, correct answer shown
- Feedback layer (overlays the card on submit):
  - **Correct (q=5)**: green check fades in, card slides left, next card slides in from right (300ms)
  - **Fuzzy (q=3)**: amber pulse + "Close — it's _Tokyo_" subtitle (typo shown crossed out), Enter to continue
  - **Wrong (q=0)**: gentle red shake, correct answer revealed, Enter to continue
- Auto-advance on correct. Manual continue on incorrect/fuzzy (gives the user time to read).
- Keyboard shortcuts: `Enter` (submit/continue), `Esc` (pause), `Cmd/Ctrl+Q` (quit to home)
- The practice page **never** ends on its own. Only the user exits.

### 9.4 StatsPage (`/stats`)

- **Mastery Heatmap**: world map colored by EF per country (red→yellow→green gradient). Mode tabs at top (Capital / Flag).
- **Progression chart** (Recharts line): accuracy % per day over last 30 days
- **Forgetting curve** (Recharts scatter): days-since-last-review vs correct-rate, overlaid with theoretical Ebbinghaus curve
- **Continent radar**: 6-axis radar showing mastery per continent
- **Global stats strip**: total mastered (EF > 2.5 and reps ≥ 3), countries seen, total answers, accuracy lifetime, current streak, longest streak

---

## 10. Design System

### Colors (CSS vars + Tailwind tokens)

```
Light:
  --bg            #FAFAF9
  --surface       #FFFFFF
  --surface-2    #F4F4F2
  --border        #E7E5E4
  --text          #1C1917
  --text-muted    #78716C
  --accent        #18181B
  --success       #16A34A
  --warning       #D97706
  --error         #DC2626
  --mastery-0     #F87171   (struggling, EF < 1.6)
  --mastery-1     #FBBF24   (learning, 1.6–2.2)
  --mastery-2     #A3E635   (familiar, 2.2–2.6)
  --mastery-3     #22C55E   (mastered, > 2.6)

Dark: invert backgrounds (#0C0A09 bg, #FAFAF9 text), keep mastery colors with slight desaturation.
```

### Typography

- Display: **Instrument Serif** (Google Fonts) — hero, large numbers, country names in quiz
- UI: **Inter** (variable, 400/500/600/700)
- Mono: **JetBrains Mono** (rare, for stats)
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64

### Spacing & shape

- 4px base unit, Tailwind defaults
- Radii: 6px (inputs), 12px (cards), 16px (modals)
- Borders: 1px low-contrast, preferred over heavy shadows
- Shadows: soft, layered (`shadow-sm` / `shadow-md` only)

### Motion

- Framer Motion everywhere
- Durations: 150 / 250 / 400 / 600 ms
- Easing: `[0.22, 1, 0.36, 1]`
- Stagger children 40–60ms
- Page transitions: fade + 8px Y-translate
- **Respect `prefers-reduced-motion`**

---

## 11. Testing

### Rust

- `sm2_test.rs`: minimum 8 cases
- `queue_test.rs`: drill priority, overdue priority, EF tiebreak, seeded determinism
- `grading_test.rs`: exact, accent-insensitive, typo within 15%, way off

### TypeScript (Vitest)

- `tauri-api.ts` wrappers with mocked invoke
- Zustand stores: state transitions
- Pure utils (`normalize.ts`, `format.ts`)

### E2E (Playwright + Tauri)

- Boot → continent selection → practice → answer a few questions → check stats updates
- Toggle modes mid-practice → next question respects new mode

Target: ≥ 70% line coverage on `src-tauri/src/domain/` and `src/lib/`.

---

## 12. CI/CD

### `.github/workflows/ci.yml`

Matrix: `ubuntu-latest`, `macos-latest`, `windows-latest`. Triggers on PR + push to `main`.

Steps:

1. Setup Node 20 + pnpm + Rust stable + Tauri Linux deps (apt)
2. Cache pnpm + Cargo
3. `pnpm install --frozen-lockfile`
4. `pnpm lint`
5. `pnpm test:unit`
6. `cargo fmt --check && cargo clippy -- -D warnings`
7. `cargo test`
8. `pnpm test:e2e` (Ubuntu only, headless)
9. `pnpm tauri build --debug` (smoke build)

### `.github/workflows/release.yml`

Triggers on tag `v*`. Build Tauri bundles for 3 OSes, create GitHub Release, upload `.msi`, `.dmg`, `.AppImage`.

---

## 13. Phasing — STOP AT EVERY CHECKPOINT

### Phase 0 — Environment check

Already specified in section 4. **STOP after.**

### Phase 1 — Scaffolding

1. `pnpm create tauri-app .` with options: pnpm, React, TypeScript
2. Adjust `Cargo.toml`, `package.json`, `tauri.conf.json`
3. Install deps: Tailwind, Framer Motion, react-simple-maps, d3-geo, Recharts, Zustand, React Router, Lucide, ESLint, Prettier, Vitest, Playwright, strsim, chrono, thiserror, rand
4. Tailwind config + design tokens (`globals.css`, `tokens.css`)
5. Empty page shells with React Router (Home/Practice/Stats/Settings)
6. App boots with `pnpm tauri dev` and shows the home page placeholder
7. Initial commit (do not push)

**STOP. Report what was done. Wait for "go".**

### Phase 2 — Data pipeline

1. `scripts/build-countries-json.ts` → run it → `src-tauri/data/countries.json`
2. `scripts/download-flags.ts` → run it → `public/flags/*.svg`
3. SQLite schema + migration + seed loader
4. Verify with `cargo test` that init is idempotent and seeds 195 countries

**STOP. Report. Wait for "go".**

### Phase 3 — Domain core (pure, fully tested)

1. `sm2.rs` + tests
2. `grading.rs` + tests
3. `queue.rs` + tests (including drill rule)
4. All `cargo test` green

**STOP. Show test output. Wait for "go".**

### Phase 4 — Tauri commands + state

1. `AppState` (SQLite pool + in-memory drill queue + RNG)
2. All commands wired (`next_question`, `submit_answer`, `get_*`, settings)
3. `tauri-api.ts` typed wrappers
4. Smoke-test from frontend dev console

**STOP. Wait for "go".**

### Phase 5 — Practice loop UI (the core experience)

1. Design system primitives (`Button`, `Card`, `Input`, `Toggle`, `Modal`, `Toast`)
2. `PracticePage` with capital mode end-to-end
3. Feedback animations (correct / fuzzy / wrong)
4. Mode toggle → flag mode end-to-end
5. Mixed mode tested

**STOP. Wait for "go".**

### Phase 6 — World map + settings

1. `WorldMap` for continent selection (Settings page)
2. Mode toggles, theme switch, fuzzy tolerance, reset stats
3. Settings persistence verified

**STOP. Wait for "go".**

### Phase 7 — Stats page

1. Mastery heatmap
2. Progression chart
3. Forgetting curve
4. Continent radar
5. Global stats strip

**STOP. Wait for "go".**

### Phase 8 — Polish + dark mode

1. Dark mode end-to-end
2. Empty states + loading skeletons
3. Reduced-motion respect
4. Keyboard nav full pass
5. Animation polish

**STOP. Wait for "go".**

### Phase 9 — Productionize

1. CI green on all 3 OSes
2. Release workflow tested with a `v0.0.1-alpha` tag
3. README finalized with screenshots
4. v0.1.0 tag prepared (don't push)

**STOP. Final report.**

---

## 14. Quality Gates (run before declaring any phase done)

- [ ] `pnpm lint` passes
- [ ] `pnpm test:unit` passes
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy -- -D warnings` passes
- [ ] `cargo test` passes
- [ ] App still boots (`pnpm tauri dev`)
- [ ] No `any` in TS
- [ ] No `unwrap()` in non-test Rust
- [ ] No `console.log` / stray `println!`
- [ ] All new public functions have doc comments
- [ ] Conventional Commit message

---

## 15. Working Protocol

- **Ask before adding any dependency not in section 3.**
- **Ask before deviating from the architecture in section 5.**
- **STOP at every phase boundary. Wait for explicit "go".**
- **Commit locally at the end of each phase with a Conventional Commit message. Never push without me asking.**
- If a spec here is ambiguous, ask. Do not guess.
- If you're tempted to build a CLI or use Python, re-read section ⚠️.

---

**Begin now with Phase 0 only. Stop after.**
