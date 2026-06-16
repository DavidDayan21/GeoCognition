/**
 * TypeScript mirrors of the Rust domain types in
 * `src-tauri/src/domain/models.rs`. Field names are snake_case to match
 * serde's serialization.
 */

export type QuestionMode = "capital" | "flag";
export type Theme = "light" | "dark" | "system";
export type FuzzyTolerance = "strict" | "normal" | "lenient";
export type Language = "en" | "fr";
/** The active home-screen game mode. */
export type AppMode = "practice" | "border_run";
/** Border Run difficulty, by shortest-path length. */
export type Difficulty = "easy" | "medium" | "hard";
/** Lifecycle of a single Border Run game. */
export type GameStatus = "in_progress" | "won" | "lost";
/** Classification of a submitted Border Run guess. */
export type GuessKind =
  | "accepted"
  | "not_adjacent"
  | "already_in_chain"
  | "not_recognized"
  | "won"
  | "lost";

export interface Country {
  id: number;
  name: string;
  name_fr: string;
  capital: string;
  capital_fr: string;
  continent: string;
  iso_alpha2: string;
  iso_alpha3: string;
  lat: number;
  lng: number;
  /** ISO alpha-3 codes of land-bordering countries; empty for islands. */
  borders: string[];
}

export interface ModesEnabled {
  capital: boolean;
  flag: boolean;
}

export interface Settings {
  selected_continents: string[];
  modes_enabled: ModesEnabled;
  theme: Theme;
  fuzzy_tolerance: FuzzyTolerance;
  language: Language;
  /** The active home-screen game mode. */
  current_mode: AppMode;
  /** The selected Border Run difficulty. */
  border_run_difficulty: Difficulty;
}

export interface QuestionPayload {
  country_id: number;
  mode: QuestionMode;
  /** English country name; present in capital mode only. */
  country_name: string | null;
  /** French country name; present in capital mode only. */
  country_name_fr: string | null;
  /** Present in flag mode only (flag asset lookup). */
  iso_alpha2: string | null;
  question_index: number;
}

export interface AnswerResult {
  /** SM-2 quality: 0 (wrong), 3 (near miss), or 5 (exact). */
  quality: number;
  is_correct: boolean;
  /** Expected answer in English (capital or country name, by mode). */
  correct_answer: string;
  /** Expected answer in French (capital or country name, by mode). */
  correct_answer_fr: string;
  country_name: string;
  country_name_fr: string;
  ef: number;
  interval_days: number;
  /** RFC 3339 UTC timestamp. */
  next_review: string;
}

export interface CountryMastery {
  country_id: number;
  name: string;
  name_fr: string;
  iso_alpha2: string;
  iso_alpha3: string;
  continent: string;
  /** null for cards never reviewed. */
  ef: number | null;
  repetitions: number;
  total_attempts: number;
}

export interface DailyStat {
  /** YYYY-MM-DD (UTC). */
  date: string;
  attempts: number;
  correct: number;
  /** correct / attempts, in [0, 1]. */
  accuracy: number;
}

export interface ForgettingPoint {
  days_since_review: number;
  correct_rate: number;
  samples: number;
}

export interface ContinentStat {
  continent: string;
  total_countries: number;
  cards_seen: number;
  cards_mastered: number;
  avg_ef: number;
}

export interface GlobalStats {
  total_mastered: number;
  countries_seen: number;
  total_answers: number;
  lifetime_accuracy: number;
  current_streak: number;
  longest_streak: number;
}

/**
 * Snapshot of a Border Run game. The shortest-path set is intentionally not
 * exposed; on-path hints arrive per guess via {@link GuessOutcomeDto}.
 */
export interface BorderRunGameDto {
  /** Start country (ISO alpha-3). */
  start: string;
  /** End country (ISO alpha-3). */
  end: string;
  /** Accepted guesses in order (ISO alpha-3). */
  chain: string[];
  attempts_used: number;
  attempts_limit: number;
  attempts_remaining: number;
  status: GameStatus;
  difficulty: Difficulty;
}

export interface GuessOutcomeDto {
  kind: GuessKind;
  /** Resolved country (ISO alpha-3); null only for "not_recognized". */
  iso3: string | null;
  /** Whether the resolved country lies on a shortest path (green vs orange). */
  on_shortest_path: boolean;
  /** For a losing guess, whether it was a valid (chained) move. */
  accepted: boolean;
  /** Game state after applying this guess. */
  game: BorderRunGameDto;
}
