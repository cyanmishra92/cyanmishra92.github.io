/** @jsxImportSource preact */
import { useEffect, useMemo, useState } from 'preact/hooks';
import Fuse from 'fuse.js';

interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  prettyDate: string;
  tags: string[];
}

interface Props {
  posts: PostMeta[];
}

/**
 * Tag chips + fuzzy search over /blog/. Mirrors the publications
 * filter island ergonomics so muscle memory transfers.
 *
 * Tag selection is OR within a single tag — no, wait — AND across
 * selected tags (a post must carry every selected tag). Fuse handles
 * the title / description / tags fuzzy match. Combined: post must
 * pass tag filter AND search filter to render.
 */
export default function BlogFilter({ posts }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [posts]);

  const fuse = useMemo(
    () =>
      new Fuse(posts, {
        keys: ['title', 'description', 'tags'],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [posts],
  );

  const filtered = useMemo(() => {
    let out = posts;
    if (selected.size > 0) {
      out = out.filter((p) => [...selected].every((t) => p.tags.includes(t)));
    }
    if (query.trim()) {
      const found = new Set(fuse.search(query.trim()).map((r) => r.item.slug));
      out = out.filter((p) => found.has(p.slug));
    }
    return out;
  }, [posts, selected, query, fuse]);

  function toggle(t: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setQuery('');
  }

  // Sync DOM list visibility — the SSR-rendered list lives outside
  // this island; we toggle each <li>'s display based on the filter
  // result. This keeps the SSR markup as the source of truth and
  // keeps the island stateless beyond filter state.
  useEffect(() => {
    const visibleSlugs = new Set(filtered.map((p) => p.slug));
    const list = document.querySelector('[data-blog-list]');
    if (!list) return;
    list.querySelectorAll<HTMLElement>('[data-post-slug]').forEach((el) => {
      const slug = el.dataset.postSlug ?? '';
      el.classList.toggle('hidden', !visibleSlugs.has(slug));
    });
    const empty = document.querySelector<HTMLElement>('[data-blog-empty]');
    if (empty) empty.classList.toggle('hidden', filtered.length > 0);
  }, [filtered]);

  const hasFilter = selected.size > 0 || query.trim().length > 0;

  return (
    <section class="mb-10 border border-border bg-surface p-6 sm:p-7">
      <label class="block">
        <span class="eyebrow">search</span>
        <div class="mt-2 flex items-center border-b border-border focus-within:border-accent">
          <span class="font-mono text-text-muted">$ </span>
          <input
            type="search"
            placeholder="title, tag, keyword..."
            class="w-full bg-transparent py-2 pl-2 font-mono text-sm text-text placeholder:text-text-muted focus:outline-none"
            autocomplete="off"
            value={query}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          />
          {hasFilter && (
            <button
              type="button"
              class="font-mono text-[0.6875rem] uppercase tracking-eyebrow text-text-muted hover:text-accent"
              onClick={reset}
              aria-label="Clear all filters and search"
            >
              [ clear ]
            </button>
          )}
        </div>
      </label>

      {allTags.length > 0 && (
        <fieldset class="mt-6">
          <legend class="eyebrow">tags</legend>
          <div class="mt-2 flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const active = selected.has(t);
              return (
                <button
                  type="button"
                  class={
                    'inline-flex items-center px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-eyebrow border transition-colors ' +
                    (active
                      ? 'border-accent bg-accent text-bg'
                      : 'border-border text-text-muted hover:border-accent hover:text-accent')
                  }
                  aria-pressed={active}
                  onClick={() => toggle(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <p class="mt-6 font-mono text-[0.6875rem] uppercase tracking-eyebrow text-text-muted">
        showing {filtered.length} / {posts.length}
      </p>
    </section>
  );
}
