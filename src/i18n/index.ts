/**
 * i18next configuration. English and French translation resources are bundled
 * at build time (no network, no backend loader). The active language is driven
 * by the persisted user setting via {@link ../lib/language}.
 *
 * Import this module for its side effect (it initializes the shared i18next
 * singleton) before rendering — see `main.tsx`.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import type { Language } from "../types/domain";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["en", "fr"];

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    // React already escapes values, so i18next must not double-escape.
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
