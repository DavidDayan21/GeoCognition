import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../types/domain";

vi.mock("../api/tauri-api", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  resetStats: vi.fn(),
}));

import { getSettings, updateSettings } from "../api/tauri-api";
import { useSettingsStore } from "./settings-store";
import { useModeStore } from "./mode-store";

const mockGet = vi.mocked(getSettings);
const mockUpdate = vi.mocked(updateSettings);

const base: Settings = {
  selected_continents: ["Europe"],
  modes_enabled: { capital: true, flag: true },
  theme: "system",
  fuzzy_tolerance: "normal",
  language: "en",
  current_mode: "practice",
  border_run_difficulty: "medium",
};

/** The settings object passed to the most recent updateSettings call. */
function lastSaved(): Settings {
  const { calls } = mockUpdate.mock;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
  useSettingsStore.setState({ settings: null, status: "idle" });
  useModeStore.setState({ currentMode: "practice" });
});

describe("mode store", () => {
  it("setMode updates local state and persists the new mode", () => {
    useSettingsStore.setState({ settings: base, status: "ready" });

    useModeStore.getState().setMode("border_run");

    expect(useModeStore.getState().currentMode).toBe("border_run");
    expect(lastSaved().current_mode).toBe("border_run");
  });

  it("mirrors the persisted mode after settings load", async () => {
    mockGet.mockResolvedValueOnce({ ...base, current_mode: "border_run" });

    await useSettingsStore.getState().load();

    expect(useModeStore.getState().currentMode).toBe("border_run");
  });
});
