use rand::rngs::StdRng;
use rand::SeedableRng;
use sqlx::SqlitePool;
use tauri::async_runtime::Mutex;

use crate::domain::border_run::game::BorderRunGame;
use crate::domain::border_run::generator::PairBuckets;
use crate::domain::border_run::graph::Graph;
use crate::domain::models::Country;
use crate::domain::queue::DrillEntry;
use crate::error::AppError;
use crate::infra::seed::load_bundled_countries;

/// Per-run quiz state. Never persisted; resets on every app launch.
pub struct RunState {
    /// 0-based index of the next question to be answered.
    pub current_index: u64,
    /// In-run failures waiting to be re-asked (section 2.3 drill rule).
    pub drill_queue: Vec<DrillEntry>,
    /// RNG for mode mixing, tiebreaks, and drill offsets.
    pub rng: StdRng,
}

impl RunState {
    /// Fresh run state with an OS-seeded RNG.
    pub fn new() -> Self {
        Self::with_rng(StdRng::from_os_rng())
    }

    /// Fresh run state with a fixed seed (deterministic tests).
    pub fn seeded(seed: u64) -> Self {
        Self::with_rng(StdRng::seed_from_u64(seed))
    }

    fn with_rng(rng: StdRng) -> Self {
        RunState {
            current_index: 0,
            drill_queue: Vec::new(),
            rng,
        }
    }
}

impl Default for RunState {
    fn default() -> Self {
        Self::new()
    }
}

/// Immutable Border Run data derived from the bundled country dataset:
/// the country list (for name resolution), the adjacency graph, and the
/// difficulty-bucketed pair index. Built once at startup.
pub struct BorderRunResources {
    pub countries: Vec<Country>,
    pub graph: Graph,
    pub buckets: PairBuckets,
}

impl BorderRunResources {
    /// Builds the graph and pair buckets from the bundled dataset.
    ///
    /// Tradeoff: this is eager (paid at every launch, including Practice
    /// mode). For the 195-country dataset the cost is a few milliseconds —
    /// 195 BFS traversals over a tiny graph — so it is not worth the
    /// complexity of lazy initialization.
    pub fn build() -> Result<Self, AppError> {
        let countries = load_bundled_countries()?;
        let graph = Graph::from_countries(&countries);
        let buckets = PairBuckets::build(&graph);
        Ok(BorderRunResources {
            countries,
            graph,
            buckets,
        })
    }
}

/// Shared application state managed by Tauri.
pub struct AppState {
    /// SQLite connection pool (persistent SM-2 state, settings, log).
    pub pool: SqlitePool,
    /// Mutable per-run state behind an async mutex.
    pub run: Mutex<RunState>,
    /// Immutable Border Run graph/pair data, built once at startup.
    pub border_run_resources: BorderRunResources,
    /// The single active Border Run game, if any.
    pub border_run: Mutex<Option<BorderRunGame>>,
}

impl AppState {
    /// Wraps an initialized pool with a fresh run state and the Border Run
    /// resources derived from the bundled dataset.
    pub fn new(pool: SqlitePool) -> Result<Self, AppError> {
        Ok(AppState {
            pool,
            run: Mutex::new(RunState::new()),
            border_run_resources: BorderRunResources::build()?,
            border_run: Mutex::new(None),
        })
    }
}
