// Optimise photo source files for the repo.
//
// For each image in src/content/photos/img/:
//   - If long edge > 2400px, downscale to 2400px max long edge.
//   - Strip ALL EXIF metadata from the JPEG itself. The privacy-safe
//     subset already lives in the sidecar JSON written by
//     scripts/extract-photo-exif.ts; the JPEG itself doesn't need to
//     carry any of it (and especially shouldn't carry GPS, even when
//     the source camera embedded it).
//   - Re-encode JPEG at quality 85, mozjpeg progressive.
//   - Convert HEIC/HEIF/WebP/PNG sources to JPEG (Astro Image still
//     generates AVIF/WebP variants for the web — this step just keeps
//     the in-repo source in one consistent format).
//
// Idempotent: a file already at ≤2400px with no EXIF won't change.
// The companion workflow .github/workflows/photo-optim.yml triggers
// this on changes under src/content/photos/img/ and commits back with
// [skip ci].
//
//   tsx scripts/optimize-photos.ts

import { readdirSync, statSync, renameSync, existsSync } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(process.cwd());
const IMG_DIR = join(ROOT, 'src/content/photos/img');
const MAX_EDGE = 2400;
const JPEG_Q = 85;

if (!existsSync(IMG_DIR)) {
  console.log(`no photos directory at ${IMG_DIR}; nothing to do`);
  process.exit(0);
}

function isOptimizable(name: string): boolean {
  return /\.(jpe?g|png|tiff?|heic|heif|webp)$/i.test(name);
}

const files = readdirSync(IMG_DIR).filter(isOptimizable);
let touched = 0;
let skipped = 0;
let renamed = 0;

for (const f of files) {
  const path = join(IMG_DIR, f);
  const ext = extname(f).toLowerCase();
  const stem = basename(f, ext);
  const finalPath = join(IMG_DIR, `${stem}.jpg`);

  // Decide if we need to do anything: probe the image.
  let img = sharp(path, { failOn: 'truncated' });
  let meta: sharp.Metadata;
  try {
    meta = await img.metadata();
  } catch (err) {
    console.warn(`[${f}] could not read metadata: ${(err as Error).message}`);
    continue;
  }

  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  const needsDownscale = longEdge > MAX_EDGE;
  const needsReencode =
    !['jpeg', 'jpg'].includes(meta.format ?? '') ||
    !!(meta.exif || meta.iptc || meta.xmp);

  // Even when neither downscale nor reencode flag fires, if the source
  // is a non-JPEG format we want it converted for consistency.
  const isJpeg = meta.format === 'jpeg';

  if (!needsDownscale && !needsReencode && isJpeg && ext === '.jpg') {
    skipped++;
    continue;
  }

  // Build the pipeline. Note: by default sharp drops metadata unless
  // .withMetadata() is called — exactly what we want for privacy.
  let pipeline = img.rotate(); // honor EXIF orientation, then strip
  if (needsDownscale) {
    if ((meta.width ?? 0) >= (meta.height ?? 0)) {
      pipeline = pipeline.resize({ width: MAX_EDGE, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: MAX_EDGE, withoutEnlargement: true });
    }
  }
  pipeline = pipeline.jpeg({ quality: JPEG_Q, mozjpeg: true, progressive: true });

  // Write to a temp path then rename, so a partial write doesn't corrupt
  // the source. Sharp can't write back to the file it's reading from.
  const tmpPath = path + '.tmp.jpg';
  await pipeline.toFile(tmpPath);

  // Replace the source with the optimised version. If the extension is
  // changing (HEIC → JPG), remove the original and rename the temp.
  if (path === finalPath) {
    renameSync(tmpPath, finalPath);
  } else {
    // Different extension — drop the original source.
    renameSync(tmpPath, finalPath);
    if (existsSync(path) && path !== finalPath) {
      // Use unlinkSync via fs to remove old format file.
      const { unlinkSync } = await import('node:fs');
      unlinkSync(path);
      renamed++;
    }
  }

  const before = statSync(path === finalPath ? finalPath : finalPath).size;
  console.log(
    `[${f}] ${needsDownscale ? 'downscaled ' : ''}${needsReencode ? 'reencoded ' : ''}` +
      `${path !== finalPath ? `(→ ${basename(finalPath)}) ` : ''}` +
      `(${(before / 1024).toFixed(0)} KB)`,
  );
  touched++;
}

console.log(`processed ${files.length} images: ${touched} touched, ${skipped} already optimal, ${renamed} renamed`);
