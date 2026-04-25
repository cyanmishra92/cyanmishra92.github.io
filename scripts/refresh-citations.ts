/**
 * Refresh per-paper citation counts.
 *
 * Strategy (in order, each step adds the rows that resolved):
 *   1. Semantic Scholar BATCH endpoint — one HTTP request for all
 *      papers with a DOI or arXiv ID. Survives the public-endpoint
 *      rate limits the per-paper variant ran into.
 *   2. OpenAlex per-paper fallback — used for papers Semantic Scholar
 *      didn't return (returned null, missed the batch, etc.).
 *   3. Title-based OpenAlex search — last-ditch for papers without a
 *      DOI or arXiv ID. We accept the top hit only when its title is a
 *      strong fuzzy match against ours.
 *   4. Manual overrides (src/data/manual-citations.json) — always wins,
 *      applied last. Useful for papers without any persistent ID.
 *
 * Robust to API hiccups: any source that fails for a paper is skipped
 * and the previous value (if any) is preserved. We never zero out a
 * value just because the network blipped.
 *
 * Usage:
 *   tsx scripts/refresh-citations.ts
 *   SEMANTIC_SCHOLAR_API_KEY=xxx tsx scripts/refresh-citations.ts
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const PUB_DIR = join(ROOT, 'src/content/publications');
const OUT_DIR = join(ROOT, 'public/data');
const OUT_FILE = join(OUT_DIR, 'citations.json');
const MANUAL_FILE = join(ROOT, 'src/data/manual-citations.json');

interface Paper {
  id: string;
  title: string;
  arxivId?: string;
  doi?: string;
  authors?: string[];
  year?: number;
}

interface CitationsFile {
  totalCitations: number;
  hIndex: number;
  perPaper: Record<string, number>;
  /** Per-paper provenance — which API source produced each count. */
  sources: Record<string, 'semantic-scholar' | 'openalex' | 'openalex-title' | 'manual' | 'previous' | 'zero'>;
  lastUpdated: string;
}

function loadPapers(): Paper[] {
  return readdirSync(PUB_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PUB_DIR, f), 'utf8')) as Paper);
}

