use sqlx::SqlitePool;

use crate::domain::models::Country;
use crate::error::AppError;

/// Country dataset bundled into the binary at compile time.
pub const COUNTRIES_JSON: &str = include_str!("../../data/countries.json");

/// Parses the bundled country dataset.
pub fn load_bundled_countries() -> Result<Vec<Country>, AppError> {
    Ok(serde_json::from_str(COUNTRIES_JSON)?)
}

/// Inserts the bundled countries into the `countries` table.
///
/// Idempotent: rows already present (by primary key) are skipped via
/// `INSERT OR IGNORE`. Returns the number of rows actually inserted.
pub async fn seed_countries(pool: &SqlitePool) -> Result<u64, AppError> {
    let countries = load_bundled_countries()?;
    let mut inserted = 0u64;
    let mut tx = pool.begin().await?;
    for country in &countries {
        let borders = serde_json::to_string(&country.borders)?;
        let result = sqlx::query(
            "INSERT OR IGNORE INTO countries \
             (id, name, name_fr, capital, capital_fr, continent, iso_alpha2, iso_alpha3, lat, lng, borders) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(country.id)
        .bind(&country.name)
        .bind(&country.name_fr)
        .bind(&country.capital)
        .bind(&country.capital_fr)
        .bind(&country.continent)
        .bind(&country.iso_alpha2)
        .bind(&country.iso_alpha3)
        .bind(country.lat)
        .bind(country.lng)
        .bind(borders)
        .execute(&mut *tx)
        .await?;
        inserted += result.rows_affected();
    }
    tx.commit().await?;
    Ok(inserted)
}
