/**
 * Single source of truth for identity, navigation, and external profiles.
 * All page templates and SEO metadata read from here.
 */

export const SITE = {
  url: 'https://cyanmishra92.github.io',
  name: 'Cyan Subhra Mishra',
  shortName: 'Cyan S. Mishra',
  tagline:
    'Performance and Power Engineer at Arm. Hardware/software co-design for ML systems.',
  description:
    'Personal site of Cyan Subhra Mishra — Performance and Power Engineer at Arm in San Diego. Ph.D. from Penn State (2025) in hardware/software co-design for ML systems, with publications at ISCA, MICRO, HPCA, ICLR, NSDI, and PACT.',
  email: 'cyanmishra92@gmail.com',
  location: 'San Diego, CA',
  // San Diego coordinates for the hero label.
  coords: { lat: 32.7157, lon: -117.1611, label: '32.7157°N 117.1611°W' },
  role: 'Performance and Power Engineer',
  org: 'Arm',
  twitter: undefined,
} as const;

export const NAV = [
  { href: '/about/', label: 'About' },
  { href: '/research/', label: 'Research' },
  { href: '/publications/', label: 'Publications' },
  { href: '/projects/', label: 'Projects' },
  { href: '/news/', label: 'News' },
  { href: '/talks/', label: 'Talks' },
  { href: '/blog/', label: 'Blog' },
  { href: '/cv/', label: 'CV' },
  { href: '/contact/', label: 'Contact' },
] as const;

export const PROFILES = [
  {
    label: 'GitHub',
    href: 'https://github.com/cyanmishra92',
    icon: 'github',
    handle: 'cyanmishra92',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/cyan-subhra-mishra/',
    icon: 'linkedin',
    handle: 'cyan-subhra-mishra',
  },
  {
    label: 'Google Scholar',
    href: 'https://scholar.google.com/citations?user=oizH-wQAAAAJ',
    icon: 'scholar',
    handle: 'oizH-wQAAAAJ',
  },
  {
    label: 'DBLP',
    href: 'https://dblp.org/pid/263/7470.html',
    icon: 'dblp',
    handle: '263/7470',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/cyansubhra/',
    icon: 'instagram',
    handle: '@cyansubhra',
  },
  {
    label: 'Email',
    href: `mailto:${SITE.email}`,
    icon: 'mail',
    handle: SITE.email,
  },
] as const;

export type ProfileIcon = (typeof PROFILES)[number]['icon'];

/** YYYY.MM string used in the hero coord label. Updates at build time. */
export function buildStamp(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}.${m}`;
}

export function buildIso(d: Date = new Date()): string {
  return d.toISOString();
}
