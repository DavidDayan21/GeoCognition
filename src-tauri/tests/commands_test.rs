use geocognition_lib::commands::quiz::{apply_answer, pick_next_question};
use geocognition_lib::commands::settings::validate;
use geocognition_lib::commands::stats::{fetch_global_stats, fetch_mastery_map, fetch_progression};
use geocognition_lib::domain::models::{ModesEnabled, Settings};
use geocognition_lib::domain::question_mode::QuestionMode;
use geocognition_lib::infra::{db, seed};
use geocognition_lib::state::RunState;
use sqlx::SqlitePool;

async fn test_pool() -> SqlitePool {
    let pool = db::connect_in_memory().await.expect("pool");
    db::init_schema(&pool).await.expect("schema");
    seed::seed_countries(&pool).await.expect("seed");
    pool
}

fn capital_only() -> Settings {
    Settings {
        modes_enabled: ModesEnabled {
            capital: true,
            flag: false,
        },
        ..Settings::default()
    }
}

async fn capital_of(pool: &SqlitePool, country_id: i64) -> String {
    let (capital,): (String,) = sqlx::query_as("SELECT capital FROM countries WHERE id = ?")
        .bind(country_id)
        .fetch_one(pool)
        .await
        .expect("capital");
    capital
}

#[tokio::test]
async fn correct_answer_updates_sm2_state_and_log() {
    let pool = test_pool().await;
    db::save_settings(&pool, &capital_only())
        .await
        .expect("settings");
    let mut run = RunState::seeded(42);

    let question = pick_next_question(&pool, &mut run).await.expect("question");
    assert_eq!(question.mode, QuestionMode::Capital);
    assert!(
        question.country_name.is_some(),
        "capital mode shows the country"
    );
    assert!(
        question.iso_alpha2.is_none(),
        "no flag asset in capital mode"
    );

    let capital = capital_of(&pool, question.country_id).await;
    let result = apply_answer(
        &pool,
        &mut run,
        question.country_id,
        question.mode,
        &capital,
        1200,
    )
    .await
    .expect("answer");

    assert_eq!(result.quality, 5);
    assert!(result.is_correct);
    assert_eq!(result.interval_days, 1);
    assert!(result.ef > 2.5);
    assert_eq!(run.current_index, 1);
    assert!(run.drill_queue.is_empty());

    let (attempts, correct): (i64, i64) = sqlx::query_as(
        "SELECT total_attempts, total_correct FROM user_stats WHERE country_id = ? AND mode = 'capital'",
    )
    .bind(question.country_id)
    .fetch_one(&pool)
    .await
    .expect("stats row");
    assert_eq!((attempts, correct), (1, 1));
}

#[tokio::test]
async fn wrong_answer_schedules_drill_and_reasks_when_due() {
    let pool = test_pool().await;
    db::save_settings(&pool, &capital_only())
        .await
        .expect("settings");
    let mut run = RunState::seeded(7);

    let question = pick_next_question(&pool, &mut run).await.expect("question");
    let result = apply_answer(
        &pool,
        &mut run,
        question.country_id,
        question.mode,
        "definitely wrong",
        800,
    )
    .await
    .expect("answer");

    assert_eq!(result.quality, 0);
    assert!(!result.is_correct);
    assert_eq!(run.drill_queue.len(), 1);
    let entry = run.drill_queue[0];
    assert_eq!(entry.country_id, question.country_id);
    assert_eq!(entry.failed_at_index, 0);
    assert!((7..=9).contains(&(entry.reappear_at_index - entry.failed_at_index)));

    // Not due yet: the drilled country must not come back immediately.
    let next = pick_next_question(&pool, &mut run).await.expect("question");
    assert_ne!(next.country_id, question.country_id);

    // Jump to the reappear index: the failed card must come back first.
    run.current_index = entry.reappear_at_index;
    let reasked = pick_next_question(&pool, &mut run).await.expect("question");
    assert_eq!(reasked.country_id, question.country_id);
    assert!(
        run.drill_queue.is_empty(),
        "drill entry consumed once re-asked"
    );
}

#[tokio::test]
async fn flag_mode_payload_hides_country_name() {
    let pool = test_pool().await;
    let flag_only = Settings {
        modes_enabled: ModesEnabled {
            capital: false,
            flag: true,
        },
        ..Settings::default()
    };
    db::save_settings(&pool, &flag_only)
        .await
        .expect("settings");
    let mut run = RunState::seeded(1);

    let question = pick_next_question(&pool, &mut run).await.expect("question");
    assert_eq!(question.mode, QuestionMode::Flag);
    assert!(
        question.country_name.is_none(),
        "flag mode must not leak the answer"
    );
    let iso = question.iso_alpha2.expect("flag asset code");
    assert_eq!(iso.len(), 2);
}

