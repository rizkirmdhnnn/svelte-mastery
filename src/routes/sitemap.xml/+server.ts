import { modules } from '$lib/content';
import { SITE_URL } from '$lib/site';

export const prerender = true;

export function GET() {
	// Static pages + every module — derived from the manifest, so new `.svx`
	// modules appear in the sitemap automatically.
	const staticRoutes = ['/', '/roadmap', '/glossary', '/cheatsheet-runes', '/migration-cheatsheet'];
	const moduleRoutes = modules.map((m) => `/belajar/${m.slug}`);
	const paths = [...staticRoutes, ...moduleRoutes];

	const urls = paths
		.map((p) => {
			const loc = `${SITE_URL}${p === '/' ? '' : p}`;
			const priority = p === '/' ? '1.0' : p.startsWith('/belajar/') ? '0.8' : '0.6';
			return `  <url>\n    <loc>${loc}</loc>\n    <priority>${priority}</priority>\n  </url>`;
		})
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
}
