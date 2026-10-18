/**
 * TGPCOP MEDIA Site & Brand Configuration
 * Central configuration file for branding, assets, and social links.
 */

export interface SiteConfig {
  brandName: string;
  tagline: string;
  subTitle: string;
  logo: string;
  logoFallback: string;
  logoAlt: string;
  instagramHandle: string | null; // Leave null/empty until finalized to keep hidden
  instagramUrl: string | null;
  contactEmail: string;
  footerText: string;
  disclaimer: string;
}

export const SITE_CONFIG: SiteConfig = {
  brandName: 'TGPCOP MEDIA',
  tagline: 'Capturing Every Beat of Campus Life',
  subTitle: 'Independent Student-Run Media & Creative Collective',
  logo: 'https://res.cloudinary.com/axgam8br/image/upload/v1792348294/tgpcop_media_logo.jpg',
  logoFallback: '/tgpcop_media_logo.jpg',
  logoAlt: 'TGPCOP MEDIA Official Graffiti Logo',
  // Until the official new Instagram account is finalized, keep as null to hide the link cleanly
  instagramHandle: null,
  instagramUrl: null,
  contactEmail: 'media@tgpcop.online',
  footerText: 'Captured & Presented by TGPCOP Media. All Rights Reserved.',
  disclaimer: 'TGPCOP Media is an independent student-run creative & media initiative covering college life, events, photography, and design.'
};