#[tokio::test]
async fn continent_filter_limits_candidates() {
    let pool = test_pool().await;
    let oceania_only = Settings {
        selected_continents: vec!["Oceania".into()],
        ..capital_only()
    };
    db::save_settings(&pool, &oceania_only)
        .await
        .expect("settings");
    let mut run = RunState::seeded(3);

    for _ in 0..10 {
        let question = pick_next_question(&pool, &mut run).await.expect("question");
        let (continent,): (String,) =
            sqlx::query_as("SELECT continent FROM countries WHERE id = ?")
                .bind(question.country_id)
                .fetch_one(&pool)
                .await
                .expect("continent");
        assert_eq!(continent, "Oceania");
        let capital = capital_of(&pool, question.country_id).await;
        apply_answer(
            &pool,
            &mut run,
            question.country_id,
            question.mode,
            &capital,
            500,
        )
        .await
        .expect("answer");
    }
}

#[tokio::test]
async fn settings_roundtrip_and_validation() {
    let pool = test_pool().await;

    // Defaults come back when nothing is stored.
    let loaded = db::load_settings(&pool).await.expect("load");
    assert_eq!(loaded, Settings::default());

    let custom = Settings {
        selected_continents: vec!["Europe".into(), "Asia".into()],
        ..capital_only()
    };
    validate(&custom).expect("custom settings are valid");
    db::save_settings(&pool, &custom).await.expect("save");
    let loaded = db::load_settings(&pool).await.expect("load");
    assert_eq!(loaded, custom);

    let no_modes = Settings {
        modes_enabled: ModesEnabled {
            capital: false,
            flag: false,
        },
        ..Settings::default()
    };
    assert!(validate(&no_modes).is_err());

    let no_continents = Settings {
        selected_continents: vec![],
        ..Settings::default()
    };
    assert!(validate(&no_continents).is_err());

    let bogus_continent = Settings {
        selected_continents: vec!["Atlantis".into()],
        ..Settings::default()
    };
    assert!(validate(&bogus_continent).is_err());
}

#[tokio::test]
async fn reset_stats_clears_progress_but_keeps_settings() {
    let pool = test_pool().await;
    db::save_settings(&pool, &capital_only())
        .await
        .expect("settings");
    let mut run = RunState::seeded(5);

    for _ in 0..3 {
        let question = pick_next_question(&pool, &mut run).await.expect("question");
        let capital = capital_of(&pool, question.country_id).await;
        apply_answer(
            &pool,
            &mut run,
            question.country_id,
            question.mode,
            &capital,
            500,
        )
        .await
        .expect("answer");
    }
    assert_eq!(
        fetch_global_stats(&pool)
            .await
            .expect("stats")
            .total_answers,
        3
    );

    db::reset_stats(&pool).await.expect("reset");

    let after = fetch_global_stats(&pool).await.expect("stats after reset");
    assert_eq!(after.total_answers, 0);
    assert_eq!(after.countries_seen, 0);
    assert_eq!(after.total_mastered, 0);

    // Settings and country data survive the reset.
    assert_eq!(
        db::load_settings(&pool).await.expect("settings"),
        capital_only()
    );
    let mastery = fetch_mastery_map(&pool, QuestionMode::Capital)
        .await
        .expect("mastery map");
    assert_eq!(mastery.len(), 195);
    assert!(mastery.iter().all(|m| m.ef.is_none()));
}

#[tokio::test]
async fn stats_reflect_answers() {
    let pool = test_pool().await;
    db::save_settings(&pool, &capital_only())
        .await
        .expect("settings");
    let mut run = RunState::seeded(11);

    // Two correct, one wrong.
    for expected_correct in [true, true, false] {
        let question = pick_next_question(&pool, &mut run).await.expect("question");
        let input = if expected_correct {
            capital_of(&pool, question.country_id).await
        } else {
            "definitely wrong".to_string()
        };
        apply_answer(
            &pool,
            &mut run,
            question.country_id,
            question.mode,
            &input,
            900,
        )
        .await
        .expect("answer");
    }

    let global = fetch_global_stats(&pool).await.expect("global stats");
    assert_eq!(global.total_answers, 3);
    assert_eq!(global.countries_seen, 3);
    assert_eq!(global.longest_streak, 2);
    assert_eq!(global.current_streak, 0);
    assert!((global.lifetime_accuracy - 2.0 / 3.0).abs() < 1e-9);

    let progression = fetch_progression(&pool, 30).await.expect("progression");
    assert_eq!(progression.len(), 1);
    assert_eq!(progression[0].attempts, 3);
    assert_eq!(progression[0].correct, 2);

    let mastery = fetch_mastery_map(&pool, QuestionMode::Capital)
        .await
        .expect("mastery map");
    assert_eq!(mastery.len(), 195);
    let seen = mastery.iter().filter(|m| m.ef.is_some()).count();
    assert_eq!(seen, 3);
    assert!(
        mastery
            .iter()
            .all(|m| m.iso_alpha3.len() == 3 && m.iso_alpha2.len() == 2),
        "mastery rows expose ISO codes for the heatmap join"
    );
}
