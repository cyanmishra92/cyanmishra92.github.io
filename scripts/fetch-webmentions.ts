/**
 * Build-time webmention fetcher. Pulls every webmention received for
 * cyanmishra92.github.io from webmention.io's domain-wide endpoint
 * and writes the result to .astro/webmentions-cache/all.json. The
 * blog post layout reads that file at render time.
 *
 * Fail-soft. If the API token isn't set or the call fails, we log a
 * warning and write an empty cache — the build keeps going. We never
 * want webmentions infrastructure to block a deployment.
 *
 * Usage: invoked automatically by `npm run build` (see package.json).
 */

import fs from 'node:fs';
import path from 'node:path';

const DOMAIN = 'cyanmishra92.github.io';
const CACHE_DIR = path.join(process.cwd(), '.astro', 'webmentions-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'all.json');
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function emptyFeed() {
  return { type: 'feed', name: 'Webmentions', children: [], 'wm-fetched': new Date().toISOString() };
}

function writeCache(payload: unknown) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
}

function freshEnough(): boolean {
  if (!fs.existsSync(CACHE_FILE)) return false;
  try {
    const stat = fs.statSync(CACHE_FILE);
    return Date.now() - stat.mtimeMs < TTL_MS;
  } catch {
    return false;
  }
}

async function main() {
  const token = process.env.WEBMENTION_IO_API_TOKEN;
  if (!token) {
    if (!fs.existsSync(CACHE_FILE)) {
      console.warn('[webmentions] WEBMENTION_IO_API_TOKEN not set; writing empty cache.');
      writeCache(emptyFeed());
    } else {
      console.warn('[webmentions] WEBMENTION_IO_API_TOKEN not set; keeping previous cache.');
    }
    return;
  }

  // Honor a recent cache so local dev builds don't spam the API.
  if (freshEnough() && process.env.WEBMENTIONS_FORCE !== '1') {
    console.log('[webmentions] cache is fresh; skipping fetch.');
    return;
  }

  // Page through all results — the API returns up to 100 per request.
  // We loop until a page returns fewer than `per-page` entries.
  const all: unknown[] = [];
  let page = 0;
  const perPage = 100;
  try {
    while (true) {
      const url =
        `https://webmention.io/api/mentions.jf2?domain=${DOMAIN}` +
        `&token=${encodeURIComponent(token)}` +
        `&per-page=${perPage}&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} on page ${page}`);
      }
      const json = (await res.json()) as { children?: unknown[] };
      const children = Array.isArray(json.children) ? json.children : [];
      all.push(...children);
      if (children.length < perPage) break;
      page += 1;
      if (page > 50) {
        // Safety stop — 5,000 mentions is well above our scale.
        console.warn('[webmentions] page cap hit; stopping early.');
        break;
      }
    }
  } catch (err) {
    console.warn(`[webmentions] fetch failed: ${(err as Error).message}; keeping empty/last cache.`);
    if (!fs.existsSync(CACHE_FILE)) writeCache(emptyFeed());
    return;
  }

  writeCache({
    type: 'feed',
    name: 'Webmentions',
    children: all,
    'wm-fetched': new Date().toISOString(),
  });
  console.log(`[webmentions] cached ${all.length} mention(s).`);
}

main().catch((err) => {
  console.warn(`[webmentions] unexpected error: ${(err as Error).message}`);
  if (!fs.existsSync(CACHE_FILE)) writeCache(emptyFeed());
});
