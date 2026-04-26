# Changelog

## v3.0.0 — public launch (2026-04-26)

The launch tag. Everything in `Unreleased` since `v2.1.0` (or v2.0.0
if no 2.1) ships under this tag. Below is the user-facing summary;
the per-phase technical detail lives under `## Unreleased` and gets
folded into v3.0 at tag time.

### Headlines

- Full v2 → v3 rebuild on Astro 4 with the Technical Editorial
  aesthetic, deployed via GitHub Pages.
- 23 publications audited against `assets/texsources/resume.tex`
  (no hallucinated entries from v1).
- Citation totals + per-paper "cited by N" sourced from Google
  Scholar via a hand-edit JSON ([`docs/CITATIONS.md`](./docs/CITATIONS.md)) with a
  weekly drift detector and on-push auto-stamp.
- Per-page OG images via satori, full JSON-LD coverage (Person /
  WebSite / ScholarlyArticle / BlogPosting / BreadcrumbList).
- IndexNow + sitemap pinging on every deploy.
- StatCounter project ID `13144757` / hash `d39bf83e` preserved
  from the legacy Jekyll site for analytics continuity.
- `/photos` with EXIF reveal, custom lightbox, image-optim bot.
- `/press`, `/subscribe`, `/talks/[slug]/` deep dives.
- Cmd-K search trigger in the header (palette implementation
  itself is still TODO; the trigger soft-falls-back to the
  publications filter).

### Operations after tagging

User-side tasks documented in
[`docs/LAUNCH_CHECKLIST.md`](./docs/LAUNCH_CHECKLIST.md):
- Set `PUBLIC_GSC_VERIFICATION` + `PUBLIC_BING_VERIFICATION` repo
  Variables (not Secrets) for search-engine verification.
- Submit sitemap in Search Console; Bing imports from GSC.
- Run the backlink migration checklist in
  [`docs/MIGRATION.md`](./docs/MIGRATION.md) (Scholar profile
  homepage URL, LinkedIn, GitHub bio, email signature, etc.).
- Flip `src/content/news/v3-launch.mdx` from `draft: true` →
  `draft: false` once the tag is pushed.

---

## Unreleased

### docs(launch): SEO Variables-vs-Secrets clarity + launch checklist + v3 news stub
*Phase 7.9 / pre-tag — 2026-04-26*

Lean launch-prep PR. No new code: the audit findings reported on
the live site at the time of writing reflect a stale browser cache
— Phases 7.7 and 7.8 are already on `main` (verified via WebFetch
against the deployed site: h1 reads `Cyan Subhra Mishra` without
the middle dot, header uses primary-nav + MORE dropdown, footer
shows all 6 channels, theme toggle is the moon/sun icon).

This PR ships only the documentation needed to support the
upcoming `v3.0.0` tag:

- `docs/SEO.md` — explicit emphasis that `PUBLIC_GSC_VERIFICATION`
  and `PUBLIC_BING_VERIFICATION` go on the **Variables** tab, not
  Secrets. `import.meta.env.PUBLIC_*` only resolves Variables; this
  is the most common misstep when wiring up Search Console for the
  first time.
- `docs/LAUNCH_CHECKLIST.md` — single tracker for the launch-
  readiness checks. Distinguishes items that are already passing in
  code (ticked) from items that need manual verification with a
  real browser (unticked).
- `src/content/news/v3-launch.mdx` — launch announcement entry,
  shipped as `draft: true` so it doesn't appear until the user
  flips it post-tag.
- `CHANGELOG.md` — v3.0.0 launch headline at the top of the file
  for the tag annotation to reference.

### fix(layout): compress header, align hero, fluid responsive
*Phase 7.8 — 2026-04-26*

Eight-issue header compression + hero alignment + responsive sweep.

**Issue 1 — SiteLogo, single line.**
- New `<SiteLogo />` component. Desktop (≥1024px): accent-square +
  `Cyan S. Mishra` + `/ csm` in mono. Mobile/tablet: just `csm` in
  accent + accent-square after, both in mono uppercase. CSS-only
  swap (no JS), `clamp()` font-size for smooth scaling. The
  multi-line wrap reported on the live site is gone — `whitespace-
  nowrap` + small font with clamp keeps it on one line at every
  width.

**Issue 2 — primary nav (5) + overflow MORE dropdown.**
- Primary: About / Publications / Projects / Blog / Contact. No
  numbered prefixes (the typographic noise wasn't earning its place
  at five items).
