/**
 * One-shot generator for the bundled world-map geometry
 * (`public/geo/world-110m.geojson`).
 *
 * Pulls Natural Earth 1:110m Admin-0 countries (GeoJSON) and strips every
 * feature down to its geometry plus a single `iso_a3` property. The code is
 * lowercased and prefers `ISO_A3_EH`, so de-facto codes (e.g. FRA, NOR)
 * replace the dataset's "-99" placeholders. The continent each country
 * belongs to is resolved at runtime by joining `iso_a3` against the app's
 * own country list, keeping `countries.json` the single source of truth.
 *
 * Run with: node scripts/build-world-geo.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface NeProperties {
  ISO_A3?: string;
  ISO_A3_EH?: string;
  [key: string]: unknown;
}

interface NeFeature {
  type: "Feature";
  properties: NeProperties;
  geometry: unknown;
}

interface NeCollection {
  type: "FeatureCollection";
  features: NeFeature[];
}

const url =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

/** De-facto ISO alpha-3, lowercased; "" when the dataset has no real code. */
function resolveIso(props: NeProperties): string {
  const candidate =
    props.ISO_A3_EH && props.ISO_A3_EH !== "-99"
      ? props.ISO_A3_EH
      : props.ISO_A3;
  return candidate && candidate !== "-99" ? candidate.toLowerCase() : "";
}

console.log(`Fetching ${url} ...`);
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Natural Earth request failed: HTTP ${response.status}`);
}
const source = (await response.json()) as NeCollection;
console.log(`Received ${source.features.length} features.`);

const features = source.features.map((feature) => ({
  type: "Feature" as const,
  properties: { iso_a3: resolveIso(feature.properties) },
  geometry: feature.geometry,
}));

const collection = { type: "FeatureCollection" as const, features };

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = join(scriptDir, "..", "public", "geo", "world-110m.geojson");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(collection) + "\n", "utf8");

const missing = features.filter((f) => f.properties.iso_a3 === "").length;
console.log(
  `Wrote ${features.length} features to ${outPath} (${missing} without an ISO code).`,
);
