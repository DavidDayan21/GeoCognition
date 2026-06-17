use serde::{Deserialize, Serialize};

use crate::domain::question_mode::QuestionMode;

/// A sovereign state included in the quiz pool.
///
/// Mirrors both `src-tauri/data/countries.json` and the `countries` table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id: i64,
    pub name: String,
    /// French country name (used when the UI language is French).
    pub name_fr: String,
    pub capital: String,
    /// French capital name (used when the UI language is French).
    pub capital_fr: String,
    pub continent: String,
    pub iso_alpha2: String,
    pub iso_alpha3: String,
    pub lat: f64,
    pub lng: f64,
    /// ISO alpha-3 codes of countries sharing a land border, restricted to
    /// the countries present in this dataset. Empty for island nations.
    /// Persisted in the `countries.borders` column as a JSON string, hence
    /// the `sqlx(json)` mapping for `FromRow`.
    #[sqlx(json)]
    pub borders: Vec<String>,
}

/// Persistent SM-2 state for one (country, mode) card, as stored in the
/// `user_stats` table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserStats {
    pub country_id: i64,
    pub mode: String,
    pub ef: f64,
    pub repetitions: i64,
    pub interval_days: i64,
    pub next_review: String,
    pub last_reviewed: Option<String>,
    pub total_attempts: i64,
    pub total_correct: i64,
}

/// UI theme preference.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

/// UI language. Persisted in settings and mirrored by the frontend i18n
/// instance. Serde rejects any value other than `"en"` / `"fr"`, so an
/// invalid language can never reach the backend.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    Fr,
}

/// The active home-screen game mode. Persisted as `current_mode` in the
/// `settings` table and restored on launch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppMode {
    Practice,
    BorderRun,
}

/// Border Run difficulty, classified by shortest-path length between the
/// start and end countries. Persisted as `border_run_difficulty`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

impl Difficulty {
    /// Inclusive shortest-path-length range accepted for this difficulty,
    /// measured in edges (border crossings) between start and end. Easy
    /// `2..=3` means 1–2 intermediate countries; `Hard` has no upper bound,
    /// represented by `usize::MAX`.
    pub fn path_length_range(self) -> (usize, usize) {
        match self {
            Difficulty::Easy => (2, 3),
            Difficulty::Medium => (4, 6),
            Difficulty::Hard => (7, usize::MAX),
        }
    }
}

/// Lifecycle of a single Border Run game.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    InProgress,
    Won,
    Lost,
}

/// The classification of a submitted Border Run guess, sent to the frontend.
///
/// Adjacency is no longer validated: every recognized, not-yet-placed country
/// is accepted, so there is no `NotAdjacent` kind. The map coloring of an
/// accepted country comes from [`CountryClassification`] instead.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GuessKind {
    Accepted,
    AlreadyInChain,
    NotRecognized,
    Won,
    Lost,
}

/// How a placed Border Run country is colored on the map, derived from the
/// shortest-path set computed at game start. Pure function of the country and
/// the immutable graph/shortest-path set, so it never changes once a game
/// begins.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CountryClassification {
    /// The start country (blue).
    Start,
    /// The end country (blue).
    End,
    /// On at least one shortest start→end path (green).
    OnShortestPath,
    /// Not on a shortest path, but borders a country that is (orange).
    AdjacentToShortestPath,
    /// Neither on nor adjacent to the shortest-path set (red).
    Disconnected,
}

/// Snapshot of a Border Run game handed to the frontend. Deliberately omits
/// the shortest-path set so the solution is never leaked mid-game; on-path
/// hints arrive per guess via [`GuessOutcomeDto`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BorderRunGameDto {
    /// Start country (ISO alpha-3).
    pub start: String,
    /// End country (ISO alpha-3).
    pub end: String,
    /// Accepted guesses in order (ISO alpha-3).
    pub chain: Vec<String>,
    pub attempts_used: u32,
    pub attempts_limit: u32,
    pub attempts_remaining: u32,
    pub status: GameStatus,
    pub difficulty: Difficulty,
    /// Whether the single free hint has been spent.
    pub hint_used: bool,
    /// The letter a hint revealed, shown for the rest of the game. `None`
    /// until a hint is requested.
    pub hint_letter: Option<char>,
    /// Whether the single undo has been spent.
    pub undo_used: bool,
}

/// Result of requesting the single per-game hint: the revealed first letter
/// (in the active UI language) of a shortest-path country not yet placed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct HintResult {
    pub letter: char,
    /// Always `true` once a hint is granted; mirrors `BorderRunGameDto.hint_used`
    /// so the caller can disable the button without re-fetching the game.
    pub used: bool,
}

/// Outcome of one submitted guess, with the updated game snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GuessOutcomeDto {
    pub kind: GuessKind,
    /// The resolved country (ISO alpha-3); `None` only for `not_recognized`.
    pub iso3: Option<String>,
    /// Map color of the placed country. `Some` for `accepted`/`won`/`lost`
    /// (every recognized guess is placed); `None` for `already_in_chain`
    /// and `not_recognized`, which place nothing.
    pub classification: Option<CountryClassification>,
    /// The game state after applying this guess.
    pub game: BorderRunGameDto,
}

