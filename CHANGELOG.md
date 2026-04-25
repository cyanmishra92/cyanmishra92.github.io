# Changelog

## Unreleased

### feat(seo): indexing pipeline + statcounter verify + sites.google.com migration plan
*Phase 7.6.4 — 2026-04-25*

- **Search-engine verification, env-driven**: `<meta name="google-site-verification">`
  and `<meta name="msvalidate.01">` only render when `PUBLIC_GSC_VERIFICATION`
  / `PUBLIC_BING_VERIFICATION` are set. No empty-content placeholder tag.
- **`WebSite` JSON-LD on home** with `SearchAction` `potentialAction`
  pointing to `/publications/?q={search_term_string}`.
- **`BreadcrumbList` JSON-LD on every nested page** via a new
  `breadcrumbs` prop on `BaseLayout`.
- **`Person` JSON-LD widened**: dual `alumniOf` (Penn State + NIT
  Rourkela), optional ORCID + Twitter slots in `src/lib/site.ts`
  (`SITE.orcid` / `SITE.twitter`); when set they appear in `sameAs` and
  drive `twitter:creator`. Email correctly stays out of `sameAs`.
- **StatCounter hash corrected** from `d3a06f8e` → `d39bf83e` to match
  the legacy Jekyll site, preserving historical analytics continuity.
  Both the async JS snippet and the `<noscript>` `<img>` fallback are
  present and consistent.
- **IndexNow wired**: 32-char API key at
  `public/169cc72c88778a725f0e4b20ea849813.txt`,
  `scripts/indexnow-submit.ts` script,
  `.github/workflows/indexnow.yml` triggered on `workflow_run` of
  `Deploy` completion. Maps deploy-commit diff → public URLs → POSTs
  to `https://api.indexnow.org/IndexNow`. Best-effort with
  soft-failures.
- **`docs/SEO.md`** — full step-by-step verification walkthrough for
  GSC, Bing Webmaster, IndexNow + key rotation procedure.
- **`docs/MIGRATION.md`** — three-step `sites.google.com` deprecation
  plan + a checkbox-tracked backlink audit checklist (Scholar,
  LinkedIn, DBLP, Penn State, talk slides, email signature, etc.).
- **`docs/ANALYTICS.md`** — StatCounter integration docs (project ID,
  hash provenance, verification steps) + Plausible enablement
  instructions.

Also carries the fix the codex bot caught on PR #7:
`scripts/audit-publications-fix.mjs` no longer drops schema-valid
optional fields on re-run. `SCHEMA_FIELDS` whitelist now covers
`abstract`, `citations`, and `citationKey`; a fail-safe pass-through
preserves any unknown keys at the tail with a warning.

### chore(content): full publications + bibtex audit against resume.tex
*Phase 7.6.3 — 2026-04-25*

- Audited every entry in `src/content/publications/` against
  `assets/texsources/resume.tex`. No hallucinated v1-Jekyll entries
  leaked into v2.
- Added `relatedPaperIds` to the publications schema and linked the
  arXiv preprint ↔ conference-version pairs (NExUME, Salient Store).
- Moved `salient-store-pact-2025`, `nexume-iclr-2025`, and
  `cord-ipdps-2025` from `to-appear` → `published` (their conferences
  are now in the past).
- Regenerated all 25 BibTeX entries to spec format:
  `lastnameYEARkeyword` keys, `Last, First and Last, First` author
  strings, venue-appropriate types, `note = {Best Paper Nominee}` on
  Origin (DATE 2021), correct publishers per venue.
- Stable field order across every JSON file for diff readability.
- `scripts/audit-publications-fix.mjs` added so the regen is
  idempotent and re-runnable on future edits.
- Full report in [`docs/PUBLICATIONS_AUDIT.md`](./docs/PUBLICATIONS_AUDIT.md).

## v2.0.0 — 2026-04-25

The full rewrite. The legacy Jekyll site is preserved on the
`legacy-jekyll` branch.

### Stack

- Astro 4 static output, Tailwind 3 with custom design tokens, MDX content
  collections, Preact for islands.
- Self-hosted Mona Sans + Fraunces (variable) + JetBrains Mono. No
  Google Fonts CDN at runtime.
- Node 20+, strict TypeScript end to end.

### Design system — "Technical Editorial"

