import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '@lib/og-image';
import { prettyDate } from '@lib/news';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((p) => ({ params: { slug: p.slug }, props: { post: p } }));
}

export const GET: APIRoute = async ({ props }) => {
  const post = props.post as Awaited<ReturnType<typeof getCollection<'blog'>>>[number];
  const buf = await renderOg({
    kicker: `// blog · ${prettyDate(post.data.date)}`,
    title: post.data.title,
    subtitle: post.data.description,
  });
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
