use geocognition_lib::domain::sm2::{update, Sm2State};

const EPS: f64 = 1e-9;

#[test]
fn fresh_card_q5_first_repetition() {
    let next = update(Sm2State::default(), 5);
    assert_eq!(next.repetitions, 1);
    assert_eq!(next.interval_days, 1);
    assert!(next.ef > 2.5, "EF should rise on a perfect answer");
    assert!((next.ef - 2.6).abs() < EPS);
}

#[test]
fn q5_twice_gives_six_day_interval() {
    let next = update(update(Sm2State::default(), 5), 5);
    assert_eq!(next.repetitions, 2);
    assert_eq!(next.interval_days, 6);
}

#[test]
fn q5_three_times_multiplies_interval_by_ef() {
    let twice = update(update(Sm2State::default(), 5), 5);
    let thrice = update(twice, 5);
    assert_eq!(thrice.repetitions, 3);
    let expected = (twice.interval_days as f64 * thrice.ef).ceil() as u32;
    assert_eq!(thrice.interval_days, expected);
    assert_eq!(thrice.interval_days, 17); // ceil(6 * 2.8)
}

#[test]
fn q0_resets_from_any_state() {
    let mature = Sm2State {
        ef: 2.8,
        repetitions: 7,
        interval_days: 120,
    };
    let next = update(mature, 0);
    assert_eq!(next.repetitions, 0);
    assert_eq!(next.interval_days, 1);
    assert!(next.ef < mature.ef, "EF should drop on a failure");
}

#[test]
fn ef_never_drops_below_floor() {
    let mut state = Sm2State::default();
    for _ in 0..20 {
        state = update(state, 0);
    }
    assert!((state.ef - 1.3).abs() < EPS);
}

#[test]
fn repeated_q5_grows_ef_monotonically() {
    let mut state = Sm2State::default();
    for _ in 0..10 {
        let next = update(state, 5);
        assert!(next.ef > state.ef);
        state = next;
    }
}

#[test]
fn q4_keeps_ef_unchanged() {
    let next = update(Sm2State::default(), 4);
    assert!((next.ef - 2.5).abs() < EPS);
    assert_eq!(next.repetitions, 1);
}

#[test]
fn q3_lowers_ef_but_advances_repetitions() {
    let next = update(Sm2State::default(), 3);
    assert!(next.ef < 2.5);
    assert_eq!(next.repetitions, 1);
    assert_eq!(next.interval_days, 1);
}

#[test]
fn q2_resets_but_keeps_failure_interval_of_one_day() {
    let state = Sm2State {
        ef: 2.5,
        repetitions: 3,
        interval_days: 21,
    };
    let next = update(state, 2);
    assert_eq!(next.repetitions, 0);
    assert_eq!(next.interval_days, 1);
}