function loadPrevious(): CitationsFile | null {
  if (!existsSync(OUT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function loadManualOverrides(): Record<string, number> {
  if (!existsSync(MANUAL_FILE)) return {};
  try {
    return JSON.parse(readFileSync(MANUAL_FILE, 'utf8'));
  } catch {
    return {};
  }
}

const SS_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;
const SS_HEADERS: Record<string, string> = { Accept: 'application/json' };
if (SS_KEY) SS_HEADERS['x-api-key'] = SS_KEY;

const UA = 'cyanmishra92.github.io/refresh-citations (mailto:cyanmishra92@gmail.com)';

function papersWithIdentifier(papers: Paper[]): Paper[] {
  return papers.filter((p) => p.doi || p.arxivId);
}

function semanticScholarId(p: Paper): string | null {
  if (p.doi) return `DOI:${p.doi}`;
  if (p.arxivId) return `ARXIV:${p.arxivId}`;
  return null;
}

async function ssBatch(
  papers: Paper[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const eligible = papersWithIdentifier(papers);
  if (eligible.length === 0) return out;

  // Batch endpoint accepts up to 500 IDs per request; we have ~25.
  const ids = eligible.map(semanticScholarId).filter((x): x is string => !!x);
  const body = JSON.stringify({ ids });

  try {
    const res = await fetch(
      'https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount',
      {
        method: 'POST',
        headers: { ...SS_HEADERS, 'Content-Type': 'application/json' },
        body,
      },
    );
    if (!res.ok) {
      console.warn(`[ss-batch] HTTP ${res.status} — falling through to per-paper sources`);
      return out;
    }
    const data = (await res.json()) as Array<{ paperId?: string; citationCount?: number } | null>;
    eligible.forEach((p, i) => {
      const row = data[i];
      if (row && typeof row.citationCount === 'number') {
        out.set(p.id, row.citationCount);
      }
    });
    console.log(`[ss-batch] resolved ${out.size}/${eligible.length} via Semantic Scholar`);
  } catch (err) {
    console.warn(`[ss-batch] failed: ${(err as Error).message}`);
  }
  return out;
}

async function oaByDoi(p: Paper): Promise<number | null> {
  if (!p.doi) return null;
  const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(p.doi)}?select=cited_by_count`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const body = (await res.json()) as { cited_by_count?: number };
    return typeof body.cited_by_count === 'number' ? body.cited_by_count : null;
  } catch {
    return null;
  }
}

async function oaByTitle(p: Paper): Promise<number | null> {
  // Last-ditch: title search. Only accept the top hit when its title is
  // a strong match against ours (Jaccard over normalised tokens >= 0.7).
  const q = encodeURIComponent(p.title);
  const url = `https://api.openalex.org/works?search=${q}&per-page=3&select=id,display_name,publication_year,cited_by_count`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      results?: Array<{ display_name?: string; publication_year?: number; cited_by_count?: number }>;
    };
    const hits = body.results ?? [];
    for (const hit of hits) {
      if (!hit.display_name || typeof hit.cited_by_count !== 'number') continue;
      // Year must be close (paper might be in-press / preprint vs final).
      if (p.year && hit.publication_year && Math.abs(p.year - hit.publication_year) > 1) continue;
      const sim = jaccard(normalise(p.title), normalise(hit.display_name));
      if (sim >= 0.7) return hit.cited_by_count;
    }
    return null;
  } catch {
    return null;
  }
}

function normalise(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function hIndexFrom(counts: number[]): number {
  const sorted = [...counts].sort((a, b) => b - a);
  let h = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}

async function main() {
  const papers = loadPapers();
  const previous = loadPrevious();
  const manual = loadManualOverrides();
  const perPaper: Record<string, number> = {};
  const sources: CitationsFile['sources'] = {};

  console.log(`refreshing citations for ${papers.length} papers`);

  // 1. Semantic Scholar batch.
  const fromSS = await ssBatch(papers);

  // 2. OpenAlex by DOI for any S2 misses, throttled to 5 rps.
  const need = papers.filter((p) => !fromSS.has(p.id));
  let oaResolved = 0;
  for (const p of need) {
    const v = await oaByDoi(p);
    if (typeof v === 'number') {
      fromSS.set(p.id, v);
      sources[p.id] = 'openalex';
      oaResolved++;
    }
    await new Promise((r) => setTimeout(r, 220));
  }
  console.log(`[openalex-doi] resolved ${oaResolved} additional`);

  // 3. OpenAlex title search for the rest, same throttle.
  const stillMissing = papers.filter((p) => !fromSS.has(p.id));
  let titleResolved = 0;
  for (const p of stillMissing) {
    const v = await oaByTitle(p);
    if (typeof v === 'number') {
      fromSS.set(p.id, v);
      sources[p.id] = 'openalex-title';
      titleResolved++;
    }
    await new Promise((r) => setTimeout(r, 220));
  }
  console.log(`[openalex-title] resolved ${titleResolved} additional`);

  // 4. Manual overrides + previous-value preservation + final assembly.
  for (const p of papers) {
    if (typeof manual[p.id] === 'number') {
      perPaper[p.id] = manual[p.id];
      sources[p.id] = 'manual';
      continue;
    }
    if (fromSS.has(p.id)) {
      perPaper[p.id] = fromSS.get(p.id)!;
      sources[p.id] ??= 'semantic-scholar';
      continue;
    }
    if (previous?.perPaper?.[p.id] !== undefined) {
      perPaper[p.id] = previous.perPaper[p.id];
      sources[p.id] = 'previous';
      continue;
    }
    perPaper[p.id] = 0;
    sources[p.id] = 'zero';
  }

  const counts = Object.values(perPaper);
  const out: CitationsFile = {
    totalCitations: counts.reduce((a, b) => a + b, 0),
    hIndex: hIndexFrom(counts),
    perPaper,
    sources,
    lastUpdated: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${OUT_FILE}`);
  console.log(`  totalCitations = ${out.totalCitations}`);
  console.log(`  hIndex         = ${out.hIndex}`);

  // Provenance breakdown.
  const counts_by_source: Record<string, number> = {};
  for (const s of Object.values(sources)) counts_by_source[s] = (counts_by_source[s] ?? 0) + 1;
  console.log(`  sources        =`, counts_by_source);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
