import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnswerResult,
  QuestionMode,
  QuestionPayload,
} from "../types/domain";

vi.mock("../api/tauri-api", () => ({
  nextQuestion: vi.fn(),
  submitAnswer: vi.fn(),
}));

import { nextQuestion, submitAnswer } from "../api/tauri-api";
import { selectAccuracy, usePracticeStore } from "./practice-store";

const mockNext = vi.mocked(nextQuestion);
const mockSubmit = vi.mocked(submitAnswer);

function question(
  index: number,
  mode: QuestionMode = "capital",
): QuestionPayload {
  return {
    country_id: 1,
    mode,
    country_name: mode === "capital" ? "Japan" : null,
    country_name_fr: mode === "capital" ? "Japon" : null,
    iso_alpha2: mode === "flag" ? "jp" : null,
    question_index: index,
  };
}

function answer(quality: number): AnswerResult {
  return {
    quality,
    is_correct: quality >= 3,
    correct_answer: "Tokyo",
    correct_answer_fr: "Tokyo",
    country_name: "Japan",
    country_name_fr: "Japon",
    ef: 2.6,
    interval_days: 1,
    next_review: "2026-06-14T00:00:00Z",
  };
}

beforeEach(() => {
  usePracticeStore.getState().reset();
  vi.clearAllMocks();
});

describe("practice store", () => {
  it("begin loads the first question and resets counters", async () => {
    mockNext.mockResolvedValueOnce(question(0));
    await usePracticeStore.getState().begin();

    const state = usePracticeStore.getState();
    expect(state.status).toBe("asking");
    expect(state.question?.question_index).toBe(0);
    expect(state.answered).toBe(0);
    expect(state.streak).toBe(0);
  });

  it("a correct answer reveals the result and bumps the streak", async () => {
    mockNext.mockResolvedValueOnce(question(0));
    mockSubmit.mockResolvedValueOnce(answer(5));
    await usePracticeStore.getState().begin();
    await usePracticeStore.getState().submit("Tokyo");

    const state = usePracticeStore.getState();
    expect(state.status).toBe("revealed");
    expect(state.result?.quality).toBe(5);
    expect(state.answered).toBe(1);
    expect(state.correct).toBe(1);
    expect(state.streak).toBe(1);
    expect(state.lastInput).toBe("Tokyo");
  });

  it("submit forwards camelCase args to the backend", async () => {
    mockNext.mockResolvedValueOnce(question(0, "flag"));
    mockSubmit.mockResolvedValueOnce(answer(5));
    await usePracticeStore.getState().begin();
    await usePracticeStore.getState().submit("Japan");

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const args = mockSubmit.mock.calls[0][0];
    expect(args.countryId).toBe(1);
    expect(args.mode).toBe("flag");
    expect(args.userInput).toBe("Japan");
    expect(args.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("a wrong answer resets the streak but counts the attempt", async () => {
    mockNext.mockResolvedValueOnce(question(0));
    mockSubmit.mockResolvedValueOnce(answer(5));
    await usePracticeStore.getState().begin();
    await usePracticeStore.getState().submit("Tokyo");

    mockNext.mockResolvedValueOnce(question(1));
    await usePracticeStore.getState().advance();
    mockSubmit.mockResolvedValueOnce(answer(0));
    await usePracticeStore.getState().submit("Kyoto");

    const state = usePracticeStore.getState();
    expect(state.answered).toBe(2);
    expect(state.correct).toBe(1);
    expect(state.streak).toBe(0);
    expect(selectAccuracy(state)).toBeCloseTo(0.5);
  });

  it("advance only runs after a reveal and loads the next question", async () => {
    mockNext.mockResolvedValueOnce(question(0));
    await usePracticeStore.getState().begin();

    // Not revealed yet: advance is a no-op.
    await usePracticeStore.getState().advance();
    expect(usePracticeStore.getState().question?.question_index).toBe(0);

    mockSubmit.mockResolvedValueOnce(answer(5));
    await usePracticeStore.getState().submit("Tokyo");
    mockNext.mockResolvedValueOnce(question(1));
    await usePracticeStore.getState().advance();

    const state = usePracticeStore.getState();
    expect(state.status).toBe("asking");
    expect(state.question?.question_index).toBe(1);
    expect(state.result).toBeNull();
  });

  it("submit is ignored unless a question is being asked", async () => {
    await usePracticeStore.getState().submit("anything");
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(usePracticeStore.getState().status).toBe("idle");
  });

  it("captures backend errors as an error status with a message", async () => {
    mockNext.mockRejectedValueOnce("database error: locked");
    await usePracticeStore.getState().begin();

    const state = usePracticeStore.getState();
    expect(state.status).toBe("error");
    expect(state.errorMessage).toBe("database error: locked");
  });

  it("selectAccuracy is 0 before any answers", () => {
    expect(selectAccuracy(usePracticeStore.getState())).toBe(0);
  });
});
