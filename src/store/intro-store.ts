/**
 * Tracks whether the launch intro animation has played in this app session.
 * Intentionally NOT persisted — resets to false on every fresh launch so the
 * intro fires exactly once per run, regardless of how many times the user
 * navigates to the Home page.
 */
import { create } from "zustand";

interface IntroStore {
  hasPlayedIntro: boolean;
  markIntroPlayed: () => void;
}

export const useIntroStore = create<IntroStore>((set) => ({
  hasPlayedIntro: false,
  markIntroPlayed: () => set({ hasPlayedIntro: true }),
}));
