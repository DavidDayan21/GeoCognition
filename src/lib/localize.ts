/**
 * Pure helpers for picking the English or French form of a country or capital
 * name based on the active UI language. Each helper falls back to the English
 * field if the French one is missing or empty, so a partially-populated record
 * never renders a blank name.
 */
import type { Language } from "../types/domain";

/** Returns `fr` when the language is French and `fr` is non-empty, else `en`. */
export function pickLocalized(
  en: string,
  fr: string,
  language: Language,
): string {
  if (language === "fr" && fr.trim() !== "") return fr;
  return en;
}

/** The country name in the active language (`name_fr` for French). */
export function getLocalizedCountryName(
  country: { name: string; name_fr: string },
  language: Language,
): string {
  return pickLocalized(country.name, country.name_fr, language);
}

/** The capital name in the active language (`capital_fr` for French). */
export function getLocalizedCapital(
  country: { capital: string; capital_fr: string },
  language: Language,
): string {
  return pickLocalized(country.capital, country.capital_fr, language);
}
