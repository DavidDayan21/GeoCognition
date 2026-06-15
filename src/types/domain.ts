/**
 * TypeScript mirrors of the Rust domain types in
 * `src-tauri/src/domain/models.rs`. Field names are snake_case to match
 * serde's serialization.
 */

export type QuestionMode = "capital" | "flag";
export type Theme = "light" | "dark" | "system";
export type FuzzyTolerance = "strict" | "normal" | "lenient";
export type Language = "en" | "fr";

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
