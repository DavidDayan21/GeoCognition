//! The practice loop: question selection and answer submission.
//!
//! Each `#[tauri::command]` is a thin wrapper over a plain async function
//! taking the pool and run state, so the full flow is covered by
//! integration tests without a running Tauri app.

use chrono::{DateTime, SecondsFormat, Utc};
use rand::Rng;
use sqlx::SqlitePool;
use tauri::State;

use crate::domain::grading;
use crate::domain::models::{AnswerResult, QuestionPayload};
use crate::domain::question_mode::QuestionMode;
use crate::domain::queue::{self, Candidate, DrillEntry};
use crate::domain::sm2::{self, Sm2State};
use crate::error::AppError;
use crate::infra::db;
use crate::state::{AppState, RunState};

/// `next_review` assigned to cards that have never been reviewed, making
/// them maximally overdue so new material is mixed in first.
const UNSEEN_NEXT_REVIEW: &str = "1970-01-01T00:00:00Z";

/// Picks the next question for the infinite practice loop.
#[tauri::command]
pub async fn next_question(state: State<'_, AppState>) -> Result<QuestionPayload, AppError> {
    let mut run = state.run.lock().await;
    pick_next_question(&state.pool, &mut run).await
}

/// Grades an answer, updates SM-2 state and the answer log, and applies
/// the in-run drill rule on failure.
#[tauri::command]
pub async fn submit_answer(
    state: State<'_, AppState>,
    country_id: i64,
    mode: String,
    user_input: String,
    response_time_ms: i64,
) -> Result<AnswerResult, AppError> {
    let mode = QuestionMode::parse(&mode)
        .ok_or_else(|| AppError::InvalidInput(format!("unknown mode: {mode}")))?;
    let mut run = state.run.lock().await;
    apply_answer(
        &state.pool,
        &mut run,
        country_id,
        mode,
        &user_input,
        response_time_ms,
    )
    .await
}

/// Selection logic behind [`next_question`]:
/// drill queue first, then SM-2 priority (overdue, then lowest EF).
pub async fn pick_next_question(
    pool: &SqlitePool,
    run: &mut RunState,
) -> Result<QuestionPayload, AppError> {
    let settings = db::load_settings(pool).await?;
    let enabled_modes = settings.enabled_modes();

    if let Some(pos) = ready_drill_position(run, &enabled_modes) {
        let entry = run.drill_queue.remove(pos);
        return question_payload(pool, entry.country_id, entry.mode, run.current_index).await;
    }

    let mode = pick_mode(pool, run, &enabled_modes).await?;
    let candidates = load_candidates(pool, &settings.selected_continents, mode).await?;
    let (country_id, mode) = queue::next_card(
        &candidates,
        &[],
        run.current_index,
        Utc::now(),
        &mut run.rng,
    )
    .ok_or_else(|| AppError::NotFound("no candidate question available".into()))?;
    question_payload(pool, country_id, mode, run.current_index).await
}

/// Grading + persistence logic behind [`submit_answer`].
pub async fn apply_answer(
    pool: &SqlitePool,
    run: &mut RunState,
    country_id: i64,
    mode: QuestionMode,
    user_input: &str,
    response_time_ms: i64,
) -> Result<AnswerResult, AppError> {
    let settings = db::load_settings(pool).await?;
    let (name, capital): (String, String) =
        sqlx::query_as("SELECT name, capital FROM countries WHERE id = ?")
            .bind(country_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("country {country_id}")))?;

    let correct_answer = match mode {
        QuestionMode::Capital => capital,
        QuestionMode::Flag => name.clone(),
    };
    let quality = grading::grade_with_tolerance(
        user_input,
        &correct_answer,
        settings.fuzzy_tolerance.ratio(),
    );
    let is_correct = quality >= 3;

    let previous: Option<(f64, i64, i64)> = sqlx::query_as(
        "SELECT ef, repetitions, interval_days FROM user_stats WHERE country_id = ? AND mode = ?",
    )
    .bind(country_id)
    .bind(mode.as_str())
    .fetch_optional(pool)
    .await?;
    let previous = previous
        .map(|(ef, repetitions, interval_days)| Sm2State {
            ef,
            repetitions: repetitions as u32,
            interval_days: interval_days as u32,
        })
        .unwrap_or_default();

    let next = sm2::update(previous, quality);
    let now = Utc::now();
    let now_s = now.to_rfc3339_opts(SecondsFormat::Secs, true);
    let next_review_s = (now + chrono::Duration::days(i64::from(next.interval_days)))
        .to_rfc3339_opts(SecondsFormat::Secs, true);

    let mut tx = pool.begin().await?;
    sqlx::query(
        "INSERT INTO user_stats \
         (country_id, mode, ef, repetitions, interval_days, next_review, last_reviewed, \
          total_attempts, total_correct) \
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) \
         ON CONFLICT(country_id, mode) DO UPDATE SET \
           ef = excluded.ef, \
           repetitions = excluded.repetitions, \
           interval_days = excluded.interval_days, \
           next_review = excluded.next_review, \
           last_reviewed = excluded.last_reviewed, \
           total_attempts = user_stats.total_attempts + 1, \
           total_correct = user_stats.total_correct + excluded.total_correct",
    )
    .bind(country_id)
    .bind(mode.as_str())
    .bind(next.ef)
    .bind(i64::from(next.repetitions))
    .bind(i64::from(next.interval_days))
    .bind(&next_review_s)
    .bind(&now_s)
    .bind(i64::from(is_correct))
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO answers_log \
         (country_id, mode, user_input, is_correct, quality, response_time_ms, answered_at) \
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(country_id)
    .bind(mode.as_str())
    .bind(user_input)
    .bind(i64::from(is_correct))
    .bind(i64::from(quality))
    .bind(response_time_ms)
    .bind(&now_s)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;

    let answered_index = run.current_index;
    if quality == 0 {
        let reappear_at_index = queue::drill_reappear_index(answered_index, &mut run.rng);
        run.drill_queue.push(DrillEntry {
            country_id,
            mode,
            reappear_at_index,
            failed_at_index: answered_index,
        });
    }
    run.current_index += 1;

    Ok(AnswerResult {
        quality,
        is_correct,
        correct_answer,
        country_name: name,
        ef: next.ef,
        interval_days: next.interval_days,
        next_review: next_review_s,
    })
}

