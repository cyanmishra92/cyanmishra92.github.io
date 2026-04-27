# Blog operations manual

How the blog works behind the scenes, and what to do when authoring.

## Lifecycle

Every post in `src/content/blog/` carries a `status` in its frontmatter:

| Status | URL | On `/blog/` | RSS | Sitemap | Indexed |
|---|---|---|---|---|---|
| `idea` | `/blog/ideas/<slug>/` | no | no | no | `noindex` |
| `draft` | `/blog/drafts/<slug>/` | no | no | no | `noindex` |
| `published` | `/blog/<slug>/` | yes | yes | yes | yes |
| `archived` | `/blog/<slug>/` (same URL) | no | no | yes | yes |

Default is `draft` — a new file is private until promoted.

### When to use each

- **idea** — captured thought, no commitment. Lives under `/blog/ideas/`. Useful for "I want to write about this someday." A scratchpad.
- **draft** — actively writing. Has a sharable preview URL. Anyone with the link can read; search engines won't.
- **published** — the canonical state for live posts. Gets a `BlogPosting` JSON-LD card, shows up in `/blog/`, broadcasts on RSS.
- **archived** — a post you no longer feature but don't want to break links for. URL stays the same (`/blog/<slug>/`), but it disappears from `/blog/` and RSS. Visible in `/blog/archive/`.

### Promotion workflow

```
idea  →  draft  →  published  →  archived
            │           │
            │           └─ unchanged URL when promoted to archived
            │
            └─ URL changes when promoted: /blog/drafts/<slug>/ → /blog/<slug>/
```

Promote by editing the file's frontmatter and pushing:

```yaml
status: draft   # was: idea
```

A promotion from `draft` → `published` changes the URL. If you've shared the draft link with anyone, the old URL 404s after the next build. That's intentional — drafts and published posts are different things.

## Authoring

### Frontmatter

```yaml
---
title: Post title
description: One-liner that ends up in /blog/, OG card, RSS.
date: 2026-04-26
status: draft
tags: [perf, ml-systems]   # any number; used for filtering and related-post selection

# optional
updated: 2026-05-10
toc: true                  # auto-renders ToC if 3+ H2s. set false to suppress.
audio: /audio/<slug>.mp3   # forward reference for Phase 8.2 narration

# series — set when this post is part of a multi-part sequence
series:
  name: Building axi-decode
  slug: building-axi-decode
  part: 2
  total: 5
---
```

### MDX components

These are auto-imported — use them inline in any post without an `import` line.

#### `<Figure>`

Sharp-bordered image with auto-numbered caption.

```mdx
<Figure
  src="/img/blog/perf-counter-trace.png"
  alt="Plot showing IPC over time"
  caption="IPC during the matmul kernel — note the dip at 1.2s when the L2 spills."
  width="default"   {/* "default" | "wide" | "full" */}
/>
```

#### `<Aside variant="...">`

Callout box. `note`, `warning`, `tip`, or `todo`. Todos render only in dev — they hide in production.

```mdx
<Aside variant="note">
  This is the body of the aside.
</Aside>
```

#### `<Quote source="..." sourceUrl="...">`

Pull quote in Fraunces italic with attribution.

```mdx
<Quote source="Donald Knuth" sourceUrl="https://example.com">
  Premature optimization is the root of all evil.
</Quote>
```

#### `<Footnote>` / `<Sidenote>`

Numbered footnote at the marker. The body is collected at the bottom of the post in a `// notes` section. `<Sidenote>` does the same but renders in the right margin on desktop ≥1280 px.

```mdx
This claim<Footnote>Source: the only paper I could find on this.</Footnote> is well-supported.
```

#### Math

Inline: `$E = mc^2$`.

Display with caption — use `<EquationBlock>`:

```mdx
<EquationBlock caption="energy-delay product">
$$
\text{EDP} = E \cdot t_{\text{exec}}
$$
</EquationBlock>
```

#### `<Diagram>`

Mermaid diagram. Source goes in the slot. Lazy-loads `mermaid` only when at least one diagram exists on the page.

```mdx
<Diagram caption="control flow">
{`flowchart LR
  A --> B
  B --> C`}
</Diagram>
```

The diagram inherits the site's light/dark palette via Mermaid theme variables — it re-renders on theme toggle.

### Code blocks

