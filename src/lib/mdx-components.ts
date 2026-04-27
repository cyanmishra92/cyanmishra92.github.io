/**
 * MDX components registry — passed to `<Content components={...} />`
 * in BlogPost.astro so blog posts can use these tags without an
 * explicit `import` line at the top of every MDX file.
 *
 * This is the canonical list. Add new components here when they're
 * authored under src/components/mdx/.
 */
import Figure from '@components/mdx/Figure.astro';
import Equation from '@components/mdx/Equation.astro';
import EquationBlock from '@components/mdx/EquationBlock.astro';
import Aside from '@components/mdx/Aside.astro';
import Footnote from '@components/mdx/Footnote.astro';
import Sidenote from '@components/mdx/Sidenote.astro';
import Quote from '@components/mdx/Quote.astro';
import Diagram from '@components/mdx/Diagram.astro';

export const mdxComponents = {
  Figure,
  Equation,
  EquationBlock,
  Aside,
  Footnote,
  Sidenote,
  Quote,
  Diagram,
};
