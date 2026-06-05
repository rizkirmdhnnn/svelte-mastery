// Per-level metadata for the learning roadmap (/roadmap).
//
// EASY TO UPDATE: the roadmap's topic lists & progress come from the content
// manifest ($lib/content) + the progress store — add a `.svx` module and it
// appears on the roadmap automatically. The only thing to edit here is the
// per-level icon / blurb / official-docs link. If you add a whole new level,
// add one entry below (a missing entry falls back to a safe default).
//
// `docsUrl` targets are the official docs sections for each stage (verified 200).

export type RoadmapMeta = {
	icon: string;
	blurb: string;
	docsUrl: string;
	docsLabel: string;
};

export const roadmapMeta: Record<number, RoadmapMeta> = {
	1: {
		icon: '🌱',
		blurb:
			'Pahami filosofi compiler Svelte, siapkan proyek (`npx sv create`), dan kuasai anatomi komponen `.svelte` plus styling scoped.',
		docsUrl: 'https://svelte.dev/docs/svelte/overview',
		docsLabel: 'Svelte · Overview'
	},
	2: {
		icon: '⚡',
		blurb:
			'Inti Svelte 5: bikin state reaktif dan nilai turunannya dengan runes — `$state`, `$derived`, `$effect`, `$props`/`$bindable`.',
		docsUrl: 'https://svelte.dev/docs/svelte/what-are-runes',
		docsLabel: 'Svelte · Runes'
	},
	3: {
		icon: '🧩',
		blurb:
			'Kendalikan markup: kondisi & loop (`{#if}`/`{#each}`), snippets, tags, directives, transitions, dan ekspresi async.',
		docsUrl: 'https://svelte.dev/docs/svelte/basic-markup',
		docsLabel: 'Svelte · Template syntax'
	},
	4: {
		icon: '🛠️',
		blurb:
			'Elemen `<svelte:*>`, stores vs runes, Context API, dan lifecycle untuk berbagi state & efek lintas komponen.',
		docsUrl: 'https://svelte.dev/docs/svelte/stores',
		docsLabel: 'Svelte · Runtime'
	},
	5: {
		icon: '🎓',
		blurb:
			'Naik kelas: TypeScript di Svelte, testing (Vitest/Playwright), web components, modul reference, dan migrasi Svelte 4→5.',
		docsUrl: 'https://svelte.dev/docs/svelte/typescript',
		docsLabel: 'Svelte · Misc'
	},
	6: {
		icon: '🚦',
		blurb:
			'Bangun aplikasi nyata: routing berbasis file, `load` data, form actions + `use:enhance`, dan opsi rendering (SSR/SSG/CSR).',
		docsUrl: 'https://svelte.dev/docs/kit/introduction',
		docsLabel: 'SvelteKit · Pengantar'
	},
	7: {
		icon: '🧭',
		blurb:
			'Routing lanjutan (rest/optional/groups), hooks, error handling, link options, service worker, dan modul server-only.',
		docsUrl: 'https://svelte.dev/docs/kit/advanced-routing',
		docsLabel: 'SvelteKit · Advanced'
	},
	8: {
		icon: '🚀',
		blurb:
			'Build & deploy (adapters), env vars, modul `$app/*`, API routes `+server.js`, auth/performance/SEO, dan studi kasus akhir.',
		docsUrl: 'https://svelte.dev/docs/kit/building-your-app',
		docsLabel: 'SvelteKit · Build & deploy'
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

/** First level that belongs to the SvelteKit half (drives the "Lanjut ke SvelteKit" divider). */
export const SVELTEKIT_FROM_LEVEL = 6;
