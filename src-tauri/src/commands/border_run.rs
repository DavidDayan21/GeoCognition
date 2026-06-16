//! Border Run commands: start a game, submit a guess, reveal the solution.
//!
//! The `#[tauri::command]` wrappers are thin: they lock the in-memory game
//! slot and delegate to the plain functions below, which hold all the logic
//! and are unit-tested directly.

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use tauri::State;

use crate::domain::border_run::game::{BorderRunGame, GuessOutcome};
use crate::domain::border_run::pathfinding::shortest_path;
use crate::domain::grading::grade_bilingual;
use crate::domain::models::{BorderRunGameDto, Difficulty, GameStatus, GuessKind, GuessOutcomeDto};
use crate::error::AppError;
use crate::state::{AppState, BorderRunResources};

/// Starts a new game at `difficulty`, replacing any game in progress.
#[tauri::command]
pub async fn border_run_start(
    state: State<'_, AppState>,
    difficulty: Difficulty,
) -> Result<BorderRunGameDto, AppError> {
    let mut slot = state.border_run.lock().await;
    let mut rng = StdRng::from_os_rng();
    start_game(&state.border_run_resources, &mut slot, difficulty, &mut rng)
}

/// Submits a typed country name against the active game.
#[tauri::command]
pub async fn border_run_guess(
    state: State<'_, AppState>,
    input: String,
) -> Result<GuessOutcomeDto, AppError> {
    let mut slot = state.border_run.lock().await;
    process_guess(&state.border_run_resources, &mut slot, &input)
}

/// Reveals one shortest start→end path for the active game (lose screen).
#[tauri::command]
pub async fn border_run_reveal_path(state: State<'_, AppState>) -> Result<Vec<String>, AppError> {
    let slot = state.border_run.lock().await;
    reveal_path(&state.border_run_resources, &slot)
}

/// Picks a random pair at `difficulty`, stores a fresh game in `slot`, and
/// returns its snapshot. Errors if no pair exists at that difficulty.
pub fn start_game<R: Rng>(
    resources: &BorderRunResources,
    slot: &mut Option<BorderRunGame>,
    difficulty: Difficulty,
    rng: &mut R,
) -> Result<BorderRunGameDto, AppError> {
    let (start, end) = resources.buckets.pick(difficulty, rng).ok_or_else(|| {
        AppError::NotFound(format!(
            "no country pair available at difficulty {difficulty:?}"
        ))
    })?;
    let game = BorderRunGame::new(start, end, difficulty, &resources.graph);
    let dto = to_game_dto(&game);
    *slot = Some(game);
    Ok(dto)
}

/// Resolves `input` to a country and applies it to the active game.
pub fn process_guess(
    resources: &BorderRunResources,
    slot: &mut Option<BorderRunGame>,
    input: &str,
) -> Result<GuessOutcomeDto, AppError> {
    let game = slot
        .as_mut()
        .ok_or_else(|| AppError::NotFound("no active border run game".into()))?;
    if game.status != GameStatus::InProgress {
        return Err(AppError::InvalidInput(
            "the border run game has already finished".into(),
        ));
    }
    let candidate = resolve_country(resources, input);
    let outcome = game.submit(candidate.as_deref(), &resources.graph);
    Ok(to_outcome_dto(outcome, game))
}

/// Returns one shortest path for the active game, or errors if there is none.
pub fn reveal_path(
    resources: &BorderRunResources,
    slot: &Option<BorderRunGame>,
) -> Result<Vec<String>, AppError> {
    let game = slot
        .as_ref()
        .ok_or_else(|| AppError::NotFound("no active border run game".into()))?;
    Ok(shortest_path(&resources.graph, &game.start, &game.end).unwrap_or_default())
}

/// Fuzzy-matches `input` against every country's English and French name,
/// returning the ISO alpha-3 of the best match (quality >= 3), or `None`.
fn resolve_country(resources: &BorderRunResources, input: &str) -> Option<String> {
    let mut best_quality = 0u8;
    let mut best_iso: Option<String> = None;
    for country in &resources.countries {
        let quality = grade_bilingual(input, &country.name, &country.name_fr);
        if quality > best_quality {
            best_quality = quality;
            best_iso = Some(country.iso_alpha3.clone());
            if quality == 5 {
                break; // Exact match; nothing can beat it.
            }
        }
    }
    best_iso
}

fn to_game_dto(game: &BorderRunGame) -> BorderRunGameDto {
    BorderRunGameDto {
        start: game.start.clone(),
        end: game.end.clone(),
        chain: game.chain.clone(),
        attempts_used: game.attempts_used,
        attempts_limit: game.attempts_limit,
        attempts_remaining: game.attempts_remaining(),
        status: game.status,
        difficulty: game.difficulty,
    }
}

fn to_outcome_dto(outcome: GuessOutcome, game: &BorderRunGame) -> GuessOutcomeDto {
    let (kind, iso3, on_shortest_path, accepted) = match outcome {
        GuessOutcome::Accepted {
            iso3,
            on_shortest_path,
        } => (GuessKind::Accepted, Some(iso3), on_shortest_path, true),
        GuessOutcome::NotAdjacent { iso3 } => (GuessKind::NotAdjacent, Some(iso3), false, false),
        GuessOutcome::AlreadyInChain { iso3 } => {
            (GuessKind::AlreadyInChain, Some(iso3), false, false)
        }
        GuessOutcome::NotRecognized => (GuessKind::NotRecognized, None, false, false),
        GuessOutcome::Won {
            iso3,
            on_shortest_path,
        } => (GuessKind::Won, Some(iso3), on_shortest_path, true),
        GuessOutcome::Lost {
            iso3,
            accepted,
            on_shortest_path,
        } => (GuessKind::Lost, Some(iso3), on_shortest_path, accepted),
    };
    GuessOutcomeDto {
        kind,
        iso3,
        on_shortest_path,
        accepted,
        game: to_game_dto(game),
    }
}
