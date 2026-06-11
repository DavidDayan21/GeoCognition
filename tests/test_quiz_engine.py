"""Tests du moteur de quiz générique : sélection, mise à jour SM-2, bilan."""

from datetime import datetime, timedelta

from src.core.models import Country, UserStats
from src.core.quiz_engine import QuizEngine
from src.questions.base import Question

NOW = datetime(2026, 6, 11, 12, 0, 0)


class FakeQuestion(Question):
    """Question factice : la note est encodée directement dans la réponse."""

    @property
    def prompt(self) -> str:
        return f"Question factice sur {self.country.name_fr}"

    @property
    def correct_answer(self) -> str:
        return self.country.capital_fr

    def evaluate(self, answer: str) -> int:
        return int(answer)


def make_country(country_id: int, continent: str = "Europe") -> Country:
    """Construit un pays de test."""
    return Country(
        id=country_id,
        name_fr=f"Pays {country_id}",
        capital_fr=f"Capitale {country_id}",
        continent=continent,
        iso_code=f"P{country_id}",
    )


def make_engine() -> QuizEngine:
    """Construit un moteur avec une horloge fixe pour des tests déterministes."""
    return QuizEngine(question_factory=FakeQuestion, clock=lambda: NOW)


def test_selection_priorise_les_pays_dus_du_plus_ancien_au_plus_recent() -> None:
    """Les pays dus sont choisis en premier, triés par next_review croissant."""
    pool = [
        (make_country(1), UserStats(1, next_review=NOW - timedelta(days=1))),
        (make_country(2), UserStats(2, next_review=NOW - timedelta(days=10))),
        (make_country(3), UserStats(3, next_review=NOW - timedelta(days=5))),
    ]
    selected = make_engine().select_countries(pool, size=3)
    assert [c.id for c in selected] == [2, 3, 1]


def test_selection_complete_avec_les_plus_petits_ef() -> None:
    """Si les pays dus ne suffisent pas, on complète par EF croissant."""
    future = NOW + timedelta(days=3)
    pool = [
        (make_country(1), UserStats(1, next_review=NOW - timedelta(days=1))),
        (make_country(2), UserStats(2, easiness_factor=2.8, next_review=future)),
        (make_country(3), UserStats(3, easiness_factor=1.4, next_review=future)),
        (make_country(4), UserStats(4, easiness_factor=2.0, next_review=future)),
    ]
    selected = make_engine().select_countries(pool, size=3)
    # Le pays dû d'abord, puis les EF les plus faibles (1.4 puis 2.0).
    assert [c.id for c in selected] == [1, 3, 4]


def test_selection_respecte_la_taille_demandee() -> None:
    """La sélection ne dépasse jamais la taille de session demandée."""
    pool = [
        (make_country(i), UserStats(i, next_review=NOW - timedelta(days=i)))
        for i in range(1, 31)
    ]
    selected = make_engine().select_countries(pool, size=20)
    assert len(selected) == 20


def test_submit_answer_met_a_jour_les_stats_sm2_et_les_compteurs() -> None:
    """Une bonne réponse applique SM-2 et incrémente les compteurs."""
    engine = make_engine()
    country = make_country(1)
    stats = UserStats(1, next_review=NOW)
    result, new_stats = engine.submit_answer(
        FakeQuestion(country), stats, answer="5", elapsed_seconds=2.5
    )
    assert result.quality == 5
    assert result.is_correct
    assert new_stats.repetitions == 1
    assert new_stats.interval_days == 1
    assert new_stats.next_review == NOW + timedelta(days=1)
    assert new_stats.total_answers == 1
    assert new_stats.correct_answers == 1
    # Les stats d'origine ne sont pas mutées (le moteur est sans effet de bord).
    assert stats.repetitions == 0


def test_submit_answer_echec_reinitialise_les_repetitions() -> None:
    """Une mauvaise réponse remet N à 0 sans incrémenter correct_answers."""
    engine = make_engine()
    country = make_country(1)
    stats = UserStats(1, repetitions=3, interval_days=15, next_review=NOW)
    result, new_stats = engine.submit_answer(
        FakeQuestion(country), stats, answer="0", elapsed_seconds=4.0
    )
    assert not result.is_correct
    assert new_stats.repetitions == 0
    assert new_stats.interval_days == 1
    assert new_stats.correct_answers == 0
    assert new_stats.total_answers == 1


def test_report_calcule_taux_continent_faible_et_maitrise() -> None:
    """Le bilan agrège taux de réussite, continent faible et pays maîtrisés."""
    engine = make_engine()
    europe = make_country(1, continent="Europe")
    asie = make_country(2, continent="Asie")
    stats_europe = UserStats(1, next_review=NOW)
    stats_asie = UserStats(2, next_review=NOW)
    results = []
    result, _ = engine.submit_answer(FakeQuestion(europe), stats_europe, "5", 1.0)
    results.append(result)
    result, _ = engine.submit_answer(FakeQuestion(asie), stats_asie, "0", 3.0)
    results.append(result)

    all_stats = [
        UserStats(1, easiness_factor=2.6, repetitions=3, next_review=NOW),  # maîtrisé
        UserStats(2, easiness_factor=2.6, repetitions=1, next_review=NOW),  # N trop bas
        UserStats(3, easiness_factor=2.5, repetitions=5, next_review=NOW),  # EF trop bas
    ]
    report = engine.build_report(results, all_stats)
    assert report.total_questions == 2
    assert report.success_rate == 0.5
    assert report.weakest_continent == "Asie"
    assert report.average_time_seconds == 2.0
    assert report.mastered_count == 1
