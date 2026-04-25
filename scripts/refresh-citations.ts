/**
 * Refresh per-paper citation counts from the Semantic Scholar Graph API,
 * compute h-index and totalCitations, and write public/data/citations.json.
 *
 * Usage:
 *   tsx scripts/refresh-citations.ts
 *
 * The job is idempotent. If Semantic Scholar rate-limits or 5xx's, we
 * keep the previous value for that paper rather than zeroing it out.
 *
 * Manual overrides live in src/data/manual-citations.json — useful for
 * papers without a DOI or arXiv ID. Manual entries take precedence over
 * any value the API returns.
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
}

interface CitationsFile {
  totalCitations: number;
  hIndex: number;
  perPaper: Record<string, number>;
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

async function fetchCitationCount(paper: Paper): Promise<number | null> {
  // Prefer DOI, fall back to arXiv. If neither, skip.
  const id = paper.doi
    ? `DOI:${paper.doi}`
    : paper.arxivId
      ? `arXiv:${paper.arxivId}`
      : null;
  if (!id) return null;

  const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(id)}?fields=citationCount`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[${paper.id}] HTTP ${res.status} — keeping previous value`);
      return null;
    }
    const body = (await res.json()) as { citationCount?: number };
    return typeof body.citationCount === 'number' ? body.citationCount : null;
  } catch (err) {
    console.warn(`[${paper.id}] fetch failed: ${(err as Error).message}`);
    return null;
  }
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

  console.log(`refreshing citations for ${papers.length} papers`);

  for (const paper of papers) {
    if (typeof manual[paper.id] === 'number') {
      perPaper[paper.id] = manual[paper.id];
      console.log(`[${paper.id}] manual override = ${manual[paper.id]}`);
      continue;
    }
    const fresh = await fetchCitationCount(paper);
    if (fresh !== null) {
      perPaper[paper.id] = fresh;
      console.log(`[${paper.id}] api = ${fresh}`);
    } else if (previous?.perPaper?.[paper.id] !== undefined) {
      perPaper[paper.id] = previous.perPaper[paper.id];
      console.log(`[${paper.id}] kept previous = ${perPaper[paper.id]}`);
    } else {
      perPaper[paper.id] = 0;
    }
    // Be polite — Semantic Scholar's public endpoint allows 1 req/sec.
    await new Promise((r) => setTimeout(r, 1100));
  }

  const counts = Object.values(perPaper);
  const out: CitationsFile = {
    totalCitations: counts.reduce((a, b) => a + b, 0),
    hIndex: hIndexFrom(counts),
    perPaper,
    lastUpdated: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${OUT_FILE}`);
  console.log(`  totalCitations = ${out.totalCitations}`);
  console.log(`  hIndex         = ${out.hIndex}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
