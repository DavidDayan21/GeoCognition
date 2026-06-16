/**
 * Active home-screen game mode (Practice vs. Border Run).
 *
 * The persisted source of truth is the `current_mode` settings key, owned by
 * the settings store; this store mirrors it locally for ergonomic access and
 * delegates persistence to the settings backend. The mirror is initialized
 * from any settings already loaded and kept in sync with later loads (e.g.
 * the restore on app boot).
 */
import { create } from "zustand";
import type { AppMode } from "../types/domain";
import { useSettingsStore } from "./settings-store";

interface ModeStoreState {
  currentMode: AppMode;
  /** Switches mode: updates local state and persists via the settings backend. */
  setMode: (mode: AppMode) => void;
}

export const useModeStore = create<ModeStoreState>((set) => ({
  currentMode: useSettingsStore.getState().settings?.current_mode ?? "practice",
  setMode: (mode) => {
    set({ currentMode: mode });
    useSettingsStore.getState().setCurrentMode(mode);
  },
}));

// Mirror the persisted mode whenever settings are (re)loaded from the backend.
useSettingsStore.subscribe((state) => {
  const mode = state.settings?.current_mode;
  if (mode && mode !== useModeStore.getState().currentMode) {
    useModeStore.setState({ currentMode: mode });
  }
});
