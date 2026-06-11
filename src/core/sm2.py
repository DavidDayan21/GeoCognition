"""Algorithme de répétition espacée SuperMemo-2 (SM-2).

Module pur : aucune dépendance vers l'UI ou la base de données.
La fonction `review` est sans effet de bord (l'horloge est injectée),
ce qui la rend testable unitairement de manière déterministe.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

# Facteur de facilité minimal autorisé par SM-2.
MIN_EASINESS_FACTOR: float = 1.3
# Note en dessous de laquelle la révision est considérée comme un échec.
PASSING_QUALITY: int = 3
# Bornes de la note q.
MIN_QUALITY: int = 0
MAX_QUALITY: int = 5
# Intervalles fixes des deux premières répétitions réussies (en jours).
FIRST_INTERVAL_DAYS: int = 1
SECOND_INTERVAL_DAYS: int = 6
# Intervalle appliqué après un échec (q < 3) : à revoir très vite.
RESET_INTERVAL_DAYS: int = 1


@dataclass(frozen=True)
class SM2State:
    """État de mémorisation d'un item avant révision (EF, N, I)."""

    easiness_factor: float
    repetitions: int
    interval_days: int


@dataclass(frozen=True)
class SM2Review:
    """Résultat d'une révision : nouvel état + date de la prochaine révision."""

    easiness_factor: float
    repetitions: int
    interval_days: int
    next_review: datetime


def review(state: SM2State, quality: int, now: datetime) -> SM2Review:
    """Applique une révision SM-2 et retourne le nouvel état.

    Args:
        state: état courant de l'item (EF, N, I).
        quality: note q ∈ [0, 5] attribuée à la réponse de l'utilisateur.
        now: instant de la révision (injecté pour rester une fonction pure).

    Returns:
        Le nouvel état (EF', N', I') et la date de prochaine révision.

    Raises:
        ValueError: si la note est hors de l'intervalle [0, 5].
    """
    if not MIN_QUALITY <= quality <= MAX_QUALITY:
        raise ValueError(
            f"La note q doit être dans [{MIN_QUALITY}, {MAX_QUALITY}], reçu : {quality}"
        )

    # 1. Mise à jour du facteur de facilité, borné par MIN_EASINESS_FACTOR.
    miss = MAX_QUALITY - quality
    new_ef = max(
        MIN_EASINESS_FACTOR,
        state.easiness_factor + (0.1 - miss * (0.08 + miss * 0.02)),
    )

    # 2. Mise à jour du compteur de répétitions et de l'intervalle.
    if quality < PASSING_QUALITY:
        new_repetitions = 0
        new_interval = RESET_INTERVAL_DAYS
    else:
        new_repetitions = state.repetitions + 1
        if new_repetitions == 1:
            new_interval = FIRST_INTERVAL_DAYS
        elif new_repetitions == 2:
            new_interval = SECOND_INTERVAL_DAYS
        else:
            # L'intervalle utilise le facteur de facilité déjà mis à jour (EF'),
            # conformément à la formule I' = ceil(I * EF').
            new_interval = math.ceil(state.interval_days * new_ef)

    # 3. Date de la prochaine révision.
    return SM2Review(
        easiness_factor=new_ef,
        repetitions=new_repetitions,
        interval_days=new_interval,
        next_review=now + timedelta(days=new_interval),
    )
