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
  borderRunRequestHint,
  borderRunRevealPath,
  borderRunStart,
  borderRunUndo,
} from "../api/tauri-api";
import {
  colorOf,
  type CountryColor,
} from "../components/border-run/border-run-colors";
import i18n from "../i18n";
import type {
  BorderRunGameDto,
  Difficulty,
  GuessOutcomeDto,
  Language,
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
  /** ISO alpha-3 → color classification for placed countries. */
  colors: Record<string, CountryColor>;
  /** Letter the hint revealed (shown until the game ends); null until used. */
  hintLetter: string | null;
  /**
   * True once a hint request came back empty (every shortest-path country is
   * already placed). The frontend can't know the shortest-path set, so this is
   * only discovered by asking — at which point the button is disabled.
   */
  hintUnavailable: boolean;
  /**
   * Starts a new game at `difficulty`, replacing any in progress. If the
   * generator has no pair at that difficulty, it falls back to the next-easier
   * one (with a toast) before giving up with an error status.
   */
  start: (difficulty: Difficulty) => Promise<void>;
  /** Submits a typed country name; returns the outcome (null on backend error). */
  guess: (input: string) => Promise<GuessOutcomeDto | null>;
  /** Reveals a shortest start→end path, coloring its interior green. */
  revealPath: () => Promise<void>;
  /**
   * Spends the single hint, storing the revealed letter. On failure (no hint
   * left) flags `hintUnavailable` so the button disables itself.
   */
  hint: () => Promise<void>;
  /** Spends the single undo, removing the last placed country and its color. */
  undo: () => Promise<void>;
  /** Drops all game state (e.g. when leaving the route). */
  reset: () => void;
}

const INITIAL = {
  status: "idle" as BorderRunStatus,
  game: null,
  colors: {} as Record<string, CountryColor>,
  hintLetter: null as string | null,
  hintUnavailable: false,
};

/** The backend's `Language` value for the active UI language. */
function activeLanguage(): Language {
  return i18n.language === "fr" ? "fr" : "en";
}

export const useBorderRunStore = create<BorderRunStoreState>((set, get) => ({
  ...INITIAL,

  start: async (difficulty) => {
    set({
      status: "loading",
      game: null,
      colors: {},
      hintLetter: null,
      hintUnavailable: false,
    });
    try {
      const game = await borderRunStart(difficulty);
      set({
        status: "ready",
        game,
        colors: { [game.start]: "start", [game.end]: "end" },
        hintLetter: null,
        hintUnavailable: false,
      });
    } catch {
      const easier = EASIER[difficulty];
      if (easier) {
        useToastStore.getState().show(i18n.t("borderRun.downgraded"), "info");
        await get().start(easier);
      } else {
        set({ status: "error", game: null, colors: {} });
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
      const { iso3, classification } = outcome;

      // Every placed country (accepted / won / lost) carries a classification;
      // color it immediately. The others (already_in_chain, not_recognized)
      // place nothing, so the map is left untouched.
      if (iso3 && classification) {
        next.colors = { ...state.colors, [iso3]: colorOf(classification) };
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

  hint: async () => {
    const { game } = get();
    if (!game || game.hint_used) return;
    try {
      const result = await borderRunRequestHint(activeLanguage());
      set((state) => ({
        hintLetter: result.letter,
        // Patch the snapshot so the button disables without a refetch.
        game: state.game ? { ...state.game, hint_used: true } : state.game,
      }));
    } catch {
      // The only expected failure is "no hint available" (every shortest-path
      // country is already placed); flag it so the button disables itself.
      set({ hintUnavailable: true });
    }
  },

  undo: async () => {
    const { game } = get();
    if (!game || game.undo_used || game.chain.length === 0) return;
    const removed = game.chain[game.chain.length - 1];
    try {
      const updated = await borderRunUndo();
      set((state) => {
        const colors = { ...state.colors };
        delete colors[removed];
        return { game: updated, colors };
      });
    } catch {
      // Non-fatal: a rejected undo leaves the game untouched.
    }
  },

  reset: () => set({ ...INITIAL, colors: {} }),
}));
