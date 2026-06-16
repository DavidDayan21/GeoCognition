import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BorderRunGameDto, GuessOutcomeDto } from "../types/domain";

vi.mock("../api/tauri-api", () => ({
  borderRunStart: vi.fn(),
  borderRunGuess: vi.fn(),
  borderRunRevealPath: vi.fn(),
}));

import {
  borderRunGuess,
  borderRunRevealPath,
  borderRunStart,
} from "../api/tauri-api";
import { useBorderRunStore } from "./border-run-store";

const mockStart = vi.mocked(borderRunStart);
const mockGuess = vi.mocked(borderRunGuess);
const mockReveal = vi.mocked(borderRunRevealPath);

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
    ...overrides,
  };
}

function outcome(overrides: Partial<GuessOutcomeDto> = {}): GuessOutcomeDto {
  return {
    kind: "accepted",
    iso3: "bel",
    on_shortest_path: true,
    accepted: true,
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
    expect(state.flash).toBeNull();
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
    mockGuess.mockResolvedValueOnce(outcome({ on_shortest_path: true }));

    const result = await useBorderRunStore.getState().guess("Belgium");

    expect(result?.kind).toBe("accepted");
    expect(useBorderRunStore.getState().colors.bel).toBe("path");
    expect(useBorderRunStore.getState().game?.chain).toEqual(["bel"]);
  });

  it("colors an accepted detour guess orange", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(outcome({ on_shortest_path: false }));

    await useBorderRunStore.getState().guess("Belgium");

    expect(useBorderRunStore.getState().colors.bel).toBe("detour");
  });

  it("flashes a non-adjacent guess without coloring it", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({
        kind: "not_adjacent",
        iso3: "esp",
        accepted: false,
        on_shortest_path: false,
        game: gameDto({ attempts_used: 1, attempts_remaining: 5 }),
      }),
    );

    await useBorderRunStore.getState().guess("Spain");

    expect(useBorderRunStore.getState().flash).toBe("esp");
    expect(useBorderRunStore.getState().colors.esp).toBeUndefined();
  });

  it("leaves state untouched for an unrecognized guess", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");
    mockGuess.mockResolvedValueOnce(
      outcome({
        kind: "not_recognized",
        iso3: null,
        accepted: false,
        on_shortest_path: false,
        game: gameDto(),
      }),
    );

    await useBorderRunStore.getState().guess("zzz");

    expect(useBorderRunStore.getState().flash).toBeNull();
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

  it("clearFlash and reset clear transient state", async () => {
    mockStart.mockResolvedValueOnce(gameDto());
    await useBorderRunStore.getState().start("easy");

    useBorderRunStore.setState({ flash: "esp" });
    useBorderRunStore.getState().clearFlash();
    expect(useBorderRunStore.getState().flash).toBeNull();

    useBorderRunStore.getState().reset();
    expect(useBorderRunStore.getState().game).toBeNull();
    expect(useBorderRunStore.getState().colors).toEqual({});
    expect(useBorderRunStore.getState().status).toBe("idle");
  });
});
