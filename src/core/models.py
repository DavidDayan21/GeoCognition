"""Modèles du domaine : pays, statistiques utilisateur et résultats de quiz."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from src.core.sm2 import PASSING_QUALITY

# Valeurs SM-2 par défaut pour un pays jamais révisé.
DEFAULT_EASINESS_FACTOR: float = 2.5
DEFAULT_REPETITIONS: int = 0
DEFAULT_INTERVAL_DAYS: int = 0

# Seuils définissant un pays « maîtrisé ».
MASTERY_MIN_EF: float = 2.5
MASTERY_MIN_REPETITIONS: int = 3


@dataclass(frozen=True)
class Country:
    """Un pays de la base statique (le code ISO servira au futur mode drapeaux)."""

    id: int
    name_fr: str
    capital_fr: str
    continent: str
    iso_code: str


@dataclass
class UserStats:
    """Statistiques SM-2 de l'utilisateur pour un pays donné."""

    country_id: int
    easiness_factor: float = DEFAULT_EASINESS_FACTOR
    repetitions: int = DEFAULT_REPETITIONS
    interval_days: int = DEFAULT_INTERVAL_DAYS
    next_review: datetime = field(default_factory=datetime.now)
    total_answers: int = 0
    correct_answers: int = 0

    def is_mastered(self) -> bool:
        """Un pays est maîtrisé si EF > 2.5 et N ≥ 3."""
        return (
            self.easiness_factor > MASTERY_MIN_EF
            and self.repetitions >= MASTERY_MIN_REPETITIONS
        )


@dataclass(frozen=True)
class QuizResult:
    """Résultat d'une question posée pendant une session."""

    country: Country
    user_answer: str
    correct_answer: str
    quality: int
    elapsed_seconds: float

    @property
    def is_correct(self) -> bool:
        """Vrai si la réponse a été acceptée (exacte ou faute de frappe tolérée)."""
        return self.quality >= PASSING_QUALITY


@dataclass(frozen=True)
class SessionReport:
    """Bilan d'une session de quiz."""

    results: tuple[QuizResult, ...]
    mastered_count: int

    @property
    def total_questions(self) -> int:
        """Nombre de questions posées pendant la session."""
        return len(self.results)

    @property
    def success_rate(self) -> float:
        """Taux de réussite de la session, entre 0.0 et 1.0."""
        if not self.results:
            return 0.0
        return sum(1 for r in self.results if r.is_correct) / len(self.results)

    @property
    def average_time_seconds(self) -> float:
        """Temps moyen de réponse par question, en secondes."""
        if not self.results:
            return 0.0
        return sum(r.elapsed_seconds for r in self.results) / len(self.results)

    @property
    def weakest_continent(self) -> str | None:
        """Continent au taux de réussite le plus faible sur cette session."""
        if not self.results:
            return None
        per_continent: dict[str, list[bool]] = {}
        for result in self.results:
            per_continent.setdefault(result.country.continent, []).append(
                result.is_correct
            )
        return min(
            per_continent,
            key=lambda continent: sum(per_continent[continent])
            / len(per_continent[continent]),
        )
