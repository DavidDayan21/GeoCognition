# Scripts

One-shot data generation scripts. These are run during development to regenerate
bundled data files. They do not run at build time or at runtime.

| Script                    | Purpose                                               | Output                          |
| ------------------------- | ----------------------------------------------------- | ------------------------------- |
| `build-countries-json.ts` | Fetches country data from REST Countries API          | `src-tauri/data/countries.json` |
| `download-flags.ts`       | Downloads flag SVGs from flagcdn.com                  | `public/flags/*.svg`            |
| `build-world-geo.ts`      | Generates simplified world GeoJSON (country-level)    | `public/geo/world-110m.geojson` |
| `build-continents-geo.ts` | Dissolves countries into continent polygons           | `public/geo/continents.geojson` |
| `add-french-names.ts`     | Adds French country/capital names to countries.json   | `src-tauri/data/countries.json` |
| `add-borders.ts`          | Adds land border data (ISO alpha-3) to countries.json | `src-tauri/data/countries.json` |
| `generate-icons.ts`       | Generates all app icon sizes from a base design       | `src-tauri/icons/*`             |

## Running a script

```bash
pnpm tsx scripts/<script-name>.ts
```

Note: `tsx` is included as a dev dependency. Scripts may require network access
(REST Countries API, flagcdn.com) except `generate-icons.ts` and `build-continents-geo.ts`
which work fully offline.
