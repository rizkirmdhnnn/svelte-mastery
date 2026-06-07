// Per-section metadata for the learning roadmap (/roadmap). Keyed by
// "<product>/<section>" — add a section, add an entry (fallback is safe).
// Topic lists & progress come from $lib/content + the progress store; only the
// per-section icon / blurb / docs link lives here.
export type RoadmapMeta = {
	icon: string;
	blurb: string;
	docsUrl: string;
	docsLabel: string;
};

export const roadmapMeta: Record<string, RoadmapMeta> = {
	'svelte/introduction': {
		icon: '🌱',
		blurb: 'Filosofi compiler Svelte, setup `npx sv create`, anatomi `.svelte` & file `.svelte.js`/`.ts`.',
		docsUrl: 'https://svelte.dev/docs/svelte/overview',
		docsLabel: 'Svelte · Introduction'
	},
	'svelte/runes': {
		icon: '⚡',
		blurb: 'Inti Svelte 5: `$state`, `$derived`, `$effect`, `$props`/`$bindable`, `$inspect`, `$host`.',
		docsUrl: 'https://svelte.dev/docs/svelte/what-are-runes',
		docsLabel: 'Svelte · Runes'
	},
	'svelte/template': {
		icon: '🧩',
		blurb: 'Markup: `{#if}`/`{#each}`, snippets & `{@render}`, tags, directives, transitions, async.',
		docsUrl: 'https://svelte.dev/docs/svelte/basic-markup',
		docsLabel: 'Svelte · Template syntax'
	},
	'svelte/styling': {
		icon: '🎨',
		blurb: 'Scoped & global styles, CSS custom properties, dan `<style>` bertingkat.',
		docsUrl: 'https://svelte.dev/docs/svelte/scoped-styles',
		docsLabel: 'Svelte · Styling'
	},
	'svelte/special-elements': {
		icon: '🪄',
		blurb: 'Elemen `<svelte:*>`: window, document, head, element, boundary, options.',
		docsUrl: 'https://svelte.dev/docs/svelte/svelte-window',
		docsLabel: 'Svelte · Special elements'
	},
	'svelte/runtime': {
		icon: '🛠️',
		blurb: 'Stores, Context, lifecycle hooks, imperative API, dan hydratable data.',
		docsUrl: 'https://svelte.dev/docs/svelte/stores',
		docsLabel: 'Svelte · Runtime'
	},
	'svelte/misc': {
		icon: '🎓',
		blurb: 'TypeScript, testing, custom elements, browser support, migrasi, dan FAQ.',
		docsUrl: 'https://svelte.dev/docs/svelte/typescript',
		docsLabel: 'Svelte · Misc'
	},
	'svelte/reference': {
		icon: '📖',
		blurb: 'Reference API tiap modul `svelte/*` + daftar error/warning compiler & runtime.',
		docsUrl: 'https://svelte.dev/docs/svelte/svelte',
		docsLabel: 'Svelte · Reference'
	},
	'svelte/legacy': {
		icon: '🕰️',
		blurb: 'Sintaks Svelte 4 (legacy) untuk membaca kode lama: `export let`, `$:`, `<slot>`, dll.',
		docsUrl: 'https://svelte.dev/docs/svelte/legacy-overview',
		docsLabel: 'Svelte · Legacy APIs'
	},
	'kit/getting-started': {
		icon: '🚦',
		blurb: 'Apa itu SvelteKit, buat proyek, project types & structure, web standards.',
		docsUrl: 'https://svelte.dev/docs/kit/introduction',
		docsLabel: 'SvelteKit · Getting started'
	},
	'kit/core': {
		icon: '🧱',
		blurb: 'Routing, `load`, form actions, page options, state, remote functions, env vars.',
		docsUrl: 'https://svelte.dev/docs/kit/routing',
		docsLabel: 'SvelteKit · Core concepts'
	},
	'kit/build-deploy': {
		icon: '🚀',
		blurb: 'Build & adapters (auto/node/static/Cloudflare/Netlify/Vercel/SPA), writing adapters.',
		docsUrl: 'https://svelte.dev/docs/kit/adapters',
		docsLabel: 'SvelteKit · Build & deploy'
	},
	'kit/advanced': {
		icon: '🧭',
		blurb: 'Advanced routing, hooks, errors, link options, service workers, packaging.',
		docsUrl: 'https://svelte.dev/docs/kit/advanced-routing',
		docsLabel: 'SvelteKit · Advanced'
	},
	'kit/best-practices': {
		icon: '🏅',
		blurb: 'Auth, performance, images, accessibility, SEO, dan icons.',
		docsUrl: 'https://svelte.dev/docs/kit/auth',
		docsLabel: 'SvelteKit · Best practices'
	},
	'kit/appendix': {
		icon: '📎',
		blurb: 'FAQ, integrations, debugging, migrasi v2/Sapper, resources, glossary.',
		docsUrl: 'https://svelte.dev/docs/kit/faq',
		docsLabel: 'SvelteKit · Appendix'
	},
	'kit/reference': {
		icon: '📚',
		blurb: 'Reference API `@sveltejs/kit`, `$app/*`, `$env/*`, configuration, CLI, types.',
		docsUrl: 'https://svelte.dev/docs/kit/@sveltejs-kit',
		docsLabel: 'SvelteKit · Reference'
	},
	'cli/intro': {
		icon: '⌨️',
		blurb: 'Pengantar CLI `sv` dan FAQ-nya.',
		docsUrl: 'https://svelte.dev/docs/cli/overview',
		docsLabel: 'CLI · Overview'
	},
	'cli/commands': {
		icon: '🧰',
		blurb: 'Perintah inti: `sv create`, `sv add`, `sv check`, `sv migrate`.',
		docsUrl: 'https://svelte.dev/docs/cli/sv-create',
		docsLabel: 'CLI · Perintah'
	},
	'cli/addons': {
		icon: '🧩',
		blurb: 'Add-ons resmi (tailwind, drizzle, eslint, playwright, …) + bikin add-on sendiri.',
		docsUrl: 'https://svelte.dev/docs/cli/sv-add',
		docsLabel: 'CLI · Add-ons'
	},
	'cli/api': {
		icon: '🔌',
		blurb: 'API terprogram: `sv` dan `sv-utils` untuk membangun add-on & transform kode.',
		docsUrl: 'https://svelte.dev/docs/cli/sv',
		docsLabel: 'CLI · API'
	}
};

export const FALLBACK_META: RoadmapMeta = {
	icon: '📘',
	blurb: 'Tahap belajar berikutnya.',
	docsUrl: 'https://svelte.dev/docs',
	docsLabel: 'Dokumentasi resmi'
};

/** Official interactive tutorial — referenced in the roadmap header. */
export const TUTORIAL_URL = 'https://svelte.dev/tutorial';

/** First section of these products starts a new roadmap band (drives dividers). */
export const PRODUCT_DIVIDERS: Record<string, string> = {
	kit: '↓ Lanjut ke SvelteKit',
	cli: '↓ Lanjut ke CLI (sv)'
};
