/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Tokens map to CSS variables defined in src/styles/global.css.
        // Light/dark values flip via the `dark` class on <html>.
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Mona Sans Variable"', 'ui-sans-serif', 'sans-serif'],
        display: ['"Fraunces Variable"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Fluid type scale per spec §4.2.
        'display-1': ['clamp(2.5rem, 5.5vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-2': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'eyebrow': ['0.75rem', { lineHeight: '1', letterSpacing: '0.15em' }],
        'caption': ['0.75rem', { lineHeight: '1.3' }],
      },
      maxWidth: {
        prose: '72ch',
        page: '1200px',
      },
      letterSpacing: {
        eyebrow: '0.15em',
      },
      animation: {
        'reveal-up': 'reveal-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-in': 'reveal-in 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-right': 'reveal-right 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'cursor-blink': 'cursor-blink 1.1s steps(1, end) infinite',
      },
      keyframes: {
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'reveal-right': {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
