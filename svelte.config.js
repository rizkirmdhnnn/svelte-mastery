import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.svx'],
	preprocess: [mdsvex(mdsvexConfig)],
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		prerender: { entries: ['*'] }
	}
};

export default config;
