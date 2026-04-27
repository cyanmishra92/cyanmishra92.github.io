/**
 * Remark plugin that computes word count + reading time and stashes
 * them on the rendered file's `frontmatter` so Astro exposes them via
 * `remarkPluginFrontmatter` on the entry render result.
 *
 * Counts words from the raw markdown source EXCLUDING fenced code
 * blocks — code shouldn't inflate read time.
 */
import { toString } from 'mdast-util-to-string';
import readingTime from 'reading-time';

export function remarkReadingTime() {
  return (tree, { data }) => {
    // Strip code blocks before counting.
    const cloned = structuredClone(tree);
    function strip(node) {
      if (!node || !node.children) return;
      node.children = node.children.filter((c) => c.type !== 'code');
      node.children.forEach(strip);
    }
    strip(cloned);

    const text = toString(cloned);
    const stats = readingTime(text);
    const wordCount = stats.words;
    const minutesRead = stats.text; // e.g. "4 min read"

    data.astro = data.astro ?? {};
    data.astro.frontmatter = data.astro.frontmatter ?? {};
    data.astro.frontmatter.minutesRead = minutesRead;
    data.astro.frontmatter.wordCount = wordCount;
  };
}
