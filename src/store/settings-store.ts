/**
 * App-wide settings: the persisted continent selection, enabled modes,
 * theme, and fuzzy tolerance. Changes are applied optimistically and then
 * written through to the backend (`update_settings`); a failed write surfaces
 * a toast and is otherwise non-fatal. The backend re-validates and re-reads
 * settings on every question, so changes take effect on the next question.
 */
import { create } from "zustand";
import { getSettings, resetStats, updateSettings } from "../api/tauri-api";
import { sortContinents } from "../lib/continents";
import { applyLanguage } from "../lib/language";
import i18n from "../i18n";
import type {
  AppMode,
  Difficulty,
  FuzzyTolerance,
  Language,
  QuestionMode,
  Settings,
  Theme,
} from "../types/domain";
import { useToastStore } from "./toast-store";

export type SettingsStatus = "idle" | "loading" | "ready" | "error";

interface SettingsStoreState {
  settings: Settings | null;
  status: SettingsStatus;
  /** Loads settings from the backend (first-launch defaults when unset). */
  load: () => Promise<void>;
  /** Toggles a continent, keeping at least one selected. */
  toggleContinent: (continent: string) => void;
  /** Enables/disables a mode, keeping at least one enabled. */
  setMode: (mode: QuestionMode, enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  setFuzzyTolerance: (tolerance: FuzzyTolerance) => void;
  /** Persists the active home-screen game mode. */
  setCurrentMode: (mode: AppMode) => void;
  /** Persists the selected Border Run difficulty. */
  setBorderRunDifficulty: (difficulty: Difficulty) => void;
  /** Switches the UI language, applies it to i18next, and persists it. */
  setLanguage: (language: Language) => void;
  /** Deletes all SM-2 progress and the answer log via the backend. */
  resetStats: () => Promise<void>;
}

function toMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return i18n.t("toast.saveError");
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => {
  /** Optimistically applies `next`, then persists it (toast on failure). */
  const persist = (next: Settings): void => {
    set({ settings: next, status: "ready" });
    updateSettings(next).catch((error) => {
      useToastStore.getState().show(toMessage(error), "error");
    });
  };

  return {
    settings: null,
    status: "idle",

    load: async () => {
      set({ status: "loading" });
      try {
        const settings = await getSettings();
        applyLanguage(settings.language);
        set({ settings, status: "ready" });
      } catch (error) {
        set({ status: "error" });
        useToastStore.getState().show(toMessage(error), "error");
      }
    },

    toggleContinent: (continent) => {
      const current = get().settings;
      if (!current) return;
      const has = current.selected_continents.includes(continent);
      const nextList = has
        ? current.selected_continents.filter((c) => c !== continent)
        : [...current.selected_continents, continent];
      if (nextList.length === 0) return;
      persist({
        ...current,
        selected_continents: sortContinents(nextList),
      });
    },

    setMode: (mode, enabled) => {
      const current = get().settings;
      if (!current) return;
      const nextModes = { ...current.modes_enabled, [mode]: enabled };
      if (!nextModes.capital && !nextModes.flag) return;
      persist({ ...current, modes_enabled: nextModes });
    },

    setTheme: (theme) => {
      const current = get().settings;
      if (!current) return;
      persist({ ...current, theme });
    },

    setFuzzyTolerance: (fuzzy_tolerance) => {
      const current = get().settings;
      if (!current) return;
      persist({ ...current, fuzzy_tolerance });
    },

    setCurrentMode: (current_mode) => {
      const current = get().settings;
      if (!current) return;
      persist({ ...current, current_mode });
    },

    setBorderRunDifficulty: (border_run_difficulty) => {
      const current = get().settings;
      if (!current) return;
      persist({ ...current, border_run_difficulty });
    },

    setLanguage: (language) => {
      // Always switch the UI language and cache it, even before settings have
      // loaded, so the change is instant. Persist only once we have settings.
      applyLanguage(language);
      const current = get().settings;
      if (!current) return;
      persist({ ...current, language });
    },

    resetStats: async () => {
      try {
        await resetStats();
        useToastStore.getState().show(i18n.t("toast.statsReset"), "success");
      } catch (error) {
        useToastStore.getState().show(toMessage(error), "error");
      }
    },
  };
});
