// Extract a privacy-safe EXIF subset from every photo source file
// and write a sidecar JSON next to its metadata file.
//
// Privacy: GPS-prefixed fields and serial numbers are NEVER written.
// We keep the photographically interesting fields only — see SAFE_FIELDS.
//
// Sidecars live at src/content/photos/_exif/<slug>.json and are
// committed to the repo. The /photos page reads them at build time
// (via getCollection-side helpers) and the EXIF popover shows the
// matching subset.
//
//   tsx scripts/extract-photo-exif.ts
//
// The companion workflow .github/workflows/photo-exif.yml triggers this
// on any change under src/content/photos/img/ and commits the
// regenerated sidecars back with [skip ci].

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import exifr from 'exifr';

const ROOT = resolve(process.cwd());
const IMG_DIR = join(ROOT, 'src/content/photos/img');
// Underscore prefix tells Astro to ignore this dir in the content
// collection (otherwise it'd treat the JSONs as data entries and
// conflict with the MDX content entries above).
const OUT_DIR = join(ROOT, 'src/content/photos/_exif');

// Photographically interesting fields. Anything not in this set is
// dropped, so the privacy story is allowlist-based, not blocklist-based.
// Adding a new field to expose? Add it here.
const SAFE_FIELDS = new Set([
  'Make',
  'Model',
  'LensModel',
  'LensMake',
  'FNumber',
  'ExposureTime',
  'ISO',
  'FocalLength',
  'FocalLengthIn35mmFormat',
  'DateTimeOriginal',
  'Flash',
  'WhiteBalance',
  'MeteringMode',
  'Orientation',          // useful for the renderer to know
  'PixelXDimension',      // image dimensions, no privacy risk
  'PixelYDimension',
  'ColorSpace',
]);

// Defensive blocklist — anything matching these patterns is dropped
// even if SAFE_FIELDS were widened by mistake. Belt and suspenders.
const BANNED_PATTERNS = [
  /^GPS/i,                // any GPS-prefixed field
  /Serial/i,              // BodySerialNumber, LensSerialNumber, etc.
  /OwnerName/i,
  /CameraOwnerName/i,
  /Artist/i,              // artist name field
  /Copyright/i,           // copyright field — keep your name out by default
  /UserComment/i,         // can carry arbitrary user text
];

function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|tiff?|heic|webp)$/i.test(name);
}

function slugFromFilename(name: string): string {
  return basename(name, extname(name))
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitize(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (BANNED_PATTERNS.some((re) => re.test(k))) continue;
    if (!SAFE_FIELDS.has(k)) continue;
    if (v === null || v === undefined) continue;
    // exifr returns Date objects for DateTimeOriginal — serialise to ISO.
    if (v instanceof Date) {
      out[k] = v.toISOString();
      continue;
    }
    out[k] = v;
  }
  return out;
}

if (!existsSync(IMG_DIR)) {
  console.log(`no photos directory at ${IMG_DIR}; nothing to do`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(IMG_DIR).filter(isImageFile);
let written = 0;
let skipped = 0;
const seen = new Set<string>();

for (const f of files) {
  const slug = slugFromFilename(f);
  const outPath = join(OUT_DIR, `${slug}.json`);
  const sourcePath = join(IMG_DIR, f);
  seen.add(`${slug}.json`);

  let raw: Record<string, unknown> | null = null;
  try {
    // `pick: SAFE_FIELDS` short-circuits unwanted parsing in exifr.
    // exifr's options type is overloaded; cast to keep TS happy.
    raw = (await exifr.parse(sourcePath, {
      tiff: true,
      exif: true,
      ifd0: true,
      pick: [...SAFE_FIELDS],
    } as unknown as Parameters<typeof exifr.parse>[1])) as Record<string, unknown> | null;
  } catch (err) {
    console.warn(`[${f}] exifr.parse failed: ${(err as Error).message}`);
  }

  const safe = raw ? sanitize(raw) : {};

  // Always write a sidecar (possibly with `{}`) so the renderer can tell
  // "EXIF was extracted but found nothing" vs "no extraction has run."
  writeFileSync(outPath, JSON.stringify(safe, null, 2) + '\n', 'utf8');
  written++;
}

// Detect (but don't delete) sidecars whose source images no longer
// exist. Stale sidecars don't hurt — they just get ignored by the
// renderer. Logged so the user notices and removes them by hand.
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.json')) continue;
    if (!seen.has(f)) skipped++;
  }
}

console.log(`processed ${files.length} images, wrote ${written} sidecars`);
if (skipped > 0) console.log(`(${skipped} stale sidecars left in place; remove manually if unwanted)`);
