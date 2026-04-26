# Citations — monthly sync playbook

The site's citation totals and per-paper "cited by N" counts come from
**one file**: [`src/data/citations-source.json`](../src/data/citations-source.json).
You sync it manually, monthly-ish, by editing it in the GitHub web UI.
Two GitHub Actions handle the rest: an auto-stamp workflow keeps the
dates honest, and a drift detector pings you when external sources
have moved past where the source file says they are.

## How to sync (5 minutes, monthly)

1. **Open Scholar** at
   <https://scholar.google.com/citations?user=oizH-wQAAAAJ>. Click
   **"Show more"** at the bottom of the publications list until every
   paper is visible.
2. **Open the source file** in the GitHub web UI. Quickest path:
   <https://github.com/cyanmishra92/cyanmishra92.github.io/edit/main/src/data/citations-source.json>
3. **For each paper in the JSON**, find the matching `Cited by N` on
   the Scholar page and update the `citations` field. The IDs in the
   JSON match the slugs of files in `src/content/publications/`, so
   most are obvious from the title.
4. **From Scholar's right sidebar**, copy:
   - Total **Citations** → `totals.citations`
   - **h-index** → `totals.hIndex`
   - **i10-index** → `totals.i10Index`
5. **Click "Commit changes…"** at the bottom of the GitHub editor.
   Write any commit message you want. **Don't worry about updating any
   `lastUpdated` or `_lastVerified` dates** — the auto-stamp workflow
   does that for you.
6. **Done.** The push triggers:
   - `citations-stamp.yml` — bumps `_lastVerified` to today + the
     `lastUpdated` of any paper whose count actually changed. Commits
     back with `[skip ci]`.
   - `Deploy to GitHub Pages` — rebuilds the site with the new numbers.
   - If any open `bot:citation-drift` issue exists, it auto-closes the
     next time the drift detector runs (Monday 06:00 UTC) and finds
     the source file in sync with external APIs.

## What if I forget to sync for months?

The drift detector (`.github/workflows/citation-drift.yml`) runs every
Monday at 06:00 UTC. It compares the source file against:

- **Semantic Scholar** (batch endpoint, by DOI / arXiv ID)
- **OpenAlex** (per-paper DOI lookup)
- **OpenAlex author works** — when `SITE.openAlexAuthorId` is set in
  `src/lib/site.ts`. Cleaner than per-paper title search.

When a paper's external high-water-mark exceeds **1.2 ×** the source
file's count **and** the absolute delta is **≥ 3** (both must hit, to
avoid noise on low-cited papers), the workflow opens or updates a
single tracking issue:

> 🟡 **chore: time to sync citations from Scholar**
> labels: `bot:citation-drift`

The issue body lists each drifted paper, the source count, the external
max, the delta, and which API reported what. Click through to Scholar,
sync, push.

When the source is back in sync, the drift detector closes the issue
automatically with `✓ Source file is in sync.`

## Why the manual approach?

Google Scholar's counts are systematically higher than any structured-
metadata API (S2, OpenAlex, Crossref) because Scholar indexes more
sources — theses, technical reports, patents, books, blogs that link
papers. For an academic profile, Scholar is the real ranking signal,
so we cite Scholar values verbatim and treat the APIs only as a sanity
check.

There's no Scholar API. There won't be. The 5-minute monthly manual
sync is the cheapest reliable path.

If/when the manual sync becomes painful, deferred automations are
documented in [`CITATIONS_FUTURE.md`](./CITATIONS_FUTURE.md) (a
bookmarklet that scrapes Scholar in your browser, and a local
Playwright script). Both are off-by-default and untouched until you
opt in.

## File reference

```jsonc
// src/data/citations-source.json
{
  "_source": "Google Scholar",
  "_scholarUrl": "https://scholar.google.com/citations?user=oizH-wQAAAAJ",
  "_lastVerified": "2026-04-25",   // auto-stamped on every push
  "totals": {
    "citations": 498,
    "hIndex": 10,
    "i10Index": 10
  },
  "perPaper": {
    "cocktail-nsdi-2022": {
      "citations": 133,
      "lastUpdated": "2026-04-25"  // auto-stamped when this number changes
    },
    // … one entry per paper in src/content/publications/
  }
}
```

The home stats strip reads `totals.{citations,hIndex}`. PaperItem
reads `perPaper[id].citations` and renders `cited by N` next to each
paper. Under-review and to-appear papers do **not** render a "cited by 0"
line — they render nothing in that slot.

## Fields you should not edit

- `_lastVerified` — auto-stamped by `citations-stamp.yml`.
- `perPaper.<id>.lastUpdated` — auto-stamped when the corresponding
  `citations` value changes.

If you do edit them by hand, the next push just stamps them again. No
harm; just unnecessary churn.

## Adding a new paper

When you add a publication via `src/content/publications/<id>.json`,
also add an entry under `perPaper.<id>` in `citations-source.json` with
`citations: 0` and a placeholder `lastUpdated`. The drift detector will
flag it whenever it picks up cites externally. Or skip the entry and
the home page just won't show a "cited by N" for that paper until you
add one.

## Why a paper might show "cited by 1" or "cited by 0"

These are not bugs — they're (probably) the truth from the last sync.
Fresh acceptances start at zero cites and accumulate slowly; a single
"1" usually means one paper somewhere already cited it (often a
co-authored follow-up or a tracking paper).

If you suspect the count is wrong:

1. Open the [Scholar profile](https://scholar.google.com/citations?user=oizH-wQAAAAJ)
   in another tab and search for the paper title.
2. Check the `Cited by` number in the right column of that row.
3. If it doesn't match what's in `src/data/citations-source.json` →
   edit the `citations` value via the GitHub web UI per the playbook
   above and push. The auto-stamp workflow handles the date.

The home strip and `/publications` `cited by N` badge already
**suppress the badge entirely** when:

- `citations === 0` for any paper (the badge would be `cited by 0`,
  which is noise),
- the paper's `status` is `under-review` or `to-appear` (no public
  citation tracking exists yet, so we don't fabricate one).

So a paper with no badge displayed is either genuinely uncited or
not yet eligible — both correct.
