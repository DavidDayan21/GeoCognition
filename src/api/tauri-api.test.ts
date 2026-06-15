import { afterEach, describe, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import {
  getGlobalStats,
  getMasteryMap,
  getSettings,
  nextQuestion,
  submitAnswer,
  updateSettings,
} from "./tauri-api";
import type { AnswerResult, QuestionPayload, Settings } from "../types/domain";

const question: QuestionPayload = {
  country_id: 142,
  mode: "capital",
  country_name: "Japan",
  iso_alpha2: null,
  question_index: 0,
};

const answer: AnswerResult = {
  quality: 5,
  is_correct: true,
  correct_answer: "Tokyo",
  country_name: "Japan",
  ef: 2.6,
  interval_days: 1,
  next_review: "2026-06-14T12:00:00Z",
};

const settings: Settings = {
  selected_continents: ["Asia", "Europe"],
  modes_enabled: { capital: true, flag: false },
  theme: "system",
  fuzzy_tolerance: "normal",
};

afterEach(() => {
  clearMocks();
});

describe("tauri-api wrappers", () => {
  it("nextQuestion invokes next_question", async () => {
    const calls: string[] = [];
    mockIPC((cmd) => {
      calls.push(cmd);
      return question;
    });
    await expect(nextQuestion()).resolves.toEqual(question);
    expect(calls).toEqual(["next_question"]);
  });

  it("submitAnswer passes camelCase args through", async () => {
    let received: unknown;
    mockIPC((cmd, args) => {
      if (cmd === "submit_answer") {
        received = args;
        return answer;
      }
      throw new Error(`unexpected command ${cmd}`);
    });
    const result = await submitAnswer({
      countryId: 142,
      mode: "capital",
      userInput: "Tokyo",
      responseTimeMs: 1200,
    });
    expect(result.is_correct).toBe(true);
    expect(received).toEqual({
      countryId: 142,
      mode: "capital",
      userInput: "Tokyo",
      responseTimeMs: 1200,
    });
  });

  it("settings roundtrip uses get_settings / update_settings", async () => {
    const calls: Array<{ cmd: string; args: unknown }> = [];
    mockIPC((cmd, args) => {
      calls.push({ cmd, args });
      return cmd === "get_settings" ? settings : undefined;
    });
    await expect(getSettings()).resolves.toEqual(settings);
    await updateSettings(settings);
    expect(calls.map((c) => c.cmd)).toEqual([
      "get_settings",
      "update_settings",
    ]);
    expect(calls[1].args).toEqual({ settings });
  });

  it("getMasteryMap forwards the mode", async () => {
    let received: unknown;
    mockIPC((cmd, args) => {
      if (cmd === "get_mastery_map") {
        received = args;
        return [];
      }
      throw new Error(`unexpected command ${cmd}`);
    });
    await expect(getMasteryMap("flag")).resolves.toEqual([]);
    expect(received).toEqual({ mode: "flag" });
  });

  it("propagates backend errors as rejections", async () => {
    mockIPC(() => {
      throw "database error: locked";
    });
    await expect(getGlobalStats()).rejects.toBe("database error: locked");
  });
});
