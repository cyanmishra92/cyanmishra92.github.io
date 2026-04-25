import type { CollectionEntry } from 'astro:content';

export type Paper = CollectionEntry<'publications'>['data'];

/**
 * Top-tier venues that get the accent color tag treatment.
 * Everything else gets the muted variant.
 */
export const TOP_VENUES = new Set([
  'ISCA', 'MICRO', 'HPCA', 'ICLR', 'NSDI', 'PACT', 'IPDPS', 'DATE',
  'ICDCS', 'SoCC', 'NAS',
]);

export const VENUE_TYPE_LABELS: Record<Paper['type'], string> = {
  conference: 'Conference',
  journal: 'Journal',
  arxiv: 'arXiv',
  'under-review': 'Under Review',
  workshop: 'Workshop',
};

/** Sort comparator: status > year-desc > venue-tier > title. */
export function compare(a: Paper, b: Paper): number {
  // Under-review papers float to the top.
  const statusOrder = (s: Paper['status']) =>
    s === 'under-review' ? 0 : s === 'to-appear' ? 1 : 2;
  const sa = statusOrder(a.status);
  const sb = statusOrder(b.status);
  if (sa !== sb) return sa - sb;
  if (a.year !== b.year) return b.year - a.year;
  // Top venues first within a year.
  const ta = TOP_VENUES.has(a.venue) ? 0 : 1;
  const tb = TOP_VENUES.has(b.venue) ? 0 : 1;
  if (ta !== tb) return ta - tb;
  return a.title.localeCompare(b.title);
}

/**
 * Group papers under display headings:
 *   - "Under Review" first
 *   - Then by year, descending
 */
export interface PaperGroup {
  heading: string;
  papers: Paper[];
}

export function groupPapers(papers: Paper[]): PaperGroup[] {
  const sorted = [...papers].sort(compare);
  const underReview = sorted.filter((p) => p.status === 'under-review');
  const byYear: Map<number, Paper[]> = new Map();
  for (const p of sorted.filter((p) => p.status !== 'under-review')) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p);
  }
  const groups: PaperGroup[] = [];
  if (underReview.length) groups.push({ heading: 'Under Review', papers: underReview });
  for (const [year, papers] of [...byYear.entries()].sort((a, b) => b[0] - a[0])) {
    groups.push({ heading: String(year), papers });
  }
  return groups;
}

/**
 * Index used by the filter/search island. Trims to only fields needed
 * client-side and pre-formats authors for fuzzy search.
 */
export interface PaperIndexEntry {
  id: string;
  title: string;
  authorString: string;
  year: number;
  venue: string;
  type: Paper['type'];
  topics: string[];
}

export function buildIndex(papers: Paper[]): PaperIndexEntry[] {
  return papers.map((p) => ({
    id: p.id,
    title: p.title,
    authorString: p.authors.join(', '),
    year: p.year,
    venue: p.venue,
    type: p.type,
    topics: p.topics,
  }));
}