/// Near-miss tolerance presets for answer grading.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FuzzyTolerance {
    Strict,
    Normal,
    Lenient,
}

impl FuzzyTolerance {
    /// Maximum Levenshtein-distance ratio accepted as a near miss.
    pub fn ratio(self) -> f64 {
        match self {
            FuzzyTolerance::Strict => 0.0,
            FuzzyTolerance::Normal => 0.15,
            FuzzyTolerance::Lenient => 0.25,
        }
    }
}

/// Which quiz modes are enabled. The UI guarantees at least one is on;
/// the backend re-validates on update.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ModesEnabled {
    pub capital: bool,
    pub flag: bool,
}

/// User settings, persisted as JSON strings in the `settings` table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Settings {
    pub selected_continents: Vec<String>,
    pub modes_enabled: ModesEnabled,
    pub theme: Theme,
    pub fuzzy_tolerance: FuzzyTolerance,
    pub language: Language,
    /// The active home-screen game mode.
    pub current_mode: AppMode,
    /// The selected Border Run difficulty.
    pub border_run_difficulty: Difficulty,
}

/// The six continents available for selection.
pub const CONTINENTS: [&str; 6] = [
    "Africa",
    "North America",
    "South America",
    "Asia",
    "Europe",
    "Oceania",
];

impl Default for Settings {
    /// First-launch defaults: all continents, both modes, system theme,
    /// normal fuzzy tolerance, English UI.
    fn default() -> Self {
        Settings {
            selected_continents: CONTINENTS.iter().map(|c| c.to_string()).collect(),
            modes_enabled: ModesEnabled {
                capital: true,
                flag: true,
            },
            theme: Theme::System,
            fuzzy_tolerance: FuzzyTolerance::Normal,
            language: Language::En,
            current_mode: AppMode::Practice,
            border_run_difficulty: Difficulty::Medium,
        }
    }
}

impl Settings {
    /// The enabled modes, in stable order.
    pub fn enabled_modes(&self) -> Vec<QuestionMode> {
        let mut modes = Vec::new();
        if self.modes_enabled.capital {
            modes.push(QuestionMode::Capital);
        }
        if self.modes_enabled.flag {
            modes.push(QuestionMode::Flag);
        }
        modes
    }
}

/// A question handed to the frontend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuestionPayload {
    pub country_id: i64,
    pub mode: QuestionMode,
    /// English country name; present in capital mode only (it would leak
    /// the answer in flag mode).
    pub country_name: Option<String>,
    /// French country name; present in capital mode only. The frontend
    /// shows this when the UI language is French.
    pub country_name_fr: Option<String>,
    /// ISO alpha-2 code for the flag asset; present in flag mode only.
    pub iso_alpha2: Option<String>,
    /// In-run index of this question (0-based).
    pub question_index: u64,
}

/// Outcome of one submitted answer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AnswerResult {
    /// SM-2 quality: 0 (wrong), 3 (near miss), or 5 (exact).
    pub quality: u8,
    /// True for quality >= 3.
    pub is_correct: bool,
    /// The expected answer in English (capital or country name, by mode).
    pub correct_answer: String,
    /// The expected answer in French (capital or country name, by mode).
    pub correct_answer_fr: String,
    /// English country name, for feedback display in both modes.
    pub country_name: String,
    /// French country name, for feedback display in both modes.
    pub country_name_fr: String,
    pub ef: f64,
    pub interval_days: u32,
    /// RFC 3339 UTC timestamp of the next scheduled review.
    pub next_review: String,
}

/// Per-country mastery for the heatmap. `ef` is `None` for unseen cards.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CountryMastery {
    pub country_id: i64,
    pub name: String,
    /// French country name, for the heatmap tooltip in French.
    pub name_fr: String,
    pub iso_alpha2: String,
    pub iso_alpha3: String,
    pub continent: String,
    pub ef: Option<f64>,
    pub repetitions: i64,
    pub total_attempts: i64,
}

/// One day of practice history.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyStat {
    /// `YYYY-MM-DD` (UTC).
    pub date: String,
    pub attempts: i64,
    pub correct: i64,
    /// correct / attempts, in [0, 1].
    pub accuracy: f64,
}

/// Observed recall rate at a given review gap, for the forgetting curve.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ForgettingPoint {
    pub days_since_review: i64,
    /// Share of correct answers at this gap, in [0, 1].
    pub correct_rate: f64,
    pub samples: i64,
}

/// Aggregate mastery per continent, for the radar chart.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContinentStat {
    pub continent: String,
    pub total_countries: i64,
    /// (country, mode) cards with at least one review.
    pub cards_seen: i64,
    /// Cards with EF > 2.5 and repetitions >= 3.
    pub cards_mastered: i64,
    /// Average EF over seen cards (2.5 when nothing seen yet).
    pub avg_ef: f64,
}

/// Lifetime totals for the global stats strip.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GlobalStats {
    /// Cards with EF > 2.5 and repetitions >= 3.
    pub total_mastered: i64,
    pub countries_seen: i64,
    pub total_answers: i64,
    /// Lifetime share of correct answers, in [0, 1].
    pub lifetime_accuracy: f64,
    /// Trailing run of consecutive correct answers.
    pub current_streak: i64,
    /// Longest run of consecutive correct answers.
    pub longest_streak: i64,
}
