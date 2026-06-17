import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BorderRunGameDto, GuessOutcomeDto } from "../types/domain";

vi.mock("../api/tauri-api", () => ({
  borderRunStart: vi.fn(),
  borderRunGuess: vi.fn(),
  borderRunRevealPath: vi.fn(),
  borderRunRequestHint: vi.fn(),
  borderRunUndo: vi.fn(),
}));

import {
  borderRunGuess,
  borderRunRequestHint,
  borderRunRevealPath,
  borderRunStart,
  borderRunUndo,
} from "../api/tauri-api";
import { useBorderRunStore } from "./border-run-store";

const mockStart = vi.mocked(borderRunStart);
const mockGuess = vi.mocked(borderRunGuess);
const mockReveal = vi.mocked(borderRunRevealPath);
const mockHint = vi.mocked(borderRunRequestHint);
const mockUndo = vi.mocked(borderRunUndo);

function gameDto(overrides: Partial<BorderRunGameDto> = {}): BorderRunGameDto {
  return {
    start: "fra",
    end: "deu",
    chain: [],
    attempts_used: 0,
    attempts_limit: 6,
    attempts_remaining: 6,
    status: "in_progress",
    difficulty: "easy",
    hint_used: false,
    hint_letter: null,
    undo_used: false,
    ...overrides,
  };
}

function outcome(overrides: Partial<GuessOutcomeDto> = {}): GuessOutcomeDto {
  return {
    kind: "accepted",
    iso3: "bel",
    classification: "on_shortest_path",
    game: gameDto({ chain: ["bel"], attempts_used: 1, attempts_remaining: 5 }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useBorderRunStore.getState().reset();
});

describe("border run store", () => {
  it("start populates the game and colors the endpoints", async () => {
    mockStart.mockResolvedValueOnce(gameDto());

    await useBorderRunStore.getState().start("easy");

    const state = useBorderRunStore.getState();
    expect(state.status).toBe("ready");
    expect(state.game?.start).toBe("fra");
    expect(state.colors).toEqual({ fra: "start", deu: "end" });
  });

  it("start records an error status when the easiest difficulty fails", async () => {
    mockStart.mockRejectedValueOnce(new Error("no pair"));

    await useBorderRunStore.getState().start("easy");

    expect(useBorderRunStore.getState().status).toBe("error");
    expect(useBorderRunStore.getState().game).toBeNull();
  });

  it("falls back to an easier difficulty when no pair exists", async () => {
    mockStart
      .mockRejectedValueOnce(new Error("no hard pair"))
      .mockResolvedValueOnce(gameDto({ difficulty: "medium" }));

    await useBorderRunStore.getState().start("hard");

    expect(mockStart).toHaveBeenNthCalledWith(1, "hard");
    expect(mockStart).toHaveBeenNthCalledWith(2, "medium");
    expect(useBorderRunStore.getState().status).toBe("ready");
    expect(useBorderRunStore.getState().game?.difficulty).toBe("medium");
  });

  it("revealPath colors the interior of a shortest path green", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockReveal.mockResolvedValueOnce(["fra", "bel", "deu"]);

    await useBorderRunStore.getState().revealPath();

    const { colors } = useBorderRunStore.getState();
    expect(colors.fra).toBe("start");
    expect(colors.deu).toBe("end");
    expect(colors.bel).toBe("path");
  });

  it("colors an accepted on-path guess green", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({ classification: "on_shortest_path" }),
    );

    const result = await useBorderRunStore.getState().guess("Belgium");

    expect(result?.kind).toBe("accepted");
    expect(useBorderRunStore.getState().colors.bel).toBe("path");
    expect(useBorderRunStore.getState().game?.chain).toEqual(["bel"]);
  });

  it("colors a guess bordering the path orange", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({ classification: "adjacent_to_shortest_path" }),
    );

    await useBorderRunStore.getState().guess("Belgium");

    expect(useBorderRunStore.getState().colors.bel).toBe("detour");
  });

  it("colors a disconnected guess red instead of rejecting it", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({
        iso3: "aus",
        classification: "disconnected",
        game: gameDto({
          chain: ["aus"],
          attempts_used: 1,
          attempts_remaining: 5,
        }),
      }),
    );

    await useBorderRunStore.getState().guess("Australia");

    expect(useBorderRunStore.getState().colors.aus).toBe("disconnected");
  });

  it("leaves the map untouched for an unrecognized guess", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({
        kind: "not_recognized",
        iso3: null,
        classification: null,
        game: gameDto(),
      }),
    );

    await useBorderRunStore.getState().guess("zzz");

    expect(useBorderRunStore.getState().colors).toEqual({
      fra: "start",
      deu: "end",
    });
  });

  it("leaves the map untouched for an already-placed guess", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({
        kind: "already_in_chain",
        iso3: "fra",
        classification: null,
        game: gameDto(),
      }),
    );

    await useBorderRunStore.getState().guess("France");

    expect(useBorderRunStore.getState().colors).toEqual({
      fra: "start",
      deu: "end",
    });
  });

  it("returns null and keeps state when the backend rejects a guess", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockRejectedValueOnce(new Error("no game"));

    const result = await useBorderRunStore.getState().guess("Belgium");

    expect(result).toBeNull();
    expect(useBorderRunStore.getState().game?.chain).toEqual([]);
  });

  it("reset clears the game and colors", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");

    useBorderRunStore.getState().reset();
    expect(useBorderRunStore.getState().game).toBeNull();
    expect(useBorderRunStore.getState().colors).toEqual({});
    expect(useBorderRunStore.getState().status).toBe("idle");
  });

  it("hint stores the revealed letter and marks the hint used", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockHint.mockResolvedValueOnce({ letter: "B", used: true });

    await useBorderRunStore.getState().hint();

    expect(useBorderRunStore.getState().hintLetter).toBe("B");
    expect(useBorderRunStore.getState().game?.hint_used).toBe(true);
    expect(useBorderRunStore.getState().hintUnavailable).toBe(false);
  });

  it("hint flags unavailability when the backend has none to give", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockHint.mockRejectedValueOnce(new Error("no hint"));

    await useBorderRunStore.getState().hint();

    expect(useBorderRunStore.getState().hintUnavailable).toBe(true);
    expect(useBorderRunStore.getState().hintLetter).toBeNull();
  });

  it("undo removes the last placed country's color and updates the game", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({ classification: "disconnected" }),
    );
    await useBorderRunStore.getState().guess("Belgium");
    expect(useBorderRunStore.getState().colors.bel).toBe("disconnected");

    mockUndo.mockResolvedValueOnce(
      gameDto({ undo_used: true, attempts_used: 0, attempts_remaining: 6 }),
    );
    await useBorderRunStore.getState().undo();

    const state = useBorderRunStore.getState();
    expect(state.colors.bel).toBeUndefined();
    expect(state.colors).toEqual({ fra: "start", deu: "end" });
    expect(state.game?.undo_used).toBe(true);
    expect(state.game?.chain).toEqual([]);
  });

  it("undo is a no-op when the chain is empty", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");

    await useBorderRunStore.getState().undo();

    expect(mockUndo).not.toHaveBeenCalled();
  });
});
