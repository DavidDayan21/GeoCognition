/**
 * UI language application and startup bootstrap. The `language` preference
 * (en / fr) is persisted in settings; this module mirrors it to the i18next
 * instance and to `localStorage`, so {@link bootstrapLanguage} can apply it
 * synchronously at startup — before the (async) settings load — avoiding a
 * flash of the wrong language. Mirrors the `theme.ts` pattern.
 */
import i18n, { SUPPORTED_LANGUAGES } from "../i18n";
import type { Language } from "../types/domain";

const LANGUAGE_CACHE_KEY = "geocognition-language";

function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Maps a language to a BCP-47 locale for `Intl` date/number formatting. */
export function localeOf(language: Language): string {
  return language === "fr" ? "fr-FR" : "en-US";
}

/**
 * Switches the active UI language and caches the choice for the next startup.
 * Safe to call repeatedly; a no-op when the language is already active.
 */
export function applyLanguage(language: Language): void {
  if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  try {
    localStorage.setItem(LANGUAGE_CACHE_KEY, language);
  } catch {
    // localStorage may be unavailable; the in-memory language still applies.
  }
}

/**
 * Applies the cached language preference synchronously at startup, defaulting
 * to English when nothing is cached. Call once before rendering.
 */
export function bootstrapLanguage(): void {
  let cached: Language = "en";
  try {
    const stored = localStorage.getItem(LANGUAGE_CACHE_KEY);
    if (stored && isLanguage(stored)) cached = stored;
  } catch {
    // Ignore and fall back to English.
  }
  if (i18n.language !== cached) void i18n.changeLanguage(cached);
}
