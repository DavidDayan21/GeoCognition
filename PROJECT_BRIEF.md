# Border Run — New Game Mode for GeoCognition

## ⚠️ READ BEFORE DOING ANYTHING ⚠️

This brief adds a new game mode to the existing GeoCognition app. The current codebase (Tauri 2 + Rust + React + TS) stays as-is. You are extending it, not rebuilding it.

### Hard Rules
1. **Do NOT touch git.** No `git add`, no `git commit`, no `git push`, no rebase, no stash. The user manages the repo. Your job ends at saving files to disk. After each phase, report what was saved and stop.
2. **Stack is locked**: Tauri 2 + Rust + React + TypeScript. Do not introduce any new framework. Adding a small dependency for graph algorithms or country-name search is OK, but ASK before adding any non-trivial dep.
3. **Language**: all code, comments, UI strings (English source) in English. The app is bilingual (en/fr) — every new UI string must be added to both `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`.
4. **No `any` in TypeScript. No `unwrap()` in non-test Rust.**
5. **Platform**: Windows native + PowerShell. No WSL/bash.
6. **STOP at every phase boundary.** Wait for explicit "go" before continuing.
7. **Quality gates pass at every phase**: `pnpm lint`, `pnpm test:unit`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `pnpm build`.

---

## 1. What is Border Run?

A new game mode inspired by `travle.earth`. The player is given a **start country** and an **end country**. They must guess the **chain of countries** connecting them by typing country names. Each guess must be a country adjacent (sharing a land border) to a country already in the player's chain — guesses that aren't adjacent still count as a used attempt.

The mode is independent of the existing SM-2 practice loop. No spaced repetition, no continent filters, no stats persistence. Each game is standalone.

---

## 2. Design decisions (LOCKED — do not deviate)

### 2.1 Navigation & mode switching
- The app now has **two game modes**: **"Practice"** (existing SM-2 + Flags + Capitals stuff) and **"Border Run"** (new).
- The currently-active mode is **persisted** to settings (just like theme/language) and restored on app launch. Default: `"practice"`.
- The home header shows `GeoCognition` (main title) with a small **subtitle** underneath showing the current mode's name (e.g., "Practice" or "Border Run"). Subtitle is statically informative — it does NOT itself switch modes.
- The mode-switch UI element lives elsewhere on the Home page (NOT in Settings, NOT next to the Stats/Settings icons). A prominent **segmented control** centered between the subtitle and the world map, sized to feel like a primary navigation element. Two segments: "Practice" / "Border Run". Both labels are translatable.
- Switching mode swaps the Home page main content area (map + toggles vs. Border Run setup), but the header (title + subtitle + language flag + Stats/Settings icons) is shared.
- Reaching `/practice` (the SM-2 quiz screen) is still done by "Start practicing" on Practice mode. Border Run has its own start button.

