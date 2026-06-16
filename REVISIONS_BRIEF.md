# GeoCognition — Revisions Brief

Revisions to the existing GeoCognition app. The previous full briefs (PROJECT_BRIEF.md and the Border Run brief) defined the foundations. This document extends/changes specific behaviors.

## ⚠️ READ FIRST — HARD RULES ⚠️

1. **Do NOT touch git.** No `git add`, `git commit`, `git push`, `rebase`, `stash`, or any state-changing git command. Files on disk only. The user manages the repo themselves.
2. **Stack locked**: Tauri 2 + Rust + React + TypeScript. Ask before adding any new dependency.
3. **No `any` in TypeScript. No `unwrap()` in non-test Rust paths.**
4. **Bilingual rule unchanged**: every new/changed UI string MUST be added to both `src/i18n/locales/en.json` and `src/i18n/locales/fr.json`. Use natural French.
5. **Platform**: Windows + PowerShell. No WSL/bash.
6. **STOP at every phase boundary.** Wait for explicit "go" before continuing.
7. **Quality gates after every phase**: `pnpm lint`, `pnpm test:unit`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `pnpm build`. All must be green.
8. **Existing tests must still pass.** Adapt them as the behavior changes — do not delete tests; rewrite them to match the new spec.
9. **Reporting**: at the end of every phase, list files changed, test totals, what to manually test, and confirm explicitly "No git commands were run."

---

## What changes (summary)

1. **Practice Quiz** — replace the "Press Enter to continue" hint with a clickable button (Enter still works in parallel).
2. **Practice Home map** — reduce to ~75% of current size.
3. **Border Run map** — auto-zoom at game start on the bounding region containing start + end countries (with a sensible cap when they're far apart); free pan/zoom via trackpad/wheel/drag at all times during the game.
4. **Border Run win/lose UI** — replace the centered modal with a discreet bottom-center bar so the user can contemplate the final map. "Play again" button visible. Optimal path is auto-revealed (in green) if the user won via a non-optimal route, and on loss.
5. **Border Run gameplay mechanics — MAJOR CHANGE**:
   - Users can type ANY of the 195 countries. No adjacency validation. Every accepted (recognized) country is placed on the map and decrements the counter.
   - Attempt limits become `shortest_path_length + 3`.
   - Coloring: blue = start/end, green = countries on the shortest path, orange = countries adjacent to a shortest-path country but not on it, red = all other accepted countries (disconnected).
   - Win = the start and the end are connected through a chain of placed countries (where each consecutive pair in the chain is adjacent on the underlying border graph).
   - Lose = attempts exhausted without that chain existing.
6. **Border Run — hint system**: a single hint per game (regardless of difficulty), free of cost, that reveals the first letter of one shortest-path country the user hasn't yet placed.
7. **Border Run — undo**: a single undo per game, removes the last accepted guess and restores 1 attempt.

---

## Phase 0 — Environment + plan check

Confirm the dev environment is still good (rustc, cargo, node, pnpm, cargo tauri all available, expected versions). Confirm working tree state (read-only `git status` is OK — do NOT modify anything, just report). List the files this brief will likely touch, grouped per phase, so the user can confirm the scope. STOP and wait for explicit "go".

---

## Phase 1 — Practice mode visual fixes (#1, #2)

### 1.1 Replace "Press Enter to continue" hint with a button
In `PracticeView` (or wherever the post-answer instruction is shown), replace the text "Press Enter to continue" with an explicit, clickable button styled like the "I don't know" button — same visual weight, same component primitives. The button label is translatable: `practice.continue` ("Continue" / "Continuer").

Behavior:
- Visible only when there's a pending answer feedback waiting to be dismissed (i.e., the same condition that currently shows the hint).
- Clicking it advances to the next question.
- Pressing Enter ALSO advances to the next question (current behavior preserved — keyboard shortcut still works).
- The button must be focusable, keyboard-accessible, and respect `prefers-reduced-motion`.

### 1.2 Reduce Practice Home map size to ~75%
The world map on the Home page in Practice mode (the continent selector — NOT Border Run's map and NOT the Stats heatmap) is currently rendered at `height=440` (Phase 7's value, may have evolved). Reduce to roughly 75% of its current rendered area. Implementation: lower the `<ComposableMap>` `height` prop AND adjust `projectionConfig.scale` proportionally so the geometry still fits — recompute `scale` via `geoEqualEarth().fitExtent` on the continents geometry against the new dimensions (or scale the existing value proportionally — explain your choice).

Make sure the map's surrounding card and the page layout still look balanced (don't leave huge empty space around the smaller map). Adjust container max-width / spacing as needed.

