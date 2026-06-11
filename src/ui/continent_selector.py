"""Sélection des continents à réviser.

`ContinentSelector` est volontairement abstrait : la V1 propose des cases à
cocher dans le terminal, mais une future version pourra brancher une carte
interactive cliquable en fournissant une autre implémentation, sans modifier
le reste de l'application.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import questionary

# Continents proposés au choix (l'Antarctique est exclu : aucun pays).
CONTINENTS: tuple[str, ...] = (
    "Afrique",
    "Amérique du Nord",
    "Amérique du Sud",
    "Asie",
    "Europe",
    "Océanie",
)


class ContinentSelector(ABC):
    """Interface de sélection de continents (checkboxes, carte future, etc.)."""

    @abstractmethod
    def select(self) -> list[str]:
        """Retourne la liste des continents choisis (vide si annulation)."""


class CheckboxContinentSelector(ContinentSelector):
    """Implémentation V1 : menu à cases à cocher dans le terminal."""

    def select(self) -> list[str]:
        choices = [questionary.Choice(continent, checked=True) for continent in CONTINENTS]
        answer = questionary.checkbox(
            "Quels continents veux-tu réviser ? (espace pour cocher, entrée pour valider)",
            choices=choices,
        ).ask()
        return answer or []
