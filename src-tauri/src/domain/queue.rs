//! Next-question selection: drill queue + SM-2 priority. Pure: the caller
//! supplies candidates, the in-run drill queue, the clock, and the RNG.

use chrono::{DateTime, Utc};
use rand::seq::IndexedRandom;
use rand::Rng;

use crate::domain::question_mode::QuestionMode;

/// A card eligible for selection (already filtered to enabled continents
/// and modes by the caller).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Candidate {
    pub country_id: i64,
    pub mode: QuestionMode,
    pub ef: f64,
    pub next_review: DateTime<Utc>,
}

/// An in-run failure scheduled to be re-asked. Not persisted.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DrillEntry {
    pub country_id: i64,
    pub mode: QuestionMode,
    /// Question index at which the card becomes ready to re-ask.
    pub reappear_at_index: u64,
    /// Question index at which the failure happened (oldest first wins).
    pub failed_at_index: u64,
}

/// Question index at which a failed card should reappear: the current
/// index plus a random offset in [7, 9] (nominally 8, randomized so the
/// re-asks feel less mechanical).
pub fn drill_reappear_index<R: Rng + ?Sized>(current_index: u64, rng: &mut R) -> u64 {
    current_index + rng.random_range(7..=9)
}

/// Picks the next card to ask:
///
/// 1. a ready drill entry (`reappear_at_index <= current_index`),
///    oldest failure first;
/// 2. otherwise the most overdue candidate (`next_review <= now`);
/// 3. otherwise the candidate with the lowest easiness factor;
/// 4. ties on (2) and (3) are broken randomly via `rng`.
///
/// Returns `None` only when there is nothing to ask at all.
pub fn next_card<R: Rng + ?Sized>(
    candidates: &[Candidate],
    drill_queue: &[DrillEntry],
    current_index: u64,
    now: DateTime<Utc>,
    rng: &mut R,
) -> Option<(i64, QuestionMode)> {
    if let Some(entry) = drill_queue
        .iter()
        .filter(|e| e.reappear_at_index <= current_index)
        .min_by_key(|e| e.failed_at_index)
    {
        return Some((entry.country_id, entry.mode));
    }

    let overdue: Vec<&Candidate> = candidates.iter().filter(|c| c.next_review <= now).collect();
    if let Some(oldest) = overdue.iter().map(|c| c.next_review).min() {
        let tied: Vec<&&Candidate> = overdue.iter().filter(|c| c.next_review == oldest).collect();
        return tied.choose(rng).map(|c| (c.country_id, c.mode));
    }

    let lowest_ef = candidates.iter().map(|c| c.ef).min_by(f64::total_cmp)?;
    let tied: Vec<&Candidate> = candidates.iter().filter(|c| c.ef == lowest_ef).collect();
    tied.choose(rng).map(|c| (c.country_id, c.mode))
}
