# Content guide

Quick references for adding the kinds of content the site supports.
The site is content-collection-driven — each kind lives under
`src/content/<collection>/`, with a Zod schema in
`src/content/config.ts`. Push commits; the build does the rest.

For citations specifically, see [`CITATIONS.md`](./CITATIONS.md).

---

## How to add a photo

The site has a local image gallery at `/photos`. No Instagram embed,
no third-party hosting — JPEGs live in the repo, and EXIF / image
optimisation are handled by GitHub Actions on push.

### Steps

1. **Drop the source JPEG (or HEIC, PNG, WebP)** into
   `src/content/photos/img/`. Use a slug-friendly filename — letters,
   digits, hyphens. The filename stem becomes the URL slug for the
   `#photo=<slug>` lightbox deep-link.
2. **Create a metadata file** at
   `src/content/photos/<slug>.mdx`:
   ```yaml
   ---
   title: View from the office
   date: 2026-02-10
   location: San Diego, CA   # optional, free-text — no GPS, no precise addresses
   caption: |
     Optional caption. Markdown supported. One sentence is fine.
   tags: [work, san-diego]
   image: ./img/view-from-office.jpg
   album: 2026-arm-onboarding   # optional grouping
   featured: false               # true → 2×2 cell on the grid
   visible: true                 # false → hidden without deleting
   # displayMode: cover | contain | tall   # optional override
   ---

   Optional MDX body. Renders nowhere yet, but kept for future single-photo pages.
   ```
3. **Push.** Two workflows fire automatically:
   - **`photo-optim.yml`** — downscales to ≤2400px on the long edge,
     **strips ALL EXIF from the JPEG itself**, re-encodes at quality 85
     (mozjpeg progressive). Commits the optimised source back with
     `[skip ci]`.
   - **`photo-exif.yml`** — extracts the privacy-safe EXIF subset
     (camera, lens, aperture, shutter, ISO, focal, taken-at) into a
     sidecar at `src/content/photos/_exif/<slug>.json`. **Strips all GPS
     and serial-number fields.** Commits with `[skip ci]`.
4. **The build picks up the new entry** on the next push (which the
   workflows themselves trigger via the commit-back step). The photo
   appears in its year section on `/photos`, with the `(i)` button
   revealing the EXIF popover and the lightbox showing it on click.

### What you control via frontmatter

| Field         | Type     | Default  | Notes |
|---------------|----------|----------|-------|
| `title`       | string   | required | Used in headings, alt text fallback, lightbox |
| `date`        | date     | required | YYYY-MM-DD; year groups + sorts the grid |
| `location`    | string   | optional | Free-text only — never GPS coordinates |
| `caption`     | string   | optional | Markdown supported; primary `<img alt>` source |
| `tags`        | string[] | `[]`     | Becomes a filter chip in the sticky bar |
| `image`       | path     | required | Relative to the .mdx file; Astro resolves |
| `album`       | string   | optional | Album dropdown filter; only shown if any are set |
| `featured`    | bool     | `false`  | `true` → 2×2 cell on the grid |
| `visible`     | bool     | `true`   | `false` → hidden without deleting (still in repo) |
| `displayMode` | enum     | auto     | `cover` (default), `contain` (padded fit), `tall` (1×2) |

If `displayMode` is left unset, the page picks `contain` for ~1 in 5
photos deterministically (stable hash of the slug) so the grid doesn't
read as a uniform Instagram square wall.

### Privacy

The site never displays GPS, even if the source camera embedded it:

- The EXIF extractor is **allowlist-only** — it copies
  `Make`/`Model`/`LensModel`/`FNumber`/`ExposureTime`/`ISO`/
  `FocalLength`/`FocalLengthIn35mmFormat`/`DateTimeOriginal`/`Flash`/
  `WhiteBalance`/`MeteringMode`/`Orientation` and nothing else. Any
  `GPS*` / `*Serial*` / `Owner*` / `Artist` / `Copyright` /
  `UserComment` field that slips into the allowlist is also dropped by
  a defensive blocklist.
