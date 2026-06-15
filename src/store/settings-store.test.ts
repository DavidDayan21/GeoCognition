import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../types/domain";

vi.mock("../api/tauri-api", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  resetStats: vi.fn(),
}));

import { getSettings, resetStats, updateSettings } from "../api/tauri-api";
import { useSettingsStore } from "./settings-store";

const mockGet = vi.mocked(getSettings);
const mockUpdate = vi.mocked(updateSettings);
const mockReset = vi.mocked(resetStats);

const base: Settings = {
  selected_continents: [
    "Africa",
    "North America",
    "South America",
    "Asia",
    "Europe",
    "Oceania",
  ],
  modes_enabled: { capital: true, flag: true },
  theme: "system",
  fuzzy_tolerance: "normal",
};

/** The settings object passed to the most recent updateSettings call. */
function lastSaved(): Settings {
  const { calls } = mockUpdate.mock;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
  mockReset.mockResolvedValue(undefined);
  useSettingsStore.setState({ settings: null, status: "idle" });
});

describe("settings store", () => {
  it("load fetches settings and becomes ready", async () => {
    mockGet.mockResolvedValueOnce(base);
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().status).toBe("ready");
    expect(useSettingsStore.getState().settings).toEqual(base);
  });

  it("toggleContinent removes a continent and persists canonical order", () => {
    useSettingsStore.setState({ settings: base, status: "ready" });
    useSettingsStore.getState().toggleContinent("Asia");

    const saved = lastSaved();
    expect(saved.selected_continents).toEqual([
      "Africa",
      "North America",
      "South America",
      "Europe",
      "Oceania",
    ]);
    expect(useSettingsStore.getState().settings?.selected_continents).toEqual(
      saved.selected_continents,
    );
  });

  it("toggleContinent re-adds in canonical order", () => {
    useSettingsStore.setState({
      settings: { ...base, selected_continents: ["Europe"] },
      status: "ready",
    });
    useSettingsStore.getState().toggleContinent("Africa");
    expect(lastSaved().selected_continents).toEqual(["Africa", "Europe"]);
  });

  it("toggleContinent refuses to remove the last continent", () => {
    useSettingsStore.setState({
      settings: { ...base, selected_continents: ["Asia"] },
      status: "ready",
    });
    useSettingsStore.getState().toggleContinent("Asia");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().settings?.selected_continents).toEqual([
      "Asia",
    ]);
  });

  it("setMode disables a mode but keeps at least one enabled", () => {
    useSettingsStore.setState({ settings: base, status: "ready" });

    useSettingsStore.getState().setMode("flag", false);
    expect(lastSaved().modes_enabled).toEqual({ capital: true, flag: false });

    mockUpdate.mockClear();
    useSettingsStore.getState().setMode("capital", false);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().settings?.modes_enabled).toEqual({
      capital: true,
      flag: false,
    });
  });

  it("setTheme and setFuzzyTolerance persist the change", () => {
    useSettingsStore.setState({ settings: base, status: "ready" });

    useSettingsStore.getState().setTheme("dark");
    expect(lastSaved().theme).toBe("dark");

    useSettingsStore.getState().setFuzzyTolerance("lenient");
    expect(lastSaved().fuzzy_tolerance).toBe("lenient");
  });

  it("resetStats calls the backend", async () => {
    await useSettingsStore.getState().resetStats();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
