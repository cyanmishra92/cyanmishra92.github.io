import { defineCollection, z } from 'astro:content';

/**
 * Publications collection — every paper is a single JSON file under
 * src/content/publications/. Schema mirrors spec §6.1.
 *
 * Authors are stored as an ordered array; `myAuthorIndex` flags which
 * one is me so PaperItem can render the bold + underlined version.
 */
const publications = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    authors: z.array(z.string()).min(1),
    myAuthorIndex: z.number().int().min(0),
    year: z.number().int(),
    venue: z.string(),
    venueFull: z.string(),
    type: z.enum(['conference', 'journal', 'arxiv', 'under-review', 'workshop']),
    status: z.enum(['published', 'to-appear', 'under-review']),
    abstract: z.string().optional(),
    pdfUrl: z.string().url().optional(),
    arxivId: z.string().optional(),
    doi: z.string().optional(),
    codeUrl: z.string().url().optional(),
    slidesUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    topics: z.array(z.string()).default([]),
    bibtex: z.string(),
    awards: z.array(z.string()).default([]),
    citations: z.number().int().nonnegative().optional(),
    /** Optional override for the citation key used in the BibTeX entry. */
    citationKey: z.string().optional(),
  }),
});

/**
 * Projects collection — MDX deep-dives under src/content/projects/.
 * Frontmatter carries the metadata; the MDX body is the long-form
 * write-up, mounted on /projects/[slug]/.
 */
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    /** One-line tagline used on cards and the page header. */
    tagline: z.string(),
    venue: z.string().optional(),
    year: z.number().int().optional(),
    status: z.enum(['published', 'to-appear', 'under-review', 'ongoing']).default('published'),
    topics: z.array(z.string()).default([]),
    paperId: z.string().optional(),
    paperUrl: z.string().url().optional(),
    codeUrl: z.string().url().optional(),
    awards: z.array(z.string()).default([]),
    /** Display order on the /projects index. Lower = earlier. */
    order: z.number().int().default(99),
    /** True for ongoing/no-public-paper projects (e.g. work at Arm). */
    ongoing: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

/**
 * News collection — short MDX entries under src/content/news/.
 * Each entry is one news item; reverse-chronological by `date`.
 * MDX body is optional; the headline + brief usually suffice.
 */
const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** True for entries where the exact day isn't known — page hides it. */
    approximateDate: z.boolean().default(false),
    /** Optional link the headline links to. Internal paths or full URLs both OK. */
    href: z.string().refine(
      (s) => s.startsWith('/') || /^https?:\/\//.test(s) || s.startsWith('mailto:'),
      'href must be an internal path (/...) or a full URL',
    ).optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

/**
 * Blog collection — MDX posts under src/content/blog/.
 */
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  publications,
  projects,
  news,
  blog,
};

