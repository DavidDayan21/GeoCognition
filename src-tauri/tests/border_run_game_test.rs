use geocognition_lib::domain::border_run::game::{BorderRunGame, GuessOutcome};
use geocognition_lib::domain::border_run::graph::Graph;
use geocognition_lib::domain::models::{Difficulty, GameStatus};

fn country(iso3: &str, borders: &[&str]) -> geocognition_lib::domain::models::Country {
    geocognition_lib::domain::models::Country {
        id: 0,
        name: iso3.to_uppercase(),
        name_fr: iso3.to_uppercase(),
        capital: "City".into(),
        capital_fr: "Ville".into(),
        continent: "Asia".into(),
        iso_alpha2: iso3.to_string(),
        iso_alpha3: iso3.to_string(),
        lat: 0.0,
        lng: 0.0,
        borders: borders.iter().map(|s| s.to_string()).collect(),
    }
}

/// Shortest sss→ttt path is sss-aaa-bbb-ttt (length 3). ccc is a dead-end
/// detour off sss; zzz is an unrelated isolated country.
fn graph() -> Graph {
    let countries = [
        country("sss", &["aaa", "ccc"]),
        country("aaa", &["sss", "bbb"]),
        country("bbb", &["aaa", "ttt"]),
        country("ttt", &["bbb"]),
        country("ccc", &["sss"]),
        country("zzz", &[]),
    ];
    Graph::from_countries(&countries)
}

fn new_game(difficulty: Difficulty) -> (BorderRunGame, Graph) {
    let graph = graph();
    let game = BorderRunGame::new("sss".into(), "ttt".into(), difficulty, &graph);
    (game, graph)
}

#[test]
fn new_game_sets_limits_and_shortest_path_set() {
    let (game, _graph) = new_game(Difficulty::Easy);
    assert_eq!(game.attempts_limit, 6);
    assert_eq!(game.attempts_used, 0);
    assert_eq!(game.status, GameStatus::InProgress);
    let mut on_path: Vec<&str> = game.shortest_path_set.iter().map(String::as_str).collect();
    on_path.sort_unstable();
    assert_eq!(on_path, ["aaa", "bbb", "sss", "ttt"]);
}

#[test]
fn accepts_guess_on_shortest_path_without_winning() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    let outcome = game.submit(Some("aaa"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Accepted {
            iso3: "aaa".into(),
            on_shortest_path: true,
        }
    );
    assert_eq!(game.chain, vec!["aaa".to_string()]);
    assert_eq!(game.attempts_used, 1);
    assert_eq!(game.status, GameStatus::InProgress);
}

#[test]
fn accepts_detour_guess_off_the_shortest_path() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    let outcome = game.submit(Some("ccc"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Accepted {
            iso3: "ccc".into(),
            on_shortest_path: false,
        }
    );
    assert_eq!(game.chain, vec!["ccc".to_string()]);
}

#[test]
fn non_adjacent_guess_costs_an_attempt_and_is_not_chained() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    let outcome = game.submit(Some("zzz"), &graph);
    assert_eq!(outcome, GuessOutcome::NotAdjacent { iso3: "zzz".into() });
    assert!(game.chain.is_empty());
    assert_eq!(game.attempts_used, 1);
}

#[test]
fn unrecognized_guess_does_not_cost_an_attempt() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    let outcome = game.submit(None, &graph);
    assert_eq!(outcome, GuessOutcome::NotRecognized);
    assert_eq!(game.attempts_used, 0);
    assert!(game.chain.is_empty());
}

#[test]
fn already_placed_country_does_not_cost_an_attempt() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // The end country is already on the board; re-guessing it is confusion,
    // not a strategic mistake, so it is exempt from the attempt cost.
    let outcome = game.submit(Some("ttt"), &graph);
    assert_eq!(outcome, GuessOutcome::AlreadyInChain { iso3: "ttt".into() });
    assert!(game.chain.is_empty());
    assert_eq!(game.attempts_used, 0);
}

#[test]
fn re_guessing_an_accepted_country_does_not_cost_an_attempt() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    assert!(matches!(
        game.submit(Some("aaa"), &graph),
        GuessOutcome::Accepted { .. }
    ));
    let before = game.attempts_used;
    let outcome = game.submit(Some("aaa"), &graph);
    assert_eq!(outcome, GuessOutcome::AlreadyInChain { iso3: "aaa".into() });
    assert_eq!(game.attempts_used, before);
    assert_eq!(game.chain, vec!["aaa".to_string()]);
}

#[test]
fn winning_guess_connects_start_to_end() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    assert!(matches!(
        game.submit(Some("aaa"), &graph),
        GuessOutcome::Accepted { .. }
    ));
    let outcome = game.submit(Some("bbb"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Won {
            iso3: "bbb".into(),
            on_shortest_path: true,
        }
    );
    assert_eq!(game.status, GameStatus::Won);
}

#[test]
fn game_is_lost_when_attempts_are_exhausted() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // Five wasted non-adjacent guesses, then the sixth ends the game.
    for _ in 0..5 {
        assert_eq!(
            game.submit(Some("zzz"), &graph),
            GuessOutcome::NotAdjacent { iso3: "zzz".into() }
        );
    }
    let outcome = game.submit(Some("zzz"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Lost {
            iso3: "zzz".into(),
            accepted: false,
            on_shortest_path: false,
        }
    );
    assert_eq!(game.status, GameStatus::Lost);
    assert_eq!(game.attempts_remaining(), 0);
}
