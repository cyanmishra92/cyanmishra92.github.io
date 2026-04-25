// Photo helpers — EXIF sidecar loading, deterministic display-mode
// selection, formatting helpers used by /photos and the lightbox.

import type { CollectionEntry } from 'astro:content';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Photo = CollectionEntry<'photos'>;

/**
 * Privacy-safe EXIF subset. Mirrors SAFE_FIELDS in
 * scripts/extract-photo-exif.ts. Adding a field requires updating both.
 */
export interface PhotoExif {
  Make?: string;
  Model?: string;
  LensModel?: string;
  LensMake?: string;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  FocalLength?: number;
  FocalLengthIn35mmFormat?: number;
  DateTimeOriginal?: string;
  Flash?: number | string;
  WhiteBalance?: number | string;
  MeteringMode?: number | string;
  Orientation?: number;
  PixelXDimension?: number;
  PixelYDimension?: number;
  ColorSpace?: number;
}

// Underscore-prefixed dir so Astro's content collection ignores it
// (otherwise the JSON sidecars get mixed in as data-entries and
// conflict with the MDX content entries).
const EXIF_DIR = resolve(process.cwd(), 'src/content/photos/_exif');

/** Read the sidecar JSON for a photo slug. Returns {} if none found. */
export function loadExif(slug: string): PhotoExif {
  const path = resolve(EXIF_DIR, `${slug}.json`);
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PhotoExif;
  } catch {
    return {};
  }
}

/** Has any photographically-interesting EXIF field. */
export function hasExif(exif: PhotoExif): boolean {
  return Boolean(
    exif.Make || exif.Model || exif.LensModel ||
    exif.FNumber || exif.ExposureTime || exif.ISO ||
    exif.FocalLength || exif.DateTimeOriginal,
  );
}

// ─── display formatting ──────────────────────────────────────────────

export function formatAperture(f: number | undefined): string | null {
  if (typeof f !== 'number' || f <= 0) return null;
  // Trim trailing zeros for clean rendering (f/2 not f/2.0).
  return `ƒ/${Number(f.toFixed(1)).toString()}`;
}

export function formatShutter(s: number | undefined): string | null {
  if (typeof s !== 'number' || s <= 0) return null;
  if (s >= 1) return `${Number(s.toFixed(1))}s`;
  // sub-second exposures: 1/Nth.
  const denom = Math.round(1 / s);
  return `1/${denom}s`;
}

export function formatFocal(
  fl: number | undefined,
  fl35: number | undefined,
): string | null {
  if (typeof fl !== 'number' || fl <= 0) return null;
  const main = `${Math.round(fl)}mm`;
  if (typeof fl35 === 'number' && fl35 > 0 && Math.abs(fl35 - fl) > 1) {
    return `${main} (${Math.round(fl35)}mm equiv)`;
  }
  return main;
}

export function formatTaken(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return null;
  }
}

/** Camera body string — Make + Model, deduplicated when Model already
 *  starts with Make (Sony bodies often do). */
export function formatCamera(make: string | undefined, model: string | undefined): string | null {
  if (!model) return make ?? null;
  if (!make) return model;
  return model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`;
}

// ─── grid layout ────────────────────────────────────────────────────

/**
 * Stable hash → boolean. Picks ~1-in-5 photos for `displayMode: contain`
 * when the photo doesn't override via frontmatter. The deterministic
 * rotation breaks up the grid visually so it doesn't read as a uniform
 * Instagram square wall.
 */
export function shouldContainByHash(slug: string): boolean {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h) % 5 === 0;
}

export type EffectiveMode = 'cover' | 'contain' | 'tall';
export function effectiveDisplayMode(p: Photo): EffectiveMode {
  if (p.data.displayMode) return p.data.displayMode;
  return shouldContainByHash(p.slug) ? 'contain' : 'cover';
}

export interface YearGroup {
  year: number;
  photos: Photo[];
}

/** Group visible photos by year, descending. */
export function groupByYear(photos: Photo[]): YearGroup[] {
  const filtered = photos.filter((p) => p.data.visible);
  const map = new Map<number, Photo[]>();
  for (const p of filtered) {
    const y = p.data.date.getUTCFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(p);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      year,
      photos: list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    }));
}

/** Slug → unique short label like `Fig. 03` for sequential per-page index. */
export function figLabel(n: number): string {
  return `Fig. ${String(n).padStart(2, '0')}`;
}
