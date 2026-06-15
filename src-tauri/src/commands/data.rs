//! Static reference data commands.

use crate::domain::models::{Country, CONTINENTS};
use crate::error::AppError;
use crate::infra::seed;

/// All countries from the bundled dataset, alphabetically ordered.
#[tauri::command]
pub async fn get_all_countries() -> Result<Vec<Country>, AppError> {
    seed::load_bundled_countries()
}

/// The six selectable continents.
#[tauri::command]
pub fn get_continents() -> Vec<String> {
    CONTINENTS.iter().map(|c| c.to_string()).collect()
}
