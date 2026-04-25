/**
 * OG image generator — Technical Editorial style.
 *
 * Renders 1200×630 PNGs at build time via satori → resvg. Used by
 * src/pages/og/*.png.ts endpoints to produce the per-page social
 * previews referenced from BaseLayout.
 *
 * Three variants:
 *   - Default (home / about / etc.): name + role + tagline + cyan square
 *   - Paper: ScholarlyArticle title + venue + year + author line
 *   - Project: project title + tagline + venue/status
 *
 * All variants share the same warm-paper background, schematic grid,
 * coordinate label, and measurement-rule footer — same vocabulary as
 * the rest of the site so social previews feel like the brand.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ReactNode } from 'preact/compat';
import { SITE, buildStamp } from './site';

// ─── font loading ────────────────────────────────────────────────────
// Satori needs raw TTF (its bundled opentype.js can't parse WOFF2 and
// can't handle the variable-axis fonts shipped by @fontsource-variable).
// We commit pre-decompressed TTFs of the static weights we want for OG
// images at assets/og-fonts/ and read them here. Build-time only;
// clients never see these files.
function fontBuf(rel: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`../../assets/og-fonts/${rel}`, import.meta.url)));
}

const fonts = [
  { name: 'Mona Sans', data: fontBuf('mona-sans-500.ttf'), weight: 500 as const, style: 'normal' as const },
  { name: 'Fraunces', data: fontBuf('fraunces-600.ttf'), weight: 600 as const, style: 'normal' as const },
  { name: 'JetBrains Mono', data: fontBuf('jetbrains-mono-500.ttf'), weight: 500 as const, style: 'normal' as const },
];

// ─── theme tokens (light mode only — OG cards always light) ──────────
const COLORS = {
  bg: '#f5f3ee',
  text: '#0f172a',
  textMuted: '#475569',
  border: '#e7e2d3',
  accent: '#0891b2',
  ink: '#1c1917',
};

interface OgArgs {
  /** Eyebrow / kicker line, mono uppercase. e.g. "// publication · ICLR 2025" */
  kicker: string;
  /** Headline — Fraunces, 60–72px depending on length. */
  title: string;
  /** Optional subtitle — body sans, slate-600. */
  subtitle?: string;
  /** Footer right caption — small mono. Defaults to coords + build stamp. */
  footerRight?: string;
}

/**
 * Compose the OG image as a JSX-compatible object tree (no JSX in this
 * file — we hand-build because satori doesn't need a runtime).
 */
function compose({ kicker, title, subtitle, footerRight }: OgArgs): ReactNode {
  const titleSize = title.length > 70 ? 56 : title.length > 40 ? 64 : 76;

  // Schematic grid as a CSS background (satori supports background-image).
  const gridBg =
    'repeating-linear-gradient(0deg, rgba(8,145,178,0.06) 0 1px, transparent 1px 48px), ' +
    'repeating-linear-gradient(90deg, rgba(8,145,178,0.06) 0 1px, transparent 1px 48px)';

  return {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.bg,
        backgroundImage: gridBg,
        padding: '64px 80px',
        position: 'relative',
        fontFamily: 'Mona Sans',
        color: COLORS.text,
      },
      children: [
        // top-left: wordmark
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'JetBrains Mono',
              fontSize: 18,
              color: COLORS.text,
              letterSpacing: 1,
            },
            children: [
              { type: 'div', props: { style: { width: 14, height: 14, background: COLORS.accent } } },
              SITE.shortName,
              { type: 'span', props: { style: { color: COLORS.textMuted, marginLeft: 6 }, children: '/ csm' } },
            ],
          },
        },

        // kicker (mono, accent)
        {
          type: 'div',
          props: {
            style: {
              marginTop: 56,
              fontFamily: 'JetBrains Mono',
              fontSize: 18,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: COLORS.accent,
            },
            children: kicker,
          },
        },

        // title (display serif)
        {
          type: 'div',
          props: {
            style: {
              marginTop: 16,
              fontFamily: 'Fraunces',
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.06,
              color: COLORS.ink,
              letterSpacing: -1,
              maxWidth: 1040,
              // satori needs explicit display
              display: 'block',
            },
            children: title,
          },
        },

        // subtitle (body sans, muted)
        ...(subtitle
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: 22,
                    fontSize: 24,
                    color: COLORS.textMuted,
                    lineHeight: 1.4,
                    maxWidth: 980,
                    display: 'block',
                  },
                  children: subtitle,
                },
              },
            ]
          : []),

        // measurement-rule footer
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: 80,
              right: 80,
              bottom: 64,
              display: 'flex',
              flexDirection: 'column',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { width: '100%', height: 1, background: COLORS.textMuted, opacity: 0.4 },
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    marginTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 16,
                    color: COLORS.textMuted,
                    letterSpacing: 1.5,
                  },
                  children: [
                    {
                      type: 'div',
                      props: { style: { display: 'flex' }, children: 'cyanmishra92.github.io' },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex' },
                        children: footerRight ?? `${SITE.location} // ${buildStamp()}`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  } as unknown as ReactNode;
}

/** Render the composed tree to a 1200×630 PNG buffer. */
export async function renderOg(args: OgArgs): Promise<Buffer> {
  const tree = compose(args);
  const svg = await satori(tree as any, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render();
  return png.asPng();
}
