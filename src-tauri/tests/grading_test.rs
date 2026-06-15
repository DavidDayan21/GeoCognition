use geocognition_lib::domain::grading::{grade, grade_bilingual};

#[test]
fn exact_match_scores_5() {
    assert_eq!(grade("Tokyo", "Tokyo"), 5);
}

#[test]
fn case_insensitive_match_scores_5() {
    assert_eq!(grade("tokyo", "Tokyo"), 5);
    assert_eq!(grade("PARIS", "Paris"), 5);
}

#[test]
fn accent_insensitive_match_scores_5() {
    assert_eq!(grade("Bogota", "Bogotá"), 5);
    assert_eq!(grade("asuncion", "Asunción"), 5);
    assert_eq!(grade("Reykjavik", "Reykjavík"), 5);
    assert_eq!(grade("Sao Tome", "São Tomé"), 5);
}

#[test]
fn surrounding_whitespace_is_ignored() {
    assert_eq!(grade("  Tokyo  ", "Tokyo"), 5);
}

#[test]
fn typo_within_15_percent_scores_3() {
    // 1 edit over 10 chars = 0.10
    assert_eq!(grade("Washingtom", "Washington"), 3);
    // 1 edit over 9 chars ≈ 0.11
    assert_eq!(grade("Amsterdan", "Amsterdam"), 3);
}

#[test]
fn typo_beyond_15_percent_scores_0() {
    // 1 edit over 5 chars = 0.20
    assert_eq!(grade("Tokio", "Tokyo"), 0);
}

#[test]
fn way_off_scores_0() {
    assert_eq!(grade("Paris", "Tokyo"), 0);
}

#[test]
fn empty_input_scores_0() {
    assert_eq!(grade("", "Tokyo"), 0);
    assert_eq!(grade("   ", "Tokyo"), 0);
}

// ---------------------------------------------------------------------------
// Bilingual grading: accept English OR French regardless of UI language.
// ---------------------------------------------------------------------------

#[test]
fn english_input_matches_english_answer() {
    // "Moscow" (en) vs "Moscou" (fr): the English answer scores 5.
    assert_eq!(grade_bilingual("Moscow", "Moscow", "Moscou"), 5);
}

#[test]
fn french_input_matches_french_answer() {
    // The user typed the French capital; it must score 5.
    assert_eq!(grade_bilingual("Moscou", "Moscow", "Moscou"), 5);
}

#[test]
fn either_language_scores_correctly_independent_of_order() {
    // Cairo / Le Caire — both forms accepted, best score wins.
    assert_eq!(grade_bilingual("Cairo", "Cairo", "Le Caire"), 5);
    assert_eq!(grade_bilingual("le caire", "Cairo", "Le Caire"), 5);
    // A country name that is identical in both languages still works.
    assert_eq!(grade_bilingual("Japon", "Japan", "Japon"), 5);
    assert_eq!(grade_bilingual("Japan", "Japan", "Japon"), 5);
}

#[test]
fn typo_tolerance_works_in_both_languages() {
    // 1 edit over 6 chars = 0.16 > 0.15 -> "Moscou" itself is exact (5),
    // but a typo'd English form within tolerance scores 3 on the EN side.
    // "Beijing" / "Pékin": typo in the English answer.
    assert_eq!(grade_bilingual("Beijong", "Beijing", "Pékin"), 3);
    // Typo in the French answer (accent-insensitive): "Pekim" vs "Pékin"
    // is 1 edit over 5 chars = 0.20 -> 0; "Pekin" is exact after folding.
    assert_eq!(grade_bilingual("Pekin", "Beijing", "Pékin"), 5);
    // A near miss on the French side: "Varsovi" vs "Varsovie" = 1/8 = 0.125.
    assert_eq!(grade_bilingual("Varsovi", "Warsaw", "Varsovie"), 3);
}

#[test]
fn way_off_in_both_languages_scores_0() {
    assert_eq!(grade_bilingual("Berlin", "Moscow", "Moscou"), 0);
}
