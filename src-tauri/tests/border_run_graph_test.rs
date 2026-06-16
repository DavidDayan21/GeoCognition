use geocognition_lib::domain::border_run::graph::Graph;
use geocognition_lib::domain::models::Country;

/// Builds a `Country` with the given ISO alpha-3 code and border list. The
/// fields irrelevant to the graph are filled with placeholders.
fn country(iso3: &str, borders: &[&str]) -> Country {
    Country {
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

#[test]
fn builds_nodes_for_every_country_including_islands() {
    let countries = [
        country("aaa", &["bbb"]),
        country("bbb", &["aaa"]),
        country("zzz", &[]),
    ];
    let graph = Graph::from_countries(&countries);
    assert_eq!(graph.len(), 3);
    assert!(graph.contains("zzz"));
    assert!(graph.neighbors("zzz").is_empty());
}

#[test]
fn neighbors_are_sorted_and_deduplicated() {
    // Unsorted, self-referential, and duplicate borders.
    let countries = [
        country("bbb", &["ccc", "aaa", "aaa", "bbb"]),
        country("aaa", &["bbb"]),
        country("ccc", &["bbb"]),
    ];
    let graph = Graph::from_countries(&countries);
    assert_eq!(
        graph.neighbors("bbb"),
        ["aaa".to_string(), "ccc".to_string()]
    );
}

#[test]
fn edges_are_symmetric_even_when_listed_one_sided() {
    // Only `eee` lists the border; `fff` lists nothing.
    let countries = [country("eee", &["fff"]), country("fff", &[])];
    let graph = Graph::from_countries(&countries);
    assert!(graph.is_adjacent("eee", "fff"));
    assert!(graph.is_adjacent("fff", "eee"));
}

#[test]
fn borders_to_unknown_codes_are_ignored() {
    let countries = [country("aaa", &["xxx"])];
    let graph = Graph::from_countries(&countries);
    assert!(graph.neighbors("aaa").is_empty());
    assert!(!graph.contains("xxx"));
}

#[test]
fn has_path_handles_connected_and_disconnected() {
    // aaa-bbb-ccc line, plus an isolated island zzz.
    let countries = [
        country("aaa", &["bbb"]),
        country("bbb", &["aaa", "ccc"]),
        country("ccc", &["bbb"]),
        country("zzz", &[]),
    ];
    let graph = Graph::from_countries(&countries);
    assert!(graph.has_path("aaa", "ccc"));
    assert!(graph.has_path("aaa", "aaa"));
    assert!(!graph.has_path("aaa", "zzz"));
    assert!(!graph.has_path("aaa", "unknown"));
}
