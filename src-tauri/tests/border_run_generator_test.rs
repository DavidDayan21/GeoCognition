use geocognition_lib::domain::border_run::generator::PairBuckets;
use geocognition_lib::domain::border_run::graph::Graph;
use geocognition_lib::domain::border_run::pathfinding::shortest_path_length;
use geocognition_lib::domain::models::{Country, Difficulty};
use rand::rngs::StdRng;
use rand::SeedableRng;

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

/// A straight chain n00-n01-...-n07 (8 nodes); the edge distance between two
/// nodes is the difference of their indices.
fn line() -> Graph {
    let labels: Vec<String> = (0..8).map(|i| format!("n{i:02}")).collect();
    let countries: Vec<Country> = labels
        .iter()
        .enumerate()
        .map(|(i, iso)| {
            let mut borders = Vec::new();
            if i > 0 {
                borders.push(labels[i - 1].as_str());
            }
            if i + 1 < labels.len() {
                borders.push(labels[i + 1].as_str());
            }
            country(iso, &borders)
        })
        .collect();
    Graph::from_countries(&countries)
}

#[test]
fn buckets_partition_pairs_by_difficulty() {
    let buckets = PairBuckets::build(&line());
    // Distances 2..=3 -> easy (6+5), 4..=6 -> medium (4+3+2), 7 -> hard (1).
    // Directly-adjacent pairs (distance 1) are excluded entirely.
    assert_eq!(buckets.count(Difficulty::Easy), 11);
    assert_eq!(buckets.count(Difficulty::Medium), 9);
    assert_eq!(buckets.count(Difficulty::Hard), 1);
}

#[test]
fn picked_pair_matches_requested_difficulty() {
    let graph = line();
    let buckets = PairBuckets::build(&graph);
    let mut rng = StdRng::seed_from_u64(7);
    for _ in 0..20 {
        let (start, end) = buckets
            .pick(Difficulty::Medium, &mut rng)
            .expect("medium bucket is non-empty");
        let length = shortest_path_length(&graph, &start, &end).expect("reachable");
        assert!(
            (4..=6).contains(&length),
            "length {length} out of medium range"
        );
    }
}

#[test]
fn picking_is_deterministic_for_a_fixed_seed() {
    let buckets = PairBuckets::build(&line());
    let mut rng_a = StdRng::seed_from_u64(42);
    let mut rng_b = StdRng::seed_from_u64(42);
    assert_eq!(
        buckets.pick(Difficulty::Easy, &mut rng_a),
        buckets.pick(Difficulty::Easy, &mut rng_b)
    );
}

#[test]
fn pick_returns_none_for_an_empty_bucket() {
    // Two adjacent nodes: only a distance-1 pair, excluded from every bucket.
    let graph = Graph::from_countries(&[country("aaa", &["bbb"]), country("bbb", &["aaa"])]);
    let buckets = PairBuckets::build(&graph);
    let mut rng = StdRng::seed_from_u64(1);
    assert_eq!(buckets.pick(Difficulty::Easy, &mut rng), None);
    assert_eq!(buckets.pick(Difficulty::Hard, &mut rng), None);
}
