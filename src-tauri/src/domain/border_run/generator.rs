//! Random start/end pair selection by difficulty.
//!
//! All reachable pair lengths are computed once via per-source BFS and
//! bucketed by difficulty; sampling then draws uniformly from a bucket.
//! Building is O(N · (V + E)); for the 195-country dataset this is a few
//! milliseconds, paid once when Border Run is initialized and cached in
//! [`AppState`](crate::state::AppState).

use rand::seq::IndexedRandom;
use rand::Rng;

use crate::domain::models::Difficulty;

use super::graph::Graph;
use super::pathfinding::distances_from;

/// Reachable (start, end) pairs pre-bucketed by difficulty.
pub struct PairBuckets {
    easy: Vec<(String, String)>,
    medium: Vec<(String, String)>,
    hard: Vec<(String, String)>,
}

/// Maps a shortest-path length (in edges) to the difficulty whose range
/// contains it, or `None` for directly-adjacent (`1`) or unreachable pairs.
fn classify(length: usize) -> Option<Difficulty> {
    [Difficulty::Easy, Difficulty::Medium, Difficulty::Hard]
        .into_iter()
        .find(|difficulty| {
            let (low, high) = difficulty.path_length_range();
            (low..=high).contains(&length)
        })
}

impl PairBuckets {
    /// Pre-computes and buckets every reachable unordered pair by difficulty.
    pub fn build(graph: &Graph) -> PairBuckets {
        let mut buckets = PairBuckets {
            easy: Vec::new(),
            medium: Vec::new(),
            hard: Vec::new(),
        };
        let mut codes: Vec<&str> = graph.iso_codes().collect();
        codes.sort_unstable();
        for &from in &codes {
            let distances = distances_from(graph, from);
            for &to in &codes {
                // Each unordered pair once.
                if from >= to {
                    continue;
                }
                let Some(&length) = distances.get(to) else {
                    continue;
                };
                let pair = (from.to_string(), to.to_string());
                match classify(length) {
                    Some(Difficulty::Easy) => buckets.easy.push(pair),
                    Some(Difficulty::Medium) => buckets.medium.push(pair),
                    Some(Difficulty::Hard) => buckets.hard.push(pair),
                    None => {}
                }
            }
        }
        buckets
    }

    /// Number of pairs available at `difficulty`.
    pub fn count(&self, difficulty: Difficulty) -> usize {
        self.bucket(difficulty).len()
    }

    fn bucket(&self, difficulty: Difficulty) -> &[(String, String)] {
        match difficulty {
            Difficulty::Easy => &self.easy,
            Difficulty::Medium => &self.medium,
            Difficulty::Hard => &self.hard,
        }
    }

    /// Draws a uniformly random pair at `difficulty`, randomizing which end
    /// is the start. Returns `None` if no pair exists at that difficulty.
    pub fn pick<R: Rng>(&self, difficulty: Difficulty, rng: &mut R) -> Option<(String, String)> {
        let (a, b) = self.bucket(difficulty).choose(rng)?.clone();
        if rng.random_bool(0.5) {
            Some((b, a))
        } else {
            Some((a, b))
        }
    }
}

/// Convenience wrapper: builds buckets from `graph` and draws one pair.
/// Prefer caching a [`PairBuckets`] when picking repeatedly.
pub fn pick_random_pair<R: Rng>(
    graph: &Graph,
    difficulty: Difficulty,
    rng: &mut R,
) -> Option<(String, String)> {
    PairBuckets::build(graph).pick(difficulty, rng)
}
