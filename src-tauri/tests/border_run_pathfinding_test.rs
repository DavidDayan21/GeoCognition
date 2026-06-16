use geocognition_lib::domain::border_run::graph::Graph;
use geocognition_lib::domain::border_run::pathfinding::{
    all_shortest_paths, shortest_path, shortest_path_length,
};
use geocognition_lib::domain::models::Country;

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

/// Diamond with a longer detour: shortest sss→ttt paths are sss-aaa-ttt and
/// sss-bbb-ttt (length 2); uuu sits on a length-3 detour off aaa.
fn diamond() -> Graph {
    let countries = [
        country("sss", &["aaa", "bbb"]),
        country("aaa", &["sss", "ttt", "uuu"]),
        country("bbb", &["sss", "ttt"]),
        country("ttt", &["aaa", "bbb", "uuu"]),
        country("uuu", &["aaa", "ttt"]),
        country("zzz", &[]),
    ];
    Graph::from_countries(&countries)
}

#[test]
fn shortest_path_length_counts_edges() {
    let graph = diamond();
    assert_eq!(shortest_path_length(&graph, "sss", "ttt"), Some(2));
    assert_eq!(shortest_path_length(&graph, "sss", "aaa"), Some(1));
    assert_eq!(shortest_path_length(&graph, "sss", "sss"), Some(0));
}

#[test]
fn shortest_path_length_none_for_disconnected_or_unknown() {
    let graph = diamond();
    assert_eq!(shortest_path_length(&graph, "sss", "zzz"), None);
    assert_eq!(shortest_path_length(&graph, "sss", "nope"), None);
}

#[test]
fn all_shortest_paths_covers_every_equal_length_path() {
    let graph = diamond();
    let on_path = all_shortest_paths(&graph, "sss", "ttt");
    // Both 2-edge paths contribute; the 3-edge detour through uuu does not.
    let mut got: Vec<String> = on_path.into_iter().collect();
    got.sort();
    assert_eq!(got, vec!["aaa", "bbb", "sss", "ttt"]);
}

#[test]
fn all_shortest_paths_includes_single_endpoint_when_equal() {
    let graph = diamond();
    let on_path = all_shortest_paths(&graph, "sss", "sss");
    assert_eq!(on_path.len(), 1);
    assert!(on_path.contains("sss"));
}

#[test]
fn all_shortest_paths_empty_for_disconnected() {
    let graph = diamond();
    assert!(all_shortest_paths(&graph, "sss", "zzz").is_empty());
}

#[test]
fn shortest_path_returns_one_ordered_route() {
    let graph = diamond();
    let path = shortest_path(&graph, "sss", "ttt").expect("path exists");
    assert_eq!(path.len(), 3);
    assert_eq!(path.first().map(String::as_str), Some("sss"));
    assert_eq!(path.last().map(String::as_str), Some("ttt"));
    assert!(path[1] == "aaa" || path[1] == "bbb");
}

#[test]
fn shortest_path_none_for_disconnected() {
    let graph = diamond();
    assert_eq!(shortest_path(&graph, "sss", "zzz"), None);
}
