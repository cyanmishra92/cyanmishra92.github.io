/**
 * remark-citations — assigns per-post numbers to <Cite key="..." /> in
 * order of first appearance, replaces each Cite node with a rendered
 * <sup><a>[N]</a></sup>, and replaces <ReferencesList /> with a
 * formatted bibliography section drawn from frontmatter.references.
 *
 * Numbering rules:
 *   - First appearance of a key = N. Same key reused = same N.
 *   - Order is document order (the order the AST walker visits nodes).
 *   - Only keys that actually appear in <Cite> get a number; unused
 *     entries in frontmatter.references are logged to console.warn
 *     and dropped from the rendered list.
 *
 * Author-year style is schema-accepted but not implemented yet —
 * falls back to numeric.
 *
 * The plugin also writes `hasCitations: boolean` into
 * `data.astro.frontmatter` so layouts can decide whether to show the
 * "citations omitted" caption on the audio player.
 *
 * Audio side note: the audio preprocessor parses the raw MDX file
 * directly, so it sees the original <Cite> / <ReferencesList /> nodes
 * before this plugin rewrites them. The two pipelines stay in sync
 * because they read the same component-name conventions from the
 * source.
 */

import { visit } from 'unist-util-visit';

const CITE_NAME = 'Cite';
const LIST_NAME = 'ReferencesList';

