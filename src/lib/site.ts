// Single source of truth for the canonical site URL & metadata.
// Used by sitemap.xml, robots.txt, and Open Graph / canonical tags.
//
// 👉 CHANGE `SITE_URL` to your real domain after deploying (no trailing slash).
export const SITE_URL = 'https://svelte-sveltekit-mastery.pages.dev';

export const SITE_NAME = 'Svelte & SvelteKit Mastery';

export const SITE_DESCRIPTION =
	'Belajar Svelte 5 (runes) & SvelteKit v2 dari pemula hingga expert — interaktif, berbahasa Indonesia, dengan playground & perbandingan framework.';

/** Absolute canonical URL for a route pathname (no trailing slash, except root). */
export function canonical(pathname: string): string {
	if (pathname === '/' || pathname === '') return SITE_URL;
	return SITE_URL + pathname.replace(/\/$/, '');
}
