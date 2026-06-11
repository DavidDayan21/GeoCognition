"""Question « Quelle est la capitale de X ? » avec tolérance aux fautes de frappe."""

from __future__ import annotations

import unicodedata

from rapidfuzz.distance import Levenshtein

from src.questions.base import Question

# Notes SM-2 attribuées selon la qualité de la réponse.
QUALITY_EXACT: int = 5
QUALITY_TYPO: int = 3
QUALITY_WRONG: int = 0
# Distance de Levenshtein normalisée maximale pour tolérer une faute de frappe.
TYPO_MAX_NORMALIZED_DISTANCE: float = 0.15


def normalize_text(text: str) -> str:
    """Normalise un texte pour comparaison : minuscules, sans accents, espaces réduits."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(without_accents.lower().split())


class CapitalQuestion(Question):
    """Demande la capitale d'un pays, réponse saisie au clavier."""

    @property
    def prompt(self) -> str:
        return f"Quelle est la capitale de {self.country.name_fr} ?"

    @property
    def correct_answer(self) -> str:
        return self.country.capital_fr

    def evaluate(self, answer: str) -> int:
        """Note la réponse : 5 si exacte (casse/accents ignorés), 3 si faute
        de frappe légère (distance normalisée ≤ 0.15), 0 sinon."""
        expected = normalize_text(self.correct_answer)
        given = normalize_text(answer)
        if given == expected:
            return QUALITY_EXACT
        if Levenshtein.normalized_distance(given, expected) <= TYPO_MAX_NORMALIZED_DISTANCE:
            return QUALITY_TYPO
        return QUALITY_WRONG
