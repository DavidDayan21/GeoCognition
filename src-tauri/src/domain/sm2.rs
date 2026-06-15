//! SuperMemo-2 spaced repetition. Pure: no I/O, no clock.

/// Per-card SM-2 scheduling state.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sm2State {
    /// Easiness factor, floored at 1.3.
    pub ef: f64,
    /// Consecutive successful repetitions.
    pub repetitions: u32,
    /// Days until the next review.
    pub interval_days: u32,
}

impl Default for Sm2State {
    /// Fresh card: EF 2.5, no repetitions, due immediately.
    fn default() -> Self {
        Sm2State {
            ef: 2.5,
            repetitions: 0,
            interval_days: 0,
        }
    }
}

/// Applies one SM-2 review with answer `quality` (0..=5).
///
/// Quality below 3 resets the repetition streak and schedules the card
/// for tomorrow; the easiness factor is always updated and never drops
/// below 1.3.
pub fn update(state: Sm2State, quality: u8) -> Sm2State {
    debug_assert!(quality <= 5);
    let q = quality as f64;
    let new_ef = (state.ef + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02))).max(1.3);

    if quality < 3 {
        return Sm2State {
            ef: new_ef,
            repetitions: 0,
            interval_days: 1,
        };
    }

    let new_reps = state.repetitions + 1;
    let new_interval = match new_reps {
        1 => 1,
        2 => 6,
        _ => (state.interval_days as f64 * new_ef).ceil() as u32,
    };

    Sm2State {
        ef: new_ef,
        repetitions: new_reps,
        interval_days: new_interval,
    }
}
