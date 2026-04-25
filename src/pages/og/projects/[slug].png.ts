import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '@lib/og-image';

export async function getStaticPaths() {
  const entries = await getCollection('projects', ({ data }) => !data.draft);
  return entries.map((e) => ({ params: { slug: e.slug }, props: { entry: e } }));
}

export const GET: APIRoute = async ({ props }) => {
  const entry = props.entry as Awaited<ReturnType<typeof getCollection<'projects'>>>[number];
  const venue = entry.data.venue ? `${entry.data.venue} ${entry.data.year ?? ''}`.trim() : entry.data.status.toUpperCase();
  const buf = await renderOg({
    kicker: `// project · ${venue}`,
    title: entry.data.title,
    subtitle: entry.data.tagline,
  });
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
