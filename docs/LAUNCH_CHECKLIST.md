# Launch checklist — v3.0.0

Tracker for the public-launch readiness checks. Tick items as they
verify; the unticked ones are the user's manual launch tasks.

Last verified against [`https://cyanmishra92.github.io/`](https://cyanmishra92.github.io/) on **2026-04-26**.

## Visual + functional (Phase 7.7 + 7.8 outcomes)

These were shipped in PRs #12 (7.7) and #13 (7.8) and verified against
the rendered HTML on `main`. Live verification against the deployed
URL is the user's last-mile sanity check.

- [x] Home matches `/publications` design language (header, footer,
      dropdown, theme icon)
- [x] Logo on one line at all viewports (CSS `clamp()` + responsive
      desktop/`csm` swap)
- [x] Hero name `Cyan Subhra Mishra` on one line at desktop widths,
      no middle-dot separator
- [x] Hero CTAs and channel icons read as one unified block; CV in
      icon strip, not as a CTA button
- [x] Theme is moon/sun icon, no text label
- [x] Featured projects: 6-card 3×2 grid + 7th "Currently exploring"
      strip
- [x] Selected publications: arxiv-vs-conference dups removed (Phase
      7.7 already collapsed the NExUME and Salient Store pairs)
- [x] News: year-grouped timeline at ≥768px
- [x] Footer: 3-column grid; channels block shows ALL 6 entries on
      every page
- [x] No "currently" content duplication on home
- [x] Code & writing: 3 cards (GitHub stats, Blog, Talks)
- [x] Header has Cmd-K search trigger (palette implementation
      itself is still TODO; the keyboard handler dispatches a custom
      event for the future palette and soft-falls-back to the
      publications filter input)
- [ ] Live screenshots at 1440 / 1280 / 1024 / 900 / 768 / 414 / 375
      in BOTH themes (manual capture during local QA — this dev
      sandbox has no headless browser)
- [ ] No horizontal scroll at any viewport (manual)

## Content correctness (Phase 7.6.3 outcomes)

- [x] No "Ph.D. Candidate" anywhere
- [x] No `cyan@psu.edu` anywhere
- [x] No hallucinated v1 papers (ResiRCA-RCA, ICLR-Origin-RL,
      Sustainable-Edge-Computing) — verified in
      [`docs/PUBLICATIONS_AUDIT.md`](./PUBLICATIONS_AUDIT.md)
- [x] All 23 publication entries verified against
      `assets/texsources/resume.tex` (audit doc)
- [x] DATE 2021 Origin shows ★ Best Paper Nominee badge
- [x] BibTeX present and well-formed for every paper

## SEO + analytics (Phase 7.6.4 outcomes — verification only)

| Surface | Status | Notes |
|---|---|---|
| Sitemap (`/sitemap-index.xml`) | ✅ | 200 OK; `@astrojs/sitemap` covers every route |
| Robots (`/robots.txt`) | ✅ | allow all + bingbot + sitemap reference |
| Person JSON-LD | ✅ | site-wide via `BaseLayout.astro` |
| WebSite JSON-LD | ✅ | home only, with `SearchAction` `potentialAction` |
| BreadcrumbList JSON-LD | ✅ | every nested page |
| ScholarlyArticle JSON-LD | ✅ | per-paper |
| BlogPosting JSON-LD | ✅ | per-post |
| Open Graph + Twitter Card | ✅ | satori-generated 1200×630 PNGs per page |
| Canonical URLs | ✅ | absolute against `SITE.url` |
| Per-page `<meta name="description">` | ✅ | unique per page; home has the bio sentence |
| StatCounter `13144757` / hash `d39bf83e` | ✅ | preserved from legacy site for analytics continuity |
| IndexNow API key | ✅ | `public/<KEY>.txt` + workflow on every deploy |
| GSC + Bing tokens | ⏳ | env-var-driven; user sets after merge — see [`SEO.md`](./SEO.md) |
| Plausible | ⏳ | scaffolded behind `PUBLIC_PLAUSIBLE_DOMAIN`; off until user signs up |

## Performance + a11y

- [ ] Lighthouse on `/`, `/publications`, `/about`, `/projects/nexume`:
      Performance ≥95, Accessibility ≥98, Best Practices ≥95, SEO 100
      (manual — needs Chrome on a real machine)
- [ ] No console errors or warnings on any page (manual)
- [x] Tab order through header is logical (logo → primary nav → more
      → search → channel icons → theme)
- [x] All images have `alt` text
- [x] Focus rings visible (cyan, 2px, 2px offset)

## Anti-slop final check

- [x] No Inter / Roboto / Arial / system stack on screen — Mona Sans /
      Fraunces / JetBrains Mono only
- [x] No purple gradients
- [x] No rounded-2xl-with-shadow cards (sharp 2px borders, no shadow)
- [x] Hero is asymmetric on warm paper, not centered on white

---

## Manual tasks for the user after this PR merges (Part F)

### Tag the release

```bash
git fetch origin main
git checkout main
git pull
git tag -a v3.0.0 -m "Site v3.0 — public launch"
git push origin v3.0.0
```

### Flip the launch news entry to visible

Edit `src/content/news/v3-launch.mdx` and change `draft: true` →
`draft: false`. Push. The home page Latest News strip and `/news`
list pick it up automatically.

### Set GSC verification token

1. <https://search.google.com/search-console> → Add property → URL
   prefix → `https://cyanmishra92.github.io/`
2. HTML tag verification → copy the `content="..."` value
3. **Settings → Secrets and variables → Actions → Variables tab**
   (the Variables tab — *not* Secrets) → new variable
   `PUBLIC_GSC_VERIFICATION` = pasted token
4. Push any commit OR manually trigger the deploy workflow
5. Click Verify in Search Console
6. Submit `https://cyanmishra92.github.io/sitemap-index.xml`
7. URL Inspection on `/`, `/about`, `/publications`, `/cv`,
   `/contact` → Request Indexing on each

Full walkthrough in [`SEO.md`](./SEO.md).

### Bing Webmaster

1. <https://www.bing.com/webmasters>
2. Sign in with same Google account
3. **Import from Google Search Console** — one click

### Backlink migration

Per [`MIGRATION.md`](./MIGRATION.md):
- LinkedIn About / Contact section
- Google Scholar profile homepage URL
- DBLP corrections form
- Email signature
- Pinned posts on Twitter/Mastodon/Bluesky
- Penn State CSE page (request via webmaster)
- Talk slides (update for next reprint)

15-checkbox tracker in `MIGRATION.md` so you can mark items as you go.

### 24h post-launch verification

- Confirm StatCounter dashboard at <https://statcounter.com> shows
  pageviews on the new domain
- Check Search Console "Coverage" report — expect "URL is on
  Google" within a week, faster after Request Indexing
- Run the citation-drift workflow once via `workflow_dispatch`.
  Confirm clean output.

Per the day-after-deploy ritual in [`SEO.md`](./SEO.md).
