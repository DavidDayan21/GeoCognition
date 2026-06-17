/**
 * One-shot script: generates the full GeoCognition app icon set.
 *
 * Design (1024×1024 base): a deep navy/near-black background (#1C1917), a white
 * globe outline (circle with latitude/longitude lines), and "GC" in a white
 * Instrument-Serif-style face centred on the globe. Clean, minimal, professional.
 *
 * Writes (all under src-tauri/icons/):
 *   32x32.png, 128x128.png, 128x128@2x.png, icon.png (1024 base),
 *   Square{30,44,71,89,107,142,150,284,310}x…Logo.png, StoreLogo.png (50×50),
 *   icon.ico (Windows multi-size container), icon.icns (macOS multi-size container)
 *
 * Fully offline — only the `sharp` dev dependency is required. sharp cannot emit
 * .ico/.icns containers, so this script packs sharp's PNG buffers into both
 * formats with the small encoders below.
 *
 * Run with: pnpm tsx scripts/generate-icons.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const iconsDir = join(root, "src-tauri", "icons");

const BG = "#1C1917"; // deep navy / near-black
const FG = "#FFFFFF"; // white

/**
 * The base icon as an SVG string. Rendered by sharp (via librsvg) at any size.
 * A circular clip keeps every latitude/longitude line inside the globe, and the
 * "GC" wordmark is overlaid on top in a serif face with a generous size.
 */
function buildSvg(): string {
  const S = 1024;
  const cx = S / 2;
  const cy = S / 2;
  const R = 380;
  const ringWidth = 16;
  const lineWidth = 7;
  const lineOpacity = 0.5;

  // Latitude lines: straight horizontal chords clipped to the globe disc.
  const latOffsets = [-R * 0.62, -R * 0.32, 0, R * 0.32, R * 0.62];
  const latLines = latOffsets
    .map((dy) => {
      const y = cy + dy;
      return `<line x1="${cx - R}" y1="${y}" x2="${cx + R}" y2="${y}" />`;
    })
    .join("\n      ");

  // Longitude meridians: vertical ellipses of decreasing width, plus the
  // central straight meridian.
  const meridianRx = [R * 0.72, R * 0.42];
  const meridians = meridianRx
    .map((rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${R}" />`)
    .join("\n      ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <clipPath id="globe">
      <circle cx="${cx}" cy="${cy}" r="${R}" />
    </clipPath>
  </defs>
  <rect width="${S}" height="${S}" rx="180" fill="${BG}" />
  <g clip-path="url(#globe)" stroke="${FG}" stroke-width="${lineWidth}" fill="none" opacity="${lineOpacity}">
      ${latLines}
      ${meridians}
      <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" />
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${FG}" stroke-width="${ringWidth}" />
  <text x="${cx}" y="${cy}" fill="${FG}" font-family="Instrument Serif, Georgia, 'Times New Roman', serif" font-size="440" font-weight="500" text-anchor="middle" dominant-baseline="central" letter-spacing="-10">GC</text>
</svg>`;
}

const svg = Buffer.from(buildSvg());

/** Render the base SVG to a square PNG buffer of the given edge length. */
function renderPng(size: number): Promise<Buffer> {
  return sharp(svg, { density: 384 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * Pack PNG buffers into a Windows .ico container. Modern .ico allows each
 * directory entry to point at a raw PNG, so we embed sharp's PNGs directly.
 */
function buildIco(images: { size: number; data: Buffer }[]): Buffer {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  images.forEach((img, i) => {
    const e = entries.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width (0 => 256)
    e.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height (0 => 256)
    e.writeUInt8(0, 2); // palette colour count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(img.data.length, 8); // size of image data
    e.writeUInt32LE(offset, 12); // offset of image data
    offset += img.data.length;
  });

  return Buffer.concat([header, entries, ...images.map((img) => img.data)]);
}

/**
 * Pack PNG buffers into a macOS .icns container using the PNG-based OSTypes.
 */
function buildIcns(images: { type: string; data: Buffer }[]): Buffer {
  const chunks = images.map((img) => {
    const head = Buffer.alloc(8);
    head.write(img.type, 0, 4, "ascii");
    head.writeUInt32BE(img.data.length + 8, 4); // length includes the 8-byte header
    return Buffer.concat([head, img.data]);
  });
  const body = Buffer.concat(chunks);
  const fileHead = Buffer.alloc(8);
  fileHead.write("icns", 0, 4, "ascii");
  fileHead.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([fileHead, body]);
}

/** Plain PNG outputs: filename → edge length. */
const PNG_OUTPUTS: Record<string, number> = {
  "32x32.png": 32,
  "128x128.png": 128,
  "128x128@2x.png": 256,
  "icon.png": 1024,
  "Square30x30Logo.png": 30,
  "Square44x44Logo.png": 44,
  "Square71x71Logo.png": 71,
  "Square89x89Logo.png": 89,
  "Square107x107Logo.png": 107,
  "Square142x142Logo.png": 142,
  "Square150x150Logo.png": 150,
  "Square284x284Logo.png": 284,
  "Square310x310Logo.png": 310,
  "StoreLogo.png": 50,
};

/** Sizes embedded in icon.ico. */
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

/** OSType → edge length for icon.icns. */
const ICNS_TYPES: Record<string, number> = {
  ic07: 128,
  ic08: 256,
  ic09: 512,
  ic10: 1024,
  ic11: 32,
  ic12: 64,
  ic13: 256,
  ic14: 512,
};

async function main(): Promise<void> {
  mkdirSync(iconsDir, { recursive: true });

  // Plain PNGs.
  for (const [name, size] of Object.entries(PNG_OUTPUTS)) {
    const data = await renderPng(size);
    writeFileSync(join(iconsDir, name), data);
    console.log(`✓ ${name} (${size}×${size})`);
  }

  // Windows .ico.
  const icoImages = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, data: await renderPng(size) })),
  );
  writeFileSync(join(iconsDir, "icon.ico"), buildIco(icoImages));
  console.log(`✓ icon.ico (${ICO_SIZES.join(", ")})`);

  // macOS .icns.
  const icnsImages = await Promise.all(
    Object.entries(ICNS_TYPES).map(async ([type, size]) => ({
      type,
      data: await renderPng(size),
    })),
  );
  writeFileSync(join(iconsDir, "icon.icns"), buildIcns(icnsImages));
  console.log(`✓ icon.icns (${Object.values(ICNS_TYPES).join(", ")})`);

  console.log(`\n✓ Wrote all icons to ${iconsDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
