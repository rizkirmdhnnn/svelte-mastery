import adapter from '@sveltejs/adapter-cloudflare';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [mdsvex(mdsvexConfig)],
	kit: {
		adapter: adapter(),
		// '*' crawls linked pages; the endpoints below aren't linked, so list them.
		prerender: { entries: ['*', '/sitemap.xml', '/robots.txt'] }
	}
};

export default config;