### 2.2 Country set
- All 195 countries are always in play. No continent filter applies to Border Run.
- Only land-reachable pairs count: pairs that would require crossing an ocean (no land path exists between them) are excluded from the random generator. Islands like Madagascar, Iceland, Sri Lanka, etc. can be start or end only if they have at least one land border (otherwise they're excluded entirely from this mode).

### 2.3 Adjacency model
- Sourced from REST Countries' `borders` field (already fetched at build time). Stored as a property on each country in `countries.json`: `borders: string[]` (array of ISO alpha-3 codes).
- **No bridges, no tunnels, no island hopping, no exclaves logic.** Land borders only. Keep it simple. If a pair has no path under this strict rule, the generator must skip it.

### 2.4 Difficulty
- A single **slider** with 3 positions (Easy / Medium / Hard), classified by **shortest-path length** between start and end (computed via BFS on the adjacency graph):
  - **Easy**: shortest path length 2–3 (i.e., 1–2 intermediate countries)
  - **Medium**: shortest path length 4–6
  - **Hard**: shortest path length 7+
- Each difficulty has its own attempt limit:
  - Easy: 6 attempts
  - Medium: 10 attempts
  - Hard: 15 attempts
- The generator picks a random valid pair matching the current difficulty.

### 2.5 Guess validation
- Player types a country name (in any language — reuses existing fuzzy bilingual matching).
- If the typed name doesn't match ANY country (fuzzy match fails against all 195) → toast error "Country not recognized" and the guess does NOT count as an attempt.
- If the name matches a real country but it's NOT adjacent to any country already in the player's chain (chain = start + all accepted guesses + end) → the guess counts as a **used attempt**, country shown briefly in red on the map, then removed (does not stay in chain).
- If the name matches a country AND it IS adjacent to some country in the chain → accepted, added to the chain, colored on the map.

### 2.6 Color coding on the map
- All countries start rendered as **blank silhouettes** (filled with a single neutral tone — e.g., `--surface-2` — same fill AND same stroke color, so internal borders disappear and only the coastlines/continent outlines are visible against the ocean background). This is the "Wordle-style mystery map" effect.
- As the game progresses:
  - **Start country**: colored with a distinct accent (e.g., blue)
  - **End country**: colored with another distinct accent (e.g., red)
  - **Correctly-guessed countries on the shortest path**: green
  - **Correctly-guessed countries that are valid detours (adjacent to chain but not on shortest path)**: orange
  - **Incorrect guesses (non-adjacent)**: flash red briefly, then revert to blank
  - When a country is colored, its border becomes visible (use a contrasting stroke color so the country shape stands out clearly from neighbors)
- The shortest path is computed once at game start and used to classify green vs orange. Multiple shortest paths may exist — any country on ANY shortest path counts as green.

### 2.7 Game outcome
- **Win**: any path of correctly-guessed countries connects start to end. Show a win screen with stats: attempts used, attempts limit, whether the player found the optimal path.
- **Lose**: attempts exhausted before connecting start to end. Show a lose screen revealing the shortest path.
- Both screens have "Play again" (new random pair, same difficulty) and "Change difficulty" buttons.

### 2.8 Persistence
- Border Run does NOT persist game history or stats. Each game is independent.
- The ONLY thing persisted is the user's mode choice (`current_mode`) and difficulty (`border_run_difficulty`) — both stored in the `settings` table.

---

## 3. Architecture additions

```
src-tauri/
├── data/
│   └── countries.json                  (extend: add `borders: string[]` to each entry)
├── src/
│   ├── domain/
│   │   ├── border_run/
│   │   │   ├── mod.rs
│   │   │   ├── graph.rs                (adjacency graph from countries.json)
│   │   │   ├── pathfinding.rs          (BFS shortest path, multiple-shortest-paths set)
│   │   │   ├── game.rs                 (GameState: start, end, chain, attempts, shortest_paths)
│   │   │   └── generator.rs            (random pair by difficulty, with validation)
│   │   └── models.rs                   (add BorderRunMode enum, GameStatus, etc.)
│   ├── commands/
│   │   └── border_run.rs               (start_game, submit_guess, get_shortest_path)
│   └── tests/
│       ├── border_run_graph_test.rs
│       ├── border_run_pathfinding_test.rs
│       └── border_run_game_test.rs

src/
├── components/
│   ├── ui/
│   │   └── Slider.tsx                  (new: 3-position difficulty slider)
│   └── border-run/
│       ├── BorderRunSetup.tsx          (difficulty slider + start button)
│       ├── BorderRunGame.tsx           (active game: map + chain + input + attempts)
│       ├── BorderRunMap.tsx            (the country-level map, color-coded)
│       ├── ChainDisplay.tsx            (visual chain: start → guesses → end)
│       ├── AttemptsCounter.tsx
│       └── BorderRunResult.tsx         (win/lose screen)
├── pages/
│   ├── HomePage.tsx                    (extend: mode segmented control, conditional content)
│   └── BorderRunPage.tsx               (the active-game route)
├── store/
│   ├── mode-store.ts                   (currentMode + persistence)
│   └── border-run-store.ts             (current game state, in-memory only)
└── api/
    └── tauri-api.ts                    (add border run command wrappers)

scripts/
└── add-borders.ts                      (one-shot: populate `borders` field in countries.json from REST Countries data)
```

---

## 4. Data extensions

### countries.json
Add to every country entry:
```json
{
  "id": 142,
  "name_en": "Japan",
  "name_fr": "Japon",
  "capital_en": "Tokyo",
  "capital_fr": "Tokyo",
  "continent": "Asia",
  "iso_alpha2": "jp",
  "iso_alpha3": "jpn",
  "lat": 36.2,
  "lng": 138.3,
  "borders": []                          ← NEW
}
```

Source: REST Countries `borders` field (already fetched). Use ISO alpha-3 codes. Empty array for island nations with no land borders.

### SQLite schema migration
Add new keys to `settings` table (it's already a key-value store):
- `current_mode`: `"practice"` or `"border_run"` (default: `"practice"`)
- `border_run_difficulty`: `"easy"` | `"medium"` | `"hard"` (default: `"medium"`)

No new tables needed.

### Rust struct
Extend `Country` to include `borders: Vec<String>`. Update seed loader and all command DTOs that return `Country`.

---

## 5. Domain core (Rust, pure)

### `graph.rs`
Build an adjacency graph from the country list. Functions:
- `Graph::from_countries(countries: &[Country]) -> Graph`
- `Graph::neighbors(&self, iso3: &str) -> &[String]`
- `Graph::is_adjacent(&self, a: &str, b: &str) -> bool`
- `Graph::has_path(&self, a: &str, b: &str) -> bool` (any path at all — used to exclude unreachable pairs from the generator)

### `pathfinding.rs`
- `shortest_path_length(graph, from, to) -> Option<usize>` — BFS, returns None if no path
- `all_shortest_paths(graph, from, to) -> HashSet<String>` — returns the set of ALL countries that appear on ANY shortest path (used for green-coloring). Implementation: BFS that records all predecessors at each distance level, then backtrack from `to`.

### `generator.rs`
- `pick_random_pair(graph, difficulty, rng) -> Option<(String, String)>`
  - Filters all (a, b) pairs in the graph where `has_path(a, b)` is true
  - Computes shortest path length, filters by difficulty range (Easy: 2-3, Medium: 4-6, Hard: 7+)
  - Picks one uniformly at random
- Implementation hint: pre-compute all reachable pair lengths once on graph init, bucket by difficulty, sample from the bucket. Cache the buckets in memory (one-time cost at game-mode-init).

### `game.rs`
```rust
pub struct BorderRunGame {
    pub start: String,             // iso3
    pub end: String,               // iso3
    pub chain: Vec<String>,        // accepted guesses in order
    pub attempts_used: u32,
    pub attempts_limit: u32,
    pub status: GameStatus,        // InProgress | Won | Lost
    pub shortest_path_set: HashSet<String>,
}

pub enum GuessOutcome {
    Accepted { iso3: String, on_shortest_path: bool },
    NotAdjacent { iso3: String },
    NotRecognized,
    Won,
    Lost,
}

impl BorderRunGame {
    pub fn submit(&mut self, candidate_iso3: Option<&str>, graph: &Graph) -> GuessOutcome { ... }
}
```

A guess is "won" when, after acceptance, the chain (including start and end) forms a connected path from start to end through accepted nodes only.

### Required tests
- `graph_test.rs`: graph builds correctly from sample countries, neighbors are symmetric, has_path works on simple/disconnected examples
- `pathfinding_test.rs`: BFS correctness, all_shortest_paths handles diamond-shaped graphs (multiple equal-length paths), returns None for disconnected nodes
- `game_test.rs`:
  - Accepted guess on shortest path
  - Accepted guess as detour (not on shortest path)
  - Non-adjacent guess uses an attempt and doesn't enter chain
  - Win condition: chain connects start to end
  - Lose condition: attempts exhausted

---

## 6. Tauri commands

```rust
#[tauri::command] async fn border_run_start(state: State<AppState>, difficulty: String) -> Result<BorderRunGameDto, AppError>;
#[tauri::command] async fn border_run_guess(state: State<AppState>, input: String) -> Result<GuessOutcomeDto, AppError>;
#[tauri::command] async fn border_run_reveal_path(state: State<AppState>) -> Result<Vec<String>, AppError>;  // for lose-screen reveal
```

The current game state lives in `AppState` (added field `border_run: Mutex<Option<BorderRunGame>>`). Only one game at a time.

Frontend wrappers in `tauri-api.ts`.

---

## 7. UI

### 7.1 Home page changes
- Header layout:
```
  GeoCognition                           [📊] [⚙️] [🇬🇧]
  Practice  (or "Border Run" — current mode subtitle, smaller, --text-muted)
```
- Below header, centered: large segmented control `[ Practice | Border Run ]`, the active one filled with accent color.
- Below the segmented control:
  - If `current_mode == "practice"`: show existing map + Capitals/Flags toggles + "Start practicing" button (unchanged behavior).
  - If `current_mode == "border_run"`: show difficulty slider (Easy/Medium/Hard) + "Start Border Run" button.

### 7.2 Difficulty slider
- A native-feeling 3-position slider (custom-built `Slider.tsx`). Label above ("Difficulty"), three tick marks below labeled "Easy / Medium / Hard". Active position highlighted with accent.
- Smooth drag/snap animation respecting `prefers-reduced-motion`.

### 7.3 BorderRunPage (`/border-run`)
Full-screen layout:
- **Top bar**: start country flag + name → end country flag + name (with a small `→` between), attempts remaining counter on the right, exit button.
- **Center**: large `BorderRunMap` (all 195 countries, blank by default, see section 2.6 for coloring).
- **Below map**: input field "Type a country…" (autofocus, Enter to submit). Below input: chain display showing all accepted guesses with their colors.
- **Feedback**: on every guess, a toast or inline message:
  - Accepted: brief green pulse around the input
  - Not adjacent: brief red shake on the input + the country flashes red on the map briefly
  - Not recognized: red border on input + "Country not recognized" message (does NOT cost an attempt)
- **Game over**: full-screen modal/overlay:
  - **Win**: "Connected!" + stats (attempts used / limit, optimal path or detour) + "Play again" / "Change difficulty" buttons
  - **Lose**: "Out of attempts" + reveals the shortest path on the map in green + "Play again" / "Change difficulty"

### 7.4 BorderRunMap
- Reuses the existing country-level GeoJSON (`public/geo/world-110m.geojson`)
- Single neutral fill for all countries by default, **no internal borders visible** (achieved by setting stroke color equal to fill color)
- When a country becomes "colored" (in the chain or revealed), its stroke switches to a contrasting border color, making its shape visible
- No hover effects on countries (this is not a click-to-select map — input is text-based only)
- Same projection/scale as the existing maps for consistency

### 7.5 Translations
Every new UI string needs both `en.json` and `fr.json` entries. Keys under `borderRun.*`:
- `borderRun.title`, `borderRun.subtitle`
- `borderRun.difficulty.label`, `borderRun.difficulty.easy`, `borderRun.difficulty.medium`, `borderRun.difficulty.hard`
- `borderRun.start`, `borderRun.attempts`, `borderRun.attemptsRemaining`
- `borderRun.input.placeholder`, `borderRun.input.notRecognized`, `borderRun.input.notAdjacent`
- `borderRun.win.title`, `borderRun.win.optimal`, `borderRun.win.withDetour`
- `borderRun.lose.title`, `borderRun.lose.reveal`
- `borderRun.playAgain`, `borderRun.changeDifficulty`, `borderRun.exit`
- `home.modeSwitcher.practice`, `home.modeSwitcher.borderRun`
- `home.subtitle.practice`, `home.subtitle.borderRun`

FR translations must be natural French (e.g., `borderRun.win.title` → "Connecté !", `borderRun.lose.title` → "Plus d'essais").

---

## 8. Phasing — STOP AT EVERY CHECKPOINT

### Phase 0 — Environment check
Verify the dev environment is still intact (rustc, cargo, node, pnpm, cargo tauri). Verify the working tree status (Claude should NOT touch it, just observe and report whether there are uncommitted changes already present — these belong to the user).

Print "✅ Phase 0 complete. Awaiting 'go' for Phase 1." **STOP.**

### Phase 1 — Data pipeline
1. Write `scripts/add-borders.ts` — augments existing `countries.json` with the `borders` field from REST Countries (or a static curated source if REST is unreliable; same fallback pattern as before).
2. Run it once. Verify: all 195 countries have a `borders` field. Island nations with no land borders have `borders: []`.
3. Extend Rust `Country` struct + DB schema (add `borders TEXT` column, store as JSON-encoded string).
4. Update seed loader to deserialize borders correctly.
5. Add `current_mode` and `border_run_difficulty` to settings.

**Quality gates pass. STOP.**

### Phase 2 — Domain core
1. `domain/border_run/graph.rs` + tests
2. `domain/border_run/pathfinding.rs` + tests (BFS + all-shortest-paths)
3. `domain/border_run/generator.rs` + tests (difficulty buckets, seeded determinism)
4. `domain/border_run/game.rs` + tests (all GuessOutcome cases, win, lose)
5. All `cargo test` green

**Quality gates pass. STOP.**

### Phase 3 — Tauri commands + state
1. Extend `AppState` with `border_run: Mutex<Option<BorderRunGame>>`
2. Implement `border_run_start`, `border_run_guess`, `border_run_reveal_path`
3. Add `tauri-api.ts` wrappers + TS types in `src/types/domain.ts`
4. Integration test in `src-tauri/tests/`: start a game, submit a known-good adjacency, win

**Quality gates pass. STOP.**

### Phase 4 — Mode infrastructure (Home + segmented control + persistence)
1. New `mode-store.ts` (Zustand): loads `current_mode` from settings on boot, exposes setter that updates settings backend + local state.
2. Extend settings backend to accept and persist `current_mode` and `border_run_difficulty`.
3. HomePage: add subtitle line below the title showing the current mode's translated name.
4. HomePage: build the prominent segmented control `[Practice | Border Run]` between subtitle and map area.
5. Switching mode swaps the page content area (Practice content vs. Border Run setup placeholder for now).
6. No Border Run gameplay yet — just the mode switch works and persists across restarts.
7. All new strings added to both locale files.

**Quality gates pass. STOP. (User will test mode persistence here.)**

### Phase 5 — Border Run setup + difficulty slider
1. Build `Slider.tsx` design-system primitive (3-position, snap, keyboard-accessible).
2. Build `BorderRunSetup.tsx` on Home (when mode = border_run): difficulty slider + "Start Border Run" button.
3. Slider persists choice via settings.
4. Button navigates to `/border-run` route (page placeholder for now).

**Quality gates pass. STOP.**

### Phase 6 — Border Run gameplay UI
1. `BorderRunPage.tsx` with top bar (start/end countries + attempts counter + exit).
2. `BorderRunMap.tsx` rendering the country-level map with blank-mode coloring (single fill, hidden internal borders) — verify visually that you see only continent silhouettes.
3. Input field with bilingual fuzzy matching wired to `border_run_guess`.
4. Color updates on accepted guesses (green on shortest path, orange detour, red flash for non-adjacent).
5. Chain display below input.
6. All strings in locale files.

**Quality gates pass. STOP. (User will play several games here to validate.)**

### Phase 7 — Result screens + polish
1. Win modal: stats + replay/difficulty buttons.
2. Lose modal: reveal shortest path on map in green + replay/difficulty.
3. Animations: map color transitions (200ms), attempt-counter decrement, page enter/exit.
4. Reduced-motion support.
5. Empty/error states (e.g., generator can't find a pair at this difficulty after N tries → toast + downgrade to next-easier difficulty).

**Quality gates pass. STOP. (Final manual test.)**

---

## 9. Quality gates checklist (every phase)
- [ ] `pnpm lint`
- [ ] `pnpm test:unit`
- [ ] `cargo fmt --check`
- [ ] `cargo clippy --all-targets -- -D warnings`
- [ ] `cargo test`
- [ ] `pnpm build`
- [ ] No `any`, no `unwrap()` in non-test Rust, no `console.log`
- [ ] New public functions documented
- [ ] All new UI strings in both `en.json` and `fr.json`
- [ ] **NO git commands run**

---

## 10. Reporting protocol

After every phase:
1. List every file created/changed.
2. Show test output (totals, no need for full log).
3. State explicitly: "No git commands were run."
4. State explicitly what the user should manually test (especially Phase 4, 6, 7).
5. Stop and wait.

---

## 11. Working protocol
- If a spec point is ambiguous, ASK before guessing.
- If you need to add a dependency, ASK.
- If a design tradeoff comes up (e.g., performance of pair pre-computation at startup), flag it instead of silently picking.
- Never push, commit, or stage anything.

**Begin with Phase 0 only. Stop after.**
