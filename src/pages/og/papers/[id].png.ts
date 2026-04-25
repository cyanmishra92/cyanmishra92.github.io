import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '@lib/og-image';

export async function getStaticPaths() {
  const papers = await getCollection('publications');
  return papers.map((p) => ({ params: { id: p.data.id }, props: { paper: p.data } }));
}

export const GET: APIRoute = async ({ props }) => {
  const paper = props.paper as Awaited<ReturnType<typeof getCollection<'publications'>>>[number]['data'];
  const me = paper.authors[paper.myAuthorIndex];
  const others = paper.authors.length - 1;
  const authorLine =
    others > 0 ? `${me} et al. (${paper.authors.length} authors)` : me;
  const buf = await renderOg({
    kicker: `// publication · ${paper.venue} ${paper.year}`,
    title: paper.title,
    subtitle: authorLine,
  });
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
