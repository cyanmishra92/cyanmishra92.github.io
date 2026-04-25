import type { APIRoute } from 'astro';
import { renderOg } from '@lib/og-image';
import { SITE } from '@lib/site';

export const GET: APIRoute = async () => {
  const buf = await renderOg({
    kicker: '// performance & power · arm',
    title: SITE.name,
    subtitle:
      'Hardware/software co-design for ML systems — energy-harvesting sensors, computational storage, intermittent and continuous learning at the edge.',
  });
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
