//! Single-game Border Run state machine. Pure: no I/O, no clock.

use std::collections::{HashSet, VecDeque};

use crate::domain::models::{Difficulty, GameStatus};

use super::graph::Graph;
use super::pathfinding::all_shortest_paths;

/// The result of submitting one guess.
///
/// `Won`/`Lost` are terminal and supersede `Accepted`/`NotAdjacent` on the
/// move that ends the game; they carry the same coloring hints so the UI can
/// render the final country. `NotRecognized` never consumes an attempt.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GuessOutcome {
    /// Adjacent to the chain and added to it; the game continues.
    Accepted {
        iso3: String,
        on_shortest_path: bool,
    },
    /// A real country, but not adjacent to the chain. Consumes an attempt.
    NotAdjacent { iso3: String },
    /// The country is already placed (start, end, or an accepted guess).
    /// User confusion rather than a strategic mistake — does not consume an
    /// attempt.
    AlreadyInChain { iso3: String },
    /// The input matched no country. Does not consume an attempt.
    NotRecognized,
    /// The accepted guess connected start to end.
    Won {
        iso3: String,
        on_shortest_path: bool,
    },
    /// The guess used the final attempt without connecting. `accepted`
    /// distinguishes a valid-but-too-late guess from a non-adjacent one.
    Lost {
        iso3: String,
        accepted: bool,
        on_shortest_path: bool,
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
    /// of shortest-path countries is computed once, up front.
    pub fn new(start: String, end: String, difficulty: Difficulty, graph: &Graph) -> BorderRunGame {
        let shortest_path_set = all_shortest_paths(graph, &start, &end);
        BorderRunGame {
            start,
            end,
            chain: Vec::new(),
            attempts_used: 0,
            attempts_limit: difficulty.attempts_limit(),
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

        if !self.is_adjacent_to_chain(graph, iso3) {
            self.attempts_used += 1;
            if self.attempts_used >= self.attempts_limit {
                self.status = GameStatus::Lost;
                return GuessOutcome::Lost {
                    iso3: iso3.to_string(),
                    accepted: false,
                    on_shortest_path: false,
                };
            }
            return GuessOutcome::NotAdjacent {
                iso3: iso3.to_string(),
            };
        }

        // Accepted: extend the chain.
        self.chain.push(iso3.to_string());
        self.attempts_used += 1;
        let on_shortest_path = self.shortest_path_set.contains(iso3);

        if self.connects_start_to_end(graph) {
            self.status = GameStatus::Won;
            return GuessOutcome::Won {
                iso3: iso3.to_string(),
                on_shortest_path,
            };
        }
        if self.attempts_used >= self.attempts_limit {
            self.status = GameStatus::Lost;
            return GuessOutcome::Lost {
                iso3: iso3.to_string(),
                accepted: true,
                on_shortest_path,
            };
        }
        GuessOutcome::Accepted {
            iso3: iso3.to_string(),
            on_shortest_path,
        }
    }

    /// True if `iso3` is the start, the end, or an already-accepted guess.
    fn is_placed(&self, iso3: &str) -> bool {
        iso3 == self.start || iso3 == self.end || self.chain.iter().any(|c| c == iso3)
    }

    /// True if `iso3` borders any country currently in the chain, where the
    /// chain is `start` + accepted guesses + `end`.
    fn is_adjacent_to_chain(&self, graph: &Graph, iso3: &str) -> bool {
        graph.is_adjacent(iso3, &self.start)
            || graph.is_adjacent(iso3, &self.end)
            || self.chain.iter().any(|c| graph.is_adjacent(iso3, c))
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
