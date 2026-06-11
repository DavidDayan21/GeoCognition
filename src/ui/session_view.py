"""Affichage Rich : questions, retours immédiats, bilan de session et stats globales."""

from __future__ import annotations

from datetime import datetime

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from src.core.models import Country, QuizResult, SessionReport, UserStats
from src.questions.capital_question import QUALITY_EXACT, QUALITY_TYPO


class SessionView:
    """Rend l'expérience du quiz dans le terminal via Rich."""

    def __init__(self) -> None:
        self.console = Console()

    def show_welcome(self) -> None:
        """Affiche la bannière d'accueil."""
        self.console.print(
            Panel.fit(
                "[bold cyan]GeoCognition[/bold cyan]\n"
                "Quiz adaptatif des capitales du monde (répétition espacée SM-2)",
                border_style="cyan",
            )
        )

    def show_question(self, index: int, total: int, prompt: str) -> None:
        """Affiche l'énoncé d'une question avec sa progression."""
        self.console.print(
            f"\n[bold]Question {index}/{total}[/bold] — {prompt}", highlight=False
        )

    def show_feedback(self, result: QuizResult) -> None:
        """Affiche immédiatement le verdict après une réponse."""
        if result.quality == QUALITY_EXACT:
            self.console.print("[bold green]✔ Correct ![/bold green]")
        elif result.quality == QUALITY_TYPO:
            self.console.print(
                f"[bold yellow]≈ Accepté (faute de frappe).[/bold yellow] "
                f"Orthographe exacte : [bold]{result.correct_answer}[/bold]"
            )
        else:
            self.console.print(
                f"[bold red]✘ Raté.[/bold red] La bonne réponse était : "
                f"[bold]{result.correct_answer}[/bold]"
            )

    def show_report(self, report: SessionReport) -> None:
        """Affiche le bilan de fin de session."""
        table = Table(title="Bilan de la session", border_style="cyan")
        table.add_column("Indicateur", style="bold")
        table.add_column("Valeur", justify="right")
        table.add_row("Questions posées", str(report.total_questions))
        table.add_row("Taux de réussite", f"{report.success_rate:.0%}")
        table.add_row("Continent le plus faible", report.weakest_continent or "—")
        table.add_row("Temps moyen / question", f"{report.average_time_seconds:.1f} s")
        table.add_row("Pays maîtrisés (EF > 2.5, N ≥ 3)", str(report.mastered_count))
        self.console.print()
        self.console.print(table)

    def show_global_stats(
        self, countries: list[Country], all_stats: list[UserStats]
    ) -> None:
        """Affiche un tableau de progression par continent."""
        stats_by_id = {stats.country_id: stats for stats in all_stats}
        now = datetime.now()

        table = Table(title="Progression par continent", border_style="cyan")
        table.add_column("Continent", style="bold")
        table.add_column("Pays", justify="right")
        table.add_column("Maîtrisés", justify="right", style="green")
        table.add_column("À réviser", justify="right", style="yellow")
        table.add_column("EF moyen", justify="right")

        continents = sorted({country.continent for country in countries})
        for continent in continents:
            members = [c for c in countries if c.continent == continent]
            member_stats = [stats_by_id[c.id] for c in members if c.id in stats_by_id]
            mastered = sum(1 for s in member_stats if s.is_mastered())
            due = sum(1 for s in member_stats if s.next_review <= now)
            avg_ef = (
                sum(s.easiness_factor for s in member_stats) / len(member_stats)
                if member_stats
                else 0.0
            )
            table.add_row(
                continent, str(len(members)), str(mastered), str(due), f"{avg_ef:.2f}"
            )
        self.console.print()
        self.console.print(table)

    def show_message(self, message: str) -> None:
        """Affiche un message d'information."""
        self.console.print(f"[italic]{message}[/italic]")
