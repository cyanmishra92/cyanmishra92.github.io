// Citation drift detector.
//
// Once a week, compare each paper's citation count from
// src/data/citations-source.json against external sources (Semantic
// Scholar batch + OpenAlex DOI). When external counts have moved
// significantly, write a report to .github/state/citation-drift.json
// and (via the workflow) open or update a tracking issue so the user
// knows it's time for a manual Scholar sync.
//
// Drift threshold (both must hit, to avoid noise on low-cited papers):
//   external_max ≥ 1.2 × source_count   AND
//   |external_max - source_count| ≥ 3
//
// Source authority: external counts are NEVER written back into
// citations-source.json. Only the user does that, by editing the file
// in the GitHub web UI per docs/CITATIONS.md.
//
//   tsx scripts/citation-drift.ts

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { SITE } from '../src/lib/site';

interface PerPaper {
  citations: number;
  lastUpdated: string;
}
interface SourceFile {
  _source: string;
  _scholarUrl: string;
  _lastVerified: string;
  totals: { citations: number; hIndex: number; i10Index: number };
  perPaper: Record<string, PerPaper>;
}
interface Paper {
  id: string;
  title: string;
  arxivId?: string;
  doi?: string;
  status?: string;
}
interface DriftRow {
  id: string;
  title: string;
  source: number;
  externalMax: number;
  externalBy: Record<string, number | null>;
  delta: number;
  ratio: number;
}
interface DriftReport {
  lastRun: string;
  threshold: { ratio: number; absoluteDelta: number };
  totalPapers: number;
  drifted: DriftRow[];
  inSync: number;
  unknown: number;
  scholarUrl: string;
}

const ROOT = resolve(process.cwd());
const SOURCE = join(ROOT, 'src/data/citations-source.json');
const PUB_DIR = join(ROOT, 'src/content/publications');
const STATE = join(ROOT, '.github/state/citation-drift.json');

const RATIO = 1.2;
const ABS_DELTA = 3;
const SS_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;
const UA = 'cyanmishra92.github.io/citation-drift (mailto:cyanmishra92@gmail.com)';

function loadSource(): SourceFile {
  return JSON.parse(readFileSync(SOURCE, 'utf8'));
}

function loadPapers(): Paper[] {
  return readdirSync(PUB_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PUB_DIR, f), 'utf8')) as Paper);
}

function ssId(p: Paper): string | null {
  if (p.doi) return `DOI:${p.doi}`;
  if (p.arxivId) return `ARXIV:${p.arxivId}`;
  return null;
}

async function ssBatch(papers: Paper[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const eligible = papers.filter(ssId);
  if (eligible.length === 0) return out;
  const ids = eligible.map(ssId).filter((x): x is string => !!x);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SS_KEY) headers['x-api-key'] = SS_KEY;
  try {
    const res = await fetch(
      'https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount',
      { method: 'POST', headers, body: JSON.stringify({ ids }) },
    );
    if (!res.ok) {
      console.warn(`[ss-batch] HTTP ${res.status}`);
      return out;
    }
    const data = (await res.json()) as Array<{ citationCount?: number } | null>;
    eligible.forEach((p, i) => {
      const v = data[i]?.citationCount;
      if (typeof v === 'number') out.set(p.id, v);
    });
  } catch (err) {
    console.warn(`[ss-batch] failed: ${(err as Error).message}`);
  }
  return out;
}

