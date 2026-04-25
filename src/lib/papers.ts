import type { CollectionEntry } from 'astro:content';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

/**
 * Citation overlay — reads `src/data/citations-source.json` (the
 * single hand-curated source-of-truth, mirrored from Google Scholar
 * and edited via the GitHub web UI per docs/CITATIONS.md).
 *
 * Returns null if the file is missing/malformed; in that case the
 * stats strip shows em-dashes and PaperItem hides "cited by N".
 */
export interface CitationsSource {
  _source: string;
  _scholarUrl: string;
  /** Date the user last manually verified against Scholar (YYYY-MM-DD). */
  _lastVerified: string;
  totals: {
    citations: number;
    hIndex: number;
    i10Index: number;
  };
  perPaper: Record<string, { citations: number; lastUpdated: string }>;
}

let _source: CitationsSource | null | undefined = undefined;

export function loadCitations(): CitationsSource | null {
  if (_source !== undefined) return _source;
  // CWD-relative — works in both `astro dev` and the bundled `astro build`
  // SSR context (where import.meta.url resolves to a chunk path inside
  // .astro/ rather than the source tree).
  const path = resolve(process.cwd(), 'src/data/citations-source.json');
  if (!existsSync(path)) {
    _source = null;
    return null;
  }
  try {
    _source = JSON.parse(readFileSync(path, 'utf8')) as CitationsSource;
    return _source;
  } catch {
    _source = null;
    return null;
  }
}

/**
 * Merge per-paper counts onto Paper objects. Under-review and to-appear
 * papers do NOT get a count merged — they should render with no
 * "cited by N" line, not "cited by 0" (which is misleading and noisy).
 */
export function withCitations(papers: Paper[]): Paper[] {
  const source = loadCitations();
  if (!source) return papers;
  return papers.map((p) => {
    if (p.status === 'under-review' || p.status === 'to-appear') return p;
    const entry = source.perPaper[p.id];
    return entry ? { ...p, citations: entry.citations } : p;
  });
}

/**
 * Last-run timestamp from .github/state/citation-drift.json, written by
 * the weekly drift detector. Used by the home stats caption to show
 * "Drift checked YYYY-MM-DD". Returns null when the file doesn't exist
 * yet (first run), in which case the caption omits the drift date.
 */
export function loadDriftTimestamp(): string | null {
  const path = resolve(process.cwd(), '.github/state/citation-drift.json');
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { lastRun?: string };
    if (!raw.lastRun) return null;
    return new Date(raw.lastRun).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

