# Migration off `sites.google.com/view/cyansubhramishra/`

The old Google Sites page outranks the new site for some queries because
it's older and has accumulated backlinks. We deprecate it gradually
rather than killing it — a hard delete loses ranking signal we want to
inherit.

## The three-step plan

### Step 1 — Repurpose the old site as a landing page (this week)

Open the old site in Google Sites and replace the entire body content
with:

> # I've moved.
>
> My homepage now lives at **https://cyanmishra92.github.io**.
> Please update your bookmarks. This page will remain as a redirect
> for the foreseeable future, but new content goes to the new site.
>
> | Section | New URL |
> |---|---|
> | Home | https://cyanmishra92.github.io/ |
> | Research | https://cyanmishra92.github.io/research/ |
> | Publications | https://cyanmishra92.github.io/publications/ |
> | Projects | https://cyanmishra92.github.io/projects/ |
> | CV | https://cyanmishra92.github.io/cv/ |
> | Contact | https://cyanmishra92.github.io/contact/ |

Google Sites doesn't support custom HTTP redirects, but it does let you
embed an HTML widget. Add a soft-redirect via the **Embed → Embed code**
widget with this content:

```html
<meta http-equiv="refresh" content="3; url=https://cyanmishra92.github.io/">
<noscript>
  <p>Redirecting in 3 seconds…
     <a href="https://cyanmishra92.github.io/">Click here if not redirected.</a></p>
</noscript>
```

Some browsers honor the meta refresh; some don't. Either way, the
explicit visible link grid is the primary CTA. Crawlers see both.

### Step 2 — Backlink audit (this week, ongoing)

Search for `"sites.google.com/view/cyansubhramishra"` (with quotes) in
each venue below; replace each occurrence with
`https://cyanmishra92.github.io/`. Mark each item as you finish.

#### High-priority (you control directly, biggest ranking signal)

- [ ] **Google Scholar profile** — homepage URL field. Edit at
      https://scholar.google.com/citations?hl=en&user=oizH-wQAAAAJ →
      pencil icon next to the name.
- [ ] **LinkedIn About / Contact info** — replace the website link
      under "Contact info" and any in-line URL in the About section.
- [ ] **Email signature** — Gmail Settings → General → Signature.
- [ ] **GitHub profile** — `github.com/cyanmishra92` settings → Bio /
      Website field.
- [ ] **DBLP author page** — submit a correction at
      https://dblp.org/pid/263/7470.html → "Search for an Updated Page"
      link, request the homepage URL be updated.
- [ ] **Instagram bio** — replace the website link if present.

#### Medium-priority (request edits from third parties)

- [ ] **Penn State CSE student / alumni page** — email the CSE
      webmaster requesting the personal-website link be updated. The
      university's `.edu` domain is a high-value backlink.
- [ ] **Microsystems Design Lab page** at Penn State.
- [ ] **NIT Rourkela alumni directory** if listed.
- [ ] **Co-author profiles** — when you co-authored with someone whose
      personal site lists you, ask them to update the link next time
      they refresh their page. Don't pester.

#### Long-tail (one-time, low-effort)

- [ ] **Conference talk slides (PDFs)** — update for the next reprint
      / repost. Don't re-upload past slides; just fix the master file.
- [ ] **GitHub repo READMEs** — search across your repos:
      ```bash
      gh search code "sites.google.com/view/cyansubhramishra" \
        --owner cyanmishra92
      ```
- [ ] **Twitter / X bio** if present.
- [ ] **Mastodon / Bluesky bio** if present.
- [ ] **Personal Notion / Roam / Obsidian shared pages** if any.

### Step 3 — After ~6 months and full Search Console indexation

Wait for the new site to outrank the old one for queries like
`"cyan subhra mishra"`, `"cyan mishra penn state"`,
`"cyan mishra arm"`. Watch this in Google Search Console under
**Performance → Queries**.

Once the new site reliably wins:

1. In Search Console, submit a removal request for the old
   `sites.google.com/view/cyansubhramishra/` URL set.
2. Then optionally delete the old site entirely. Or leave it as a
   permanent stub — the meta refresh + explicit link grid is harmless
   and catches anyone with stale bookmarks.

Don't delete the old site before step 3. Premature deletion drops the
ranking signal you're trying to inherit.

---

## Why not just delete and 301?

Google Sites doesn't support 301 redirects from
`sites.google.com/view/...` URLs. The only redirect mechanism is the
client-side meta refresh in the embed widget, which Google does honor
as a soft-redirect signal but takes longer to consolidate ranking than
a real 301 would.

If you ever need a real 301, the move is to put a custom domain in
front of both sites and configure DNS-level redirects — but that's
more infrastructure than this migration is worth.

---

## Status snapshot

| Item                              | Status |
|-----------------------------------|--------|
| New site live                     | ✅ |
| GitHub Pages source = Actions     | ✅ (otherwise this doc would be inaccessible) |
| Step 1 — old site landing page    | ⬜ pending |
| Step 2 — backlink audit           | ⬜ pending (checklist above) |
| Step 3 — old site removal request | ⬜ wait ~6 months |
