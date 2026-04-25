import type { CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;
export type BlogEntry = CollectionEntry<'blog'>;

/** ISO YYYY-MM-DD; safe for `<time datetime=...>` */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Pretty date for display, e.g. "2026 · Jan 15" */
export function prettyDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCFullYear()} · ${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** "2026 · Jan" — used when only month-precision is reliable. */
export function approximateDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCFullYear()} · ${months[d.getUTCMonth()]}`;
}

export function compareNews(a: NewsEntry, b: NewsEntry): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

export function compareBlog(a: BlogEntry, b: BlogEntry): number {
  return b.data.date.getTime() - a.data.date.getTime();
}
