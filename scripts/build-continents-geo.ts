/**
 * One-shot script: dissolves country polygons into 6 continent shapes.
 *
 * Reads:
 *   public/geo/world-110m.geojson  — Natural Earth country geometry (iso_a3 per feature)
 *   src-tauri/data/countries.json  — ISO alpha-3 → continent mapping
 *
 * Writes:
 *   public/geo/continents.geojson  — 6 dissolved continent shapes
 *     (Africa, Asia, Europe, North America, South America, Oceania).
 *     Antarctica is excluded. Each feature carries { continent: "<name>" }.
 *
 * Run with: npx tsx scripts/build-continents-geo.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as turf from "@turf/turf";
import { geoEqualEarth } from "d3-geo";

interface CountryRecord {
  iso_alpha3: string;
  continent: string;
}

interface WorldFeature {
  type: "Feature";
  properties: { iso_a3: string };
  geometry: turf.Geometry;
}

interface WorldCollection {
  type: "FeatureCollection";
  features: WorldFeature[];
}

const CONTINENTS = [
  "Africa",
  "North America",
  "South America",
  "Asia",
  "Europe",
  "Oceania",
] as const;

// Per-continent bounding boxes [minLon, minLat, maxLon, maxLat] used to
// filter individual sub-polygons by centroid before dissolving. This
// prevents overseas territories (e.g., French Guiana appearing in Europe)
// from polluting continent shapes. Bounds are generous enough to include
// legitimate territories such as islands and exclaves.
const CONTINENT_BOUNDS: Partial<
  Record<string, readonly [number, number, number, number]>
> = {
  Europe: [-30, 27, 65, 82],
};

function centroidInBounds(
  poly: turf.Feature<turf.Polygon>,
  continent: string,
): boolean {
  const bounds = CONTINENT_BOUNDS[continent];
  if (!bounds) return true;
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const c = turf.centroid(poly);
  const [lon, lat] = c.geometry.coordinates;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");

const worldGeo = JSON.parse(
  readFileSync(join(root, "public", "geo", "world-110m.geojson"), "utf8"),
) as WorldCollection;

const countries = JSON.parse(
  readFileSync(join(root, "src-tauri", "data", "countries.json"), "utf8"),
) as CountryRecord[];

const continentByIso = new Map<string, string>(
  countries.map((c) => [c.iso_alpha3, c.continent]),
);

// Group world features by continent, splitting MultiPolygons into individual
// polygon parts so the centroid filter can operate on each sub-shape.
const groups = new Map<string, turf.Feature<turf.Polygon>[]>();
for (const feature of worldGeo.features) {
  const iso = feature.properties?.iso_a3;
  if (!iso) continue;
  const continent = continentByIso.get(iso);
  if (!continent) continue;

  const list = groups.get(continent) ?? [];

  if (feature.geometry.type === "MultiPolygon") {
    for (const polyCoords of (feature.geometry as turf.MultiPolygon)
      .coordinates) {
      const poly = turf.polygon(polyCoords);
      if (centroidInBounds(poly, continent)) {
        list.push(poly);
      }
    }
  } else if (feature.geometry.type === "Polygon") {
    const poly = turf.feature(feature.geometry as turf.Polygon);
    if (centroidInBounds(poly, continent)) {
      list.push(poly);
    }
  }

  groups.set(continent, list);
}

// Union each continent's country polygons into one dissolved shape
const continentFeatures: turf.Feature[] = [];
for (const continent of CONTINENTS) {
  const features = groups.get(continent);
  if (!features || features.length === 0) {
    console.warn(`No geometry found for ${continent} — skipping.`);
    continue;
  }
  console.log(`Dissolving ${continent}: ${features.length} country polygons…`);
  const fc = turf.featureCollection(features);
  const unioned = turf.union(fc);
  if (!unioned) {
    console.warn(`Union returned null for ${continent} — skipping.`);
    continue;
  }
  // turf.union outputs RFC 7946 winding (counterclockwise exterior rings),
  // but d3-geo (via react-simple-maps) uses the opposite convention and would
  // render a CCW polygon as its spherical complement — filling the whole map.
  // The source world-110m.geojson is entirely clockwise, so rewind the
  // dissolved shape to match (reverse: true => clockwise exterior rings).
  const feature = turf.feature(unioned.geometry, { continent });
  continentFeatures.push(turf.rewind(feature, { reverse: true }));
}

const output = turf.featureCollection(continentFeatures);
const outPath = join(root, "public", "geo", "continents.geojson");
writeFileSync(outPath, JSON.stringify(output) + "\n", "utf8");
console.log(
  `\n✓ Wrote ${continentFeatures.length} continent shapes to ${outPath}`,
);

// Report the projection config that fits these shapes into the Home-page map's
// frame (WorldMap.tsx). react-simple-maps hard-codes translate to the frame
// centre and only honours `scale`/`center`, so we express the fitExtent result
// as { scale, center } and keep WorldMap.tsx in sync with whatever is printed.
const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 370;
const FRAME_PADDING = 12;
const fitProjection = geoEqualEarth().fitExtent(
  [
    [FRAME_PADDING, FRAME_PADDING],
    [FRAME_WIDTH - FRAME_PADDING, FRAME_HEIGHT - FRAME_PADDING],
  ],
  output,
);
const fitCenter = fitProjection.invert?.([FRAME_WIDTH / 2, FRAME_HEIGHT / 2]);
if (fitCenter) {
  console.log(
    `  WorldMap projectionConfig (fits ${FRAME_WIDTH}x${FRAME_HEIGHT}): ` +
      `scale ${fitProjection.scale().toFixed(2)}, ` +
      `center [${fitCenter[0].toFixed(3)}, ${fitCenter[1].toFixed(3)}]`,
  );
}