### Quality gates → STOP.

### What to test manually
- Practice quiz: answer a question, see the "Continue" button, click it (advances), do the same with Enter (advances).
- Home page (Practice mode): the world map is visibly smaller than before, but the page still feels coherent.

---

## Phase 2 — Border Run major mechanic change (#5)

This phase RESHAPES the Border Run game logic. Existing Rust domain/tests must be updated, not just extended.

### 2.1 Domain changes (`src-tauri/src/domain/border_run/`)

#### Attempts limit derivation
Compute `attempts_limit = shortest_path_length + 3` for each new game. Replace the hardcoded 6/10/15 limits.

The `Difficulty` enum's `attempts_limit` method becomes irrelevant for limit derivation (the limit depends on the specific generated pair's path length, not just the difficulty bucket). Either remove the method or rename to something like `padding()` returning the constant `3` — your call, but document the choice.

#### Adjacency check REMOVED for accept/reject
The `GuessOutcome::NotAdjacent` variant disappears. Every recognized country (i.e., it fuzzy-matches one of the 195) becomes `Accepted`. Update:
- `BorderRunGame::submit` logic
- `GuessOutcome` enum (remove `NotAdjacent`)
- `GuessKind` enum / DTOs accordingly
- Frontend types (`src/types/domain.ts`)

