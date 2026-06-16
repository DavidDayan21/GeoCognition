/**
 * In-memory state for the active Border Run game. Nothing here is persisted
 * (per the brief): a game lives only as long as the player is on the
 * `/border-run` route. The authoritative game state lives in the Rust backend;
 * this store mirrors the latest snapshot plus the per-country coloring derived
 * from each guess outcome.
 */
import { create } from "zustand";
import {
  borderRunGuess,
  borderRunRevealPath,
  borderRunStart,
} from "../api/tauri-api";
import type { CountryColor } from "../components/border-run/border-run-colors";
import i18n from "../i18n";
import type {
  BorderRunGameDto,
  Difficulty,
  GuessOutcomeDto,
} from "../types/domain";
import { useToastStore } from "./toast-store";

export type BorderRunStatus = "idle" | "loading" | "ready" | "error";

/** The next-easier difficulty to fall back to, or null at the easiest. */
const EASIER: Record<Difficulty, Difficulty | null> = {
  hard: "medium",
  medium: "easy",
  easy: null,
};

interface BorderRunStoreState {
  status: BorderRunStatus;
  game: BorderRunGameDto | null;
  /** ISO alpha-3 → color classification for revealed countries. */
  colors: Record<string, CountryColor>;
  /** ISO alpha-3 of a non-adjacent guess flashing red, or null. */
  flash: string | null;
  /**
   * Starts a new game at `difficulty`, replacing any in progress. If the
   * generator has no pair at that difficulty, it falls back to the next-easier
   * one (with a toast) before giving up with an error status.
   */
  start: (difficulty: Difficulty) => Promise<void>;
  /** Submits a typed country name; returns the outcome (null on backend error). */
  guess: (input: string) => Promise<GuessOutcomeDto | null>;
  /** Reveals a shortest start→end path, coloring its interior green (lose screen). */
  revealPath: () => Promise<void>;
  /** Clears the transient red flash. */
  clearFlash: () => void;
  /** Drops all game state (e.g. when leaving the route). */
  reset: () => void;
}

const INITIAL = {
  status: "idle" as BorderRunStatus,
  game: null,
  colors: {} as Record<string, CountryColor>,
  flash: null as string | null,
};

/** Color for an accepted country: green on a shortest path, orange otherwise. */
function acceptedColor(onShortestPath: boolean): CountryColor {
  return onShortestPath ? "path" : "detour";
}

export const useBorderRunStore = create<BorderRunStoreState>((set, get) => ({
  ...INITIAL,

  start: async (difficulty) => {
    set({ status: "loading", game: null, colors: {}, flash: null });
    try {
      const game = await borderRunStart(difficulty);
      set({
        status: "ready",
        game,
        colors: { [game.start]: "start", [game.end]: "end" },
        flash: null,
      });
    } catch {
      const easier = EASIER[difficulty];
      if (easier) {
        useToastStore.getState().show(i18n.t("borderRun.downgraded"), "info");
        await get().start(easier);
      } else {
        set({ status: "error", game: null, colors: {}, flash: null });
      }
    }
  },

  guess: async (input) => {
    let outcome: GuessOutcomeDto;
    try {
      outcome = await borderRunGuess(input);
    } catch {
      return null;
    }

    set((state) => {
      const next: Partial<BorderRunStoreState> = { game: outcome.game };
      const { kind, iso3, on_shortest_path, accepted } = outcome;

      if (iso3 && (kind === "accepted" || kind === "won")) {
        next.colors = {
          ...state.colors,
          [iso3]: acceptedColor(on_shortest_path),
        };
      } else if (kind === "lost" && iso3) {
        if (accepted) {
          next.colors = {
            ...state.colors,
            [iso3]: acceptedColor(on_shortest_path),
          };
        } else {
          next.flash = iso3;
        }
      } else if (kind === "not_adjacent" && iso3) {
        next.flash = iso3;
      }

      return next;
    });

    return outcome;
  },

  revealPath: async () => {
    const { game } = get();
    if (!game) return;
    try {
      const path = await borderRunRevealPath();
      set((state) => {
        const next = { ...state.colors };
        for (const iso of path) {
          // Keep the start/end accents; color only the interior green.
          if (iso !== game.start && iso !== game.end) next[iso] = "path";
        }
        return { colors: next };
      });
    } catch {
      // A missing path is non-fatal; the lose screen simply shows no reveal.
    }
  },

  clearFlash: () => set({ flash: null }),

  reset: () => set({ ...INITIAL, colors: {} }),
}));
