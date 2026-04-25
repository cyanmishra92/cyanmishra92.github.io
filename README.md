# cyanmishra92.github.io · v2

Personal site of Cyan Subhra Mishra — Performance and Power Engineer at Arm.

The site lives at https://cyanmishra92.github.io/.

> **One-time setup needed.** GitHub Pages must be set to **"GitHub Actions"** as
> the build source — _not_ "Deploy from a branch" — or the legacy Jekyll
> builder will try to parse `.astro` files as YAML and fail. Settings → Pages
> → Source → **GitHub Actions**. Full details and the failure mode are in
> [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Stack

- **Astro 4** — static output, island architecture, content collections.
- **Tailwind CSS 3** — design tokens layered over a custom theme.
- **MDX** — for news entries, blog posts, and per-project deep-dives.
- **Preact** — for the few interactive islands (publication filter, BibTeX modal).
- **Self-hosted fonts** — Mona Sans (body), Fraunces (display), JetBrains Mono (mono).
- **GitHub Pages** — static deploy via Actions.

Aesthetic: **Technical Editorial** — refined, schematic, hardware-aware. See
`assets/skill/SKILL.md` for the design rules and the spec in
`docs/REBUILD_SPEC.md` (added in Phase 2).

## Run locally

```bash
nvm use            # Node 20+
npm install
npm run dev        # http://localhost:4321
npm run build      # static output to ./dist
npm run preview    # preview the production build
npm run check      # astro check / type check
```

## Repo layout

```
public/                 static assets (img/, cv/, og/, favicon)
src/
  components/           UI components (.astro), one per file
  content/              Astro content collections (Phase 3+)
  layouts/              page templates
  lib/                  site config, helpers
  pages/                routes (Astro file-based routing)
  styles/global.css     design tokens + base typography
assets/
  texsources/resume.tex source TeX for the CV (PDF auto-builds via Action)
  skill/SKILL.md        frontend-design skill (read before any UI work)
.github/workflows/      deploy + refresh-citations + build-resume
```

## How to add a news entry

(Wires up in Phase 4; until then, edit `src/pages/index.astro` placeholders.)

```bash
# After Phase 4:
echo '---
title: Joined Arm
date: 2026-01-15
---
Joined Arm in San Diego.' > src/content/news/joined-arm.mdx
```

## How to add a paper

(Wires up in Phase 3.) Each paper is a JSON file under
`src/content/publications/`. See `src/content/config.ts` for the schema and
`scripts/refresh-citations.ts` for the citation refresh job.

## How to add a blog post

(Wires up in Phase 4.) MDX file under `src/content/blog/` with frontmatter:

```yaml
---
title: Post title
date: 2026-04-25
description: One-line summary
tags: [perf, ml-systems]
draft: false
---
```

## CV

Source of truth is `assets/texsources/resume.tex`. On every push that
touches that file, `.github/workflows/build-resume.yml` rebuilds the PDF
and commits it to `public/cv/Cyan_Subhra_Mishra_Resume.pdf` (Phase 2).

## Branches

- `main` — production. Deploys via the `deploy.yml` workflow.
- `legacy-jekyll` — the old Jekyll site, frozen for reference.
- `claude/rebuild-portfolio-v2-mnmbx` — active rebuild branch.

## Phase status

| Phase | Scope | Status |
|------:|---------------------------------------------------------------|--------|
| 1 | Scaffold + design system + hero + deploy workflow | ✅ |
| 2 | Static content pages (about, research, teaching, talks, cv, contact) + resume PDF auto-build | ✅ |
| 3 | Publications + projects collections, filter/search, BibTeX modal | ⏳ |
| 4 | News, blog, RSS, citation refresh, GitHub stats | ✅ |
| 5 | OG images (satori), JSON-LD, link checker, PR smoke check | ✅ |
| 6 | Cutover to `main`, tag `v2.0.0` | ⏳ |
