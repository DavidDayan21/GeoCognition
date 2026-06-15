use geocognition_lib::domain::grading::grade;

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
