"""Point d'entrée CLI : menu principal et orchestration d'une session de quiz.

Cette couche assemble les briques découplées : dépôts de données, moteur de
quiz générique, type de question (capitales en V1) et vues Rich.
"""

from __future__ import annotations

import time
from pathlib import Path

import questionary

from src.core.quiz_engine import QuizEngine
from src.data_access.repository import CountryRepository, StatsRepository
from src.questions.capital_question import CapitalQuestion
from src.ui.continent_selector import CheckboxContinentSelector, ContinentSelector
from src.ui.session_view import SessionView

# Chemins par défaut, relatifs à la racine du projet.
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
COUNTRIES_JSON_PATH: Path = PROJECT_ROOT / "data" / "countries.json"
DB_PATH: Path = PROJECT_ROOT / "data" / "geocognition.db"

# Entrées du menu principal.
MENU_START: str = "Démarrer une session"
MENU_STATS: str = "Voir mes stats"
MENU_QUIT: str = "Quitter"


def run() -> None:
    """Lance l'application : initialisation puis boucle du menu principal."""
    countries_repo = CountryRepository(COUNTRIES_JSON_PATH)
    stats_repo = StatsRepository(DB_PATH)
    # Premier lancement : crée la table et les stats par défaut (idempotent).
    stats_repo.initialize(countries_repo.all())
    view = SessionView()
    view.show_welcome()

    try:
        while True:
            choice = questionary.select(
                "Que veux-tu faire ?",
                choices=[MENU_START, MENU_STATS, MENU_QUIT],
            ).ask()
            if choice == MENU_START:
                _run_session(countries_repo, stats_repo, view)
            elif choice == MENU_STATS:
                view.show_global_stats(countries_repo.all(), stats_repo.all())
            else:
                # MENU_QUIT ou annulation clavier (None).
                view.show_message("À bientôt !")
                break
    finally:
        stats_repo.close()


def _run_session(
    countries_repo: CountryRepository,
    stats_repo: StatsRepository,
    view: SessionView,
    selector: ContinentSelector | None = None,
) -> None:
    """Déroule une session complète : sélection, questions, bilan."""
    selector = selector or CheckboxContinentSelector()
    continents = selector.select()
    if not continents:
        view.show_message("Aucun continent sélectionné, retour au menu.")
        return

    pool_countries = countries_repo.by_continents(continents)
    stats_by_id = stats_repo.get_many([c.id for c in pool_countries])
    engine = QuizEngine(question_factory=CapitalQuestion)
    selected = engine.select_countries(
        [(country, stats_by_id[country.id]) for country in pool_countries]
    )
    if not selected:
        view.show_message("Aucun pays disponible pour ces continents.")
        return

    results = []
    for index, country in enumerate(selected, start=1):
        question = engine.build_question(country)
        view.show_question(index, len(selected), question.prompt)
        started_at = time.monotonic()
        answer = questionary.text("Ta réponse :").ask()
        elapsed_seconds = time.monotonic() - started_at
        if answer is None:
            # Interruption clavier : on termine la session proprement.
            break
        result, new_stats = engine.submit_answer(
            question, stats_by_id[country.id], answer, elapsed_seconds
        )
        stats_repo.save(new_stats)
        stats_by_id[country.id] = new_stats
        results.append(result)
        view.show_feedback(result)

    if results:
        report = engine.build_report(results, stats_repo.all())
        view.show_report(report)
