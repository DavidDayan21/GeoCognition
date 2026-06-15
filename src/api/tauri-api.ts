/**
 * Typed wrappers around Tauri `invoke` for every backend command.
 * Argument keys are camelCase (Tauri converts them to the Rust
 * commands' snake_case parameters).
 */
import { invoke } from "@tauri-apps/api/core";
import type {
  AnswerResult,
  ContinentStat,
  Country,
  CountryMastery,
  DailyStat,
  ForgettingPoint,
  GlobalStats,
  QuestionMode,
  QuestionPayload,
  Settings,
} from "../types/domain";

export interface SubmitAnswerArgs {
  countryId: number;
  mode: QuestionMode;
  userInput: string;
  responseTimeMs: number;
}

export function nextQuestion(): Promise<QuestionPayload> {
  return invoke("next_question");
}

export function submitAnswer(args: SubmitAnswerArgs): Promise<AnswerResult> {
  return invoke("submit_answer", { ...args });
}

export function getMasteryMap(mode: QuestionMode): Promise<CountryMastery[]> {
  return invoke("get_mastery_map", { mode });
}

export function getProgression(days: number): Promise<DailyStat[]> {
  return invoke("get_progression", { days });
}

export function getForgettingCurve(): Promise<ForgettingPoint[]> {
  return invoke("get_forgetting_curve");
}

export function getContinentBreakdown(): Promise<ContinentStat[]> {
  return invoke("get_continent_breakdown");
}

export function getGlobalStats(): Promise<GlobalStats> {
  return invoke("get_global_stats");
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}

export function resetStats(): Promise<void> {
  return invoke("reset_stats");
}

export function getAllCountries(): Promise<Country[]> {
  return invoke("get_all_countries");
}

export function getContinents(): Promise<string[]> {
  return invoke("get_continents");
}
