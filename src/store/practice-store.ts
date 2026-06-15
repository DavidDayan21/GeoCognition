/**
 * State for the infinite practice loop. Owns the current question, the
 * submitted result, and the in-run counters (answered / correct / streak).
 * SM-2 state and the drill queue live in the Rust backend; this store only
 * mirrors what the current screen needs.
 */
import { create } from "zustand";
import { nextQuestion, submitAnswer } from "../api/tauri-api";
import i18n from "../i18n";
import type { AnswerResult, QuestionPayload } from "../types/domain";

/**
 * Lifecycle of one question:
 * - `idle`: nothing loaded yet
 * - `loading`: fetching a question
 * - `asking`: question shown, awaiting input
 * - `checking`: an answer is being graded
 * - `revealed`: the result is shown
 * - `error`: a backend call failed
 */
export type PracticeStatus =
  | "idle"
  | "loading"
  | "asking"
  | "checking"
  | "revealed"
  | "error";

export interface PracticeState {
  status: PracticeStatus;
  question: QuestionPayload | null;
  result: AnswerResult | null;
  /** The exact text last submitted (empty for "I don't know"). */
  lastInput: string;
  answered: number;
  correct: number;
  /** Consecutive correct answers in this run. */
  streak: number;
  errorMessage: string | null;
  /** `performance.now()` at the moment the current question was shown. */
  questionShownAt: number;
  /** Starts a fresh run: resets counters and loads the first question. */
  begin: () => Promise<void>;
  /** Grades `input` for the current question and reveals the result. */
  submit: (input: string) => Promise<void>;
  /** Advances to the next question after a result has been revealed. */
  advance: () => Promise<void>;
  /** Clears all run state back to `idle`. */
  reset: () => void;
}

const initialRunState = {
  status: "idle" as PracticeStatus,
  question: null as QuestionPayload | null,
  result: null as AnswerResult | null,
  lastInput: "",
  answered: 0,
  correct: 0,
  streak: 0,
  errorMessage: null as string | null,
  questionShownAt: 0,
};

/** Monotonic clock for response timing, falling back to wall time. */
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Best-effort string from an unknown thrown value (Tauri rejects with strings). */
function toMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return i18n.t("toast.genericError");
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  ...initialRunState,

  begin: async () => {
    set({ ...initialRunState, status: "loading" });
    try {
      const question = await nextQuestion();
      set({ question, status: "asking", questionShownAt: now() });
    } catch (error) {
      set({ status: "error", errorMessage: toMessage(error) });
    }
  },

  submit: async (input) => {
    const { status, question } = get();
    if (status !== "asking" || !question) return;
    const responseTimeMs = Math.max(
      0,
      Math.round(now() - get().questionShownAt),
    );
    set({ status: "checking", lastInput: input });
    try {
      const result = await submitAnswer({
        countryId: question.country_id,
        mode: question.mode,
        userInput: input,
        responseTimeMs,
      });
      set((state) => ({
        status: "revealed",
        result,
        answered: state.answered + 1,
        correct: state.correct + (result.is_correct ? 1 : 0),
        streak: result.is_correct ? state.streak + 1 : 0,
      }));
    } catch (error) {
      set({ status: "error", errorMessage: toMessage(error) });
    }
  },

  advance: async () => {
    if (get().status !== "revealed") return;
    set({ status: "loading", result: null });
    try {
      const question = await nextQuestion();
      set({
        question,
        status: "asking",
        questionShownAt: now(),
        lastInput: "",
      });
    } catch (error) {
      set({ status: "error", errorMessage: toMessage(error) });
    }
  },

  reset: () => set({ ...initialRunState }),
}));

/** Selector: current run accuracy in [0, 1] (0 before any answer). */
export function selectAccuracy(state: PracticeState): number {
  return state.answered === 0 ? 0 : state.correct / state.answered;
}
