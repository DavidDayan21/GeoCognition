//! Single-game Border Run state machine. Pure: no I/O, no clock.

use std::collections::{HashSet, VecDeque};

use crate::domain::models::{CountryClassification, Difficulty, GameStatus};

use super::graph::Graph;
use super::pathfinding::{all_shortest_paths, shortest_path_length};

/// Attempts granted on top of the shortest-path length. The per-game limit is
/// `shortest_path_length + ATTEMPTS_PADDING`, so it scales with how hard the
/// generated pair actually is rather than the difficulty bucket. (Replaces the
/// old per-`Difficulty` fixed limits.)
pub const ATTEMPTS_PADDING: u32 = 3;

/// The result of submitting one guess.
///
/// Adjacency is no longer validated: every recognized, not-yet-placed country
/// is accepted, placed on the map, and consumes an attempt. `Won`/`Lost` are
/// terminal and supersede `Accepted` on the move that ends the game; all three
/// carry the placed country's [`CountryClassification`] so the UI can color it
/// immediately. `AlreadyInChain` and `NotRecognized` place nothing and never
/// consume an attempt.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GuessOutcome {
    /// Recognized and added to the chain; the game continues.
    Accepted {
        iso3: String,
        classification: CountryClassification,
    },
    /// The country is already placed (start, end, or an accepted guess).
    /// User confusion rather than a strategic mistake — does not consume an
    /// attempt.
    AlreadyInChain { iso3: String },
    /// The input matched no country. Does not consume an attempt.
    NotRecognized,
    /// The accepted guess connected start to end.
    Won {
        iso3: String,
        classification: CountryClassification,
    },
    /// The accepted guess used the final attempt without connecting.
    Lost {
        iso3: String,
        classification: CountryClassification,
    },
}

/// In-memory state of one Border Run game.
pub struct BorderRunGame {
    /// Start country (ISO alpha-3).
    pub start: String,
    /// End country (ISO alpha-3).
    pub end: String,
    /// Accepted guesses in submission order (excludes start and end).
    pub chain: Vec<String>,
    pub attempts_used: u32,
    pub attempts_limit: u32,
    pub status: GameStatus,
    /// The difficulty this game was generated at (echoed to the UI and used
    /// for "play again at the same difficulty").
    pub difficulty: Difficulty,
    /// Every country on any shortest start→end path (green classification).
    pub shortest_path_set: HashSet<String>,
}

impl BorderRunGame {
    /// Starts a new game between `start` and `end` at `difficulty`. The set
    /// of shortest-path countries is computed once, up front, and the attempt
    /// limit is derived from the pair's shortest-path length
    /// (`length + ATTEMPTS_PADDING`). A disconnected pair (no path) yields a
    /// length of 0; the generator only produces connected pairs, so this is a
    /// safe floor rather than an expected case.
    pub fn new(start: String, end: String, difficulty: Difficulty, graph: &Graph) -> BorderRunGame {
        let shortest_path_set = all_shortest_paths(graph, &start, &end);
        let path_length = shortest_path_length(graph, &start, &end).unwrap_or(0) as u32;
        BorderRunGame {
            start,
            end,
            chain: Vec::new(),
            attempts_used: 0,
            attempts_limit: path_length + ATTEMPTS_PADDING,
            status: GameStatus::InProgress,
            difficulty,
            shortest_path_set,
        }
    }

    /// Attempts remaining before the game is lost.
    pub fn attempts_remaining(&self) -> u32 {
        self.attempts_limit.saturating_sub(self.attempts_used)
    }

    /// Submits a guess. `candidate` is the fuzzy-resolved ISO alpha-3 code,
    /// or `None` when the typed text matched no country.
    ///
    /// Adjacency is not checked: any recognized, not-yet-placed country is
    /// accepted, placed on the map, and consumes an attempt. The game is won
    /// the moment the placed countries connect start to end through the border
    /// graph, and lost when the attempt limit is reached without that link.
    ///
    /// Must only be called while the game is [`GameStatus::InProgress`]; the
    /// command layer enforces this.
    pub fn submit(&mut self, candidate: Option<&str>, graph: &Graph) -> GuessOutcome {
        debug_assert_eq!(self.status, GameStatus::InProgress);
        let iso3 = match candidate {
            None => return GuessOutcome::NotRecognized,
            Some(code) => code,
        };

        // Already-placed countries (start, end, or accepted) are not valid
        // new moves, but re-guessing one is confusion, not a mistake: it is
        // exempt from the attempt cost, like an unrecognized input.
        if self.is_placed(iso3) {
            return GuessOutcome::AlreadyInChain {
                iso3: iso3.to_string(),
            };
        }

        // Accepted: place the country and spend an attempt.
        self.chain.push(iso3.to_string());
        self.attempts_used += 1;
        let classification = self.classify_country(iso3, graph);

        if self.connects_start_to_end(graph) {
            self.status = GameStatus::Won;
            return GuessOutcome::Won {
                iso3: iso3.to_string(),
                classification,
            };
        }
        if self.attempts_used >= self.attempts_limit {
            self.status = GameStatus::Lost;
            return GuessOutcome::Lost {
                iso3: iso3.to_string(),
                classification,
            };
        }
        GuessOutcome::Accepted {
            iso3: iso3.to_string(),
            classification,
        }
    }

    /// Classifies a country for map coloring, relative to the shortest-path
    /// set fixed at game start. The result depends only on the (immutable)
    /// graph and shortest-path set, so it is stable for the whole game.
    pub fn classify_country(&self, iso3: &str, graph: &Graph) -> CountryClassification {
        if iso3 == self.start {
            return CountryClassification::Start;
        }
        if iso3 == self.end {
            return CountryClassification::End;
        }
        if self.shortest_path_set.contains(iso3) {
            return CountryClassification::OnShortestPath;
        }
        if graph
            .neighbors(iso3)
            .iter()
            .any(|n| self.shortest_path_set.contains(n))
        {
            return CountryClassification::AdjacentToShortestPath;
        }
        CountryClassification::Disconnected
    }

    /// True if `iso3` is the start, the end, or an already-accepted guess.
    fn is_placed(&self, iso3: &str) -> bool {
        iso3 == self.start || iso3 == self.end || self.chain.iter().any(|c| c == iso3)
    }

    /// True if a path of placed countries connects start to end. Traversal
    /// is restricted to start, end, and accepted guesses.
    fn connects_start_to_end(&self, graph: &Graph) -> bool {
        let allowed: HashSet<&str> = std::iter::once(self.start.as_str())
            .chain(std::iter::once(self.end.as_str()))
            .chain(self.chain.iter().map(String::as_str))
            .collect();
        let mut visited: HashSet<&str> = HashSet::new();
        visited.insert(self.start.as_str());
        let mut queue: VecDeque<&str> = VecDeque::new();
        queue.push_back(self.start.as_str());
        while let Some(node) = queue.pop_front() {
            if node == self.end {
                return true;
            }
            for neighbor in graph.neighbors(node) {
                let neighbor = neighbor.as_str();
                if allowed.contains(neighbor) && visited.insert(neighbor) {
                    queue.push_back(neighbor);
                }
            }
        }
        false
    }
}
