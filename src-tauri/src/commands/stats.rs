//! Read-only statistics queries for the Stats page.

use sqlx::SqlitePool;
use tauri::State;

use crate::domain::models::{
    ContinentStat, CountryMastery, DailyStat, ForgettingPoint, GlobalStats,
};
use crate::domain::question_mode::QuestionMode;
use crate::error::AppError;
use crate::state::AppState;

/// Per-country mastery for one mode (heatmap).
#[tauri::command]
pub async fn get_mastery_map(
    state: State<'_, AppState>,
    mode: String,
) -> Result<Vec<CountryMastery>, AppError> {
    let mode = QuestionMode::parse(&mode)
        .ok_or_else(|| AppError::InvalidInput(format!("unknown mode: {mode}")))?;
    fetch_mastery_map(&state.pool, mode).await
}

/// Daily attempts/accuracy over the last `days` days (progression chart).
#[tauri::command]
pub async fn get_progression(
    state: State<'_, AppState>,
    days: i64,
) -> Result<Vec<DailyStat>, AppError> {
    fetch_progression(&state.pool, days).await
}

/// Observed recall rate by days-since-previous-review (forgetting curve).
#[tauri::command]
pub async fn get_forgetting_curve(
    state: State<'_, AppState>,
) -> Result<Vec<ForgettingPoint>, AppError> {
    fetch_forgetting_curve(&state.pool).await
}

/// Aggregate mastery per continent (radar chart).
#[tauri::command]
pub async fn get_continent_breakdown(
    state: State<'_, AppState>,
) -> Result<Vec<ContinentStat>, AppError> {
    fetch_continent_breakdown(&state.pool).await
}

/// Lifetime totals (global stats strip).
#[tauri::command]
pub async fn get_global_stats(state: State<'_, AppState>) -> Result<GlobalStats, AppError> {
    fetch_global_stats(&state.pool).await
}

/// Row shape for the mastery map query:
/// (id, name, name_fr, iso_alpha2, iso_alpha3, continent, ef, repetitions,
/// total_attempts).
type MasteryRow = (
    i64,
    String,
    String,
    String,
    String,
    String,
    Option<f64>,
    Option<i64>,
    Option<i64>,
);

/// Query behind [`get_mastery_map`].
pub async fn fetch_mastery_map(
    pool: &SqlitePool,
    mode: QuestionMode,
) -> Result<Vec<CountryMastery>, AppError> {
    let rows: Vec<MasteryRow> = sqlx::query_as(
        "SELECT c.id, c.name, c.name_fr, c.iso_alpha2, c.iso_alpha3, c.continent, s.ef, \
             s.repetitions, s.total_attempts \
             FROM countries c \
             LEFT JOIN user_stats s ON s.country_id = c.id AND s.mode = ? \
             ORDER BY c.name",
    )
    .bind(mode.as_str())
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(
            |(
                country_id,
                name,
                name_fr,
                iso_alpha2,
                iso_alpha3,
                continent,
                ef,
                repetitions,
                total_attempts,
            )| {
                CountryMastery {
                    country_id,
                    name,
                    name_fr,
                    iso_alpha2,
                    iso_alpha3,
                    continent,
                    ef,
                    repetitions: repetitions.unwrap_or(0),
                    total_attempts: total_attempts.unwrap_or(0),
                }
            },
        )
        .collect())
}

/// Query behind [`get_progression`].
pub async fn fetch_progression(pool: &SqlitePool, days: i64) -> Result<Vec<DailyStat>, AppError> {
    if days <= 0 {
        return Err(AppError::InvalidInput("days must be positive".into()));
    }
    let rows: Vec<(String, i64, i64)> = sqlx::query_as(
        "SELECT date(answered_at) AS day, COUNT(*), COALESCE(SUM(is_correct), 0) \
         FROM answers_log \
         WHERE answered_at >= datetime('now', ?) \
         GROUP BY day ORDER BY day",
    )
    .bind(format!("-{days} days"))
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|(date, attempts, correct)| DailyStat {
            date,
            attempts,
            correct,
            accuracy: correct as f64 / attempts as f64,
        })
        .collect())
}

/// Query behind [`get_forgetting_curve`]: groups answers by the number of
/// days since the same card was last reviewed.
pub async fn fetch_forgetting_curve(pool: &SqlitePool) -> Result<Vec<ForgettingPoint>, AppError> {
    let rows: Vec<(i64, f64, i64)> = sqlx::query_as(
        "SELECT days_since, AVG(is_correct), COUNT(*) FROM ( \
           SELECT is_correct, \
             CAST(julianday(answered_at) - julianday(LAG(answered_at) OVER ( \
               PARTITION BY country_id, mode ORDER BY answered_at, id)) AS INTEGER) AS days_since \
           FROM answers_log \
         ) WHERE days_since IS NOT NULL \
         GROUP BY days_since ORDER BY days_since",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(
            |(days_since_review, correct_rate, samples)| ForgettingPoint {
                days_since_review,
                correct_rate,
                samples,
            },
        )
        .collect())
}

/// Query behind [`get_continent_breakdown`].
pub async fn fetch_continent_breakdown(pool: &SqlitePool) -> Result<Vec<ContinentStat>, AppError> {
    let rows: Vec<(String, i64, i64, i64, f64)> = sqlx::query_as(
        "SELECT c.continent, \
           COUNT(DISTINCT c.id), \
           COUNT(s.country_id), \
           COALESCE(SUM(CASE WHEN s.ef > 2.5 AND s.repetitions >= 3 THEN 1 ELSE 0 END), 0), \
           COALESCE(AVG(s.ef), 2.5) \
         FROM countries c \
         LEFT JOIN user_stats s ON s.country_id = c.id \
         GROUP BY c.continent ORDER BY c.continent",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(
            |(continent, total_countries, cards_seen, cards_mastered, avg_ef)| ContinentStat {
                continent,
                total_countries,
                cards_seen,
                cards_mastered,
                avg_ef,
            },
        )
        .collect())
}

/// Query behind [`get_global_stats`]. Streaks are computed over the full
/// answer log in chronological order.
pub async fn fetch_global_stats(pool: &SqlitePool) -> Result<GlobalStats, AppError> {
    let (total_mastered,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM user_stats WHERE ef > 2.5 AND repetitions >= 3")
            .fetch_one(pool)
            .await?;
    let (countries_seen,): (i64,) =
        sqlx::query_as("SELECT COUNT(DISTINCT country_id) FROM user_stats")
            .fetch_one(pool)
            .await?;
    let (total_answers, lifetime_accuracy): (i64, f64) =
        sqlx::query_as("SELECT COUNT(*), COALESCE(AVG(is_correct), 0.0) FROM answers_log")
            .fetch_one(pool)
            .await?;

    let outcomes: Vec<(i64,)> = sqlx::query_as("SELECT is_correct FROM answers_log ORDER BY id")
        .fetch_all(pool)
        .await?;
    let mut current_streak = 0;
    let mut longest_streak = 0;
    for (is_correct,) in outcomes {
        if is_correct != 0 {
            current_streak += 1;
            longest_streak = longest_streak.max(current_streak);
        } else {
            current_streak = 0;
        }
    }

    Ok(GlobalStats {
        total_mastered,
        countries_seen,
        total_answers,
        lifetime_accuracy,
        current_streak,
        longest_streak,
    })
}
