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
    /** IDs of related papers (e.g. arXiv preprint ↔ conference version). */
    relatedPaperIds: z.array(z.string()).default([]),
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

/**
 * Photos collection — MDX entries under src/content/photos/, one per
 * photo. Image source files live alongside under src/content/photos/img/.
 * Privacy: GPS is never stored in the sidecar JSON or rendered; the
 * frontmatter `location` field is free-text only.
 */
const photos = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** Optional free-text location. Don't put GPS or precise addresses. */
    location: z.string().optional(),
    /** Optional caption (markdown supported in body). */
    caption: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** Relative path to the source image — Astro's image() helper. */
    image: image(),
    /** Optional grouping; the /photos UI shows an album filter when set. */
    album: z.string().optional(),
    /** Larger 2×2 cell in the grid. */
    featured: z.boolean().default(false),
    /** Set false to hide without deleting (also hidden in the lightbox). */
    visible: z.boolean().default(true),
    /**
     * Layout mode for the cell:
     *   - cover  (default): fill cell, crop overflow
     *   - contain: fit whole image inside cell with paper-bg padding
     *   - tall: 1×2 cell for portrait orientation
     * If unset, the page picks `contain` for ~1 in 5 photos
     * deterministically (stable hash of slug) for visual rhythm.
     */
    displayMode: z.enum(['cover', 'contain', 'tall']).optional(),
  }),
});

/**
 * Press / Mentions collection — short MDX entries under
 * src/content/press/, one per article / podcast / interview /
 * thesis-acknowledgment / blog-mention.
 *
 * Reverse-chronological list at /press. Body MDX is optional and
 * unused by the index page; reserved for future per-entry pages if
 * we ever want them.
 */
const press = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    outlet: z.string(),
    /** Public URL to the source article / episode / page. */
    url: z.string().url(),
    /** Optional pull-quote or short summary. */
    excerpt: z.string().optional(),
    type: z
      .enum(['article', 'podcast', 'interview', 'thesis-acknowledgment', 'blog-mention'])
      .default('article'),
    draft: z.boolean().default(false),
  }),
});

/**
 * Talks deep-dive collection — optional MDX page per talk at
 * /talks/<slug>/. The /talks index page also links to a deep-dive
 * when a matching slug exists in this collection.
 *
 * Embeds:
 *   - youtubeId: 11-char YouTube video id (NOT the full URL)
 *   - driveFileId: Google Drive file id (NOT the full URL)
 *   - slidesUrl: PDF or Drive link, embedded inline via <iframe>
 */
const talks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    venue: z.string(),
    venueFull: z.string(),
    location: z.string(),
    /** Type of talk — drives the small "invited" badge on the index. */
    type: z.enum(['conference', 'invited']).default('conference'),
    awards: z.array(z.string()).default([]),
    /** YouTube video id (e.g. "VAsB1XBuRZ0" — not the full URL). */
    youtubeId: z.string().optional(),
    /** Google Drive file id (e.g. "1zM1oa..." — not the full URL). */
    driveFileId: z.string().optional(),
    /** URL to slides PDF — Drive or self-hosted under /public/slides/. */
    slidesUrl: z.string().url().optional(),
    /** Optional id matching publications.id for cross-linking. */
    paperId: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  publications,
  projects,
  news,
  blog,
  photos,
  press,
  talks,
};

