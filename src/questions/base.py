"""Abstraction d'une question de quiz.

Le moteur (`core/quiz_engine.py`) ne manipule que cette interface : ajouter
un nouveau type de question (ex. mode drapeaux via `Country.iso_code`) se
fait en créant une sous-classe, sans toucher au moteur ni à l'algorithme SM-2.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from src.core.models import Country


class Question(ABC):
    """Une question portant sur un pays, évaluable sur l'échelle SM-2 [0, 5]."""

    def __init__(self, country: Country) -> None:
        self.country = country

    @property
    @abstractmethod
    def prompt(self) -> str:
        """Texte de la question à afficher à l'utilisateur."""

    @property
    @abstractmethod
    def correct_answer(self) -> str:
        """Réponse attendue, sous sa forme canonique."""

    @abstractmethod
    def evaluate(self, answer: str) -> int:
        """Évalue la réponse de l'utilisateur et retourne la note q ∈ [0, 5]."""
