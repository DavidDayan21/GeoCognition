"""Tests de l'évaluation des réponses pour les questions « capitale »."""

from src.core.models import Country
from src.questions.capital_question import (
    QUALITY_EXACT,
    QUALITY_TYPO,
    QUALITY_WRONG,
    CapitalQuestion,
    normalize_text,
)


def make_question(capital: str) -> CapitalQuestion:
    """Construit une question de test pour une capitale donnée."""
    country = Country(
        id=1, name_fr="Testland", capital_fr=capital, continent="Europe", iso_code="TL"
    )
    return CapitalQuestion(country)


def test_prompt_contient_le_nom_du_pays() -> None:
    question = make_question("Paris")
    assert "Testland" in question.prompt


def test_reponse_exacte_donne_5() -> None:
    assert make_question("Paris").evaluate("Paris") == QUALITY_EXACT


def test_casse_et_accents_ignores() -> None:
    """« yaounde » est accepté pour « Yaoundé » : q=5."""
    assert make_question("Yaoundé").evaluate("  yaounde ") == QUALITY_EXACT


def test_faute_de_frappe_legere_donne_3() -> None:
    """Une lettre erronée sur un nom long reste sous le seuil de 0.15 : q=3."""
    assert make_question("Antananarivo").evaluate("Antananarive") == QUALITY_TYPO


def test_reponse_fausse_donne_0() -> None:
    assert make_question("Paris").evaluate("Londres") == QUALITY_WRONG


def test_reponse_vide_donne_0() -> None:
    assert make_question("Paris").evaluate("") == QUALITY_WRONG


def test_normalize_text_supprime_accents_et_casse() -> None:
    assert normalize_text("  Saint-Élie   du  Nord ") == "saint-elie du nord"
