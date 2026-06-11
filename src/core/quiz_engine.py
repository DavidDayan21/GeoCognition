"""Moteur de quiz générique, indépendant du type de question et de l'UI.

Le moteur ne connaît que l'interface abstraite `Question` : il fonctionne à
l'identique pour le mode « capitales » et pour un futur mode « drapeaux ».
Il ne touche jamais à la base de données : il reçoit des statistiques et en
retourne de nouvelles, la persistance est la responsabilité de l'appelant.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import datetime

from src.core import sm2
from src.core.models import Country, QuizResult, SessionReport, UserStats
from src.questions.base import Question

# Nombre de questions par session.
DEFAULT_SESSION_SIZE: int = 20

# Fabrique de questions : transforme un pays en question concrète.
QuestionFactory = Callable[[Country], Question]


class QuizEngine:
    """Orchestre la sélection des pays, l'évaluation et la mise à jour SM-2."""

    def __init__(
        self,
        question_factory: QuestionFactory,
        clock: Callable[[], datetime] = datetime.now,
    ) -> None:
        self._question_factory = question_factory
        self._clock = clock

    def select_countries(
        self,
        pool: Sequence[tuple[Country, UserStats]],
        size: int = DEFAULT_SESSION_SIZE,
    ) -> list[Country]:
        """Choisit les pays de la session.

        Priorité aux pays « dus » (next_review <= maintenant), triés par date
        de révision la plus ancienne. Si la session n'est pas remplie, on
        complète avec les pays au plus petit facteur de facilité (EF).
        """
        now = self._clock()
        due = sorted(
            (pair for pair in pool if pair[1].next_review <= now),
            key=lambda pair: pair[1].next_review,
        )
        selected = [country for country, _ in due[:size]]
        if len(selected) < size:
            not_due = sorted(
                (pair for pair in pool if pair[1].next_review > now),
                key=lambda pair: pair[1].easiness_factor,
            )
            remaining = size - len(selected)
            selected.extend(country for country, _ in not_due[:remaining])
        return selected

    def build_question(self, country: Country) -> Question:
        """Crée la question concrète pour un pays via la fabrique injectée."""
        return self._question_factory(country)

    def submit_answer(
        self,
        question: Question,
        stats: UserStats,
        answer: str,
        elapsed_seconds: float,
    ) -> tuple[QuizResult, UserStats]:
        """Évalue une réponse, applique SM-2 et retourne (résultat, nouvelles stats)."""
        quality = question.evaluate(answer)
        outcome = sm2.review(
            sm2.SM2State(
                easiness_factor=stats.easiness_factor,
                repetitions=stats.repetitions,
                interval_days=stats.interval_days,
            ),
            quality,
            now=self._clock(),
        )
        is_correct = quality >= sm2.PASSING_QUALITY
        new_stats = UserStats(
            country_id=stats.country_id,
            easiness_factor=outcome.easiness_factor,
            repetitions=outcome.repetitions,
            interval_days=outcome.interval_days,
            next_review=outcome.next_review,
            total_answers=stats.total_answers + 1,
            correct_answers=stats.correct_answers + (1 if is_correct else 0),
        )
        result = QuizResult(
            country=question.country,
            user_answer=answer,
            correct_answer=question.correct_answer,
            quality=quality,
            elapsed_seconds=elapsed_seconds,
        )
        return result, new_stats

    @staticmethod
    def build_report(
        results: Sequence[QuizResult], all_stats: Sequence[UserStats]
    ) -> SessionReport:
        """Construit le bilan de session (le nombre de pays maîtrisés est
        calculé sur l'ensemble des statistiques fournies, pas uniquement la
        session)."""
        mastered = sum(1 for stats in all_stats if stats.is_mastered())
        return SessionReport(results=tuple(results), mastered_count=mastered)
