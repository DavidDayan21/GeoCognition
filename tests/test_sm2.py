"""Tests unitaires rigoureux de l'algorithme SM-2 (fonction pure)."""

from datetime import datetime, timedelta

import pytest

from src.core.sm2 import (
    MIN_EASINESS_FACTOR,
    SM2State,
    review,
)

# Horloge fixe injectée dans la fonction pure pour des tests déterministes.
NOW = datetime(2026, 6, 11, 12, 0, 0)


def test_q5_premiere_repetition() -> None:
    """q=5 sur N=0 → I=1, N=1, EF augmente de 0.1."""
    state = SM2State(easiness_factor=2.5, repetitions=0, interval_days=0)
    result = review(state, quality=5, now=NOW)
    assert result.interval_days == 1
    assert result.repetitions == 1
    assert result.easiness_factor == pytest.approx(2.6)
    assert result.next_review == NOW + timedelta(days=1)


def test_q5_deuxieme_repetition() -> None:
    """q=5 sur N=1 → I=6, N=2."""
    state = SM2State(easiness_factor=2.6, repetitions=1, interval_days=1)
    result = review(state, quality=5, now=NOW)
    assert result.interval_days == 6
    assert result.repetitions == 2


def test_q5_troisieme_repetition_ef_2_5() -> None:
    """q=5 sur N=2 avec EF=2.5 et I=6.

    Conformément à la formule de la spec (I' = ceil(I * EF') avec EF' calculé
    d'abord) : EF' = 2.5 + 0.1 = 2.6, donc I' = ceil(6 * 2.6) = 16.
    NB : la valeur « 15 » citée dans la spec correspondrait à l'ancien EF
    (6 * 2.5) ; c'est la formule explicite qui fait foi ici.
    """
    state = SM2State(easiness_factor=2.5, repetitions=2, interval_days=6)
    result = review(state, quality=5, now=NOW)
    assert result.repetitions == 3
    assert result.easiness_factor == pytest.approx(2.6)
    assert result.interval_days == 16
    assert result.next_review == NOW + timedelta(days=16)


def test_q0_reset_et_ef_diminue() -> None:
    """q=0 → N repasse à 0, I=1, EF diminue (2.5 - 0.8 = 1.7)."""
    state = SM2State(easiness_factor=2.5, repetitions=4, interval_days=30)
    result = review(state, quality=0, now=NOW)
    assert result.repetitions == 0
    assert result.interval_days == 1
    assert result.easiness_factor == pytest.approx(1.7)
    assert result.easiness_factor < state.easiness_factor


def test_ef_ne_descend_jamais_sous_1_3() -> None:
    """EF est borné inférieurement à 1.3, même après des échecs répétés."""
    state = SM2State(easiness_factor=1.3, repetitions=0, interval_days=1)
    for _ in range(5):
        result = review(state, quality=0, now=NOW)
        assert result.easiness_factor == MIN_EASINESS_FACTOR
        state = SM2State(
            result.easiness_factor, result.repetitions, result.interval_days
        )


def test_q3_compte_comme_reussite_mais_ef_baisse() -> None:
    """q=3 (rappel difficile) incrémente N mais fait baisser EF."""
    state = SM2State(easiness_factor=2.5, repetitions=0, interval_days=0)
    result = review(state, quality=3, now=NOW)
    assert result.repetitions == 1
    assert result.interval_days == 1
    # EF' = 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.36
    assert result.easiness_factor == pytest.approx(2.36)


def test_q2_est_un_echec() -> None:
    """q=2 (< 3) remet N à 0 et l'intervalle à 1 jour."""
    state = SM2State(easiness_factor=2.0, repetitions=3, interval_days=15)
    result = review(state, quality=2, now=NOW)
    assert result.repetitions == 0
    assert result.interval_days == 1


def test_q4_laisse_ef_inchange() -> None:
    """q=4 : EF' = EF + (0.1 - 1 * 0.10) = EF (point neutre de la formule)."""
    state = SM2State(easiness_factor=2.5, repetitions=0, interval_days=0)
    result = review(state, quality=4, now=NOW)
    assert result.easiness_factor == pytest.approx(2.5)


@pytest.mark.parametrize("quality", [-1, 6, 100])
def test_note_hors_bornes_leve_une_erreur(quality: int) -> None:
    """Une note hors de [0, 5] lève une ValueError."""
    state = SM2State(easiness_factor=2.5, repetitions=0, interval_days=0)
    with pytest.raises(ValueError):
        review(state, quality=quality, now=NOW)
