// Auto-stamp dates in src/data/citations-source.json after a manual edit.
//
// Workflow contract:
//   - Triggered by .github/workflows/citations-stamp.yml on push to main
//     when the source file changes.
//   - For every perPaper entry whose `citations` value differs from
//     HEAD~1, this script updates that entry's `lastUpdated` to today.
//   - Always updates the file-level `_lastVerified` to today.
//   - If the resulting JSON differs from what's on disk, writes it back.
//     The workflow then commits with `[skip ci]` and pushes.
//
// Idempotent: a no-op run leaves the file untouched. Date format: ISO
// YYYY-MM-DD in UTC, matching what a human would type.
//
//   tsx scripts/citations-stamp.ts

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

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

const FILE = resolve(process.cwd(), 'src/data/citations-source.json');
const REL = 'src/data/citations-source.json';

if (!existsSync(FILE)) {
  console.error(`citations source not found at ${FILE}`);
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const current = JSON.parse(readFileSync(FILE, 'utf8')) as SourceFile;

// Best-effort: pull the previous version of the file from HEAD~1 so we
// can diff per-paper counts. If unavailable (first commit, shallow
// clone), assume everything changed.
let previous: SourceFile | null = null;
try {
  const raw = execFileSync('git', ['show', `HEAD~1:${REL}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  previous = JSON.parse(raw);
} catch {
  console.log(`no previous revision for ${REL}; treating all entries as changed`);
}

let perPaperChanges = 0;
for (const [id, entry] of Object.entries(current.perPaper)) {
  const prev = previous?.perPaper?.[id];
  const countChanged = !prev || prev.citations !== entry.citations;
  if (countChanged && entry.lastUpdated !== today) {
    entry.lastUpdated = today;
    perPaperChanges++;
  }
}

const verifiedChanged = current._lastVerified !== today;
if (verifiedChanged) current._lastVerified = today;

if (perPaperChanges === 0 && !verifiedChanged) {
  console.log('no stamp updates needed; exiting');
  process.exit(0);
}

writeFileSync(FILE, JSON.stringify(current, null, 2) + '\n', 'utf8');
console.log(`stamped: _lastVerified=${today}, ${perPaperChanges} perPaper entries`);