- Overflow `☰ MORE` dropdown carries the rest with their numbered
  prefixes preserved: Research / News / Talks / Photos / Press /
  Subscribe / CV / etc. Dropdown panel: paper-bg, sharp 2px accent
  border, click-outside or Esc to close, focus trapped while open.
- Mobile (<lg): hamburger panel from the right, full nav list with
  numbered prefixes restored, theme + search at the bottom, full
  channel icon strip below that.

**Issue 3 — theme toggle as moon/sun icon.**
- Replaced the `[ DARK ]` / `[ LIGHT ]` text button with a 36×36
  borderless icon button. Lucide moon visible in light mode → click
  to dark; lucide sun visible in dark → click to light. Hover:
  `rotate(30deg)` 200ms ease-out + accent color. Same localStorage
  persistence, same anti-flash blocking head script.
- `aria-label` updated dynamically to read "Toggle theme (currently
  X, switch to Y)" for screen readers.

**Issue 4 — hero h1 single line.**
- Dropped the middle-dot separator between "Cyan" and "Subhra".
  The h1 now reads `Cyan Subhra Mishra` with the trailing accent
  square.
- Tuned `clamp(2rem, 5vw, 4.25rem)` so the name fits on one line
  at the lg breakpoint and above. `text-wrap: balance` lets the
  browser pick clean breaks if it does need to wrap below sm.
- The name itself is wrapped in `whitespace-nowrap` to prevent the
  "Cyan / Subhra" intra-name break that the live site showed.

**Issue 5 — unified CTA + channel block, CV joins the strip.**
- Hero CTA row: just `View publications →` (filled accent) + `Get
  in touch` (outline). The CV button is gone from this row.
- Channel strip below (now 6px below the CTA row, `mt-1.5`) carries
  email · scholar · github · linkedin · dblp · instagram with a
  hairline `|` separator and CV at the very end with the same
  typographic treatment (file-text icon → `/cv/`, mono uppercase
  label, hover-to-accent). Treats CV as a channel, not a primary
  action.
- `<ProfileLinkBar>` got an `includeCv` prop to opt the hero into
  this; footer/about/etc. don't render CV in the strip — they have
  their own placements.

**Issue 6 — single nav row.**
- Verified only one `<nav aria-label="Primary">` block in the
  rendered header. Mobile nav is hidden behind the hamburger; the
  desktop chip nav from Phase 7.7 is now the primary 5 items only,
  with the overflow consolidated into MORE.

**Issue 7 — fluid responsive across all viewports.**
- `max-w-page` bumped from 1200px → 1280px to give the chip-nav +
  utility cluster more breathing room at xl.
- Hero avatar shrinks across breakpoints: `w-32` (mobile) → `w-40`
  (sm) → `w-[140px]` (md, smaller than the full-column avatar) →
  `w-full max-w-[260px]` (lg+).
- Featured projects: `1×6` mobile · `2×3` sm-lg · `3×2` lg+ via
  `sm:grid-cols-2 lg:grid-cols-3` — fluid auto-collapse.
- Code & writing: same `1/2/3` breakpoint pattern.
- Footer 3-col grid stacks on mobile.
- Stats strip: `2×2` <lg, `1×4` lg+.

**Issue 8 — Cmd-K search trigger in the header.**
- New `<SearchTrigger />` component: lucide `search` icon button +
  `⌘K` kbd hint (xl only). Click and Cmd/Ctrl-K both fire a
  `site:open-palette` custom event for the future palette to listen
  to. Soft-fallback for now: focuses the publications page filter
  input when on `/publications/`, navigates to `/publications/?q=`
  otherwise. The palette implementation itself is still TODO per
  the BaseLayout comment.

Anti-slop check: no Inter, no purple, no rounded-2xl-with-shadow,
no centered-on-white hero. The `text-wrap: balance` is the only new
typographic CSS feature; everything else is established design
language.

Verified:
- npm run check: 0 errors / 0 warnings / 0 hints (72 files).
- npm run build: 25 pages + sitemap + RSS, 0 errors.
- HTTP sweep: all 13 public routes return 200.
- Rendered HTML: 1 Primary nav (5 items), MORE button + dropdown,
  ⌘K search trigger present, theme moon+sun SVGs (no text label),
  middle-dot dropped from h1, CV in ProfileLinkBar (not as btn),
  SiteLogo renders both desktop and mobile token forms.

