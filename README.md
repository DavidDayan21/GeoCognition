# GeoCognition

Quiz en ligne de commande pour mémoriser les capitales du monde, fondé sur la
**répétition espacée** (algorithme **SuperMemo-2**). Le programme apprend de vos
réponses : les pays que vous connaissez bien reviennent de moins en moins
souvent, ceux que vous ratez reviennent très vite.

## Concept : un quiz adaptatif

À chaque session de 20 questions, GeoCognition pioche en priorité les pays
« dus » (dont la date de révision est dépassée), puis complète avec les pays
qui vous posent le plus de difficultés (facteur de facilité le plus bas).
Chaque réponse est notée sur l'échelle SM-2 :

| Réponse | Note q |
|---|---|
| Exacte (casse et accents ignorés) | 5 |
| Faute de frappe légère (distance de Levenshtein normalisée ≤ 0.15) | 3 |
| Fausse | 0 |

La bonne réponse est affichée immédiatement en cas d'erreur, et un bilan Rich
clôt la session : taux de réussite, continent le plus faible, temps moyen par
question, nombre de pays maîtrisés (EF > 2.5 et N ≥ 3).

## L'algorithme SM-2

Chaque pays porte trois valeurs : le facteur de facilité **EF** (initialisé à
2.5), le nombre de répétitions réussies consécutives **N**, et l'intervalle
**I** en jours. Après chaque réponse notée q ∈ [0, 5] :

```
1. EF' = max(1.3, EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)))
2. Si q < 3 :
       N' = 0
       I' = 1            (échec : à revoir très vite)
   Sinon :
       N' = N + 1
       Si N' = 1 : I' = 1
       Si N' = 2 : I' = 6
       Sinon     : I' = ⌈I × EF'⌉
3. next_review = maintenant + I' jours
```

L'implémentation (`src/core/sm2.py`) est une **fonction pure** : l'horloge est
injectée en paramètre, il n'y a aucun effet de bord, et l'algorithme est
couvert par des tests unitaires (`tests/test_sm2.py`).

## Architecture modulaire — et pourquoi

```
geocognition/
├── data/
│   └── countries.json          # 195 pays : nom, capitale, continent, code ISO
├── src/
│   ├── core/                   # Cœur métier, AUCUNE dépendance UI/DB
│   │   ├── sm2.py              # Algo SM-2 pur
│   │   ├── quiz_engine.py      # Moteur générique (sélection, évaluation, bilan)
│   │   └── models.py           # Dataclasses : Country, UserStats, QuizResult…
│   ├── data_access/
│   │   ├── repository.py       # countries.json + SQLite (stats utilisateur)
│   │   └── schema.sql
│   ├── questions/
│   │   ├── base.py             # Classe abstraite Question
│   │   └── capital_question.py # « Quelle est la capitale de X ? »
│   └── ui/
│       ├── cli.py              # Orchestration : menu, session
│       ├── continent_selector.py # Abstraction + impl. checkboxes
│       └── session_view.py     # Rendu Rich
├── tests/
└── main.py
```

Deux évolutions sont prévues, et l'architecture est pensée pour les accueillir
**sans modifier le cœur** :

1. **Carte interactive cliquable** pour choisir les continents : l'UI dépend de
   l'abstraction `ContinentSelector` (`src/ui/continent_selector.py`). La V1
   fournit `CheckboxContinentSelector` ; il suffira d'ajouter une implémentation
   « carte » respectant la même interface (`select() -> list[str]`).
2. **Mode drapeaux** (reconnaître un pays depuis son drapeau) : le moteur
   (`QuizEngine`) ne manipule que la classe abstraite `Question`
   (`src/questions/base.py`). Une `FlagQuestion` exploitant le champ
   `iso_code` — déjà présent dans `countries.json` précisément pour cela —
   se branchera sur le moteur, l'algorithme SM-2 et la persistance existants.

Plus généralement : `core/` ne connaît ni Rich, ni questionary, ni SQLite ;
`data_access/` est la seule couche qui connaît le format de stockage ; `ui/`
assemble le tout. Les statistiques sont mises à jour par des fonctions qui
retournent de nouveaux objets (pas de mutation), la persistance étant la
responsabilité de l'appelant.

## Installation et lancement

Prérequis : **Python 3.11+**.

```powershell
pip install -r requirements.txt
python main.py
```

Au premier lancement, la base SQLite (`data/geocognition.db`) est créée et
chaque pays reçoit ses statistiques par défaut (EF = 2.5, N = 0, révision due
immédiatement).

## Tests

```powershell
pytest tests/
```

Les tests couvrent l'algorithme SM-2 (intervalles, reset après échec, borne
EF ≥ 1.3, validation des notes), le moteur de quiz (priorité aux pays dus,
complément par EF croissant, mise à jour des stats, bilan) et l'évaluation
des réponses (tolérance casse/accents/fautes de frappe).
