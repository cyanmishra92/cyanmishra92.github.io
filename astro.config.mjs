import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';
import expressiveCode from 'astro-expressive-code';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';

export default defineConfig({
  site: 'https://cyanmishra92.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Order matters: expressive-code must register before mdx() so MDX
  // delegates fenced code blocks to it instead of the default Shiki path.
  integrations: [
    tailwind({ applyBaseStyles: false }),
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      themeCssSelector: (theme) => (theme.name === 'github-dark' ? '.dark' : ':root'),
      styleOverrides: {
        borderRadius: '0',
        borderColor: 'rgb(var(--color-border))',
        codeFontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
        codeFontSize: '0.8125rem',
        uiFontFamily: '"JetBrains Mono", ui-monospace, monospace',
        frames: {
          frameBoxShadowCssValue: 'none',
          editorActiveTabBorderColor: 'rgb(var(--color-accent))',
          editorTabBarBorderBottomColor: 'rgb(var(--color-border))',
        },
      },
      defaultProps: {
        showLineNumbers: false,
      },
    }),
    mdx(),
    sitemap({
      // Drafts and ideas live on noindex paths; never include them in
      // the public sitemap.
      filter: (page) =>
        !page.includes('/blog/drafts/') && !page.includes('/blog/ideas/'),
    }),
    preact({ compat: false }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkReadingTime],
    rehypePlugins: [[rehypeKatex, { throwOnError: false, output: 'html' }]],
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
});
