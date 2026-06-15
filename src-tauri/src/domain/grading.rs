//! Answer grading: maps free-text input to an SM-2 quality of 0, 3, or 5.

use unicode_normalization::char::is_combining_mark;
use unicode_normalization::UnicodeNormalization;

/// Default near-miss tolerance (the "normal" fuzzy setting).
pub const DEFAULT_TOLERANCE: f64 = 0.15;

/// Grades `user_input` against the `correct` answer with the default
/// 15% near-miss tolerance. See [`grade_with_tolerance`].
pub fn grade(user_input: &str, correct: &str) -> u8 {
    grade_with_tolerance(user_input, correct, DEFAULT_TOLERANCE)
}

/// Grades `user_input` against the `correct` answer.
///
/// Returns 5 for an exact match (case- and accent-insensitive), 3 for a
/// near miss (Levenshtein distance within `max_ratio` of the longer
/// string), and 0 otherwise. A `max_ratio` of 0 accepts exact matches
/// only.
pub fn grade_with_tolerance(user_input: &str, correct: &str, max_ratio: f64) -> u8 {
    let a = normalize(user_input);
    let b = normalize(correct);
    if a == b {
        return 5;
    }
    let max_len = a.chars().count().max(b.chars().count()) as f64;
    if max_len == 0.0 {
        return 0;
    }
    let dist = strsim::levenshtein(&a, &b) as f64;
    let ratio = dist / max_len;
    if ratio <= max_ratio {
        3
    } else {
        0
    }
}

/// Lowercases, strips accents (NFD + combining-mark removal), and trims.
fn normalize(s: &str) -> String {
    s.trim()
        .to_lowercase()
        .nfd()
        .filter(|c| !is_combining_mark(*c))
        .collect()
}
