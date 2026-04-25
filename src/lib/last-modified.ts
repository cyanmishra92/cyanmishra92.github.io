// Last-modified date for a content file — backed by `git log`.
//
// Used by content-page footers to show:
//   Last modified YYYY-MM-DD
//
// Single git invocation per file, results cached for the lifetime of
// the build process. Falls back to the file's mtime if git isn't
// available (e.g. when previewing outside a checkout).

import { execFileSync } from 'node:child_process';
import { statSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const cache = new Map<string, string | null>();
const CWD = process.cwd();

/**
 * Returns the YYYY-MM-DD of the last commit that touched `filePath`.
 * Pass an absolute path or a path relative to the repo root.
 *
 * Returns null if the file isn't tracked, git isn't available, or the
 * file doesn't exist on disk.
 */
export function lastModified(filePath: string): string | null {
  const abs = resolve(CWD, filePath);
  if (cache.has(abs)) return cache.get(abs)!;

  if (!existsSync(abs)) {
    cache.set(abs, null);
    return null;
  }

  // First try git log against the workdir-relative path.
  const rel = relative(CWD, abs);
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', rel],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: CWD },
    ).trim();
    if (out) {
      cache.set(abs, out);
      return out;
    }
  } catch {
    // Fall through to mtime fallback.
  }

  // Fallback: file mtime. Useful in preview contexts (e.g. local builds
  // of unstaged changes, or shallow CI clones that aren't full mirrors).
  try {
    const m = statSync(abs).mtime;
    const stamp = m.toISOString().slice(0, 10);
    cache.set(abs, stamp);
    return stamp;
  } catch {
    cache.set(abs, null);
    return null;
  }
}
