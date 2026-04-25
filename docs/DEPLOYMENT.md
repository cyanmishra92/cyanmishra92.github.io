# Deployment

The site is built by `.github/workflows/deploy.yml` and published to GitHub
Pages by `actions/deploy-pages@v4`.

## One-time setup (REQUIRED)

You **must** switch GitHub Pages from "Deploy from a branch" to
**"GitHub Actions"** mode. Until you do this, GitHub will keep trying to
build the repo with the legacy Jekyll builder and fail (see the symptom
below).

1. Open <https://github.com/cyanmishra92/cyanmishra92.github.io/settings/pages>.
2. Under **Build and deployment** → **Source**, switch from
   *Deploy from a branch* to **GitHub Actions**.
3. Save. (No other action needed — the next push to `main` triggers the
   custom workflow.)

That's it. From then on, every push to `main` runs:

1. `npm ci` + `npm run build` (Astro static output → `dist/`).
2. `actions/upload-pages-artifact` packages `dist/`.
3. `actions/deploy-pages` publishes it to <https://cyanmishra92.github.io/>.

## Symptom you'll see if Pages is still in "Deploy from a branch" mode

```
YAML Exception reading /github/workspace/src/layouts/BaseLayout.astro:
  (<unknown>): mapping values are not allowed in this context at line 9
ERROR: YOUR SITE COULD NOT BE BUILT:
       Invalid YAML front matter in /github/workspace/src/components/ThemeToggle.astro
```

That's `actions/jekyll-build-pages@v1.0.13` — the legacy GitHub Pages Jekyll
builder — trying to parse Astro component frontmatter (`---` blocks
containing JS/TS) as YAML. It can't. The fix is the source-mode switch
above.

The repo has a `.nojekyll` file at the root as a defense in depth. With
`.nojekyll` present, Pages in branch mode publishes the source tree as-is
without invoking Jekyll — but the result is a directory listing of
`package.json`, `node_modules`, etc., not a site. The custom Astro deploy
workflow is the only correct path.

## Other workflows

- `.github/workflows/build-resume.yml` — rebuilds
  `public/cv/Cyan_Subhra_Mishra_Resume.pdf` from `assets/texsources/resume.tex`
  on every push that touches the `.tex`. Commits the regenerated PDF back to
  `main` with `[skip ci]`. Phase 2.
- `.github/workflows/refresh-citations.yml` — weekly scheduled job that
  refreshes `public/data/citations.json` from the Semantic Scholar API.
  Phase 4.

## Local development

```bash
nvm use            # Node 20+
npm install
npm run dev        # http://localhost:4321
npm run build      # static output to ./dist
npm run check      # typecheck
```

## Domain configuration

The site is served from `cyanmishra92.github.io` (no custom domain). If
you ever add one, drop a `CNAME` file into `public/` and Astro will copy it
into `dist/` so Pages picks it up.
