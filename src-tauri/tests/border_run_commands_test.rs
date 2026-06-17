use geocognition_lib::commands::border_run::{
    process_guess, request_hint, reveal_path, start_game, undo,
};
use geocognition_lib::domain::border_run::game::BorderRunGame;
use geocognition_lib::domain::border_run::pathfinding::shortest_path_length;
use geocognition_lib::domain::models::{
    CountryClassification, Difficulty, GameStatus, GuessKind, Language,
};
use geocognition_lib::state::BorderRunResources;
use rand::rngs::StdRng;
use rand::SeedableRng;

/// Portugal → Andorra: a known Easy pair connected through Spain
/// (Portugal–Spain–Andorra), used to drive a deterministic win.
fn portugal_to_andorra(resources: &BorderRunResources) -> Option<BorderRunGame> {
    Some(BorderRunGame::new(
        "prt".into(),
        "and".into(),
        Difficulty::Easy,
        &resources.graph,
    ))
}

#[test]
fn start_game_produces_a_valid_in_progress_pair() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = None;
    let mut rng = StdRng::seed_from_u64(123);

    let dto = start_game(&resources, &mut slot, Difficulty::Easy, &mut rng).expect("start");

    assert_eq!(dto.status, GameStatus::InProgress);
    assert!(dto.chain.is_empty());
    assert_ne!(dto.start, dto.end);
    let length = shortest_path_length(&resources.graph, &dto.start, &dto.end).expect("reachable");
    assert!(
        (2..=3).contains(&length),
        "Easy pair length {length} out of range"
    );
    // The attempt limit is derived from this pair's path length plus padding.
    let expected_limit = length as u32 + 3;
    assert_eq!(dto.attempts_limit, expected_limit);
    assert_eq!(dto.attempts_remaining, expected_limit);
    assert!(slot.is_some(), "the game is stored in the slot");
}

#[test]
fn known_adjacency_wins_the_game() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);

    let outcome = process_guess(&resources, &mut slot, "Spain").expect("guess");

    assert_eq!(outcome.kind, GuessKind::Won);
    assert_eq!(outcome.iso3.as_deref(), Some("esp"));
    assert_eq!(
        outcome.classification,
        Some(CountryClassification::OnShortestPath)
    );
    assert_eq!(outcome.game.status, GameStatus::Won);
    assert_eq!(outcome.game.chain, vec!["esp".to_string()]);
}

#[test]
fn any_recognized_country_is_accepted_even_when_disconnected() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);

    // Australia is an island, nowhere near the Portugal→Andorra route, yet it
    // is accepted (adjacency is no longer validated) and spends an attempt.
    let outcome = process_guess(&resources, &mut slot, "Australia").expect("guess");

    assert_eq!(outcome.kind, GuessKind::Accepted);
    assert_eq!(outcome.iso3.as_deref(), Some("aus"));
    assert_eq!(
        outcome.classification,
        Some(CountryClassification::Disconnected)
    );
    assert_eq!(outcome.game.attempts_used, 1);
    assert_eq!(outcome.game.chain, vec!["aus".to_string()]);
}

#[test]
fn french_country_name_resolves() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);

    let outcome = process_guess(&resources, &mut slot, "Espagne").expect("guess");

    assert_eq!(outcome.kind, GuessKind::Won);
    assert_eq!(outcome.iso3.as_deref(), Some("esp"));
}

#[test]
fn unrecognized_input_does_not_consume_an_attempt() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);

    let outcome = process_guess(&resources, &mut slot, "Wakanda").expect("guess");

    assert_eq!(outcome.kind, GuessKind::NotRecognized);
    assert!(outcome.iso3.is_none());
    assert_eq!(outcome.game.attempts_used, 0);
}

#[test]
fn reveal_path_returns_an_ordered_solution() {
    let resources = BorderRunResources::build().expect("resources");
    let slot = portugal_to_andorra(&resources);

    let path = reveal_path(&resources, &slot).expect("reveal");

    assert_eq!(path.first().map(String::as_str), Some("prt"));
    assert_eq!(path.last().map(String::as_str), Some("and"));
    assert_eq!(path.len(), 3, "Portugal-Spain-Andorra is three countries");
    assert_eq!(path[1], "esp");
}

#[test]
fn guessing_without_an_active_game_errors() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = None;
    assert!(process_guess(&resources, &mut slot, "Spain").is_err());
}

#[test]
fn hint_reveals_the_first_letter_in_the_active_language() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);
    let mut rng = StdRng::seed_from_u64(5);

    // The only shortest-path interior country is Spain, so the hint is
    // deterministic: "Spain" → 'S' in English, "Espagne" → 'E' in French.
    let en = request_hint(&resources, &mut slot, Language::En, &mut rng).expect("hint");
    assert_eq!(en.letter, 'S');
    assert!(en.used);
    let game = slot.as_ref().expect("game");
    assert!(game.hint_used);
    assert_eq!(game.hint_letter, Some('S'));

    // A second hint on the same game is rejected.
    assert!(request_hint(&resources, &mut slot, Language::En, &mut rng).is_err());

    // A fresh game in French reveals the French first letter.
    let mut slot_fr = portugal_to_andorra(&resources);
    let fr = request_hint(&resources, &mut slot_fr, Language::Fr, &mut rng).expect("hint");
    assert_eq!(fr.letter, 'E');
}

#[test]
fn undo_removes_the_last_guess_and_refunds_the_attempt() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);

    // Place a country, then undo it.
    process_guess(&resources, &mut slot, "Australia").expect("guess");
    assert_eq!(slot.as_ref().expect("game").attempts_used, 1);

    let dto = undo(&mut slot).expect("undo");
    assert!(dto.chain.is_empty());
    assert_eq!(dto.attempts_used, 0);
    assert!(dto.undo_used);

    // A second undo is rejected.
    assert!(undo(&mut slot).is_err());
}

#[test]
fn undo_with_an_empty_chain_errors() {
    let resources = BorderRunResources::build().expect("resources");
    let mut slot = portugal_to_andorra(&resources);
    assert!(undo(&mut slot).is_err());
}