/// Index of the drill entry to re-ask now, if any: ready entries only,
/// restricted to enabled modes, oldest failure first.
fn ready_drill_position(run: &RunState, enabled_modes: &[QuestionMode]) -> Option<usize> {
    run.drill_queue
        .iter()
        .enumerate()
        .filter(|(_, e)| {
            e.reappear_at_index <= run.current_index && enabled_modes.contains(&e.mode)
        })
        .min_by_key(|(_, e)| e.failed_at_index)
        .map(|(position, _)| position)
}

/// Chooses the question mode. With both modes enabled, the less-practiced
/// mode is picked slightly more often (60/40) to balance exposure.
async fn pick_mode(
    pool: &SqlitePool,
    run: &mut RunState,
    enabled_modes: &[QuestionMode],
) -> Result<QuestionMode, AppError> {
    match enabled_modes {
        [] => Err(AppError::InvalidInput("no question mode enabled".into())),
        [single] => Ok(*single),
        _ => {
            let (capital_attempts, flag_attempts) = attempts_per_mode(pool).await?;
            let p_flag = if flag_attempts < capital_attempts {
                0.6
            } else if flag_attempts > capital_attempts {
                0.4
            } else {
                0.5
            };
            Ok(if run.rng.random_bool(p_flag) {
                QuestionMode::Flag
            } else {
                QuestionMode::Capital
            })
        }
    }
}

/// Lifetime attempt counts per mode, for mode balancing.
async fn attempts_per_mode(pool: &SqlitePool) -> Result<(i64, i64), AppError> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT mode, COALESCE(SUM(total_attempts), 0) FROM user_stats GROUP BY mode",
    )
    .fetch_all(pool)
    .await?;
    let mut capital = 0;
    let mut flag = 0;
    for (mode, attempts) in rows {
        match mode.as_str() {
            "capital" => capital = attempts,
            "flag" => flag = attempts,
            _ => {}
        }
    }
    Ok((capital, flag))
}

/// All cards of `mode` in the selected continents, with SM-2 defaults
/// for never-reviewed cards.
async fn load_candidates(
    pool: &SqlitePool,
    selected_continents: &[String],
    mode: QuestionMode,
) -> Result<Vec<Candidate>, AppError> {
    let rows: Vec<(i64, String, f64, String)> = sqlx::query_as(
        "SELECT c.id, c.continent, COALESCE(s.ef, 2.5), COALESCE(s.next_review, ?) \
         FROM countries c \
         LEFT JOIN user_stats s ON s.country_id = c.id AND s.mode = ?",
    )
    .bind(UNSEEN_NEXT_REVIEW)
    .bind(mode.as_str())
    .fetch_all(pool)
    .await?;

    let mut candidates = Vec::new();
    for (country_id, continent, ef, next_review) in rows {
        if !selected_continents.contains(&continent) {
            continue;
        }
        let next_review = DateTime::parse_from_rfc3339(&next_review)?.with_timezone(&Utc);
        candidates.push(Candidate {
            country_id,
            mode,
            ef,
            next_review,
        });
    }
    Ok(candidates)
}

/// Builds the frontend payload for the chosen card.
async fn question_payload(
    pool: &SqlitePool,
    country_id: i64,
    mode: QuestionMode,
    question_index: u64,
) -> Result<QuestionPayload, AppError> {
    let (name, iso_alpha2): (String, String) =
        sqlx::query_as("SELECT name, iso_alpha2 FROM countries WHERE id = ?")
            .bind(country_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("country {country_id}")))?;
    Ok(QuestionPayload {
        country_id,
        mode,
        country_name: matches!(mode, QuestionMode::Capital).then_some(name),
        iso_alpha2: matches!(mode, QuestionMode::Flag).then_some(iso_alpha2),
        question_index,
    })
}
