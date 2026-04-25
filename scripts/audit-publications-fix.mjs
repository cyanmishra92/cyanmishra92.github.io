// Apply Phase 7.6.3 audit fixes to publication JSON files.
// Idempotent — safe to re-run.
//
//   node scripts/audit-publications-fix.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve(process.cwd(), 'src/content/publications');

// 1. Status updates: 2025 conferences are now in the past (today: 2026-04-25).
//    PACT 2025 (Sep), ICLR 2025 (Apr-May), IPDPS 2025 (May-Jun) all done.
const STATUS_UPDATES = {
  'salient-store-pact-2025': 'published',
  'nexume-iclr-2025': 'published',
  'cord-ipdps-2025': 'published',
};

// 2. Related-paper links: arXiv preprint ↔ conference version pairs.
const RELATED = {
  'nexume-arxiv': ['nexume-iclr-2025'],
  'nexume-iclr-2025': ['nexume-arxiv'],
  'salient-store-arxiv': ['salient-store-pact-2025'],
  'salient-store-pact-2025': ['salient-store-arxiv'],
};

function lastNameSlug(authors, myIndex) {
  // First-author last name in lowercase, no diacritics, no spaces.
  const first = authors[0] ?? authors[myIndex] ?? 'paper';
  const last = first.split(' ').slice(-1)[0];
  return last
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z]/g, '');
}

function bibtexFor(d) {
  const isArxiv = d.type === 'arxiv';
  const isJournal = d.type === 'journal';
  const isUnderReview = d.type === 'under-review';
  const tex = isArxiv
    ? '@article'
    : isJournal
      ? '@article'
      : isUnderReview
        ? '@unpublished'
        : '@inproceedings';

  // `lastnameYEARkeyword` per spec. Keyword is a short slug derived from id.
  const keyword = d.id
    .replace(/-(\d{4})$/, '')
    .replace(/-arxiv$/, '')
    .replace(/[^a-z]/g, '')
    .slice(0, 12);
  const key = `${lastNameSlug(d.authors, d.myAuthorIndex)}${d.year}${keyword}`;

  // BibTeX prefers "Last, First and Last, First" format for proper sorting.
  const authors = d.authors
    .map((a) => {
      const parts = a.split(' ');
      const last = parts.slice(-1)[0];
      const first = parts.slice(0, -1).join(' ');
      return first ? `${last}, ${first}` : last;
    })
    .join(' and ');

  const fields = [
    `  title     = {${d.title}},`,
    `  author    = {${authors}},`,
  ];
  if (isArxiv) {
    fields.push(`  journal   = {arXiv preprint arXiv:${d.arxivId}},`);
    fields.push(`  year      = {${d.year}},`);
    if (d.arxivId) fields.push(`  eprint    = {${d.arxivId}},`);
    fields.push(`  archivePrefix = {arXiv},`);
  } else if (isJournal) {
    fields.push(`  journal   = {${d.venueFull}},`);
    fields.push(`  year      = {${d.year}},`);
    if (d.doi) fields.push(`  doi       = {${d.doi}},`);
  } else if (isUnderReview) {
    fields.push(`  note      = {Manuscript under review},`);
    fields.push(`  year      = {${d.year}},`);
  } else {
    fields.push(`  booktitle = {${d.venueFull}},`);
    if (d.pages) fields.push(`  pages     = {${d.pages}},`);
    fields.push(`  year      = {${d.year}},`);
    if (d.publisher) fields.push(`  publisher = {${d.publisher}},`);
    else if (d.venue === 'NSDI') fields.push(`  publisher = {USENIX Association},`);
    else if (d.venue === 'WoSC' || d.venue === 'SoCC') fields.push(`  publisher = {ACM},`);
    else fields.push(`  publisher = {IEEE},`);
    if (d.doi) fields.push(`  doi       = {${d.doi}},`);
  }
  if (d.awards?.includes('Best Paper Nominee')) {
    fields.push(`  note      = {Best Paper Nominee},`);
  }
  return `${tex}{${key},\n${fields.join('\n')}\n}`;
}

