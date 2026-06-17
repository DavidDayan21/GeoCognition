pub mod commands;
pub mod domain;
pub mod error;
pub mod infra;
pub mod state;

use tauri::Manager;

/// Builds and runs the Tauri application: opens (or creates) the SQLite
/// database in the app data directory, applies the schema, seeds the
/// country dataset on first run, and registers all commands.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("geocognition.db");
            let pool = tauri::async_runtime::block_on(async {
                let pool = infra::db::connect(&db_path).await?;
                infra::db::init_schema(&pool).await?;
                infra::seed::seed_countries(&pool).await?;
                Ok::<_, error::AppError>(pool)
            })?;
            app.manage(state::AppState::new(pool)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::quiz::next_question,
            commands::quiz::submit_answer,
            commands::stats::get_mastery_map,
            commands::stats::get_progression,
            commands::stats::get_forgetting_curve,
            commands::stats::get_continent_breakdown,
            commands::stats::get_global_stats,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::reset_stats,
            commands::data::get_all_countries,
            commands::data::get_continents,
            commands::border_run::border_run_start,
            commands::border_run::border_run_guess,
            commands::border_run::border_run_reveal_path,
            commands::border_run::border_run_request_hint,
            commands::border_run::border_run_undo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
