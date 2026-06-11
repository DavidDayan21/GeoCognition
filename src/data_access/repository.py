"""Dépôts de données : pays statiques (countries.json) et stats utilisateur (SQLite).

Seule cette couche connaît le format de stockage ; le cœur métier ne manipule
que les dataclasses de `core/models.py`.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path

from src.core.models import (
    DEFAULT_EASINESS_FACTOR,
    DEFAULT_INTERVAL_DAYS,
    DEFAULT_REPETITIONS,
    Country,
    UserStats,
)

# Schéma SQL livré à côté de ce module.
SCHEMA_PATH: Path = Path(__file__).parent / "schema.sql"


class CountryRepository:
    """Charge la base statique des pays depuis un fichier JSON."""

    def __init__(self, json_path: Path) -> None:
        with open(json_path, encoding="utf-8") as handle:
            raw = json.load(handle)
        self._countries: list[Country] = [Country(**entry) for entry in raw]

    def all(self) -> list[Country]:
        """Retourne tous les pays."""
        return list(self._countries)

    def by_continents(self, continents: list[str]) -> list[Country]:
        """Retourne les pays appartenant aux continents donnés."""
        wanted = set(continents)
        return [c for c in self._countries if c.continent in wanted]

    def continents(self) -> list[str]:
        """Retourne la liste triée des continents présents dans la base."""
        return sorted({c.continent for c in self._countries})


class StatsRepository:
    """Gère la persistance SQLite des statistiques SM-2 de l'utilisateur."""

    def __init__(self, db_path: Path) -> None:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(db_path)
        self._connection.row_factory = sqlite3.Row

    def initialize(self, countries: list[Country]) -> None:
        """Crée le schéma si besoin et insère les stats par défaut pour tout
        pays encore inconnu (idempotent : sans effet aux lancements suivants)."""
        schema = SCHEMA_PATH.read_text(encoding="utf-8")
        self._connection.executescript(schema)
        now_iso = datetime.now().isoformat()
        self._connection.executemany(
            """
            INSERT OR IGNORE INTO user_stats (
                country_id, easiness_factor, repetitions, interval_days,
                next_review, total_answers, correct_answers
            ) VALUES (?, ?, ?, ?, ?, 0, 0)
            """,
            [
                (
                    country.id,
                    DEFAULT_EASINESS_FACTOR,
                    DEFAULT_REPETITIONS,
                    DEFAULT_INTERVAL_DAYS,
                    now_iso,
                )
                for country in countries
            ],
        )
        self._connection.commit()

    def get_many(self, country_ids: list[int]) -> dict[int, UserStats]:
        """Retourne les stats des pays demandés, indexées par id de pays."""
        placeholders = ",".join("?" for _ in country_ids)
        rows = self._connection.execute(
            f"SELECT * FROM user_stats WHERE country_id IN ({placeholders})",
            country_ids,
        ).fetchall()
        return {row["country_id"]: self._row_to_stats(row) for row in rows}

    def all(self) -> list[UserStats]:
        """Retourne les stats de tous les pays."""
        rows = self._connection.execute("SELECT * FROM user_stats").fetchall()
        return [self._row_to_stats(row) for row in rows]

    def save(self, stats: UserStats) -> None:
        """Persiste les nouvelles statistiques d'un pays."""
        self._connection.execute(
            """
            UPDATE user_stats SET
                easiness_factor = ?,
                repetitions = ?,
                interval_days = ?,
                next_review = ?,
                total_answers = ?,
                correct_answers = ?
            WHERE country_id = ?
            """,
            (
                stats.easiness_factor,
                stats.repetitions,
                stats.interval_days,
                stats.next_review.isoformat(),
                stats.total_answers,
                stats.correct_answers,
                stats.country_id,
            ),
        )
        self._connection.commit()

    def close(self) -> None:
        """Ferme la connexion SQLite."""
        self._connection.close()

    @staticmethod
    def _row_to_stats(row: sqlite3.Row) -> UserStats:
        """Convertit une ligne SQLite en dataclass UserStats."""
        return UserStats(
            country_id=row["country_id"],
            easiness_factor=row["easiness_factor"],
            repetitions=row["repetitions"],
            interval_days=row["interval_days"],
            next_review=datetime.fromisoformat(row["next_review"]),
            total_answers=row["total_answers"],
            correct_answers=row["correct_answers"],
        )
