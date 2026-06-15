use rand::rngs::StdRng;
use rand::SeedableRng;
use sqlx::SqlitePool;
use tauri::async_runtime::Mutex;

use crate::domain::queue::DrillEntry;

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

/// Shared application state managed by Tauri.
pub struct AppState {
    /// SQLite connection pool (persistent SM-2 state, settings, log).
    pub pool: SqlitePool,
    /// Mutable per-run state behind an async mutex.
    pub run: Mutex<RunState>,
}

impl AppState {
    /// Wraps an initialized pool with a fresh run state.
    pub fn new(pool: SqlitePool) -> Self {
        AppState {
            pool,
            run: Mutex::new(RunState::new()),
        }
    }
}