- The image optimisation step calls `sharp().jpeg(...)` without
  `.withMetadata()` — sharp's default is to strip ALL embedded
  metadata, so even if the allowlist somehow leaked, the JPEG itself
  contains no EXIF when it lands in the repo.
- The `location` frontmatter field is free-text only. **Don't put
  precise addresses in it.** "San Diego, CA" is fine; a street address
  is not.

### Removing a photo

- **Quick hide**: set `visible: false` in the .mdx and push. The photo
  stays in the repo but disappears from the gallery.
- **Hard delete**: remove both the .mdx and the JPEG. The sidecar JSON
  in `src/content/photos/_exif/` becomes stale but inert; you can
  delete it manually or leave it (it has zero runtime cost).

### Custom EXIF reveal off for a photo

Don't set anything special — the `(i)` button only renders when the
sidecar has at least one usable field. A screenshot or a photo without
EXIF just doesn't show the button.

### Lightbox behaviour

- Click any photo → opens the lightbox at that photo.
- URL hash updates to `#photo=<slug>` for shareable views.
- **Keyboard**: Esc closes · ←/→ navigates · `+` / `-` zoom · `0`
  resets · `D` downloads.
- **Mouse**: scroll-wheel zooms · drag pans when zoomed · double-click
  toggles fit/2× zoom.
- **Touch**: pinch-zoom · drag-pan · swipe nav when not zoomed.
- Native `<dialog>` backdrop click also closes.
- Respects `prefers-reduced-motion` — disables the transform
  transitions for users who've opted out.

---

## How to add a news entry

```bash
# Create src/content/news/<YYYY-MM-DD-slug>.mdx with frontmatter:
#   title:           one-line headline
#   date:            YYYY-MM-DD
#   approximateDate: true  → renders as "YYYY · Mon" instead of full date
#   href:            optional link the headline goes to (internal or external)
#   tags:            string[]
#   draft:           true  → excluded from the build
#
# Body is short MDX. Commit and push. The home page Latest News strip
# auto-updates and the RSS feed regenerates.
```

---

## How to add a blog post

```bash
# Create src/content/blog/<slug>.mdx with frontmatter:
#   title:        post title
#   description:  one-line description (used in OG + RSS)
#   date:         YYYY-MM-DD
#   updated:      YYYY-MM-DD  (optional, shown if present)
#   tags:         string[]
#   draft:        true  → excluded from the build
#
# Body is MDX — full markdown plus components. The build adds reading-
# progress bar + per-post OG image automatically.
```

---

## How to add a publication

```bash
# Create src/content/publications/<id>.json. Schema and field reference
# live in src/content/config.ts. Run scripts/audit-publications-fix.mjs
# afterwards to regenerate the BibTeX in the canonical format and stamp
# field order. See docs/PUBLICATIONS_AUDIT.md.
#
# After adding the file, also add an entry to
# src/data/citations-source.json under perPaper.<id> with a
# placeholder citations: 0 — see docs/CITATIONS.md.
```

---

## How to add a project deep-dive

```bash
# Create src/content/projects/<slug>.mdx with frontmatter:
#   title:     project title
#   summary:   2-3 sentence summary used on cards
#   tagline:   one-line tagline
#   venue:     "ICLR" / "HPCA" / etc. — optional
#   year:      number — optional
#   status:    'published' | 'to-appear' | 'under-review' | 'ongoing'
#   topics:    string[]
#   paperId:   matches an id in src/content/publications/ for cross-linking
#   paperUrl:  optional direct URL to the paper PDF
#   codeUrl:   optional GitHub URL
#   awards:    string[]
#   order:     display rank on /projects (lower = earlier)
#   ongoing:   true for no-public-paper work (e.g. employer projects)
#   draft:     true → excluded from the build
#
# The MDX body is the long-form write-up. Per-project OG image is
# generated automatically.
```

---

## How to add a press / mentions entry

(Lands in Phase 7.6.5 along with the `/press` page scaffold.)
