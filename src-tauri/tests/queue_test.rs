use chrono::{DateTime, Duration, Utc};
use geocognition_lib::domain::question_mode::QuestionMode;
use geocognition_lib::domain::queue::{drill_reappear_index, next_card, Candidate, DrillEntry};
use rand::rngs::StdRng;
use rand::SeedableRng;

fn now() -> DateTime<Utc> {
    DateTime::parse_from_rfc3339("2026-06-13T12:00:00Z")
        .expect("valid timestamp")
        .with_timezone(&Utc)
}

fn candidate(id: i64, ef: f64, next_review: DateTime<Utc>) -> Candidate {
    Candidate {
        country_id: id,
        mode: QuestionMode::Capital,
        ef,
        next_review,
    }
}

fn drill(id: i64, reappear_at_index: u64, failed_at_index: u64) -> DrillEntry {
    DrillEntry {
        country_id: id,
        mode: QuestionMode::Capital,
        reappear_at_index,
        failed_at_index,
    }
}

#[test]
fn ready_drill_entry_takes_priority_over_overdue_cards() {
    let candidates = [candidate(1, 1.3, now() - Duration::days(30))];
    let drills = [drill(99, 10, 2)];
    let mut rng = StdRng::seed_from_u64(42);
    let pick = next_card(&candidates, &drills, 10, now(), &mut rng);
    assert_eq!(pick, Some((99, QuestionMode::Capital)));
}

#[test]
fn unready_drill_entry_is_ignored() {
    let candidates = [candidate(1, 2.5, now() - Duration::days(1))];
    let drills = [drill(99, 11, 2)];
    let mut rng = StdRng::seed_from_u64(42);
    let pick = next_card(&candidates, &drills, 10, now(), &mut rng);
    assert_eq!(pick, Some((1, QuestionMode::Capital)));
}

#[test]
fn oldest_failure_is_drilled_first() {
    let drills = [drill(7, 9, 5), drill(3, 8, 1), drill(5, 10, 3)];
    let mut rng = StdRng::seed_from_u64(42);
    let pick = next_card(&[], &drills, 10, now(), &mut rng);
    assert_eq!(pick, Some((3, QuestionMode::Capital)));
}

#[test]
fn most_overdue_card_beats_lower_ef_card() {
    let candidates = [
        candidate(1, 2.9, now() - Duration::days(10)),
        candidate(2, 1.3, now() - Duration::days(2)),
        candidate(3, 1.3, now() + Duration::days(3)),
    ];
    let mut rng = StdRng::seed_from_u64(42);
    let pick = next_card(&candidates, &[], 0, now(), &mut rng);
    assert_eq!(pick, Some((1, QuestionMode::Capital)));
}

#[test]
fn lowest_ef_wins_when_nothing_is_due() {
    let candidates = [
        candidate(1, 2.9, now() + Duration::days(1)),
        candidate(2, 1.6, now() + Duration::days(2)),
        candidate(3, 2.2, now() + Duration::days(3)),
    ];
    let mut rng = StdRng::seed_from_u64(42);
    let pick = next_card(&candidates, &[], 0, now(), &mut rng);
    assert_eq!(pick, Some((2, QuestionMode::Capital)));
}

#[test]
fn ef_tiebreak_is_deterministic_with_seeded_rng() {
    let candidates = [
        candidate(1, 1.5, now() + Duration::days(1)),
        candidate(2, 1.5, now() + Duration::days(1)),
        candidate(3, 1.5, now() + Duration::days(1)),
        candidate(4, 2.5, now() + Duration::days(1)),
    ];
    let mut rng_a = StdRng::seed_from_u64(7);
    let mut rng_b = StdRng::seed_from_u64(7);
    let pick_a = next_card(&candidates, &[], 0, now(), &mut rng_a);
    let pick_b = next_card(&candidates, &[], 0, now(), &mut rng_b);
    assert_eq!(pick_a, pick_b);
    let (id, _) = pick_a.expect("a card is picked");
    assert!((1..=3).contains(&id), "tied low-EF cards only");
}

#[test]
fn empty_inputs_yield_none() {
    let mut rng = StdRng::seed_from_u64(42);
    assert_eq!(next_card(&[], &[], 0, now(), &mut rng), None);
}

#[test]
fn drill_reappear_offset_stays_within_7_to_9() {
    let mut rng = StdRng::seed_from_u64(42);
    for index in 0..200 {
        let reappear = drill_reappear_index(index, &mut rng);
        let offset = reappear - index;
        assert!((7..=9).contains(&offset), "offset {offset} out of range");
    }
}
