/**
 * The six selectable continents, in display order. Mirrors `CONTINENTS` in
 * `src-tauri/src/domain/models.rs`; Antarctica is intentionally excluded.
 */
export const CONTINENTS = [
  "Africa",
  "North America",
  "South America",
  "Asia",
  "Europe",
  "Oceania",
] as const;

export type Continent = (typeof CONTINENTS)[number];

/** Returns `list` filtered and reordered to the canonical continent order. */
export function sortContinents(list: readonly string[]): string[] {
  return CONTINENTS.filter((continent) => list.includes(continent));
}
