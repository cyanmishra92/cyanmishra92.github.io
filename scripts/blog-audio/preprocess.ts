/**
 * MDX → narration-prose preprocessor for OpenAI TTS.
 *
 * OpenAI's tts-1-hd does NOT accept SSML. Prosody comes from real
 * punctuation — sentence-ending periods, commas, em-dashes, paragraph
 * breaks. The walker emits clean prose with those signals.
 *
 * Bump PREPROCESSOR_VERSION when transformation rules change in a way
 * that materially affects narration. The hash baked into each post's
 * audio URL includes this version, so a bump regenerates everything
 * on the next workflow run (intentional).
 */

import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { Node, Parent } from 'unist';

export const PREPROCESSOR_VERSION = 1;

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | { type: 'mdxJsxAttributeValueExpression'; value: string } | null;
}

interface MdxJsxElement extends Parent {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: MdxJsxAttribute[];
}

interface CodeNode extends Node {
  type: 'code';
  value: string;
}

interface TextNode extends Node {
  type: 'text';
  value: string;
}

interface InlineCodeNode extends Node {
  type: 'inlineCode';
  value: string;
}

interface HeadingNode extends Parent {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
}

interface LinkNode extends Parent {
  type: 'link';
  url: string;
}

interface ImageNode extends Node {
  type: 'image';
  url: string;
  alt?: string | null;
  title?: string | null;
}

interface ListNode extends Parent {
  type: 'list';
  ordered?: boolean;
}

interface MathNode extends Node {
  type: 'math' | 'inlineMath';
  value: string;
}

interface MdxFlowExpression extends Node {
  type: 'mdxFlowExpression' | 'mdxTextExpression';
  value: string;
}

const PLACEHOLDER_CODE = 'Code block omitted from narration.';
const PLACEHOLDER_EQ = 'equation';
const PLACEHOLDER_LINK = 'a link';

/** Strip markdown emphasis chars and read raw text. Used for plain-string fallbacks. */
function stripMarkers(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}