- Warm-paper light theme (`#f5f3ee`) and deep-slate dark theme.
- Cyan as the only accent — no purple gradients, no rainbow palettes.
- SVG turbulence noise atmosphere overlay; sharp 2px-border cards with
  corner index labels; `§ NN` schematic section dividers.
- Asymmetric hero with inline SVG SoC pipeline schematic backdrop,
  measurement-rule caption, San Diego coordinate label, and a 7-stage
  CSS-only page-load orchestration. `prefers-reduced-motion` respected
  end to end.
- Terminal-style 404 with CRT scanline overlay.

### Content

- 25 publications across ISCA, MICRO, HPCA, ICLR, NSDI, PACT, IPDPS,
  DATE, ICDCS, SoCC, NAS, ASTM, IEEE ESL, DSJ, plus arXiv preprints
  and under-review papers — all sourced from `assets/texsources/resume.tex`.
- 7 project deep-dives as MDX (NExUME, Salient Store, Usás, Seeker,
  Origin, Prophet, plus the Arm SoC-perf ongoing card).
- 12 news entries seeded from spec §6.4 + 1 welcome blog post.
- Six research themes; education + experience timelines; teaching
  history.

### Interactive

- Vanilla-TS publication filter + search with multi-select chips
  across year, type, venue, and topic. Live count, auto-hiding group
  headings, clear button. ~3KB JS.
- BibTeX modal with one `<template>` per paper, Clipboard API copy,
  `.bib` blob download. No fuse.js, no Preact island.
- Click-to-copy email on `/contact` with graceful fallback.
- Theme toggle (system default, persisted, anti-flash blocking head
  script).
- Reading-progress bar on blog posts.

### Citations — accurate, attributed, and self-refreshing

- Per-paper counts in `src/data/manual-citations.json`, mirrored from
  the [Google Scholar profile](https://scholar.google.com/citations?user=oizH-wQAAAAJ).
  Manual values take precedence and the home stats strip shows the
  source + last-refresh date.
- `scripts/refresh-citations.ts` runs on every deploy and a daily
  06:30 UTC cron, refreshing counts via Semantic Scholar batch +
  OpenAlex DOI + OpenAlex title-search fallbacks for any paper not
  in the manual file. Failures preserve the previous value rather
  than zeroing.
- Renders **496 total citations, h-index 10** at launch.

### SEO + sharing

- Per-page OG images (1200×630 PNGs) generated at build time via
  satori + resvg — one for home, 25 for papers, 7 for projects, 1
  for the blog post. Same Technical Editorial vocabulary as the site.
- `Person` JSON-LD site-wide; `ScholarlyArticle` per paper on
  `/publications`; `BlogPosting` on every post.
- Canonical URLs, sitemap, RSS at `/rss.xml` combining news + blog.
- StatCounter preserved (project ID `13144757`); Plausible opt-in.

### Workflows

- `deploy.yml` — build + GitHub Pages publish on push to main; daily
  cron at 06:30 UTC; refresh-citations runs before each build with
  `continue-on-error`.
- `build-resume.yml` — rebuilds the resume PDF from `.tex` on change,
  commits back with `[skip ci]`.
- `refresh-citations.yml` — weekly Mondays 06:00 UTC, opens a chore
  PR with the regenerated `citations.json`.
- `links.yml` — lychee link checker on push, PR, and weekly Wednesday
  scheduled run; auto-issues on link rot.
- `pr-check.yml` — typecheck + build + dist-sanity on every PR.

### Acceptance against spec §9

- [x] No Inter / Roboto / Arial / system fonts (verified in built CSS).
- [x] Single accent (cyan), no purple gradients, no rainbow palettes.
- [x] Sharp-bordered cards with corner index labels — no rounded-2xl
      with drop shadow.
- [x] Asymmetric hero on warm paper, schematic backdrop, coordinate
      label, page-load orchestration.
- [x] All 12 routes serve, sitemap covers them, robots allows them.
- [x] Theme toggle works without flash; mobile nav slides in correctly
      below 768px.
- [x] `npm run check` → 0 errors / 0 warnings / 0 hints across 52 files.
- [x] `npm run build` → 20 pages + 34 OG PNGs + sitemap + RSS, no errors.
- [x] PR smoke check + link check pass on PRs.

### Operational note

GitHub Pages source must be set to **GitHub Actions** (not "Deploy
from a branch") for the deploy workflow to publish. See
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## v1.x — Jekyll era

Preserved on the `legacy-jekyll` branch.
