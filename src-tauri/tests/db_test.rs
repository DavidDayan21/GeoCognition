use std::collections::HashSet;

use geocognition_lib::infra::{db, seed};

const CONTINENTS: [&str; 6] = [
    "Africa",
    "North America",
    "South America",
    "Asia",
    "Europe",
    "Oceania",
];

#[tokio::test]
async fn schema_init_is_idempotent() {
    let pool = db::connect_in_memory().await.expect("pool");
    db::init_schema(&pool).await.expect("first init");
    db::init_schema(&pool).await.expect("second init");
}

#[tokio::test]
async fn seed_inserts_195_countries_and_is_idempotent() {
    let pool = db::connect_in_memory().await.expect("pool");
    db::init_schema(&pool).await.expect("init");

    let inserted = seed::seed_countries(&pool).await.expect("first seed");
    assert_eq!(inserted, 195);

    let inserted_again = seed::seed_countries(&pool).await.expect("second seed");
    assert_eq!(inserted_again, 0);

    let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM countries")
        .fetch_one(&pool)
        .await
        .expect("count");
    assert_eq!(count, 195);
}

#[test]
fn bundled_dataset_is_valid() {
    let countries = seed::load_bundled_countries().expect("parse bundled dataset");
    assert_eq!(countries.len(), 195);

    let iso2: HashSet<&str> = countries.iter().map(|c| c.iso_alpha2.as_str()).collect();
    let iso3: HashSet<&str> = countries.iter().map(|c| c.iso_alpha3.as_str()).collect();
    assert_eq!(iso2.len(), 195, "iso_alpha2 codes must be unique");
    assert_eq!(iso3.len(), 195, "iso_alpha3 codes must be unique");

    for country in &countries {
        assert!(
            CONTINENTS.contains(&country.continent.as_str()),
            "unexpected continent {} for {}",
            country.continent,
            country.name
        );
        assert!(
            !country.capital.is_empty(),
            "{} has no capital",
            country.name
        );
    }
}

#[test]
fn every_country_has_a_bundled_flag() {
    let countries = seed::load_bundled_countries().expect("parse bundled dataset");
    let flags_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("repo root")
        .join("public")
        .join("flags");
    for country in &countries {
        let flag = flags_dir.join(format!("{}.svg", country.iso_alpha2));
        assert!(flag.is_file(), "missing flag for {}", country.name);
    }
}