### feat(home): tighten + channels above the fold
*Phase 7.7 — 2026-04-25*

Five-issue tighten + above-the-fold channels pass.

**Issue 1 — channels link bar in the hero.**
- New `<ProfileLinkBar variant="hero|footer|compact" />` reading from
  the single `PROFILES` source in `src/lib/site.ts`. Adding ORCID /
  Mastodon later is a one-line edit there.
- Hero now carries the strip directly under the existing CTA row
  (`stage stage-7 mt-3` keeps it as part of the page-load
  orchestration). Order: email · scholar · github · linkedin · dblp ·
  instagram. Hairline `|` separators, `text-muted` → accent on hover
  with the underline-from-left animation matching the rest of the
  site. No boxes.
- `compact` variant placed under the bio paragraphs on `/about`. The
  full-handle card grid at §05 stays as the richer affordance.
- Contact page already pulled from `PROFILES`; left as-is — its rich
  cards beat a thin link bar there.

**Issue 2 — footer rewrite.**
- 3-col grid: about / sitemap / channels. Mobile collapses to a
  stack as before.
- Sitemap grouped per spec into `// research`, `// writing`, `//
  personal` so the 13-link list reads as three short columns instead
  of one long one.
- Channels block now uses `<ProfileLinkBar variant="footer" />` —
  single source of truth; the previously-broken filtered render is
  gone.
- Meta strip extended with `last modified · YYYY-MM-DD` from
  `git log` on `src/pages/index.astro`, alongside the existing
  `last build` stamp.

**Issue 3 — density tighten.**
- *3a* — Numbered chip nav. Each item now reads `01 About / 02
  Research / ...` with the number prefix in subordinate type and a
  `·` accent marker on the active page. Single nav row; the spec's
  reference to "two rows" was the request to upgrade to the chip
  variant.
- *3b* — Removed standalone `§ 02 currently` section. The hero
  right-column "Currently" card already carries the same paragraph;
  long-form bio + experience timeline live on `/about`. Section
  numbers shifted: `§02 stats / §03 featured / §04 news / §05
  publications / §06 elsewhere`. Saves ~120px above the fold.
- *3c* — Featured projects now render in a 3×2 grid (six cards
  filtered by `!ongoing`), with the Arm SoC-perf card surfaced as a
  single horizontal "ongoing" strip below. Six cards: NExUME,
  Salient Store, Usás, Seeker, Origin (with ★ Best Paper Nominee
  badge), Prophet. The hero card-index numbering is now `01 / 06`
  through `06 / 06` plus `07 / 06+` on the ongoing strip.
- *3d* — Deduped arxiv ↔ conference twins. The standalone
  `nexume-arxiv` and `salient-store-arxiv` entries are deleted; the
  conference entries (`nexume-iclr-2025`, `salient-store-pact-2025`)
  carry the `arxivId` + `pdfUrl` + cleared `relatedPaperIds`.
  PaperItem renders `[ pdf ] [ arxiv ]` action buttons from those
  fields, so no information is lost from the merge. Dropped the
  twin entries from `citations-source.json`.
- *3e* — News section is now year-grouped on desktop. Year as a
  big Fraunces display number on the left (col-span-2), entries flow
  right beside it. Bumped from 4 to 6 entries to fill the timeline.
  Mobile retains the simple stacked list.
- *3f* — Code & writing section grew to 3 cards: GitHub stats /
  Blog teaser / **Talks card** (deep-dive count + latest talk title +
  view-all link). New `talksAll` query in the home frontmatter.

**Issue 4 — citation render audit.**
- `PaperItem` already suppresses the `cited by N` badge when
  `citations === 0` and `withCitations()` already skips merging
  counts for `under-review`/`to-appear` papers. Verified intact.
- The "cited by 1" pattern on three recent papers reflects the
  actual Scholar values from the last manual sync — not a bug, just
  three young papers all currently sitting at 1 cite. Documented
  the explanation + refresh path in `docs/CITATIONS.md` under "Why
  a paper might show 'cited by 1' or 'cited by 0'".

**Issue 5 — polish.**
- *5a* — Hero CTA row + channels strip share a single action block
  (`mt-3` between them, no extra heading or separator).
- *5b* — Avatar caption dropped the `· 2024` year. Now just
  `Fig. 0 — author photo`, treats the photo as durable identity.
