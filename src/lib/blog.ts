/**
 * Blog helpers — a single source of truth for lifecycle filtering, URL
 * derivation, and series grouping. Used by every /blog page and the
 * RSS feed so the rules stay in one place.
 */

import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;
export type BlogStatus = 'idea' | 'draft' | 'published' | 'archived';

/** Reverse-chronological by date. */
function byDateDesc(a: BlogEntry, b: BlogEntry): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

/** Posts visible on the public /blog/ index — published only. */
export async function publishedPosts(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return all.filter((p) => p.data.status === 'published').sort(byDateDesc);
}

/** Posts that survive on `/blog/<slug>/` URLs — published + archived. */
export async function postsByCanonicalUrl(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return all
    .filter((p) => p.data.status === 'published' || p.data.status === 'archived')
    .sort(byDateDesc);
}

/** Drafts — listed on /blog/drafts/, served at /blog/drafts/<slug>/. */
export async function draftPosts(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return all.filter((p) => p.data.status === 'draft').sort(byDateDesc);
}

/** Ideas — listed on /blog/ideas/, served at /blog/ideas/<slug>/. */
export async function ideaPosts(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return all.filter((p) => p.data.status === 'idea').sort(byDateDesc);
}

/** Full archive — published + archived, grouped by year for /blog/archive/. */
export async function archivePosts(): Promise<BlogEntry[]> {
  return postsByCanonicalUrl();
}

/**
 * URL prefix per status. Idea/draft live on noindex paths; published
 * and archived share the canonical `/blog/<slug>/` URL.
 */
export function postUrl(entry: BlogEntry): string {
  switch (entry.data.status) {
    case 'idea':
      return `/blog/ideas/${entry.slug}/`;
    case 'draft':
      return `/blog/drafts/${entry.slug}/`;
    case 'published':
    case 'archived':
    default:
      return `/blog/${entry.slug}/`;
  }
}

/** True if the URL should carry a noindex meta + be omitted from the sitemap. */
export function isNoindex(entry: BlogEntry): boolean {
  return entry.data.status === 'idea' || entry.data.status === 'draft';
}

/** Group posts by year (descending year, posts within each year by date desc). */
export function groupByYear(posts: BlogEntry[]): { year: number; posts: BlogEntry[] }[] {
  const map = new Map<number, BlogEntry[]>();
  for (const p of posts) {
    const y = p.data.date.getUTCFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(p);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, posts]) => ({ year, posts: posts.sort(byDateDesc) }));
}

/**
 * All series across the corpus, keyed by series.slug. Within each
 * series, parts are ordered by `series.part`. Used for the series
 * index page (which carries noindex if any part is non-public) and
 * the prev/next sibling cards on every post in the series.
 */
export async function seriesGroups(): Promise<
  { slug: string; name: string; total: number; parts: BlogEntry[]; allPublic: boolean }[]
> {
  const all = await getCollection('blog');
  const map = new Map<string, BlogEntry[]>();
  for (const p of all) {
    if (!p.data.series) continue;
    const key = p.data.series.slug;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()].map(([slug, parts]) => {
    parts.sort((a, b) => (a.data.series!.part - b.data.series!.part));
    const allPublic = parts.every(
      (p) => p.data.status === 'published' || p.data.status === 'archived',
    );
    return {
      slug,
      name: parts[0].data.series!.name,
      total: parts[0].data.series!.total,
      parts,
      allPublic,
    };
  });
}

/** Find the series sibling at `part = currentPart ± offset`. */
export function seriesSibling(
  group: { parts: BlogEntry[] },
  current: BlogEntry,
  offset: 1 | -1,
): BlogEntry | undefined {
  const idx = group.parts.findIndex((p) => p.slug === current.slug);
  if (idx === -1) return undefined;
  return group.parts[idx + offset];
}

/**
 * Related posts — selection algorithm: shared-tag-count × 2 + recency × 1.
 * Recency contribution is normalized: posts in the same year score 1,
 * older posts decay linearly toward 0.
 */
export function relatedPosts(current: BlogEntry, pool: BlogEntry[], n = 3): BlogEntry[] {
  const currentTags = new Set(current.data.tags);
  const currentYear = current.data.date.getUTCFullYear();

  type Scored = { entry: BlogEntry; score: number };
  const scored: Scored[] = [];
  for (const p of pool) {
    if (p.slug === current.slug) continue;
    if (p.data.status !== 'published') continue;
    const overlap = p.data.tags.filter((t) => currentTags.has(t)).length;
    const yearGap = Math.abs(currentYear - p.data.date.getUTCFullYear());
    const recency = Math.max(0, 1 - yearGap * 0.25);
    const score = overlap * 2 + recency;
    scored.push({ entry: p, score });
  }
  scored.sort((a, b) => b.score - a.score || b.entry.data.date.getTime() - a.entry.data.date.getTime());
  // If best score is 0 (no overlap, very old), fall back to most recent.
  return scored.slice(0, n).map((s) => s.entry);
}
