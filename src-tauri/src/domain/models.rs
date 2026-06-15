use serde::{Deserialize, Serialize};

use crate::domain::question_mode::QuestionMode;

/// A sovereign state included in the quiz pool.
///
/// Mirrors both `src-tauri/data/countries.json` and the `countries` table.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id: i64,
    pub name: String,
    pub capital: String,
    pub continent: String,
    pub iso_alpha2: String,
    pub iso_alpha3: String,
    pub lat: f64,
    pub lng: f64,
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
    /// normal fuzzy tolerance.
    fn default() -> Self {
        Settings {
            selected_continents: CONTINENTS.iter().map(|c| c.to_string()).collect(),
            modes_enabled: ModesEnabled {
                capital: true,
                flag: true,
            },
            theme: Theme::System,
            fuzzy_tolerance: FuzzyTolerance::Normal,
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
    /// Country name; present in capital mode only (it would leak the
    /// answer in flag mode).
    pub country_name: Option<String>,
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
    /// The expected answer (capital or country name, depending on mode).
    pub correct_answer: String,
    /// Country name, for feedback display in both modes.
    pub country_name: String,
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