function attrString(node, name) {
  const attr = (node.attributes ?? []).find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
  if (!attr) return undefined;
  if (typeof attr.value === 'string') return attr.value;
  if (attr.value && typeof attr.value === 'object' && 'value' in attr.value) {
    return String(attr.value.value).replace(/^['"`]|['"`]$/g, '');
  }
  return undefined;
}

/** Short tooltip: "Author et al., Year. Title". Truncate title to 80 chars. */
function tooltipFor(entry) {
  if (!entry) return '';
  const authors = (entry.authors ?? []).join('; ');
  const head = authors
    ? authors.split(';')[0].trim() + (entry.authors.length > 1 ? ' et al.' : '')
    : '';
  const year = entry.year ? String(entry.year) : '';
  const title = entry.title ? entry.title.slice(0, 80) + (entry.title.length > 80 ? '…' : '') : '';
  return [head && (year ? `${head}, ${year}.` : `${head}.`), title].filter(Boolean).join(' ');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format authors as "Smith, J. and Lee, K." — the user already pre-formats
 *  each author string; we just join. */
function formatAuthors(authors) {
  const a = (authors ?? []).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}

function renderEntryHtml(num, key, entry, total) {
  const padded = String(num).padStart(total >= 10 ? 2 : 1, '0');
  const authors = formatAuthors(entry.authors);
  const yearPart = entry.year ? ` (${entry.year})` : '';
  const titlePart = entry.title ? `<em>${escapeHtml(entry.title)}</em>.` : '';
  const venuePart = entry.venue ? ` ${escapeHtml(entry.venue)}.` : '';
  const pagesPart = entry.pages ? ` ${escapeHtml(entry.pages)}.` : '';

  // Pick the primary link target: explicit url, then DOI, then arXiv.
  let linkUrl;
  let linkLabel;
  if (entry.url) {
    linkUrl = entry.url;
    linkLabel = 'link';
  } else if (entry.doi) {
    linkUrl = `https://doi.org/${entry.doi}`;
    linkLabel = `doi:${entry.doi}`;
  } else if (entry.arxivId) {
    linkUrl = `https://arxiv.org/abs/${entry.arxivId}`;
    linkLabel = `arXiv:${entry.arxivId}`;
  }
  const linkPart = linkUrl
    ? ` <a class="reference-link" href="${escapeHtml(linkUrl)}" rel="noopener noreferrer" target="_blank">[${escapeHtml(linkLabel)}]</a>`
    : '';

  const headPart = `${authors}${yearPart}.`.trim();
  const meta = [headPart, titlePart, venuePart, pagesPart, linkPart].filter(Boolean).join(' ').trim();

  return (
    `<li id="ref-${escapeHtml(key)}" class="reference-entry" data-cite-key="${escapeHtml(key)}">` +
    `<span class="reference-num" aria-hidden="true">[${padded}]</span> ` +
    `<span class="reference-body">${meta}` +
    ` <a class="reference-back" href="#cite-${escapeHtml(key)}-1" aria-label="Back to first citation of ${escapeHtml(key)}">↑</a>` +
    `</span></li>`
  );
}

function renderListHtml(citedInOrder, references) {
  const total = citedInOrder.length;
  const items = citedInOrder
    .map(({ key, num }) => renderEntryHtml(num, key, references[key] ?? {}, total))
    .join('');
  return (
    `<section class="references-list" aria-labelledby="references-heading">` +
    `<h2 id="references-heading" class="references-heading">// references</h2>` +
    `<ol class="references-ol">${items}</ol>` +
    `</section>`
  );
}

export function remarkCitations() {
  return (tree, file) => {
    const data = file?.data ?? {};
    const frontmatter = data.astro?.frontmatter ?? {};
    const references = frontmatter.references ?? {};

    /** key → number, assigned in order of first <Cite> occurrence. */
    const keyToNum = new Map();
    /** key → running occurrence count (for stable cite-N anchor IDs). */
    const keyOccurrences = new Map();
    /** Cite nodes get rewritten in-place; collect first to also support
     *  the case where ReferencesList sits before some Cite (rare but legal). */
    const citeNodes = [];
    const listNodes = [];

    visit(tree, (node) => {
      if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        node.name === CITE_NAME
      ) {
        const key = attrString(node, 'key');
        if (!key) return;
        if (!keyToNum.has(key)) keyToNum.set(key, keyToNum.size + 1);
        const occ = (keyOccurrences.get(key) ?? 0) + 1;
        keyOccurrences.set(key, occ);
        citeNodes.push({ node, key, occ });
      }
      if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        node.name === LIST_NAME
      ) {
        listNodes.push(node);
      }
    });

    // Surface the citation flag for the layout (controls the audio
    // player caption + RSS enclosure disclaimer).
    file.data.astro = file.data.astro ?? {};
    file.data.astro.frontmatter = file.data.astro.frontmatter ?? {};
    file.data.astro.frontmatter.hasCitations = citeNodes.length > 0;

    // Rewrite each <Cite key="X" /> in place to a rendered <sup>.
    for (const { node, key, occ } of citeNodes) {
      const num = keyToNum.get(key);
      const entry = references[key];
      const tooltip = tooltipFor(entry);
      // Keep the wrapping element class structure as raw HTML so it
      // survives downstream rehype passes intact.
      const html =
        `<sup class="cite" id="cite-${escapeHtml(key)}-${occ}">` +
        `<a href="#ref-${escapeHtml(key)}"` +
        (tooltip ? ` title="${escapeHtml(tooltip)}" data-cite-tooltip="${escapeHtml(tooltip)}"` : '') +
        `>[${num}]</a></sup>`;
      // Mutate node into an inline html node.
      node.type = 'html';
      node.value = html;
      delete node.name;
      delete node.attributes;
      delete node.children;
    }

    // Rewrite each <ReferencesList /> with the rendered list. If
    // there's no list element in the doc but citations exist, we
    // intentionally do NOT auto-append — authoring should be explicit.
    if (listNodes.length > 0) {
      const citedInOrder = [...keyToNum.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([key, num]) => ({ key, num }));
      const html = renderListHtml(citedInOrder, references);
      for (const node of listNodes) {
        node.type = 'html';
        node.value = html;
        delete node.name;
        delete node.attributes;
        delete node.children;
      }
    }

    // Warn about unused references — easy to leave one stale after
    // editing, would otherwise sit in frontmatter silently forever.
    const slug = data?.astro?.frontmatter?.slug ?? file?.history?.[0] ?? 'unknown';
    for (const key of Object.keys(references)) {
      if (!keyToNum.has(key)) {
        // eslint-disable-next-line no-console
        console.warn(`[remark-citations] ${slug}: reference "${key}" is in frontmatter but never cited; dropping.`);
      }
    }
  };
}
