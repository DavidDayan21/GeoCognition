/**
 * Helpers for the continent-selection world map. The map geometry
 * (`public/geo/world-110m.geojson`) carries only an `iso_a3` per feature;
 * the authoritative continent is resolved by joining that code against the
 * app's country list, so `countries.json` stays the single source of truth.
 *
 * A pre-dissolved continent-level geometry (`public/geo/continents.geojson`)
 * is used by the Home-page map so that each of the 6 continents renders as a
 * single shape without internal country borders.
 */
import type { Country, CountryMastery } from "../../types/domain";

/** Path to the bundled, stripped Natural Earth 110m geometry (country-level). */
export const WORLD_GEO_URL = "/geo/world-110m.geojson";

/** Path to the pre-dissolved 6-continent geometry (no country borders). */
export const CONTINENT_GEO_URL = "/geo/continents.geojson";

/** A react-simple-maps feature from the dissolved continent geometry. */
export interface ContinentGeography {
  rsmKey: string;
  properties: { continent: string };
}

/** A react-simple-maps geography feature (only the fields we read). */
export interface MapGeography {
  rsmKey: string;
  properties: { iso_a3?: string };
}

/** Whether a feature is in a selected continent, another one, or not a quiz country. */
export type GeoFillState = "selected" | "deselected" | "inactive";

/** Builds a lowercase-ISO-alpha-3 -> continent lookup from the country list. */
export function buildContinentByIso(
  countries: readonly Country[],
): Map<string, string> {
  return new Map(countries.map((c) => [c.iso_alpha3, c.continent]));
}

/** The continent of a map feature, or `null` when it isn't a quiz country. */
export function continentForGeography(
  geo: MapGeography,
  byIso: ReadonlyMap<string, string>,
): string | null {
  const iso = geo.properties.iso_a3;
  if (!iso) return null;
  return byIso.get(iso) ?? null;
}

/** Classifies a feature for fill purposes given the current selection. */
export function geoFillState(
  continent: string | null,
  selectedContinents: readonly string[],
): GeoFillState {
  if (!continent) return "inactive";
  return selectedContinents.includes(continent) ? "selected" : "deselected";
}

/** Builds a lowercase-ISO-alpha-3 -> easiness-factor lookup (null = unseen). */
export function buildMasteryByIso(
  mastery: readonly CountryMastery[],
): Map<string, number | null> {
  return new Map(mastery.map((m) => [m.iso_alpha3, m.ef]));
}

/**
 * Heatmap fill (CSS variable) for a country's easiness factor. `null` (never
 * reviewed) and unknown features render neutral; otherwise the EF is binned
 * to the four mastery colors per the design tokens.
 */
export function masteryFill(ef: number | null | undefined): string {
  if (ef === null || ef === undefined) return "var(--surface-2)";
  if (ef < 1.6) return "var(--mastery-0)";
  if (ef < 2.2) return "var(--mastery-1)";
  if (ef <= 2.6) return "var(--mastery-2)";
  return "var(--mastery-3)";
}
