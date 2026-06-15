/**
 * One-shot downloader for flag SVGs.
 *
 * Reads `src-tauri/data/countries.json` and downloads each country's flag
 * from flagcdn.com into `public/flags/{iso_alpha2}.svg` so the flags can be
 * bundled into the Tauri binary for offline use.
 *
 * Run with: node scripts/download-flags.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Country {
  name: string;
  iso_alpha2: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataPath = join(scriptDir, "..", "src-tauri", "data", "countries.json");
const flagsDir = join(scriptDir, "..", "public", "flags");

const countries = JSON.parse(readFileSync(dataPath, "utf8")) as Country[];
mkdirSync(flagsDir, { recursive: true });

const CONCURRENCY = 10;
let downloaded = 0;
const failures: string[] = [];

async function downloadFlag(country: Country): Promise<void> {
  const url = `https://flagcdn.com/${country.iso_alpha2}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    failures.push(
      `${country.name} (${country.iso_alpha2}): HTTP ${response.status}`,
    );
    return;
  }
  const svg = await response.text();
  writeFileSync(join(flagsDir, `${country.iso_alpha2}.svg`), svg, "utf8");
  downloaded += 1;
}

console.log(`Downloading ${countries.length} flags to ${flagsDir} ...`);
for (let i = 0; i < countries.length; i += CONCURRENCY) {
  const batch = countries.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(downloadFlag));
}

console.log(`Downloaded ${downloaded}/${countries.length} flags.`);
if (failures.length > 0) {
  console.error("Failures:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
