import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  bootstrapTheme,
  resolveTheme,
  systemPrefersDark,
} from "./theme";

/** Installs a matchMedia stub reporting the given dark-mode preference. */
function stubMatchMedia(prefersDark: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
  stubMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveTheme", () => {
  it("returns explicit preferences unchanged", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("follows the OS in system mode", () => {
    stubMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
    stubMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("systemPrefersDark", () => {
  it("reflects the media query", () => {
    stubMatchMedia(true);
    expect(systemPrefersDark()).toBe(true);
  });
});

describe("applyTheme", () => {
  it("adds the dark class and color-scheme, and caches the preference", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(localStorage.getItem("geocognition-theme")).toBe("dark");
  });

  it("removes the dark class for a light theme", () => {
    applyTheme("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("geocognition-theme")).toBe("light");
  });
});

describe("bootstrapTheme", () => {
  it("applies the cached preference", () => {
    localStorage.setItem("geocognition-theme", "dark");
    bootstrapTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to system when nothing is cached", () => {
    stubMatchMedia(true);
    bootstrapTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("ignores an invalid cached value", () => {
    localStorage.setItem("geocognition-theme", "neon");
    stubMatchMedia(false);
    bootstrapTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
