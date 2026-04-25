// Submit changed URLs to IndexNow after a successful deploy.
//
// Reads the deploy commit's git diff for files under src/pages/ or
// src/content/, maps them to public site URLs, and POSTs the list to
// https://api.indexnow.org/IndexNow with our verification key.
//
// Driven by .github/workflows/indexnow.yml which runs on
// `workflow_run` of `deploy.yml` completion. Idempotent and best-effort
// — IndexNow re-submissions are fine; a network failure is logged but
// does not fail the workflow.
//
// Env:
//   GITHUB_SHA   — the deployed commit SHA (provided by Actions)
//   INDEXNOW_KEY — 32-char API key matching public/<KEY>.txt

import { execSync } from 'node:child_process';

const KEY = process.env.INDEXNOW_KEY;
const SHA = process.env.GITHUB_SHA ?? 'HEAD';
const HOST = 'cyanmishra92.github.io';
const SITE = `https://${HOST}`;
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

if (!KEY || !/^[a-f0-9]{32}$/i.test(KEY)) {
  console.error('INDEXNOW_KEY env var missing or malformed; aborting.');
  process.exit(0); // soft-exit so the workflow stays green
}

// ─── changed files in the deploy commit ─────────────────────────────
let changed: string[] = [];
try {
  const out = execSync(`git diff --name-only ${SHA}~1 ${SHA}`, { encoding: 'utf8' });
  changed = out.split('\n').filter(Boolean);
} catch (err) {
  // First commit on a branch / shallow clone — fall back to "everything changed".
  console.warn('git diff failed, falling back to full sitemap:', (err as Error).message);
}

// ─── map source paths to URLs ───────────────────────────────────────
function pathToUrls(path: string): string[] {
  // Static page files: src/pages/<route>.astro → /<route>/
  let m = path.match(/^src\/pages\/(.+)\.astro$/);
  if (m) {
    let route = m[1];
    if (route === 'index') return [`${SITE}/`];
    if (route === '404') return []; // 404 has no canonical URL
    if (route.endsWith('/index')) route = route.slice(0, -6);
    if (route.includes('[')) return []; // dynamic — handled via collection paths
    return [`${SITE}/${route}/`];
  }
  // Dynamic page collections.
  m = path.match(/^src\/content\/publications\/(.+)\.json$/);
  if (m) return [`${SITE}/publications/`]; // publications all live on one page
  m = path.match(/^src\/content\/projects\/(.+)\.mdx$/);
  if (m) return [`${SITE}/projects/${m[1]}/`, `${SITE}/projects/`];
  m = path.match(/^src\/content\/blog\/(.+)\.mdx$/);
  if (m) return [`${SITE}/blog/${m[1]}/`, `${SITE}/blog/`, `${SITE}/rss.xml`];
  m = path.match(/^src\/content\/news\/(.+)\.mdx$/);
  if (m) return [`${SITE}/news/`, `${SITE}/rss.xml`];
  return [];
}

const urlSet = new Set<string>();
if (changed.length === 0) {
  // Nothing diffable — just nudge the home and the high-traffic indexes.
  ['', 'about/', 'publications/', 'projects/', 'blog/', 'news/', 'cv/'].forEach((p) =>
    urlSet.add(`${SITE}/${p}`),
  );
} else {
  for (const f of changed) {
    for (const u of pathToUrls(f)) urlSet.add(u);
  }
  // Always nudge the home if anything changed.
  if (urlSet.size > 0) urlSet.add(`${SITE}/`);
}

const urlList = [...urlSet];
if (urlList.length === 0) {
  console.log('no URLs to submit; exiting');
  process.exit(0);
}

console.log(`submitting ${urlList.length} URLs to IndexNow:`);
urlList.forEach((u) => console.log('  ' + u));

// ─── POST to IndexNow ───────────────────────────────────────────────
const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
});

try {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  });
  // Per IndexNow spec: 200/202 = accepted, 422 = invalid URL, 429 = throttled.
  console.log(`indexnow → ${res.status} ${res.statusText}`);
  if (res.status >= 400 && res.status !== 429) {
    const text = await res.text();
    console.warn(`indexnow body: ${text.slice(0, 400)}`);
  }
} catch (err) {
  console.warn('indexnow POST failed:', (err as Error).message);
}