function attrValue(el: MdxJsxElement, name: string): string | undefined {
  const a = el.attributes.find((at) => at.type === 'mdxJsxAttribute' && at.name === name);
  if (!a) return undefined;
  if (typeof a.value === 'string') return a.value;
  if (a.value && typeof a.value === 'object' && 'value' in a.value) {
    // expression: strip outer template-literal backticks if present
    const raw = a.value.value.trim();
    return raw.replace(/^`([\s\S]*)`$/, '$1').replace(/^['"]([\s\S]*)['"]$/, '$1');
  }
  return undefined;
}

function isUrlLike(s: string): boolean {
  return /^https?:\/\//.test(s.trim());
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Recursively render a node subtree to narration prose. The walker is
 * a single function with explicit handling for every node type we
 * care about, falling back to children-traversal for anything else
 * (so generic JSX, spans, html nodes, etc. just contribute their
 * inner text).
 */
function renderNode(node: Node): string {
  switch (node.type) {
    case 'root':
      return (node as Parent).children.map(renderNode).join('');

    case 'paragraph': {
      // Markdown soft-breaks (single \n inside a paragraph) become real
      // newlines in text nodes; TTS reads those as awkward micro-pauses.
      // Collapse internal whitespace, then append a clean paragraph
      // break that the walker uses as a real pause signal.
      const inner = (node as Parent).children
        .map(renderNode)
        .join('')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return inner ? `${inner}\n\n` : '';
    }

    case 'heading': {
      const h = node as HeadingNode;
      const inner = h.children.map(renderNode).join('').trim();
      if (!inner) return '';
      // H1 → period + paragraph break
      // H2 → paragraph break before AND after (strongest pause)
      // H3+ → single line break
      if (h.depth === 1) return `${inner}.\n\n`;
      if (h.depth === 2) return `\n\n${inner}.\n\n`;
      return `\n${inner}.\n`;
    }

    case 'text':
      return (node as TextNode).value;

    case 'inlineCode':
      // Strip the backticks; read identifier as plain text.
      return (node as InlineCodeNode).value;

    case 'code':
      // Block code: replace with the standard placeholder.
      return `${PLACEHOLDER_CODE}\n\n`;

    case 'emphasis': {
      // Italic → just strip markers.
      return (node as Parent).children.map(renderNode).join('');
    }

    case 'strong': {
      // Bold → em-dash framing for emphasis when short; plain text
      // when long (dashes would feel stilted on long bold runs).
      const inner = (node as Parent).children.map(renderNode).join('');
      if (wordCount(inner) > 5) return inner;
      return ` — ${inner.trim()} — `;
    }

    case 'link': {
      const ln = node as LinkNode;
      const inner = ln.children.map(renderNode).join('').trim();
      // If the visible text is a bare URL, replace; otherwise speak text only.
      if (!inner || isUrlLike(inner)) return PLACEHOLDER_LINK;
      return inner;
    }

    case 'image': {
      const im = node as ImageNode;
      const text = (im.alt ?? im.title ?? '').trim();
      if (!text) return '';
      return `Figure: ${text}. `;
    }

    case 'list': {
      const list = node as ListNode;
      let i = 1;
      const parts: string[] = [];
      for (const child of list.children) {
        if (child.type !== 'listItem') continue;
        const inner = (child as Parent).children
          .map(renderNode)
          .join('')
          .trim()
          // Tight list items often emit their own paragraph break — collapse.
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ');
        if (!inner) continue;
        if (list.ordered) {
          parts.push(`${i}. ${inner}`);
          i += 1;
        } else {
          parts.push(`. ${inner}`);
        }
      }
      return parts.join(' ') + '\n\n';
    }

    case 'listItem':
      // Should be consumed by the list handler; fall through if seen at root.
      return (node as Parent).children.map(renderNode).join('');

    case 'blockquote': {
      const inner = (node as Parent).children.map(renderNode).join('').trim();
      return inner ? `${inner}\n\n` : '';
    }

    case 'thematicBreak':
      return '\n\n';

    case 'table':
      // Minimal table support — render the caption-like first row, then
      // suggest the reader visit the post.
      return 'Table: see blog post for details. ';

    case 'inlineMath':
    case 'math':
      return ` ${PLACEHOLDER_EQ} `;

    case 'html': {
      // Rare in MDX (since JSX is preferred). Strip tags, keep text.
      const v = ((node as TextNode).value ?? '').replace(/<[^>]+>/g, '').trim();
      return v;
    }

    case 'mdxFlowExpression':
    case 'mdxTextExpression': {
      // {`mermaid src`} or {expr}. Strip outer template-literal fences;
      // for non-template expressions, drop entirely.
      const ex = (node as MdxFlowExpression).value.trim();
      const m = ex.match(/^`([\s\S]*)`$/);
      return m ? m[1] : '';
    }

    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return renderMdxComponent(node as MdxJsxElement);

    default:
      // Unknown / generic — recurse if possible, else drop.
      if ('children' in node && Array.isArray((node as Parent).children)) {
        return (node as Parent).children.map(renderNode).join('');
      }
      return '';
  }
}

/** Custom MDX components — each gets a tailored narration form. */
function renderMdxComponent(el: MdxJsxElement): string {
  const name = el.name ?? '';
  const innerChildren = () => el.children.map(renderNode).join('').trim();

  switch (name) {
    case 'Figure': {
      const caption = (attrValue(el, 'caption') ?? attrValue(el, 'alt') ?? '').trim();
      return caption ? `Figure: ${caption}. ` : '';
    }
    case 'EquationBlock': {
      const caption = (attrValue(el, 'caption') ?? '').trim();
      return caption ? `Equation: ${caption}. ` : `${PLACEHOLDER_EQ}. `;
    }
    case 'Equation':
      return ` ${PLACEHOLDER_EQ} `;
    case 'Diagram': {
      const caption = (attrValue(el, 'caption') ?? '').trim();
      const lead = caption ? `Diagram: ${caption}.` : 'Diagram.';
      return `${lead} See blog post for details. `;
    }
    case 'Aside': {
      const variant = (attrValue(el, 'variant') ?? 'note').toLowerCase();
      if (variant === 'todo') return ''; // never narrated
      const labels: Record<string, string> = {
        note: 'Note',
        warning: 'Warning',
        tip: 'Tip',
      };
      const label = labels[variant] ?? 'Note';
      const body = innerChildren();
      return body ? ` ${label}: ${body} ` : '';
    }
    case 'Quote': {
      const source = (attrValue(el, 'source') ?? '').trim();
      const body = innerChildren();
      if (!body) return '';
      const lead = source ? `Quote, attributed to ${source}` : 'Quote';
      return `${lead}: ${body} End quote. `;
    }
    case 'Footnote':
    case 'Sidenote': {
      // Inline footnote/sidenote — em-dash framing for natural pause.
      const body = innerChildren();
      return body ? ` — footnote: ${body} — ` : '';
    }
    case 'TableOfContents':
    case 'ReadingTime':
      // Auto-rendered chrome; never narrate.
      return '';
    default:
      // Unknown component — read inner text; the wrapper is silent.
      return innerChildren();
  }
}

/**
 * Final whitespace cleanup. The walker emits a lot of newlines and
 * spaces; squash them down into well-formed prose.
 */
function finalizeWhitespace(s: string): string {
  let out = s;
  // Strip any markdown markers that survived (defensive).
  out = out.replace(/[`*_~#]/g, ' ');
  // Strip stray brackets / angle brackets the walker may have missed
  // (e.g. JSX tag names quoted in inline code: `<Figure>` → "Figure").
  out = out.replace(/[\[\]<>]/g, '');
  // Collapse 3+ spaces to 1.
  out = out.replace(/[ \t]{3,}/g, ' ');
  // Collapse 3+ newlines to 2.
  out = out.replace(/\n{3,}/g, '\n\n');
  // Trim each line.
  out = out
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+/, ''))
    .join('\n');
  // Tidy stray double-spaces around em-dashes.
  out = out.replace(/ {2,}—/g, ' —').replace(/— {2,}/g, '— ');
  // Dedupe runs of em-dashes that pile up when bold framing collides
  // with literal em-dashes in the surrounding markdown ("**foo** — bar"
  // produces "— foo — — bar" otherwise).
  out = out.replace(/(?:—\s*){2,}/g, '— ');
  // Final trim.
  return out.trim();
}

/**
 * Public entrypoint. Returns the narration script for an MDX source
 * string. If the post supplies `audioReadAs`, that script is returned
 * verbatim (only frontmatter is stripped).
 */
export function preprocessForTTS(mdxSource: string): string {
  const { content, data } = matter(mdxSource);

  // Per-post override — frontmatter `audioReadAs` short-circuits the
  // entire walker. Used for posts where automatic preprocessing would
  // sound awkward.
  if (typeof data.audioReadAs === 'string' && data.audioReadAs.trim()) {
    return data.audioReadAs.trim();
  }

  const tree = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkMath)
    .use(remarkGfm)
    .parse(content);

  return finalizeWhitespace(renderNode(tree as Node));
}
