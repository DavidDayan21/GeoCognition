use geocognition_lib::domain::border_run::game::{BorderRunGame, GuessOutcome};
use geocognition_lib::domain::border_run::graph::Graph;
use geocognition_lib::domain::models::{CountryClassification, Difficulty, GameStatus};

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

/// Two routes from `sss` to `ttt`:
///
/// - shortest: sss-aaa-bbb-ttt (length 3, the only shortest path)
/// - detour: sss-ppp-qqq-rrr-ttt (length 4, all off the shortest path)
///
/// `ccc` is a dead-end bordering the start; `z1..z6` are isolated countries
/// used to exhaust attempts without ever connecting.
fn graph() -> Graph {
    let countries = [
        country("sss", &["aaa", "ppp"]),
        country("aaa", &["sss", "bbb"]),
        country("bbb", &["aaa", "ttt"]),
        country("ttt", &["bbb", "rrr"]),
        country("ppp", &["sss", "qqq"]),
        country("qqq", &["ppp", "rrr"]),
        country("rrr", &["qqq", "ttt"]),
        country("ccc", &["sss"]),
        country("z1", &[]),
        country("z2", &[]),
        country("z3", &[]),
        country("z4", &[]),
        country("z5", &[]),
        country("z6", &[]),
    ];
    Graph::from_countries(&countries)
}

fn new_game(difficulty: Difficulty) -> (BorderRunGame, Graph) {
    let graph = graph();
    let game = BorderRunGame::new("sss".into(), "ttt".into(), difficulty, &graph);
    (game, graph)
}

#[test]
fn new_game_derives_limit_from_path_length_and_records_shortest_set() {
    let (game, _graph) = new_game(Difficulty::Easy);
    // sss-aaa-bbb-ttt is 3 edges; limit is path length (3) + padding (3) = 6,
    // independent of the difficulty bucket.
    assert_eq!(game.attempts_limit, 6);
    assert_eq!(game.attempts_used, 0);
    assert_eq!(game.status, GameStatus::InProgress);
    let mut on_path: Vec<&str> = game.shortest_path_set.iter().map(String::as_str).collect();
    on_path.sort_unstable();
    assert_eq!(on_path, ["aaa", "bbb", "sss", "ttt"]);
}

#[test]
fn classifies_an_on_path_guess_as_green() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    let outcome = game.submit(Some("aaa"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Accepted {
            iso3: "aaa".into(),
            classification: CountryClassification::OnShortestPath,
        }
    );
    assert_eq!(game.chain, vec!["aaa".to_string()]);
    assert_eq!(game.attempts_used, 1);
    assert_eq!(game.status, GameStatus::InProgress);
}

#[test]
fn classifies_a_guess_bordering_the_path_as_adjacent() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // `ppp` is not on the shortest path, but it borders `sss`, which is.
    let outcome = game.submit(Some("ppp"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Accepted {
            iso3: "ppp".into(),
            classification: CountryClassification::AdjacentToShortestPath,
        }
    );
}

#[test]
fn any_recognized_country_is_accepted_and_classified_even_when_disconnected() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // `z1` borders nothing — neither on nor adjacent to the path — but with
    // adjacency validation gone it is still accepted and decrements attempts.
    let outcome = game.submit(Some("z1"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Accepted {
            iso3: "z1".into(),
            classification: CountryClassification::Disconnected,
        }
    );
    assert_eq!(game.chain, vec!["z1".to_string()]);
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
fn wins_via_the_exact_shortest_path() {
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
            classification: CountryClassification::OnShortestPath,
        }
    );
    assert_eq!(game.status, GameStatus::Won);
}

#[test]
fn wins_via_a_longer_detour_that_still_connects() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // None of these are on the shortest path, but sss-ppp-qqq-rrr-ttt is a
    // valid chain, so placing the last link still wins.
    assert!(matches!(
        game.submit(Some("ppp"), &graph),
        GuessOutcome::Accepted { .. }
    ));
    assert!(matches!(
        game.submit(Some("qqq"), &graph),
        GuessOutcome::Accepted { .. }
    ));
    let outcome = game.submit(Some("rrr"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Won {
            iso3: "rrr".into(),
            classification: CountryClassification::AdjacentToShortestPath,
        }
    );
    assert_eq!(game.status, GameStatus::Won);
}

#[test]
fn loses_when_the_chain_never_connects_despite_using_every_attempt() {
    let (mut game, graph) = new_game(Difficulty::Easy);
    // Six isolated countries: each is accepted but none bridges sss to ttt.
    for iso in ["z1", "z2", "z3", "z4", "z5"] {
        assert!(matches!(
            game.submit(Some(iso), &graph),
            GuessOutcome::Accepted { .. }
        ));
    }
    let outcome = game.submit(Some("z6"), &graph);
    assert_eq!(
        outcome,
        GuessOutcome::Lost {
            iso3: "z6".into(),
            classification: CountryClassification::Disconnected,
        }
    );
    assert_eq!(game.status, GameStatus::Lost);
    assert_eq!(game.attempts_remaining(), 0);
}

#[test]
fn classify_country_query_matches_the_legend() {
    let (game, graph) = new_game(Difficulty::Easy);
    assert_eq!(
        game.classify_country("sss", &graph),
        CountryClassification::Start
    );
    assert_eq!(
        game.classify_country("ttt", &graph),
        CountryClassification::End
    );
    assert_eq!(
        game.classify_country("bbb", &graph),
        CountryClassification::OnShortestPath
    );
    assert_eq!(
        game.classify_country("ccc", &graph),
        CountryClassification::AdjacentToShortestPath
    );
    assert_eq!(
        game.classify_country("qqq", &graph),
        CountryClassification::Disconnected
    );
}