- *5c* — `last modified YYYY-MM-DD` for the home page added to
  the footer meta strip (read via `lastModified()` against
  `src/pages/index.astro`).
- *5d* — Cmd-K palette not yet shipped. TODO comment placed in
  `BaseLayout.astro` so the next implementer mounts it at the right
  level.
- *5e* — Day-after-deploy SEO verification ritual added to
  `docs/SEO.md` covering Search Console Coverage, URL Inspection,
  StatCounter recent activity, and Bing Webmaster Site Explorer.
- *5f* — `SITE.description` rewritten as the focused bio sentence
  ("Performance and Power Engineer at Arm. Hardware/software
  co-design for ML systems — energy-harvesting sensors,
  computational storage, intermittent and continuous learning at
  the edge."). 183 chars; flows into `<meta name="description">`,
  OG description, and RSS channel description.

Verified against acceptance criteria: 6 channels in hero, 6 channels
in footer, single header nav with numbered chips, no duplicate
"currently" section, 6 featured cards + 1 ongoing strip, 5 distinct
selected publications (no arxiv-vs-conference dups), year-grouped
news (2026/2025/2024), 3 cards in Code & writing, no "cited by 0"
anywhere, meta description present.

### feat(polish): last-modified + newsletter + press + talks deep dives + migration checklist
*Phase 7.6.5 — 2026-04-25*

Six independent polish improvements bundled. After this lands, the
structural rebuild is done — what remains is content, not infrastructure.

**1. Last-modified footer on every content page.**
- `src/lib/last-modified.ts` runs `git log -1 --format=%cs <filepath>`
  per file at build time, with in-process caching so each file is
  shelled-out at most once. Falls back to `statSync().mtime` when git
  isn't available (preview builds, shallow CI clones).
- `<LastModified file="src/content/..." />` component renders a
  Commit Mono `// Last modified YYYY-MM-DD` line in the footer of
  blog posts, project deep-dives, and talks deep-dives.

**2. Buttondown newsletter — disabled by default, lit by env var.**
- `<NewsletterSubscribe variant="default|compact" />` POSTs to
  Buttondown's hosted form endpoint. Driven by
  `SITE.buttondownUsername` in `src/lib/site.ts`; renders nothing
  when unset.
- Three placements: compact in the footer, full at the bottom of
  every blog post, dedicated `/subscribe` page with longer copy and
  alternate channels.

**3. `docs/MIGRATION.md` backlink audit checklist.**
- Already shipped in Phase 7.6.4 with **15 real checkboxes** across
  Scholar / LinkedIn / GitHub / DBLP / Penn State / talk slides /
  email signature. Verified intact.

**4. Per-photo location.**
- Already shipped in Phase 7.6.1 — `location: string` (free-text only,
  never GPS). Verified intact.

**5. `/press` page + collection.**
- New `press` content collection: title, date, outlet, url,
  excerpt (optional), type (`article` | `podcast` | `interview` |
  `thesis-acknowledgment` | `blog-mention`), draft.
- `src/pages/press.astro` renders a tight reverse-chrono list with
  mono dates, type chip, outlet name, optional pull-quote,
  "read source →" link.
- Seed: one `_template.mdx` kept as draft.
- `/press` linked from the footer site map.

**6. Talks deep-dive pages with embedded video.**
- New `talks` content collection: title, date, venue, venueFull,
  location, type, awards, optional `youtubeId` / `driveFileId` /
  `slidesUrl` / `paperId`, draft.
- `src/pages/talks/[...slug].astro` renders the deep-dive — asymmetric
  header, 16:9 video container, optional inline PDF slides,
  optional MDX body for transcript / notes, footer with
  back-link + LastModified.
- `<YouTubeEmbed>` and `<DriveEmbed>`: click-to-play poster buttons.
  The real `<iframe>` only loads on click — no YT/Drive cookies set
  on page view. YouTube uses `youtube-nocookie.com`.
- `/talks` index renders a `deep dive →` accent link on entries
  whose `slug` matches an existing `talks` MDX, alongside the
  existing "watch recording →" external link.
- Seed: `cocktail-nsdi-2022.mdx` (YouTube `VAsB1XBuRZ0`) and
  `origin-date-2021.mdx` (Drive `1zM1oa...mVrACI`).

Footer site map gained `/photos`, `/press`, and `/subscribe`.
`SITE.buttondownUsername` slot added in `src/lib/site.ts`.

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
