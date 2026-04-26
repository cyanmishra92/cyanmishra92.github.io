# SEO + indexing

Everything wired into the site for getting Google and friends to surface
the right pages, and the manual-once steps that depend on tokens we
don't keep in source control.

## What's already wired (no action needed)

| Surface                          | Where                                             | Notes |
|----------------------------------|---------------------------------------------------|-------|
| Canonical URL                    | `BaseLayout.astro` → every page                   | `<link rel="canonical">` to absolute URL |
| `sitemap-index.xml`              | `@astrojs/sitemap` → `/sitemap-index.xml`         | All routes including pagination |
| `robots.txt`                     | `public/robots.txt`                               | `User-agent: *` allow + sitemap reference |
| Open Graph + Twitter Card        | `BaseLayout.astro`                                | Per-page; `og:image` is satori-generated PNG |
| `Person` JSON-LD                 | `BaseLayout.astro`                                | Site-wide |
| `WebSite` JSON-LD + `SearchAction` | `src/pages/index.astro`                         | Home only — helps Google show a sitelinks search box |
| `BreadcrumbList` JSON-LD         | `BaseLayout.astro` via `breadcrumbs` prop         | All nested pages |
| `ScholarlyArticle` JSON-LD       | `src/pages/publications.astro`                    | One per paper |
| `BlogPosting` JSON-LD            | `src/pages/blog/[...slug].astro`                  | Per post |
| RSS feed                         | `src/pages/rss.xml.ts`                            | News + blog combined; linked from `<link rel="alternate">` |
| `noindex` opt-out                | `BaseLayout.astro` `noindex` prop                 | Used on `/404` |

The site uses `cyanmishra92.github.io` (no custom domain). All canonical
URLs are absolute against `https://cyanmishra92.github.io/`.

---

## Google Search Console verification

Status: **token not set** — the `<meta name="google-site-verification">` tag
isn't emitted yet. Until it is, GSC can't verify the property.

### Steps

1. Sign in at https://search.google.com/search-console.
2. **Add property** → choose **URL prefix** → enter
   `https://cyanmishra92.github.io/`.
3. When prompted to verify, choose the **"HTML tag"** method. It'll show
   a string like `<meta name="google-site-verification" content="ABCDEF...">`.
   Copy just the value of `content="..."`.
4. In the GitHub repo: **Settings → Secrets and variables → Actions →
   Variables → New repository variable**:
   - Name: `PUBLIC_GSC_VERIFICATION`
   - Value: paste the token from step 3.
5. Push any commit (or `workflow_dispatch` Deploy). The next deploy
   bakes the verification meta tag into every HTML page.
6. Back in GSC, click **Verify**. It should succeed within seconds.
7. Once verified, **Sitemaps → Add a new sitemap** →
   `sitemap-index.xml`.
8. **URL Inspection** the home page, `/about`, `/publications`, `/cv` →
   **Request indexing** for each. Speeds up the first crawl.

### Why a repo *variable*, not a *secret*

The token is publicly visible in the rendered HTML anyway (it's a meta
tag). A repo variable can be referenced from `${{ vars.X }}` in
workflows; secrets can't be read at non-secret contexts. The
`PUBLIC_` prefix is Astro's convention for build-time env vars exposed
to the client bundle.

---

## Bing Webmaster Tools

Same pattern — `<meta name="msvalidate.01" content="...">` driven by
`PUBLIC_BING_VERIFICATION`. **Easier shortcut**: Bing Webmaster supports
one-click import from Search Console, so once GSC is verified you can
skip the meta-tag dance.

### Steps (if not importing from GSC)

1. Sign in at https://www.bing.com/webmasters.
2. **Add a site** → `https://cyanmishra92.github.io/`.
3. Choose **Meta tag** verification. Copy the `content="..."` value.
4. Repo **Settings → Variables → Actions** → new variable
   `PUBLIC_BING_VERIFICATION` = the token.
5. Push, deploy, click **Verify** in Bing Webmaster.
6. Submit the sitemap.

### Steps (importing from GSC — recommended)

1. In Bing Webmaster, **Import from Google Search Console**.
2. Sign in with the same Google account that verified the property in GSC.
3. Pick the verified property. Done — no token, no commit.

---

## IndexNow (Bing, Yandex, Naver, etc.)

IndexNow lets us tell search engines about new/changed URLs the moment
they go live, instead of waiting for them to crawl us. Bing, Yandex,
Naver, Seznam, and Yep currently support it.

### Already wired

