/**
 * One-shot generator for `src-tauri/data/countries.json`.
 *
 * Pulls the REST Countries v3.1 dataset (the live v3.1 API was shut down in
 * favor of an API-key-gated v5, so this reads the same dataset from the
 * project's open GitLab repository), filters to UN-recognized sovereign
 * states (193 UN members + 2 observer states: Vatican City and Palestine),
 * normalizes continents into the app's six buckets, and writes a stable,
 * alphabetically ordered JSON array.
 *
 * Run with: node scripts/build-countries-json.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface RestCountry {
  name: { common: string };
  capital?: string[];
  cca2: string;
  cca3: string;
  latlng?: number[];
  continents: string[];
  unMember: boolean;
}

interface Country {
  id: number;
  name: string;
  capital: string;
  continent: string;
  iso_alpha2: string;
  iso_alpha3: string;
  lat: number;
  lng: number;
}

const CONTINENTS = [
  "Africa",
  "North America",
  "South America",
  "Asia",
  "Europe",
  "Oceania",
] as const;

/**
 * States included despite `unMember: false` in the dataset:
 * - VAT, PSE: UN observer states
 * - GNB: Guinea-Bissau is a UN member since 1974; dataset flag is wrong
 */
const UN_MEMBER_CORRECTIONS = new Set(["VAT", "PSE", "GNB"]);

/**
 * Countries pinned to the continent conventionally used in geography
 * quizzes, where the dataset is multi-continent (RUS, TUR, AZE) or
 * unconventional (TLS is listed as Oceania).
 */
const CONTINENT_OVERRIDES: Record<string, string> = {
  RUS: "Europe",
  TUR: "Asia",
  AZE: "Asia",
  TLS: "Asia",
};

function resolveContinent(country: RestCountry): string {
  const override = CONTINENT_OVERRIDES[country.cca3];
  const continent = override ?? country.continents[0];
  if (!(CONTINENTS as readonly string[]).includes(continent)) {
    throw new Error(
      `Unexpected continent "${continent}" for ${country.cca3}; add a mapping.`,
    );
  }
  return continent;
}

const url =
  "https://gitlab.com/restcountries/restcountries/-/raw/master/src/main/resources/countriesV3.1.json";

console.log(`Fetching ${url} ...`);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`REST Countries request failed: HTTP ${response.status}`);
}
const all = (await response.json()) as RestCountry[];
console.log(`Received ${all.length} entries.`);

const sovereign = all.filter(
  (c) => c.unMember || UN_MEMBER_CORRECTIONS.has(c.cca3),
);
sovereign.sort((a, b) => a.name.common.localeCompare(b.name.common, "en"));

const countries: Country[] = sovereign.map((c, index) => {
  const capital = c.capital?.[0];
  if (!capital) {
    throw new Error(`Missing capital for ${c.name.common} (${c.cca3})`);
  }
  const [lat, lng] = c.latlng ?? [];
  if (lat === undefined || lng === undefined) {
    throw new Error(`Missing coordinates for ${c.name.common} (${c.cca3})`);
  }
  return {
    id: index + 1,
    name: c.name.common,
    capital,
    continent: resolveContinent(c),
    iso_alpha2: c.cca2.toLowerCase(),
    iso_alpha3: c.cca3.toLowerCase(),
    lat,
    lng,
  };
});

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(scriptDir, "..", "src-tauri", "data", "countries.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(countries, null, 2) + "\n", "utf8");

const byContinent = new Map<string, number>();
for (const c of countries) {
  byContinent.set(c.continent, (byContinent.get(c.continent) ?? 0) + 1);
}
console.log(`Wrote ${countries.length} countries to ${outPath}`);
for (const [continent, count] of byContinent) {
  console.log(`  ${continent}: ${count}`);
}