Keep `AlreadyInChain` (still free, still doesn't decrement attempts).
Keep `NotRecognized` (still free, gibberish input doesn't count).

#### New country-state classification (for UI coloring)
On the backend, given the current `BorderRunGame` state, expose a method/field that classifies each placed country into one of:
- `Start` (the start country)
- `End` (the end country)
- `OnShortestPath` (country is in the `shortest_path_set` computed at game start)
- `AdjacentToShortestPath` (country is NOT in the shortest path set, but at least one of its border neighbors IS) — orange in UI
- `Disconnected` (none of the above — purely off-path) — red in UI

This classification is reported via the `GuessOutcome::Accepted` variant (so the frontend can color the country immediately) AND via a `classify_country(iso3) -> CountryClassification` query (so the result screen / undo can re-derive colors).

#### Win detection
Win condition becomes: there exists a connected path in the **border graph** from `start` to `end` such that every node on the path is currently placed in the chain (including start and end, which are always implicitly "placed"). Implementation: a small BFS over `placed_nodes ∪ {start, end}` restricted to graph edges, checking reachability from start to end.

Lose: `attempts_used == attempts_limit && status != Won`.

#### Tests to update (`src-tauri/tests/border_run_*`)
- Remove or rewrite tests asserting the `NotAdjacent` behavior — these no longer apply.
- Add: "any recognized country is accepted, decrements attempts, gets a classification".
- Add: "win via the exact shortest path", "win via a longer detour that still connects", "lose when chain never connects despite using all attempts".
- Update integration tests in `src-tauri/tests/`.

### 2.2 Frontend updates

#### `border-run-store.ts`
- Drop the `NotAdjacent` flash logic (or repurpose it for the deprecation of "Disconnected" if you want a subtle indicator — but no flash, the country just stays on the map in its color).
- Replace the per-country color derivation to use the new backend classification.
- Color tokens (`tokens.css`): map the 4 states to the existing `--br-start/end/path/detour/blank` plus a NEW `--br-disconnected` (red, both light and dark themes).

#### `BorderRunMap.tsx`
Always render every placed country in its classification color. No more transient red flash for non-adjacency. The map state is purely a function of `placed_countries` + their classifications.

#### `AttemptsCounter.tsx`
The "low attempts" thresholds need rethinking now that limits vary per-pair (e.g., attempts_limit could be 5 for an Easy pair or 13 for a Hard pair). Use proportional thresholds: amber when `remaining / limit ≤ 0.33`, red on the last one.

#### `ChainDisplay.tsx`
Render every placed country chip with its classification color. The chain is no longer ordered by "construction adjacency" (since the user could place anything); display them in the order they were guessed.

### Translations
- Remove `borderRun.input.notAdjacent` (no longer used).
- Keep `borderRun.input.notRecognized` and `borderRun.input.alreadyInChain`.

### Quality gates → STOP.

### What to test manually
- Start a Border Run game. Type any random country — it's accepted, colored, decrements attempts.
- Type a country on the shortest path — it appears green.
- Type a country adjacent to a shortest-path country but not on it — orange.
- Type a totally disconnected country (e.g., Australia when playing Portugal→Spain) — red.
- Verify victory when you've actually built a connected path; verify you don't win just by guessing 5 random unconnected countries.

---

## Phase 3 — Border Run map zoom (#3)

### 3.1 Auto-zoom at game start
When a new game starts, the map automatically zooms to the bounding region containing the start and end countries' coordinates (use the `lat`/`lng` fields already present in `countries.json`, expanded by a padding of ~5° in each direction).

**Sensible cap**: if the geographic distance between start and end exceeds a threshold (e.g., great-circle distance > 8000 km, or the bounding box spans more than ~120° of longitude), don't zoom at all — show the full map. This avoids the "Portugal → Japan" case where zooming wouldn't help.

Animate the zoom-in over ~500ms (Framer Motion or a CSS transition on the SVG transform), respecting `prefers-reduced-motion` (snap directly to final transform if reduced motion is set).

### 3.2 Free pan + zoom via trackpad / mouse wheel / drag
At any point during the game, the user can:
- **Wheel / trackpad pinch**: zoom in/out around the cursor position
- **Drag**: pan the map

Implementation: use `react-simple-maps`' `ZoomableGroup` (it has this built-in) or implement custom transform handling. If using `ZoomableGroup`, set sensible `minZoom`/`maxZoom` bounds (e.g., 1–8) and a `center` prop that we control programmatically for the auto-zoom.

Add a small "reset zoom" button (an icon button in the corner of the map) that returns to the default (auto-zoomed) view in case the user gets lost. Translatable tooltip: `borderRun.resetZoom`.

### Quality gates → STOP.

### What to test manually
- Start a game with two nearby countries (e.g., Portugal → France) → map zooms in to that region.
- Start a game with two distant countries (e.g., Portugal → Japan) → no auto-zoom, full map visible.
- During the game, use wheel/trackpad to zoom; drag to pan; click "reset zoom".

---

## Phase 4 — Border Run result UI (#4)

Replace the modal-based result screen with a **bottom-center bar** that:
- Appears at the bottom of the screen when the game ends (win or lose)
- Is compact (full width or a centered card a few hundred pixels wide — your call, but it should not cover the map)
- Shows a brief result line:
  - **Win + optimal**: "Connected! You found an optimal route."
  - **Win + non-optimal**: "Connected! Optimal route shown in green."
  - **Lose**: "Out of attempts. Optimal route shown in green."
- Contains: a primary "Play again" button (restarts same difficulty), a secondary "Change difficulty" button (returns to Home setup), and a small "✕" to dismiss the bar (the user can keep contemplating the map; if dismissed, the bar can be re-opened via a small floating "results" button in a corner)

**Auto-reveal optimal path** in green on the map for:
- Loss (always)
- Win via non-optimal route (so the user sees what they missed)

For an optimal win, no extra reveal needed (the green path is already on screen).

The existing `BorderRunResult.tsx` is replaced by this new component (rename or delete + create new). Existing modal behavior is gone.

Translations: rework the `borderRun.win.*` / `lose.*` strings to fit the new compact format. Keep `borderRun.playAgain`, `borderRun.changeDifficulty`. Add a new `borderRun.dismissResult` and `borderRun.showResult` for the dismiss/reopen.

### Quality gates → STOP.

### What to test manually
- Win optimally → bottom bar shows "optimal" message.
- Win with a detour → bar shows non-optimal message, map auto-reveals the optimal path in green.
- Lose → bar shows out-of-attempts, map reveals optimal path in green.
- Dismiss bar with ✕ → bar disappears, the map is fully visible. A "show results" button in a corner brings it back.

---

## Phase 5 — Border Run hint system (#6) + undo (#7)

### 5.1 Hint button
One hint per game, regardless of difficulty. Free (doesn't cost an attempt).

Behavior:
- A "Hint" button is visible during the game (place it next to the input field or in the top bar).
- Clicking it reveals a small inline message: "Hint: a country on the shortest path starts with the letter **X**."
- The letter is the first letter of a random country from `shortest_path_set` that the user has NOT yet placed (sampled with seeded RNG for testability).
- If all shortest-path countries are already placed, the hint button is disabled with a tooltip "No hint available — you're already on the optimal path".
- Once used, the button is disabled for the rest of the game.

State: track `hint_used: bool` and `hint_letter: Option<char>` in `BorderRunGame`. Expose via the DTO. Frontend stores it and shows it persistently until end of game.

New Tauri command: `border_run_request_hint() -> Result<HintResult, AppError>` where `HintResult = { letter: char, used: bool }` (or returns an error if no hint is available).

Translations: `borderRun.hint.button`, `borderRun.hint.message` (with `{{letter}}` interpolation), `borderRun.hint.unavailable`.

### 5.2 Undo button
One undo per game, regardless of difficulty.

Behavior:
- An "Undo" button is visible during the game.
- Clicking it removes the most recently placed country from the chain AND restores 1 attempt (i.e., `attempts_used -= 1`).
- Once used, the button is disabled.
- If the chain is empty (no guesses yet), the button is also disabled.
- Undo never "un-wins" or "un-loses" a finished game — it's only available while status is `InProgress`.

State: track `undo_used: bool` in `BorderRunGame`. New Tauri command: `border_run_undo() -> Result<BorderRunGameDto, AppError>`.

Translations: `borderRun.undo.button`, `borderRun.undo.unavailable`.

### Tests
- Backend: hint returns a letter from a non-placed shortest-path country; second hint call is rejected; hint disabled when all shortest-path countries are placed.
- Backend: undo removes last guess, restores attempt; second undo rejected; undo with empty chain rejected; undo on a finished game rejected.
- Frontend: hint/undo buttons disable correctly after one use.

### Quality gates → STOP.

### What to test manually
- Click "Hint" → see a letter. Try again — button disabled.
- Place a few countries, click "Undo" → last one disappears, attempts counter goes back up by 1. Click "Undo" again — disabled.
- Start a new game → hint and undo are re-enabled.
- Place all shortest-path countries first, then click Hint → "no hint available" message.

---

## Phase 6 — Final pass

Final phase: full regression check, unused-code cleanup (e.g., dead `NotAdjacent` code paths from Phase 2 that may have lingered in tests/fixtures), and a final round of quality gates.

Report a complete change inventory (files added, removed, modified across all 6 phases) so the user can review before committing.

### Quality gates → STOP.

---

## Quality gates checklist (every phase)
- [ ] `pnpm lint`
- [ ] `pnpm test:unit`
- [ ] `cargo fmt --check`
- [ ] `cargo clippy --all-targets -- -D warnings`
- [ ] `cargo test`
- [ ] `pnpm build`
- [ ] No `any`, no non-test `unwrap()`, no `console.log`
- [ ] New public functions documented
- [ ] All new/changed UI strings in both `en.json` and `fr.json`
- [ ] **NO git commands run**

---

## Working protocol
- If a spec point is ambiguous, ASK before guessing.
- If you need a new dependency, ASK.
- For any tradeoff (e.g., performance of recomputing classifications on every guess), flag it instead of silently choosing.
- Never push, commit, or stage anything.

**Begin with Phase 0 only. Stop after.**
