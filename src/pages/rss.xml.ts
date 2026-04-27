import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE } from '@lib/site';
import { compareNews, compareBlog } from '@lib/news';
import audioCache from '@/data/blog-audio.json';

interface AudioEntry {
  url: string;
  duration: number;
  voice: string;
  bytes?: number;
}
const audioMap = audioCache as Record<string, AudioEntry>;

export async function GET(context: APIContext) {
  const news = (await getCollection('news', ({ data }) => !data.draft)).sort(compareNews);
  // RSS only carries `published` posts. Drafts and ideas live on
  // noindex paths and never broadcast.
  const blog = (await getCollection('blog', ({ data }) => data.status === 'published')).sort(compareBlog);

  const cleanBody = (s: string) =>
    s
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // MDX JSX comments
      .replace(/<[^>]+>/g, '') // any inline JSX tags
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links → text
      .replace(/[*_`]/g, '') // markdown emphasis
      .replace(/\s+/g, ' ')
      .trim();

  const newsItems = news.map((entry) => {
    const link = entry.data.href
      ? entry.data.href.startsWith('http')
        ? entry.data.href
        : `${SITE.url}${entry.data.href}`
      : `${SITE.url}/news/#${entry.slug}`;
    return {
      title: entry.data.title,
      pubDate: entry.data.date,
      description: cleanBody(entry.body).slice(0, 240),
      link,
      categories: ['news', ...entry.data.tags],
    };
  });

  const blogItems = blog.map((entry) => {
    // Attach an audio enclosure when narration exists — turns the feed
    // into a working podcast feed for clients like Overcast / Pocket
    // Casts. Only emit when bytes is known (the `length` attr is
    // required for many podcast parsers).
    const audio = audioMap[entry.slug];
    const enclosure =
      audio && audio.url && audio.bytes
        ? { url: audio.url, type: 'audio/mpeg', length: audio.bytes }
        : undefined;
    return {
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.description,
      link: `${SITE.url}/blog/${entry.slug}/`,
      categories: ['blog', ...entry.data.tags],
      ...(enclosure ? { enclosure } : {}),
    };
  });

  const items = [...newsItems, ...blogItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: `${SITE.shortName} — News & Blog`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items,
    customData: '<language>en-us</language>',
    stylesheet: false,
  });
}