// Carry forward any pages/publisher from the existing bibtex string so we
// don't lose information that was authored once.
function extractPagesPublisher(b) {
  const out = {};
  let m = b.match(/pages\s*=\s*\{([^}]+)\}/);
  if (m) out.pages = m[1];
  m = b.match(/publisher\s*=\s*\{([^}]+)\}/);
  if (m && !/^IEEE$/.test(m[1])) out.publisher = m[1]; // only carry non-default
  return out;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const summary = [];
for (const f of files) {
  const path = join(DIR, f);
  const before = readFileSync(path, 'utf8');
  const d = JSON.parse(before);
  const changes = [];

  if (STATUS_UPDATES[d.id] && d.status !== STATUS_UPDATES[d.id]) {
    d.status = STATUS_UPDATES[d.id];
    changes.push(`status → ${d.status}`);
  }

  if (RELATED[d.id]) {
    const want = RELATED[d.id];
    const have = d.relatedPaperIds ?? [];
    if (want.some((id) => !have.includes(id)) || have.length !== want.length) {
      d.relatedPaperIds = want;
      changes.push(`relatedPaperIds → [${want.join(', ')}]`);
    }
  } else if (!d.relatedPaperIds) {
    d.relatedPaperIds = [];
  }

  // Always rebuild bibtex from canonical fields.
  const carry = extractPagesPublisher(d.bibtex);
  Object.assign(d, carry);
  const newBib = bibtexFor(d);
  delete d.pages;
  delete d.publisher;
  if (d.bibtex !== newBib) {
    d.bibtex = newBib;
    changes.push('bibtex → regenerated');
  }

  // Stable field order for diffs. The whitelist below covers every
  // optional and required field defined in the publications schema —
  // adding a new schema field requires adding it here too, otherwise
  // the script silently drops it on the next run.
  //
  // The trailing pass-through guarantees we never lose data even if
  // a field exists in the JSON that isn't yet known to this script:
  // anything not in the whitelist is appended at the end, sorted by
  // key, with a console warning so the omission is caught.
  const SCHEMA_FIELDS = [
    'id', 'title', 'authors', 'myAuthorIndex',
    'year', 'venue', 'venueFull', 'type', 'status',
    'doi', 'arxivId', 'pdfUrl', 'codeUrl', 'slidesUrl', 'videoUrl',
    'awards', 'topics',
    'abstract', 'citations', 'citationKey',
    'relatedPaperIds',
    'bibtex',
  ];

  const ordered = {};
  for (const k of SCHEMA_FIELDS) {
    if (k in d) {
      // Keep optional empty arrays / falsy strings out of the output
      // unless they're a default we want to ship explicitly.
      if (k === 'awards' && (!d[k] || d[k].length === 0)) continue;
      if (typeof d[k] === 'string' && d[k] === '') continue;
      ordered[k] = d[k];
    }
  }

  // Fail-safe: any unknown key in the source JSON is preserved at the
  // tail (sorted) and logged so the next person notices and updates
  // SCHEMA_FIELDS.
  const stray = Object.keys(d).filter((k) => !SCHEMA_FIELDS.includes(k)).sort();
  for (const k of stray) {
    ordered[k] = d[k];
    console.warn(`  ⚠ ${d.id}: unknown field "${k}" preserved at tail; add it to SCHEMA_FIELDS`);
  }

  const next = JSON.stringify(ordered, null, 2) + '\n';
  if (next !== before) {
    writeFileSync(path, next);
    summary.push(`${d.id}: ${changes.join(', ') || 'reordered fields'}`);
  }
}

console.log(`processed ${files.length} files`);
console.log(`changed ${summary.length}:`);
summary.forEach((s) => console.log('  ' + s));
