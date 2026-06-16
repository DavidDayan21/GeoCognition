/**
 * One-shot augmentation of `src-tauri/data/countries.json` with the
 * `borders` field used by the Border Run game mode.
 *
 * Reads the same REST Countries v3.1 dataset as `build-countries-json.ts`
 * (served from the project's open GitLab repository, since the live v3.1
 * API was retired in favor of an API-key-gated v5), extracts each
 * country's land `borders` (ISO alpha-3 codes), and writes them back into
 * the existing dataset — preserving every other field and the stable
 * alphabetical ordering.
 *
 * Borders are filtered to the 195 countries actually present in the
 * dataset, so adjacency stays symmetric and never dangles to a code the
 * app does not know about. Island nations with no land border get `[]`.
 *
 * Run with: node scripts/add-borders.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface RestCountry {
  cca3: string;
  borders?: string[];
}

interface Country {
  id: number;
  name: string;
  name_fr: string;
  capital: string;
  capital_fr: string;
  continent: string;
  iso_alpha2: string;
  iso_alpha3: string;
  lat: number;
  lng: number;
  borders?: string[];
}

const url =
  "https://gitlab.com/restcountries/restcountries/-/raw/master/src/main/resources/countriesV3.1.json";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(scriptDir, "..", "src-tauri", "data", "countries.json");

const countries = JSON.parse(readFileSync(dataPath, "utf8")) as Country[];
const knownIso3 = new Set(countries.map((c) => c.iso_alpha3));

console.log(`Fetching ${url} ...`);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`REST Countries request failed: HTTP ${response.status}`);
}
const all = (await response.json()) as RestCountry[];
console.log(`Received ${all.length} entries.`);

const bordersByIso3 = new Map<string, string[]>();
for (const c of all) {
  bordersByIso3.set(c.cca3.toLowerCase(), c.borders ?? []);
}

let withBorders = 0;
let islands = 0;
for (const country of countries) {
  const raw = bordersByIso3.get(country.iso_alpha3);
  if (raw === undefined) {
    throw new Error(
      `No REST Countries entry for ${country.name} (${country.iso_alpha3}).`,
    );
  }
  // Keep only borders pointing to countries in our own dataset, sorted for
  // a stable diff.
  const borders = raw
    .map((code) => code.toLowerCase())
    .filter((code) => knownIso3.has(code))
    .sort();
  country.borders = borders;
  if (borders.length > 0) {
    withBorders += 1;
  } else {
    islands += 1;
  }
}

// Re-emit each country with `borders` last, preserving the existing key
// order for a minimal diff.
const ordered = countries.map((c) => ({
  id: c.id,
  name: c.name,
  name_fr: c.name_fr,
  capital: c.capital,
  capital_fr: c.capital_fr,
  continent: c.continent,
  iso_alpha2: c.iso_alpha2,
  iso_alpha3: c.iso_alpha3,
  lat: c.lat,
  lng: c.lng,
  borders: c.borders ?? [],
}));

writeFileSync(dataPath, JSON.stringify(ordered, null, 2) + "\n", "utf8");

console.log(`Wrote borders for ${ordered.length} countries to ${dataPath}`);
console.log(`  with land borders: ${withBorders}`);
console.log(`  no land borders (islands): ${islands}`);
