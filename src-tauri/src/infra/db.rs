use std::path::Path;
use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

use crate::domain::models::Settings;
use crate::error::AppError;

/// Initial schema, embedded at compile time. Idempotent (IF NOT EXISTS).
pub const INIT_SQL: &str = include_str!("migrations/001_init.sql");

/// Opens (creating if missing) the SQLite database file at `path`.
pub async fn connect(path: &Path) -> Result<SqlitePool, AppError> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(true)
        .foreign_keys(true);
    Ok(SqlitePoolOptions::new().connect_with(options).await?)
}

/// Opens a private in-memory SQLite database (used by tests).
///
/// The pool is capped at a single connection because each in-memory
/// connection would otherwise get its own empty database.
pub async fn connect_in_memory() -> Result<SqlitePool, AppError> {
    let options = SqliteConnectOptions::from_str("sqlite::memory:")?.foreign_keys(true);
    Ok(SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?)
}

/// Applies the initial schema. Safe to call on every startup.
pub async fn init_schema(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::raw_sql(INIT_SQL).execute(pool).await?;
    ensure_borders_column(pool).await?;
    Ok(())
}

/// Adds the `countries.borders` column to databases created before Border
/// Run shipped. New databases already have it from `001_init.sql`; SQLite
/// lacks `ADD COLUMN IF NOT EXISTS`, so the column list is inspected first.
async fn ensure_borders_column(pool: &SqlitePool) -> Result<(), AppError> {
    let columns: Vec<(i64, String, String, i64, Option<String>, i64)> =
        sqlx::query_as("PRAGMA table_info(countries)")
            .fetch_all(pool)
            .await?;
    let has_borders = columns.iter().any(|(_, name, ..)| name == "borders");
    if !has_borders {
        sqlx::query("ALTER TABLE countries ADD COLUMN borders TEXT NOT NULL DEFAULT '[]'")
            .execute(pool)
            .await?;
    }
    Ok(())
}

/// Loads settings from the `settings` table; any missing key falls back
/// to its first-launch default.
pub async fn load_settings(pool: &SqlitePool) -> Result<Settings, AppError> {
    let rows: Vec<(String, String)> = sqlx::query_as("SELECT key, value FROM settings")
        .fetch_all(pool)
        .await?;
    let mut settings = Settings::default();
    for (key, value) in rows {
        match key.as_str() {
            "selected_continents" => settings.selected_continents = serde_json::from_str(&value)?,
            "modes_enabled" => settings.modes_enabled = serde_json::from_str(&value)?,
            "theme" => settings.theme = serde_json::from_str(&value)?,
            "fuzzy_tolerance" => settings.fuzzy_tolerance = serde_json::from_str(&value)?,
            "language" => settings.language = serde_json::from_str(&value)?,
            "current_mode" => settings.current_mode = serde_json::from_str(&value)?,
            "border_run_difficulty" => {
                settings.border_run_difficulty = serde_json::from_str(&value)?
            }
            _ => {}
        }
    }
    Ok(settings)
}

/// Clears all user progress: SM-2 state and the entire answer log.
/// Settings and the bundled country data are left untouched.
pub async fn reset_stats(pool: &SqlitePool) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM answers_log")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM user_stats")
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

/// Persists all settings keys as JSON strings, atomically.
pub async fn save_settings(pool: &SqlitePool, settings: &Settings) -> Result<(), AppError> {
    let entries = [
        (
            "selected_continents",
            serde_json::to_string(&settings.selected_continents)?,
        ),
        (
            "modes_enabled",
            serde_json::to_string(&settings.modes_enabled)?,
        ),
        ("theme", serde_json::to_string(&settings.theme)?),
        (
            "fuzzy_tolerance",
            serde_json::to_string(&settings.fuzzy_tolerance)?,
        ),
        ("language", serde_json::to_string(&settings.language)?),
        (
            "current_mode",
            serde_json::to_string(&settings.current_mode)?,
        ),
        (
            "border_run_difficulty",
            serde_json::to_string(&settings.border_run_difficulty)?,
        ),
    ];
    let mut tx = pool.begin().await?;
    for (key, value) in entries {
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES (?, ?) \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    Ok(())
}
