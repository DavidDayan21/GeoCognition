/**
 * Typed wrappers around Tauri `invoke` for every backend command.
 * Argument keys are camelCase (Tauri converts them to the Rust
 * commands' snake_case parameters).
 */
import { invoke } from "@tauri-apps/api/core";
import type {
  AnswerResult,
  BorderRunGameDto,
  ContinentStat,
  Country,
  CountryMastery,
  DailyStat,
  Difficulty,
  ForgettingPoint,
  GlobalStats,
  GuessOutcomeDto,
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

/** Starts a new Border Run game at the given difficulty. */
export function borderRunStart(
  difficulty: Difficulty,
): Promise<BorderRunGameDto> {
  return invoke("border_run_start", { difficulty });
}

/** Submits a typed country name against the active Border Run game. */
export function borderRunGuess(input: string): Promise<GuessOutcomeDto> {
  return invoke("border_run_guess", { input });
}

/** Reveals one shortest start→end path for the active game (lose screen). */
export function borderRunRevealPath(): Promise<string[]> {
  return invoke("border_run_reveal_path");
}
