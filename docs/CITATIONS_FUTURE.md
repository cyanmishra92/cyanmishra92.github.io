# Citations — deferred automation ideas

The current model (`docs/CITATIONS.md`) is hand-edit JSON via the GitHub
web UI, ~5 min monthly. It's deliberately the lowest-tech reliable path.

If/when the manual sync becomes painful — say, the publications list
crosses 50, or you start updating citations more than monthly — these
two ideas can replace step 3 of the playbook (typing numbers into the
JSON editor). They were intentionally **not** built initially because
the current scale doesn't justify the maintenance burden of a second
moving piece.

If you implement either, update `docs/CITATIONS.md` to point at it.

---

## Idea A — Scholar bookmarklet

A one-click browser bookmarklet that, when pressed on
`scholar.google.com/citations?user=oizH-wQAAAAJ`, scrapes the visible
publications + sidebar totals and copies a fully-formatted
`citations-source.json` snippet to the clipboard. You then paste-replace
into the GitHub editor.

### DOM selectors (as of Apr 2026)

Scholar's profile page structure has been stable for years; these
should hold up barring a major redesign.

| Field                     | CSS selector |
|---------------------------|--------------|
| Publications table rows   | `#gsc_a_b > tr.gsc_a_tr` |
| Per-row title             | `td.gsc_a_t a.gsc_a_at` (text) |
| Per-row Cited-by count    | `td.gsc_a_c a.gsc_a_ac` (text; empty when 0) |
| Per-row authors line      | `td.gsc_a_t .gs_gray:nth-child(2)` (text) |
| Per-row venue line        | `td.gsc_a_t .gs_gray:nth-child(3)` (text) |
| Per-row year              | `td.gsc_a_y .gsc_a_h` (text) |
| Total citations (all)     | `#gsc_rsb_st td.gsc_rsb_std:nth-child(2)` first row |
| h-index (all)             | second row, second cell of same table |
| i10-index (all)           | third row, second cell |
| "Show more" button        | `#gsc_bpf_more` (click until disabled) |

### Title-to-id mapping

The hardest part: mapping Scholar's free-text titles to our
`src/content/publications/<id>.json` IDs. Two approaches:

1. **Embed the mapping in the bookmarklet.** Hard-code an array
   `[{ scholarTitle: 'Cocktail: A Multidimensional...', id: 'cocktail-nsdi-2022' }, ...]`.
   Brittle but explicit.
2. **Fuzzy-match against a list of IDs.** The bookmarklet fetches
   `https://cyanmishra92.github.io/data/publications-titles.json` (a
   build-time-generated index of `{ id: title }`) and Jaccard-matches
   each Scholar title against the list. More robust, but requires
   shipping a new public endpoint and adding a build step.

Recommend (1) for first cut, (2) when (1) breaks.

### Output JSON shape

The bookmarklet should produce exactly the shape of
`citations-source.json` so paste-replace works without manual cleanup.
Keep the `_source` / `_scholarUrl` / `_lastVerified` lines untouched
(or omit them and let the auto-stamp workflow populate `_lastVerified`
on push).

### Bookmarklet template

```javascript
javascript:(async function(){
  // 1. Click "Show more" until all rows visible.
  let btn = document.querySelector('#gsc_bpf_more');
  while (btn && !btn.disabled) {
    btn.click();
    await new Promise(r => setTimeout(r, 600));
    btn = document.querySelector('#gsc_bpf_more');
  }
  // 2. Scrape rows + totals.
  const rows = [...document.querySelectorAll('#gsc_a_b > tr.gsc_a_tr')].map(tr => ({
    title: tr.querySelector('td.gsc_a_t a.gsc_a_at')?.textContent ?? '',
    cites: parseInt(tr.querySelector('td.gsc_a_c a.gsc_a_ac')?.textContent || '0', 10),
  }));
  const totals = [...document.querySelectorAll('#gsc_rsb_st td.gsc_rsb_std')]
    .filter((_, i) => i % 2 === 0)
    .map(td => parseInt(td.textContent ?? '0', 10));
  // 3. Build output. (Title→id mapping lives in MAP — embed as needed.)
  const MAP = { /* fill in: scholarTitlePrefix → id */ };
  const perPaper = {};
  for (const r of rows) {
    const id = Object.entries(MAP).find(([prefix]) => r.title.startsWith(prefix))?.[1];
    if (id) perPaper[id] = { citations: r.cites, lastUpdated: new Date().toISOString().slice(0,10) };
  }
  const out = {
    totals: { citations: totals[0], hIndex: totals[1], i10Index: totals[2] },
    perPaper,
  };
  await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
  alert('Copied ' + Object.keys(perPaper).length + ' papers + totals to clipboard. Paste into citations-source.json.');
})();
```

---

## Idea B — Local Playwright sync script

Same goals as the bookmarklet, but runs locally (or in CI) without
needing you to open a browser. Useful if you want to schedule a sync.

### Why not in CI directly

Google has aggressive anti-bot detection on Scholar. A headless
Chromium running from a GitHub Actions IP gets CAPTCHA'd reliably.
Running locally on your own machine + browser session evades this — at
the cost of needing your machine online to run.

### Command shape

```bash
# One-shot sync from local Playwright
npm run citations-pull-from-scholar

# Or via the Playwright test runner directly
npx playwright test scripts/scholar-pull.spec.ts
```

### Implementation outline

```typescript
// scripts/scholar-pull.ts
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';

const SCHOLAR_URL = 'https://scholar.google.com/citations?user=oizH-wQAAAAJ';

async function main() {
  // Use a persistent context so Google's "I trust this device" cookie
  // survives between runs, reducing CAPTCHA frequency.
  const ctx = await chromium.launchPersistentContext('.cache/playwright', {
    headless: false,  // headed avoids CAPTCHA in practice
  });
  const page = await ctx.newPage();
  await page.goto(SCHOLAR_URL);

  // Click "Show more" until disabled.
  while (await page.isEnabled('#gsc_bpf_more')) {
    await page.click('#gsc_bpf_more');
    await page.waitForTimeout(700);
  }

  // Scrape the same selectors as the bookmarklet.
  const data = await page.evaluate(() => {
    // ... copy the bookmarklet logic verbatim ...
  });

  // Merge into existing source file.
  const path = 'src/data/citations-source.json';
  const source = JSON.parse(readFileSync(path, 'utf8'));
  for (const [id, entry] of Object.entries(data.perPaper)) {
    source.perPaper[id] = entry;
  }
  source.totals = data.totals;
  writeFileSync(path, JSON.stringify(source, null, 2) + '\n');
  await ctx.close();
}
main();
```

### Dependencies

```bash
npm i -D playwright
npx playwright install chromium
```

Adds ~150MB to the dev install and a ~300MB Chromium download. The
trade-off is lower per-sync friction.

---

## When to escalate to one of these

Triggers that say it's time:

- You miss two consecutive monthly syncs because of friction.
- The publications list crosses 50 entries.
- You start needing weekly (or more frequent) syncs for some external
  reason (e.g. a tenure-track portfolio reviewer asks for a current
  Scholar count).

Until any of those hit, the manual JSON-edit playbook in
`CITATIONS.md` is correct and cheap.
