# Changelog

## Unreleased

### feat(photos): local schematic grid + exif reveal + custom lightbox + image optim bot
*Phase 7.6.1 — 2026-04-25*

A new `/photos` route — local image gallery in the Technical Editorial
vocabulary. No Instagram embed, no third-party hosting, no GPS leakage.

Content collection:
- `src/content/photos/` (MDX) with schema: title, date, location
  (free-text only — never GPS), caption (markdown), tags, image
  (Astro `image()`-resolved relative path), album (optional), featured
  (bool, 2×2 cell), visible (bool, hide without deleting), displayMode
  (cover | contain | tall, optional override).
- Image source files in `src/content/photos/img/`.
- EXIF sidecars in `src/content/photos/_exif/` — leading underscore so
  Astro's content collection ignores the JSONs (otherwise they'd
  conflict with the MDX entries).

EXIF extraction (`scripts/extract-photo-exif.ts` +
`.github/workflows/photo-exif.yml`):
- Allowlist-only extraction via `exifr`. Keeps Make / Model /
  LensModel / FNumber / ExposureTime / ISO / FocalLength /
  FocalLengthIn35mmFormat / DateTimeOriginal / Flash / WhiteBalance /
  MeteringMode / Orientation. Drops everything else.
- Defensive blocklist as a second line of defense: any field matching
  `/^GPS/i`, `/Serial/i`, `/OwnerName/i`, `/CameraOwnerName/i`,
  `/Artist/i`, `/Copyright/i`, `/UserComment/i` is rejected even if
  the allowlist were widened by mistake.
- Sidecar JSON committed back with `[skip ci]`.

Photo optimisation (`scripts/optimize-photos.ts` +
`.github/workflows/photo-optim.yml`):
- Downscales any image > 2400px on the long edge.
- **Strips ALL EXIF from the JPEG itself** (sharp default — never
  calls `.withMetadata()`). The privacy-safe subset stays in the
  sidecar JSON; the JPEG carries nothing.
- Converts HEIC/PNG/WebP/TIFF sources to JPEG quality 85, mozjpeg
  progressive.
- Idempotent — files already at ≤2400px with no embedded EXIF are
  skipped.
- Commits the optimised source back with `[skip ci]`.

Schematic grid (`src/pages/photos.astro`):
- CSS Grid, 4-col desktop / 3-col tablet / 2-col mobile.
- 1×1 default cells; `featured: true` → 2×2 (2×1 on mobile);
  `displayMode: tall` → 1×2.
- `Fig. NN` Commit Mono label above each cell, `YYYY-MM-DD · location`
  caption below. Sharp 2px border, accent on hover.
- ~1-in-5 photos auto-pick `displayMode: contain` deterministically
  via stable hash of the slug, breaking up the visual rhythm so the
  grid doesn't read as a uniform Instagram square wall. Frontmatter
  override is honored.
- Year-grouped sections, year heading in big Fraunces, mono `(N
  photos)` subhead.
- Sticky tag + album filter bar at the top; tag chips are AND-mode
  (must match all selected); album is a single-select dropdown,
  rendered only when any album exists in the data.

