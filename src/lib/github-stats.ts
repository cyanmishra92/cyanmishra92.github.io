/**
 * Build-time GitHub stats fetch. Called from src/pages/index.astro.
 *
 * Strategy: hit the unauthenticated GitHub REST API for the user's
 * public profile + repos. No octokit dependency — keeps the
 * dev/build install lighter. Authenticate when GITHUB_TOKEN is in env
 * (GitHub Actions sets it automatically) to lift the rate limit from
 * 60 → 5000 req/hour.
 *
 * Cached on disk for 6 hours to keep `npm run dev` snappy and to
 * survive offline rebuilds.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export interface GhStats {
  username: string;
  publicRepos: number;
  totalStars: number;
  topLanguages: { name: string; count: number }[];
  fetchedAt: string;
}

const username = 'cyanmishra92';
const cachePath = fileURLToPath(new URL('../../.cache/github-stats.json', import.meta.url));
const ttlMs = 6 * 60 * 60 * 1000;

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 120)}`);
  }
  return (await res.json()) as T;
}

async function fetchFresh(): Promise<GhStats> {
  type Repo = {
    fork: boolean;
    archived: boolean;
    stargazers_count: number;
    language: string | null;
  };
  const repos: Repo[] = [];
  let page = 1;
  while (true) {
    const batch = await gh<Repo[]>(`/users/${username}/repos?per_page=100&type=owner&sort=updated&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
    if (++page > 5) break; // hard cap
  }
  const own = repos.filter((r) => !r.fork && !r.archived);
  const totalStars = own.reduce((acc, r) => acc + r.stargazers_count, 0);
  const langCounts: Record<string, number> = {};
  for (const r of own) {
    if (r.language) langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));
  return {
    username,
    publicRepos: own.length,
    totalStars,
    topLanguages,
    fetchedAt: new Date().toISOString(),
  };
}

/** Returns stats from cache if fresh, else from API. Returns null on hard failure. */
export async function loadGithubStats(): Promise<GhStats | null> {
  // Try cache first.
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf8')) as GhStats;
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < ttlMs) return cached;
    } catch {
      // fall through
    }
  }
  try {
    const fresh = await fetchFresh();
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(fresh, null, 2) + '\n', 'utf8');
    return fresh;
  } catch (err) {
    console.warn(`[github-stats] live fetch failed: ${(err as Error).message}`);
    // Last resort — stale cache is better than no cache.
    if (existsSync(cachePath)) {
      try {
        return JSON.parse(readFileSync(cachePath, 'utf8'));
      } catch {
        return null;
      }
    }
    return null;
  }
}
