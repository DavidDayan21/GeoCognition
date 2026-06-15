//! Settings read/update commands.

use tauri::State;

use crate::domain::models::{Settings, CONTINENTS};
use crate::error::AppError;
use crate::infra::db;
use crate::state::{AppState, RunState};

/// Returns the persisted settings (first-launch defaults when unset).
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    db::load_settings(&state.pool).await
}

/// Validates and persists new settings.
#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<(), AppError> {
    validate(&settings)?;
    db::save_settings(&state.pool, &settings).await
}

/// Deletes all SM-2 progress and the answer log, then resets the current
/// run's in-memory drill state. Settings are preserved.
#[tauri::command]
pub async fn reset_stats(state: State<'_, AppState>) -> Result<(), AppError> {
    db::reset_stats(&state.pool).await?;
    let mut run = state.run.lock().await;
    *run = RunState::new();
    Ok(())
}

/// Enforces the UI invariants on the backend as well: at least one
/// continent (all of them known) and at least one mode.
pub fn validate(settings: &Settings) -> Result<(), AppError> {
    if settings.selected_continents.is_empty() {
        return Err(AppError::InvalidInput(
            "at least one continent must be selected".into(),
        ));
    }
    for continent in &settings.selected_continents {
        if !CONTINENTS.contains(&continent.as_str()) {
            return Err(AppError::InvalidInput(format!(
                "unknown continent: {continent}"
            )));
        }
    }
    if !settings.modes_enabled.capital && !settings.modes_enabled.flag {
        return Err(AppError::InvalidInput(
            "at least one mode must be enabled".into(),
        ));
    }
    // `language` is a `Language` enum, so serde already rejected any value
    // other than "en"/"fr" before deserialization reached this point.
    Ok(())
}