| Piece                                              | Status |
|----------------------------------------------------|--------|
| 32-char API key                                    | `169cc72c88778a725f0e4b20ea849813` |
| Verification file at `/<KEY>.txt`                  | `public/169cc72c88778a725f0e4b20ea849813.txt` (committed) |
| Submit script (`scripts/indexnow-submit.ts`)       | maps deploy-commit diff → public URLs → POSTs to IndexNow |
| Workflow (`.github/workflows/indexnow.yml`)        | triggers on `workflow_run` of `Deploy to GitHub Pages` success |

The default key is checked into the repo because IndexNow's "secret"
is just the verification file alongside it — anyone can read both at
runtime, so checking the key in is no worse than what's already public.

### Key rotation procedure

If you ever need to rotate the key (paranoia, or if the file is
deleted):

1. Generate a new 32-char hex key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```
2. Save to `public/<NEW_KEY>.txt` containing the same key string.
3. Delete the old `public/<OLD_KEY>.txt`.
4. **Settings → Secrets and variables → Actions → Secrets → New
   repository secret**:
   - Name: `INDEXNOW_KEY`
   - Value: the new key.
5. Push. The next deploy ships the new verification file; the next
   `workflow_run` of Deploy uses the secret as the override.

### How submission works

On every successful deploy:
1. Workflow checks out the deployed commit + its parent.
2. `git diff --name-only` against the parent gives the changed files.
3. `scripts/indexnow-submit.ts` maps source paths to public URLs:
   - `src/pages/about.astro` → `/about/`
   - `src/content/projects/<slug>.mdx` → `/projects/<slug>/` + `/projects/`
   - `src/content/blog/<slug>.mdx` → `/blog/<slug>/` + `/blog/` + `/rss.xml`
   - `src/content/news/<slug>.mdx` → `/news/` + `/rss.xml`
   - `src/content/publications/*.json` → `/publications/`
4. POSTs `{ host, key, keyLocation, urlList }` to
   `https://api.indexnow.org/IndexNow`.
5. Logs the HTTP status. Soft-failures so a network blip doesn't fail
   the post-deploy chain.

Re-submissions are fine — IndexNow is idempotent and just refreshes
crawl priority.

---

## Verification checklist after the first deploy

When the deploy lands and you've set the GSC + Bing tokens:

- [ ] `view-source:https://cyanmishra92.github.io/` shows
      `<meta name="google-site-verification" content="...">` and
      `<meta name="msvalidate.01" content="...">`.
- [ ] `view-source:https://cyanmishra92.github.io/` shows three
      `<script type="application/ld+json">` blocks: `Person`,
      `BreadcrumbList` (no — home has none), `WebSite`. Nested pages
      have `BreadcrumbList`.
- [ ] `https://cyanmishra92.github.io/sitemap-index.xml` resolves and
      lists all routes.
- [ ] `https://cyanmishra92.github.io/robots.txt` resolves and points
      to the sitemap.
- [ ] `https://cyanmishra92.github.io/169cc72c88778a725f0e4b20ea849813.txt`
      returns the 32-char key.
- [ ] [Twitter Card validator](https://cards-dev.twitter.com/validator)
      and [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
      render the OG image cleanly.
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results)
      on `/publications/` parses the `ScholarlyArticle` entries
      without errors.
- [ ] StatCounter dashboard shows traffic on the new domain
      (see [`ANALYTICS.md`](./ANALYTICS.md)).

---

## Day-after-deploy ritual (every meaningful release)

After any release that changes more than a handful of pages — or
after every `Phase 7.x` PR merge in particular — do this 24 hours
later:

1. **Search Console → Coverage / Pages.** Filter to "Last crawled in
   the past 24 hours." Confirm the home and any newly-added route
   appear with `Indexed` status.
2. **Search Console → URL Inspection** for the home URL and one new
   nested page. Confirm `URL is on Google` and the `Page changes`
   stamp matches the deploy date.
3. **StatCounter → Recent visitor activity.** A test visit you make
   should appear within ~60 seconds. Hash should still be `d39bf83e`
   in the network panel; project ID `13144757`. If StatCounter
   stopped recording, see [`ANALYTICS.md`](./ANALYTICS.md) "Why
   preserve the legacy hash?" for the recovery path.
4. **Bing Webmaster → Site Explorer** for any new URL. `Allowed by
   robots.txt`, `Indexable`, `Discovered via sitemap` should all be
   green.

If any of these check fails, open a `bot:seo-regression` issue with
the URL and the failing report so it doesn't get lost in the next
release cycle.

---

## Future: Google Tag Manager / GA4

Skipped for now. If/when you add GA4, drop a `dns-prefetch` for
`www.googletagmanager.com` in `BaseLayout.astro`'s head and inject the
GTM snippet behind a `PUBLIC_GTM_CONTAINER_ID` env-var check, the same
pattern as Plausible.
