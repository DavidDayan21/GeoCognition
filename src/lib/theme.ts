/**
 * Theme resolution and application. The `theme` preference (light / dark /
 * system) is persisted in settings; this module turns it into the concrete
 * `dark` class on the document root that the CSS variables key off, and also
 * sets `color-scheme` so native controls and scrollbars match.
 *
 * The preference is mirrored to `localStorage` so {@link bootstrapTheme} can
 * apply it synchronously at startup, before the (async) settings load, which
 * avoids a flash of the wrong theme.
 */
import type { Theme } from "../types/domain";

export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_CACHE_KEY = "geocognition-theme";
const THEMES: readonly Theme[] = ["light", "dark", "system"];

/** Whether the OS currently prefers a dark color scheme. */
export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}

/** Resolves a theme preference to a concrete light/dark value. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/**
 * Applies `theme` to the document root (the `dark` class and `color-scheme`)
 * and caches the preference for the next startup.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  try {
    localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // localStorage may be unavailable; the in-memory theme still applies.
  }
}

/**
 * Applies the cached theme preference synchronously at startup, defaulting to
 * `system` when nothing is cached. Call once before rendering.
 */
export function bootstrapTheme(): void {
  let cached: Theme = "system";
  try {
    const stored = localStorage.getItem(THEME_CACHE_KEY);
    if (stored && (THEMES as readonly string[]).includes(stored)) {
      cached = stored as Theme;
    }
  } catch {
    // Ignore and fall back to system.
  }
  applyTheme(cached);
}

/** The media query used to react to OS theme changes in `system` mode. */
export function darkModeMediaQuery(): MediaQueryList | null {
  return typeof window === "undefined" ? null : window.matchMedia(DARK_QUERY);
}