Powered by [Expressive Code](https://expressive-code.com). Beyond plain fenced blocks:

````mdx
```python title="example.py" showLineNumbers
def fizzbuzz(n: int) -> str:
    ...
```
````

- `title="..."` — caption bar above the block.
- `showLineNumbers` — opt-in, mono and muted.
- `{2-4,7}` — highlight specific lines: `\`\`\`python {2-4,7}`.
- A `[ copy ]` button is added automatically with a 1.5 s confirmation.

## Series

A multi-part series renders three things automatically:

1. A "Part N of M" caption in each post's header, linking to the series index.
2. Previous / next sibling cards at the bottom of each post.
3. A series index page at `/blog/series/<slug>/` listing every part in order.

The series index only generates publicly when **every** part is `published` or `archived`. If any part is still `draft` or `idea`, sibling cards still work between drafts (linking through the `/blog/drafts/...` URLs), but the public index URL doesn't materialize.

## Drafts and previews

A draft post lives at `/blog/drafts/<slug>/`. Three things:

1. The page carries `<meta name="robots" content="noindex,nofollow">`. Search engines won't index it.
2. It's not in `/sitemap-index.xml`.
3. There's no password gate — the URL itself is the secret. Share it directly with whoever you want feedback from.

Once promoted to `published`, the URL changes from `/blog/drafts/<slug>/` to `/blog/<slug>/`. Old draft links 404. Don't share draft links you don't want to break.

## Webmentions

[Webmention](https://www.w3.org/TR/webmention/) is the IndieWeb's inbound notification protocol — when someone writes about your post on their own site (or via a bridge like brid.gy that mirrors X / Mastodon / Bluesky activity), you receive a webmention. The site renders likes, reposts, and replies on the post itself.

### How the pipeline works

1. `BaseLayout.astro` declares the webmention endpoint:
   ```html
   <link rel="webmention" href="https://webmention.io/cyanmishra92.github.io/webmention" />
   ```
2. [webmention.io](https://webmention.io) receives mentions on our behalf. Account name: `cyanmishra92.github.io`.
3. At build time, `scripts/fetch-webmentions.ts` (run by `npm run build`) calls the webmention.io API with the `WEBMENTION_IO_API_TOKEN` repo Secret, and writes the full feed to `.astro/webmentions-cache/all.json`.
4. The post layout reads that cache, filters by `wm-target` to match each canonical post URL, groups by `wm-property` (likes / reposts / replies), and renders the section.
5. If the cache is missing, the API call fails, or the token is unset, the build emits a warning and continues with no webmentions data. Never blocks deployment.
6. Posts with zero mentions render no section at all — there's no empty state.

### Testing a webmention

The easiest end-to-end check is via [indiewebify.me](https://indiewebify.me/send-webmentions/):

1. Pick a post URL (must be `published`).
2. Use indiewebify.me's "send a webmention" tool, supplying the test source URL and your post URL as the target.
3. Run `npm run build` (or push and let CI build) — the fetch script picks up the new mention.
4. The mention appears on the post.

### Pingbacks: intentionally disabled

Pingback is the legacy XML-RPC predecessor to webmention. It generates spam, the protocol has been abandoned by every modern publisher, and webmention.io even offers it as a checkbox we declined. There is no `<link rel="pingback">` on this site. Don't add one.

## Editing flow

Every published post carries a `// found a typo? edit on github →` link in the footer. It points at GitHub's web editor for the source MDX. For non-collaborators, GitHub auto-forks and opens a PR. The barrier to a typo fix is a single click.

## Audio narration

Every published post is narrated by OpenAI's `tts-1-hd` model in the `echo` voice and served via a sharp-bordered audio player at the top of the post. Generation runs at build time. The MP3 ships **two ways**:

1. **Primary:** committed into the repo at `public/audio/<hash>.mp3` and served same-origin from `https://cyanmishra92.github.io/audio/<hash>.mp3`. Always reachable for anyone who can reach the blog at all — survives corporate firewalls that block third-party CDNs.
2. **Mirror (best-effort):** uploaded to Cloudflare R2 at `audio/<hash>.mp3`. Used as a fallback for the rare cases the same-origin path misbehaves. RSS uses the GitHub Pages URL (always absolute) so podcast clients always get the canonical copy.

The slug → metadata map lives in `src/data/blog-audio.json`.

### Per-post controls

```yaml
audio: enabled         # default. set to 'disabled' to skip generation.
audioVoice: echo       # default. options: alloy | echo | fable | onyx | nova | shimmer.
audioReadAs: |         # optional pre-recorded narration script.
  When provided, this text is sent to TTS verbatim instead of the
  auto-preprocessed post body. Use this for posts with heavy math,
  dense code, or any narration that needs hand-tuning.
```

### How it works

When you push a blog post with `status: published`, the `Blog audio — generate` workflow runs:

1. **Preprocess** the MDX into prose-with-prosody-friendly punctuation (em-dashes for emphasis, real periods at headings, brief pauses inside list items).
2. **Hash** `(script + voice + model + preprocessor_version)`. Skip if the slug already has that hash in `src/data/blog-audio.json`.
3. **Chunk** at sentence boundaries into ≤4000-char slices.
4. **Call** OpenAI `tts-1-hd` per chunk; concatenate the resulting MP3 buffers (binary concat works for MP3 frames).
5. **Write** the MP3 to `public/audio/<hash>.mp3` (the same-origin primary).
6. **Mirror** to R2 at `audio/<hash>.mp3` (best-effort; if the upload fails the post still works via the same-origin path).
7. **Commit** `src/data/blog-audio.json` and `public/audio/` back to main. The deploy workflow fires automatically on the auto-commit; the audio workflow's `paths:` filter prevents recursion (it only watches `src/content/blog/**` and `scripts/blog-audio/**`).

The next deploy serves the audio. End-to-end is ~2 min per post.

### Idempotency

The script is keyed by `hash(script + voice + model + preprocessor_version)`. Re-running on unchanged posts is a no-op (`0 generated, N cached`). Audio only regenerates when:

- the post's narrated content changes,
- the post's `audioVoice` changes,
- the OpenAI model version changes (rare),
- `PREPROCESSOR_VERSION` is bumped in `scripts/blog-audio/preprocess.ts`.

Bumping the preprocessor version intentionally regenerates every post on the next workflow run. Useful when you've improved the preprocessing rules and want every existing post re-narrated.

### Cost

OpenAI `tts-1-hd` is **$30 per 1M characters**. A typical 5,000-word post (~30K chars) costs about **$0.90** to generate once. Repeat builds are free (idempotent). The OpenAI account has a **$5/month hard cap** as a safety belt.

The workflow logs cost per post and a total at the end:

```
[audio] hello-world: 8732 chars, 2 chunks, generated $0.26
[audio] summary: 3 generated, 5 cached, 0 errors, estimated cost $0.78
```

If a single run shows >$2, investigate — likely a bug or an unintended preprocessor-version bump.

### Manual regeneration

`workflow_dispatch` on the `Blog audio — generate` action accepts:

- `slug` — regenerate just one post
- `force: true` — regenerate even when the hash matches (useful when sampling a different voice)

### Voices (samples at https://platform.openai.com/docs/guides/text-to-speech)

- `alloy` — neutral, calm, the OpenAI house voice
- `echo` — deeper, measured, technical-feeling **(default)**
- `fable` — warm, narrative
- `onyx` — deep, authoritative, documentary
- `nova` — warm, expressive
- `shimmer` — calm, clear

Override per-post with `audioVoice:` in frontmatter.

### Failure modes

The pipeline is fail-soft. If the OpenAI call rate-limits, the local write fails, or any Secret is missing, the workflow logs a warning and skips that post — the deploy still goes through, the post just renders without an audio player. Run the workflow manually later (`slug: <slug>`) to retry.

R2 uploads are best-effort. A failed mirror upload only logs a warning; the post still serves audio via the same-origin GitHub Pages copy.

If a specific post's auto-narration sounds off, set `audioReadAs: |` in its frontmatter with a hand-tuned script. The preprocessor returns that string verbatim and TTS sees nothing else.

### When the player can't reach the primary

Some corporate networks block Cloudflare R2's public dev URLs (`pub-*.r2.dev`) as generic CDN content. If a reader's network does the same to the same-origin path (extremely rare — same origin as the page they're already reading), the player auto-falls-back to the R2 mirror once on the first real `MediaError`. A small `// primary blocked? play from mirror ↗` link sits beneath the player so the reader can also opt in manually.

### Podcast feed

The RSS feed includes an `<enclosure>` element on every post that has audio. That makes the blog also function as a podcast feed for free — anyone can subscribe in Overcast, Pocket Casts, or Apple Podcasts (via the RSS URL) and get the audio version automatically.

### Architecture at a glance

```
content/blog/*.mdx  →  preprocess.ts  →  OpenAI TTS  →  MP3 chunks
                                                            ↓
                                                       Buffer.concat
                                                            ↓
                                  ┌─────────────────────────┴─────────────────────────┐
                                  ↓                                                   ↓
                       public/audio/<hash>.mp3                         Cloudflare R2 (mirror, best-effort)
                       (committed → GitHub Pages, same-origin)         (immutable, public dev URL)
                                  │                                                   │
                                  └────────────────────┬──────────────────────────────┘
                                                       ↓
                                              src/data/blog-audio.json
                                              (url + optional mirror)
                                                       ↓
                                              <AudioPlayer /> in BlogPost.astro
                                              (primary first, mirror fallback on error)
```

### Files

- `scripts/blog-audio/preprocess.ts` — MDX → narration prose. Bump `PREPROCESSOR_VERSION` to invalidate the cache.
- `scripts/blog-audio/generate.ts` — TTS, chunking, R2 upload, JSON write.
- `.github/workflows/blog-audio.yml` — triggers on push to `src/content/blog/**` and on `workflow_dispatch`. Auto-commits the JSON with `[skip ci]`.
- `src/data/blog-audio.json` — slug → `{ url, duration, voice, scriptHash, ... }`. Don't edit by hand; the workflow owns it.
- `src/components/blog/AudioPlayer.tsx` — Preact island, native `<audio>`, scrubber + speed pills + keyboard shortcuts (Space, ←/→, ↑/↓, M, 0).

## Cheatsheet

```bash
# new post (defaults to draft)
$ touch src/content/blog/<slug>.mdx

# preview locally
$ npm run dev

# build (runs the webmention fetch first; safe even without the token)
$ npm run build

# promote draft → published: edit the file's `status:` field and commit
```