async function oaByDoi(p: Paper): Promise<number | null> {
  if (!p.doi) return null;
  try {
    const res = await fetch(
      `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(p.doi)}?select=cited_by_count`,
      { headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { cited_by_count?: number };
    return typeof body.cited_by_count === 'number' ? body.cited_by_count : null;
  } catch {
    return null;
  }
}

async function oaAuthorWorks(authorId: string): Promise<Map<string, number>> {
  // When SITE.openAlexAuthorId is set, pull the entire author's works
  // page in one shot and key by DOI / arXiv ID. More accurate than
  // per-paper title search.
  const out = new Map<string, number>();
  let cursor = '*';
  for (let page = 0; page < 5; page++) {
    try {
      const url = `https://api.openalex.org/authors/${encodeURIComponent(authorId)}/works?per-page=200&select=ids,doi,cited_by_count&cursor=${encodeURIComponent(cursor)}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) break;
      const body = (await res.json()) as {
        results?: Array<{ doi?: string | null; ids?: { doi?: string }; cited_by_count?: number }>;
        meta?: { next_cursor?: string };
      };
      const rows = body.results ?? [];
      for (const r of rows) {
        const doi = r.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//, '') ?? r.ids?.doi;
        if (doi && typeof r.cited_by_count === 'number') {
          out.set(`DOI:${doi}`, r.cited_by_count);
        }
      }
      const next = body.meta?.next_cursor;
      if (!next || rows.length < 200) break;
      cursor = next;
    } catch {
      break;
    }
  }
  return out;
}

async function main() {
  const source = loadSource();
  const papers = loadPapers();
  console.log(`drift check: ${papers.length} papers vs ${source._source}`);

  // 1. Pull all external counts (S2 batch + OpenAlex DOI + optional
  //    OpenAlex author).
  const fromSS = await ssBatch(papers);
  console.log(`[ss-batch] resolved ${fromSS.size} papers`);

  const oaAuthorMap =
    SITE.openAlexAuthorId !== undefined
      ? await oaAuthorWorks(SITE.openAlexAuthorId)
      : new Map<string, number>();
  if (oaAuthorMap.size > 0) console.log(`[oa-author] resolved ${oaAuthorMap.size} works`);

  const fromOaDoi = new Map<string, number>();
  for (const p of papers) {
    const v = await oaByDoi(p);
    if (typeof v === 'number') fromOaDoi.set(p.id, v);
    await new Promise((r) => setTimeout(r, 220));
  }
  console.log(`[oa-doi] resolved ${fromOaDoi.size} papers`);

  // 2. Per paper: take the max external value across sources, compare
  //    to the source-of-truth count, flag if it exceeds the drift
  //    threshold.
  const drifted: DriftRow[] = [];
  let inSync = 0;
  let unknown = 0;
  for (const p of papers) {
    const sourceCount = source.perPaper[p.id]?.citations ?? 0;
    const ssVal = fromSS.get(p.id);
    const oaDoiVal = fromOaDoi.get(p.id);
    const oaAuthorVal = p.doi ? oaAuthorMap.get(`DOI:${p.doi}`) : undefined;
    const externalBy: DriftRow['externalBy'] = {
      'semantic-scholar': ssVal ?? null,
      'openalex-doi': oaDoiVal ?? null,
      'openalex-author': oaAuthorVal ?? null,
    };
    const externalValues = [ssVal, oaDoiVal, oaAuthorVal].filter(
      (x): x is number => typeof x === 'number',
    );
    if (externalValues.length === 0) {
      unknown++;
      continue;
    }
    const externalMax = Math.max(...externalValues);
    const delta = externalMax - sourceCount;
    const ratio = sourceCount === 0 ? (externalMax > 0 ? Infinity : 1) : externalMax / sourceCount;
    if (ratio >= RATIO && Math.abs(delta) >= ABS_DELTA) {
      drifted.push({
        id: p.id,
        title: p.title,
        source: sourceCount,
        externalMax,
        externalBy,
        delta,
        ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : 999,
      });
    } else {
      inSync++;
    }
  }
  drifted.sort((a, b) => b.delta - a.delta);

  const report: DriftReport = {
    lastRun: new Date().toISOString(),
    threshold: { ratio: RATIO, absoluteDelta: ABS_DELTA },
    totalPapers: papers.length,
    drifted,
    inSync,
    unknown,
    scholarUrl: source._scholarUrl,
  };

  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(`\nwrote ${STATE}`);
  console.log(`  drifted = ${drifted.length}`);
  console.log(`  in sync = ${inSync}`);
  console.log(`  unknown = ${unknown}`);
  if (drifted.length > 0) {
    console.log('\ndrift report:');
    drifted.forEach((d) => {
      console.log(`  ${d.id}: source=${d.source} external=${d.externalMax} (Δ${d.delta >= 0 ? '+' : ''}${d.delta}, ${d.ratio}×)`);
    });
  }

  // For the workflow to read.
  if (process.env.GITHUB_OUTPUT) {
    const out = process.env.GITHUB_OUTPUT;
    const lines = [
      `drifted_count=${drifted.length}`,
      `in_sync_count=${inSync}`,
      `unknown_count=${unknown}`,
    ].join('\n') + '\n';
    writeFileSync(out, lines, { flag: 'a' });
  }
}

if (!existsSync(SOURCE)) {
  console.error(`source file not found: ${SOURCE}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
