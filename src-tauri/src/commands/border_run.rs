//! Border Run commands: start a game, submit a guess, reveal the solution.
//!
//! The `#[tauri::command]` wrappers are thin: they lock the in-memory game
//! slot and delegate to the plain functions below, which hold all the logic
//! and are unit-tested directly.

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use tauri::State;

use crate::domain::border_run::game::{BorderRunGame, GuessOutcome, HintError, UndoError};
use crate::domain::border_run::pathfinding::shortest_path;
use crate::domain::grading::grade_bilingual;
use crate::domain::models::{
    BorderRunGameDto, Difficulty, GameStatus, GuessKind, GuessOutcomeDto, HintResult, Language,
};
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

/// Spends the single free hint, revealing the first letter (in `language`) of
/// a shortest-path country the player has not yet placed.
#[tauri::command]
pub async fn border_run_request_hint(
    state: State<'_, AppState>,
    language: Language,
) -> Result<HintResult, AppError> {
    let mut slot = state.border_run.lock().await;
    let mut rng = StdRng::from_os_rng();
    request_hint(&state.border_run_resources, &mut slot, language, &mut rng)
}

/// Spends the single undo, removing the last guess and refunding its attempt.
#[tauri::command]
pub async fn border_run_undo(state: State<'_, AppState>) -> Result<BorderRunGameDto, AppError> {
    let mut slot = state.border_run.lock().await;
    undo(&mut slot)
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

/// Grants the active game's single hint. Picks a not-yet-placed shortest-path
/// country (seeded via `rng`), derives the first letter of its name in
/// `language`, records it on the game, and returns it.
pub fn request_hint<R: Rng>(
    resources: &BorderRunResources,
    slot: &mut Option<BorderRunGame>,
    language: Language,
    rng: &mut R,
) -> Result<HintResult, AppError> {
    let game = slot
        .as_mut()
        .ok_or_else(|| AppError::NotFound("no active border run game".into()))?;
    let iso3 = game.use_hint(rng).map_err(hint_error)?;
    let letter = first_letter(resources, &iso3, language).ok_or_else(|| {
        AppError::NotFound(format!("no name to derive a hint letter from for {iso3}"))
    })?;
    game.record_hint_letter(letter);
    Ok(HintResult { letter, used: true })
}

/// Applies the active game's single undo, returning the updated snapshot.
pub fn undo(slot: &mut Option<BorderRunGame>) -> Result<BorderRunGameDto, AppError> {
    let game = slot
        .as_mut()
        .ok_or_else(|| AppError::NotFound("no active border run game".into()))?;
    game.use_undo().map_err(undo_error)?;
    Ok(to_game_dto(game))
}

/// Maps a [`HintError`] to a user-facing [`AppError`].
fn hint_error(err: HintError) -> AppError {
    match err {
        HintError::AlreadyUsed => AppError::InvalidInput("the hint was already used".into()),
        HintError::Unavailable => {
            AppError::NotFound("every shortest-path country is already placed".into())
        }
        HintError::NotInProgress => {
            AppError::InvalidInput("the border run game has already finished".into())
        }
    }
}

/// Maps an [`UndoError`] to a user-facing [`AppError`].
fn undo_error(err: UndoError) -> AppError {
    match err {
        UndoError::AlreadyUsed => AppError::InvalidInput("the undo was already used".into()),
        UndoError::EmptyChain => AppError::InvalidInput("there is nothing to undo".into()),
        UndoError::NotInProgress => {
            AppError::InvalidInput("the border run game has already finished".into())
        }
    }
}

/// First letter (uppercased) of `iso3`'s name in the given language, or `None`
/// if the country is absent or has an empty name.
fn first_letter(resources: &BorderRunResources, iso3: &str, language: Language) -> Option<char> {
    let country = resources.countries.iter().find(|c| c.iso_alpha3 == iso3)?;
    let name = match language {
        Language::En => &country.name,
        Language::Fr => &country.name_fr,
    };
    name.chars().next().map(|c| c.to_ascii_uppercase())
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
        hint_used: game.hint_used,
        hint_letter: game.hint_letter,
        undo_used: game.undo_used,
    }
}

fn to_outcome_dto(outcome: GuessOutcome, game: &BorderRunGame) -> GuessOutcomeDto {
    let (kind, iso3, classification) = match outcome {
        GuessOutcome::Accepted {
            iso3,
            classification,
        } => (GuessKind::Accepted, Some(iso3), Some(classification)),
        GuessOutcome::AlreadyInChain { iso3 } => (GuessKind::AlreadyInChain, Some(iso3), None),
        GuessOutcome::NotRecognized => (GuessKind::NotRecognized, None, None),
        GuessOutcome::Won {
            iso3,
            classification,
        } => (GuessKind::Won, Some(iso3), Some(classification)),
        GuessOutcome::Lost {
            iso3,
            classification,
        } => (GuessKind::Lost, Some(iso3), Some(classification)),
    };
    GuessOutcomeDto {
        kind,
        iso3,
        classification,
        game: to_game_dto(game),
    }
}