EXIF reveal popover (`src/components/ExifReveal.astro`):
- 24×24 `(i)` button bottom-right of every cell. Hidden when the
  sidecar carries no usable fields (so screenshots don't show one).
- Click → in-cell popover with mono 2-col table (CAMERA / LENS /
  FOCAL / APERTURE / SHUTTER / ISO / TAKEN). Esc and outside-click
  dismiss.
- Pure Astro + a tiny IIFE for the toggle. Data is rendered at build
  time, hidden behind `[hidden]`, shown on click — no JS sent for the
  EXIF parser itself.

Custom lightbox (`src/components/PhotoLightbox.tsx`):
- Native `<dialog>` + Preact island, ~2.5KB gzipped (8KB budget).
  No PhotoSwipe — built bespoke to fit the aesthetic.
- Keyboard: Esc / ← / → / + / - / 0 / D.
- Mouse: scroll-zoom · drag-pan when zoomed · double-click toggles
  fit/2×.
- Touch: pinch-zoom · drag-pan · swipe nav at zoom 1.
- URL hash `#photo=<slug>` for shareable views.
- Preloads next/prev image when current opens.
- Honors `prefers-reduced-motion` — disables the transform
  transitions.

Page header — restrained IG callout:
- Single mono line: `// hand-picked moments. for more, follow
  @cyansubhra on instagram →`. The link is the entire IG presence
  on this site. No icons, no banners, no embeds.

Astro `<Image>`:
- Responsive variants (`widths={[480, 800, 1200, 1600]}`) with
  appropriate `sizes`. First 6 images on the page are `loading="eager"`
  with `decoding="sync"`; the rest lazy.

Seed:
- 3 placeholder MDX entries (`placeholder-square`, `-tall`, `-wide`)
  with `visible: false` so the page builds before real photos exist.
  Each has a TODO pointing at `docs/CONTENT_GUIDE.md`.
- 3 synthetic placeholder JPEGs in `src/content/photos/img/`.

Nav + footer:
- `/photos` added to NAV between Blog and CV. Footer site-map updated
  to match.

Docs:
- `docs/CONTENT_GUIDE.md` — full "How to add a photo" workflow plus
  short references for news / blog / publications / projects entries.

### refactor(citations): github-only sync via web ui + auto date stamp + drift detector
*Phase 7.6.2 — 2026-04-25*

Single-source-of-truth model for citations:

- **`src/data/citations-source.json`** is the new authority. Schema:
  `_source` / `_scholarUrl` / `_lastVerified` / `totals` (citations,
  hIndex, i10Index) / `perPaper.<id>` (citations, lastUpdated). Migrated
  from `manual-citations.json` with current Scholar values
  (498 / h=10 / i10=10).
- The home stats strip and per-paper "cited by N" badge read from this
  file *only*. `public/data/citations.json` and the previous overlay
  loader are deleted.
- Under-review and to-appear papers no longer render `cited by 0` —
  they render nothing in that slot. (`withCitations` skips merging the
  count.)

GitHub-web-UI workflow (no clone needed):

1. Edit `src/data/citations-source.json` in the GitHub web editor;
   paste in fresh Scholar counts; commit.
2. **`citations-stamp.yml`** triggers on push, runs
   `scripts/citations-stamp.ts`, bumps `_lastVerified` to today and
   `perPaper.<id>.lastUpdated` for any entry whose `citations` value
   actually changed (compared against `HEAD~1`). Commits back with
   `[skip ci]` so the workflow doesn't recurse. Idempotent.
3. **`Deploy`** runs as normal on the new commit.

Drift safety net:

- **`citation-drift.yml`** runs Mondays 06:00 UTC + manual dispatch.
  `scripts/citation-drift.ts` queries Semantic Scholar batch +
  OpenAlex DOI + (optionally) OpenAlex author works. When external
  high-water-mark exceeds **1.2× source AND |Δ| ≥ 3** for any paper,
  opens or updates a tracking issue
  `chore: time to sync citations from Scholar` (label
  `bot:citation-drift`, assigned to repo owner). Auto-closes when in
  sync.
- `.github/state/citation-drift.json` carries the report between runs;
  `lastRun` is read by the home page caption.
- Drift detector NEVER writes back to the source file. Only the user
  does that, by editing in the web UI.

Honest captioning:

- Home stats strip footer now reads
  `// source: Google Scholar · synced YYYY-MM-DD · drift checked YYYY-MM-DD`
  in Commit Mono. Source links to the Scholar profile. Synced date
  comes from `citations-source.json._lastVerified`. Drift-checked
  date comes from `.github/state/citation-drift.json.lastRun`
  (omitted gracefully on first deploy when the file doesn't exist
  yet).

Site config:

- New optional `SITE.openAlexAuthorId` slot in `src/lib/site.ts`.
  When set, the drift detector uses `/authors/<id>/works` for cleaner
  disambiguation than per-paper title search. Look up your ID at
  <https://openalex.org/works?search=cyan+subhra+mishra> and drop it
  into the file when convenient.

Removed (superseded by the new model):

- `.github/workflows/refresh-citations.yml`
- `scripts/refresh-citations.ts`
- The pre-build `npm run refresh-citations` step in `deploy.yml`
- `npm run refresh-citations` script entry

Docs:

- **`docs/CITATIONS.md`** — monthly playbook for editing the source
  file via the GitHub web UI. Step-by-step with selectors for
  Scholar's right-sidebar totals.
- **`docs/CITATIONS_FUTURE.md`** — deferred bookmarklet + Playwright
  ideas with DOM selectors, JSON shape, and command structure
  documented in enough detail that a future Cyan-or-Claude can
  implement without re-reasoning. Marked as "deferred — implement
  when manual sync becomes painful."

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
