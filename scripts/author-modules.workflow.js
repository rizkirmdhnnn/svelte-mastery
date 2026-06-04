export const meta = {
	name: 'author-svelte-modules',
	description: 'Author + verify Svelte/SvelteKit learning modules (.svx) per the spec',
	phases: [
		{ title: 'Tulis', detail: 'satu agen penulis per modul' },
		{ title: 'Verifikasi', detail: 'agen verifikator memeriksa & memperbaiki' }
	]
};

// ---------------------------------------------------------------------------
// Shared authoring guide given to every writer agent.
// ---------------------------------------------------------------------------
const GUIDE = `Kamu menulis SATU modul pembelajaran berbahasa Indonesia tentang Svelte 5 / SvelteKit v2,
sebagai file mdsvex (.svx). Pembaca sudah paham React & Vue; selalu kaitkan ke sana bila relevan.

OUTPUT WAJIB:
1) Gunakan tool Write untuk membuat file di PATH yang diberikan (timpa jika ada).
2) Lalu kembalikan JSON sesuai schema.

STRUKTUR FILE (persis):
---
title: <judul>
level: <angka>
levelTitle: <judul level>
order: <angka>
description: <1 kalimat>
docs: <URL docs resmi yang diberikan>
keywords: [<3-6 kata kunci>]
---

<script>
	import Playground from '$lib/components/playground/Playground.svelte';
	import FrameworkCompare from '$lib/components/FrameworkCompare.svelte';
	import Callout from '$lib/components/Callout.svelte';
	import Exercise from '$lib/components/Exercise.svelte';
	import DocsLink from '$lib/components/DocsLink.svelte';
	import LegacyVsModern from '$lib/components/LegacyVsModern.svelte';
</script>

(Hapus import yang tidak dipakai.)

Lalu 7 BAGIAN dengan heading "## " persis berurutan:
## 1. Konsep        -> penjelasan jelas + ANALOGI/cerita untuk hal abstrak (WAJIB bila konsepnya abstrak)
## 2. Contoh kode   -> 1-3 blok \`\`\`svelte beranotasi (komentar menjelaskan)
## 3. Coba sendiri  -> <Playground code={\`...\`} />  (lihat batasan playground di bawah)
## 4. Kalau di framework lain  -> <FrameworkCompare .../>  (HANYA jika brief.compare ada; kalau tidak, hapus bagian ini & nomori ulang)
## 5. Latihan       -> <Exercise> + {#snippet solution()}...{/snippet}
## 6. Tips & Pitfalls -> minimal 2 <Callout type="pitfall|warning|tip">; pakai type="legacy" untuk menandai API lama
## 7. Docs resmi    -> <DocsLink href="<URL>" label="..." />

API KOMPONEN (pakai persis):
- <Playground code={\`<script>\\n  let n = $state(0);\\n</script>\\n\\n<button onclick={() => n++}>{n}</button>\`} />
- <FrameworkCompare task="Judul tugas" svelte={\`...\`} react={\`...\`} vue={\`...\`} next={\`...\`} nuxt={\`...\`} nest={\`...\`} diff={{ react: [2], vue: [3] }} note="perbedaan singkat & objektif" />  (sertakan hanya framework yang diminta brief.compare)
- <Callout type="tip">markdown</Callout>
- <Exercise title="...">prompt markdown{#snippet solution()}

  \`\`\`svelte
  ...solusi...
  \`\`\`

  {/snippet}</Exercise>
- <DocsLink href="https://..." label="..." />
- <LegacyVsModern rows={[{ legacy: 'export let x', modern: 'let { x } = $props()', note: 'opsional' }]} />

ATURAN AKURASI (KETAT — diperiksa verifikator):
- HANYA Svelte 5 (runes). DILARANG: export let, $: (reactive statement), on:click (pakai onclick), <slot> (pakai {@render children()} / snippet), createEventDispatcher (pakai prop callback mis. onsave), $$props/$$restProps, beforeUpdate/afterUpdate.
- SvelteKit 2: panggil error()/redirect() TANPA throw di depannya (mereka throw sendiri); pakai event.fetch; tanda tangan load/actions terbaru.
- Tandai API lama dengan <Callout type="legacy"> atau <LegacyVsModern>.

BATASAN PLAYGROUND (penting agar live preview jalan):
- Playground = SATU komponen .svelte mandiri, Svelte 5 runes saja, sintaks valid.
- Hanya boleh import dari 'svelte', 'svelte/transition', 'svelte/motion', 'svelte/easing', 'svelte/store', 'svelte/animate', 'svelte/events' (di-resolve via CDN). JANGAN import komponen lokal/file lain.
- JANGAN pakai backtick (\`) atau \${ } di dalam kode playground (akan merusak template literal). Pakai kutip biasa & string biasa.
- Untuk modul SvelteKit (butuh server: load/+page.server/+server/form actions/hooks/adapters) JANGAN pakai <Playground>; ganti bagian "Coba sendiri" jadi contoh kode statis \`\`\`svelte / \`\`\`js / \`\`\`ts beranotasi + penjelasan. (Playground boleh dipakai jika potongan itu komponen Svelte murni tanpa server.)

KESELAMATAN mdsvex (agar tidak gagal build):
- Di PROSA jangan tulis karakter "{" atau "<" mentah. Untuk simbol < atau { gunakan inline code backtick (mis. \`{#if}\`, \`a < b\`) atau entitas.
- Pasangkan semua tag komponen dengan benar; jangan biarkan markup tergantung.
- Indentasi snippet solution seperti contoh.

GAYA: Bahasa Indonesia santai tapi jelas, istilah teknis & kode tetap Inggris. Kedalaman PENUH (jangan dangkal): jelaskan "mengapa", bukan hanya "bagaimana". Objektif saat membandingkan (sebut plus-minus).`;

const SCHEMA_WRITE = {
	type: 'object',
	additionalProperties: false,
	required: ['slug', 'path', 'written', 'usedPlayground', 'summary'],
	properties: {
		slug: { type: 'string' },
		path: { type: 'string' },
		written: { type: 'boolean' },
		usedPlayground: { type: 'boolean' },
		summary: { type: 'string' }
	}
};

const SCHEMA_VERIFY = {
	type: 'object',
	additionalProperties: false,
	required: ['slug', 'pass', 'issues', 'fixed'],
	properties: {
		slug: { type: 'string' },
		pass: { type: 'boolean' },
		issues: { type: 'array', items: { type: 'string' } },
		fixed: { type: 'boolean' }
	}
};

// ---------------------------------------------------------------------------
// 42 module briefs.
// compare: { task, fw: [..], note? } or null. cover = topik wajib.
// ---------------------------------------------------------------------------
const D = 'https://svelte.dev/docs/svelte/';
const K = 'https://svelte.dev/docs/kit/';

const BRIEFS = [
	// LEVEL 1 — Dasar Svelte
	{ slug: 'level-1-dasar/01-apa-itu-svelte', title: 'Apa itu Svelte & Filosofi Compiler', level: 1, levelTitle: 'Dasar Svelte', order: 1, docs: D + 'overview',
	  cover: 'Svelte sebagai compiler (bukan runtime/VDOM); apa yang membuatnya beda; output JS ringan; "write less code"; tidak ada virtual DOM.', analogy: 'compiler = tukang yang merakit furniture di pabrik, bukan di rumahmu; yang dikirim sudah jadi & ringan.', compare: { task: 'Model eksekusi: compiler vs Virtual DOM', fw: ['react', 'vue'], note: 'React/Vue diff VDOM saat runtime; Svelte meng-compile update presisi saat build.' } },
	{ slug: 'level-1-dasar/02-setup-tooling', title: 'Setup & Tooling (npx sv create)', level: 1, levelTitle: 'Dasar Svelte', order: 2, docs: D + 'getting-started',
	  cover: 'npx sv create, memilih template, struktur proyek, npm run dev, Vite, ekstensi editor; Svelte vs SvelteKit secara singkat.', analogy: null, compare: null },
	{ slug: 'level-1-dasar/03-anatomi-komponen', title: 'Anatomi Komponen .svelte & file .svelte.js/.ts', level: 1, levelTitle: 'Dasar Svelte', order: 3, docs: D + 'svelte-files',
	  cover: 'Bagian <script>, markup, <style> dalam .svelte; file .svelte.js/.svelte.ts untuk logika reaktif yang bisa di-share; <script module>.', analogy: null, compare: { task: 'Struktur satu komponen', fw: ['react', 'vue'], note: 'React: 1 fungsi+JSX; Vue SFC: 3 blok; Svelte: mirip SFC tapi reaktivitas dari compiler.' } },
	{ slug: 'level-1-dasar/04-markup-dasar', title: 'Markup Dasar: Attributes & Text Expressions', level: 1, levelTitle: 'Dasar Svelte', order: 4, docs: D + 'basic-markup',
	  cover: 'Text interpolation {expr}; attribute & shorthand {value}; spread props; boolean attrs; komentar; perbedaan dari JSX.', analogy: null, compare: { task: 'Interpolasi & atribut', fw: ['react', 'vue'], note: 'JSX className vs HTML class; Svelte pakai HTML asli.' } },
	{ slug: 'level-1-dasar/05-styling', title: 'Styling: Scoped, Global, Custom Properties, Nested', level: 1, levelTitle: 'Dasar Svelte', order: 5, docs: D + 'scoped-styles',
	  cover: 'Scoped style otomatis; :global(); CSS custom properties; class: directive singkat; style: directive.', analogy: null, compare: { task: 'Scoped styling', fw: ['vue', 'react'], note: 'Vue <style scoped>; React butuh CSS Modules / CSS-in-JS; Svelte scoped by default.' } },

	// LEVEL 2 — Reactivity / Runes
	{ slug: 'level-2-reactivity/01-apa-itu-runes', title: 'Apa itu Runes & Mengapa Ada', level: 2, levelTitle: 'Reactivity (Runes)', order: 1, docs: D + 'what-are-runes',
	  cover: 'Runes = simbol $ yang jadi instruksi compiler; mengapa menggantikan reaktivitas implisit Svelte 4 ($:); di mana boleh dipakai (.svelte/.svelte.js/.svelte.ts).', analogy: 'runes = "mantra" yang memberi tahu compiler bagian mana yang hidup/reaktif.', compare: null },
	{ slug: 'level-2-reactivity/02-state', title: '$state, Deep State, $state.raw, $state.snapshot', level: 2, levelTitle: 'Reactivity (Runes)', order: 2, docs: D + '%24state',
	  cover: '$state dasar; deep reactivity via Proxy untuk object/array; $state.raw (non-deep); $state.snapshot untuk salinan statis.', analogy: 'papan tulis ajaib: ubah satu angka, semua hitungan yang bergantung ikut berubah.', compare: { task: 'State reaktif lokal', fw: ['react', 'vue'], note: 'useState butuh setter & immutable update; Vue ref butuh .value; $state bisa dimutasi langsung.' } },
	{ slug: 'level-2-reactivity/03-derived', title: '$derived & $derived.by', level: 2, levelTitle: 'Reactivity (Runes)', order: 3, docs: D + '%24derived',
	  cover: '$derived(expr); $derived.by(()=>{}) untuk logika kompleks; bebas efek samping; bisa di-override sementara.', analogy: 'nilai turunan papan tulis ajaib yang dihitung ulang otomatis.', compare: { task: 'Nilai terkomputasi', fw: ['react', 'vue'], note: 'useMemo butuh dependency array; Vue computed mirip; $derived melacak dependency otomatis.' } },
	{ slug: 'level-2-reactivity/04-effect', title: '$effect, $effect.pre, $effect.root & Kapan TIDAK Pakai', level: 2, levelTitle: 'Reactivity (Runes)', order: 4, docs: D + '%24effect',
	  cover: '$effect setelah DOM update + cleanup; $effect.pre; $effect.root; $effect.tracking; KAPAN TIDAK pakai effect (sinkronisasi state -> pakai $derived).', analogy: 'asisten yang selalu mengintip perubahan lalu bereaksi (nyalakan lampu tiap pintu dibuka).', compare: { task: 'Side effect reaktif', fw: ['react', 'vue'], note: 'useEffect butuh dependency array & sering jadi sumber bug; $effect melacak otomatis; Vue watch/watchEffect mirip.' } },
	{ slug: 'level-2-reactivity/05-props-bindable', title: '$props & $bindable', level: 2, levelTitle: 'Reactivity (Runes)', order: 5, docs: D + '%24props',
	  cover: 'let { a, b = default, ...rest } = $props(); tipe props (TS); $bindable() untuk two-way; $props.id().', analogy: null, compare: { task: 'Props & two-way binding', fw: ['react', 'vue'], note: 'React props one-way (callback untuk balik); Vue props + v-model; Svelte $props + $bindable opt-in.' } },
	{ slug: 'level-2-reactivity/06-inspect-host', title: '$inspect & $host', level: 2, levelTitle: 'Reactivity (Runes)', order: 6, docs: D + '%24inspect',
	  cover: '$inspect(...) debug dev-only; $inspect().with(); $inspect.trace() (5.14+); $host() untuk custom element.', analogy: null, compare: null },

	// LEVEL 3 — Template Syntax
	{ slug: 'level-3-template/01-control-flow', title: '{#if}, {#each}, {#key}, {#await}', level: 3, levelTitle: 'Template Syntax', order: 1, docs: D + 'if',
	  cover: '{#if/:else if/:else}; {#each list as item, i (key)} + keyed each; {#key} untuk re-mount; {#await promise}.', analogy: null, compare: { task: 'Kondisi & list rendering', fw: ['react', 'vue'], note: 'JSX pakai && dan .map(); Vue v-if/v-for; Svelte blok {#if}/{#each} + key eksplisit.' } },
	{ slug: 'level-3-template/02-snippets', title: 'Snippets {#snippet} & {@render}', level: 3, levelTitle: 'Template Syntax', order: 2, docs: D + 'snippet',
	  cover: '{#snippet name(args)}...{/snippet}; {@render name(args)}; children sebagai snippet implisit; snippet sebagai prop; menggantikan <slot>.', analogy: null, compare: { task: 'Konten yang bisa disisipkan', fw: ['react', 'vue'], note: 'React children/render props; Vue slots (default & named/scoped); Svelte snippets lebih eksplisit & bisa berargumen.' } },
	{ slug: 'level-3-template/03-tags', title: 'Tags: {@html}, {@const}, {@debug}, {@attach}', level: 3, levelTitle: 'Template Syntax', order: 3, docs: D + '@html',
	  cover: '{@html} (+ risiko XSS); {@const} di blok; {@debug}; {@attach} (attachment modern pengganti action use:).', analogy: 'attachment = stiker fungsi yang menempel ke elemen saat ia muncul di DOM.', compare: null },
	{ slug: 'level-3-template/04-directives', title: 'Directives: bind:, use:, style:, class', level: 3, levelTitle: 'Template Syntax', order: 4, docs: D + 'bind',
	  cover: 'bind:value/checked/group/this; bind:property komponen; use: (actions); style: directive; class (objek/array baru di Svelte 5).', analogy: null, compare: { task: 'Two-way binding input', fw: ['react', 'vue'], note: 'React controlled (value+onChange); Vue v-model; Svelte bind:value.' } },
	{ slug: 'level-3-template/05-transitions', title: 'Transitions & Animations: transition:, in:/out:, animate:', level: 3, levelTitle: 'Template Syntax', order: 5, docs: D + 'transition',
	  cover: 'transition: (fade/fly/slide/scale); in:/out: terpisah; |local/|global; animate: untuk list reorder (FLIP); custom transition.', analogy: null, compare: { task: 'Animasi masuk/keluar', fw: ['vue', 'react'], note: 'Vue <Transition>; React butuh library (Framer Motion); Svelte transition bawaan.' } },
	{ slug: 'level-3-template/06-async-await', title: 'await Expressions (Async Svelte)', level: 3, levelTitle: 'Template Syntax', order: 6, docs: D + 'await-expressions',
	  cover: 'await langsung di <script>/markup/$derived (fitur async terbaru); {#await} vs await expression; $effect.pending; <svelte:boundary> untuk loading.', analogy: null, compare: null },

	// LEVEL 4 — Special Elements & Runtime
	{ slug: 'level-4-special-runtime/01-special-elements', title: 'Special Elements: <svelte:boundary/window/document/body/head/element/options>', level: 4, levelTitle: 'Special Elements & Runtime', order: 1, docs: D + 'svelte-window',
	  cover: '<svelte:window> (bind scrollY/keydown); <svelte:document/body/head>; <svelte:element this={tag}>; <svelte:boundary> (error/pending); <svelte:options>.', analogy: null, compare: null },
	{ slug: 'level-4-special-runtime/02-stores-vs-runes', title: 'Stores (writable/readable/derived/custom) vs Runes', level: 4, levelTitle: 'Special Elements & Runtime', order: 2, docs: D + 'stores',
	  cover: 'writable/readable/derived; $ auto-subscribe; custom store; KAPAN pakai store vs runes ($state di .svelte.ts) untuk state global.', analogy: null, compare: { task: 'State global', fw: ['react', 'vue'], note: 'Redux/Zustand (React), Pinia (Vue); di Svelte 5 sering cukup runes di module .svelte.ts atau stores untuk RxJS-like.' } },
	{ slug: 'level-4-special-runtime/03-context-lifecycle', title: 'Context API, Lifecycle & Imperative Component API', level: 4, levelTitle: 'Special Elements & Runtime', order: 3, docs: D + 'context',
	  cover: 'setContext/getContext/hasContext; lifecycle onMount/onDestroy/tick (lifecycle-hooks); mount/unmount/render imperative API.', analogy: 'context = titip pesan lewat keluarga, tak perlu oper tangan ke tangan (lawan prop drilling).', compare: { task: 'Berbagi data lintas kedalaman & lifecycle', fw: ['react', 'vue'], note: 'React Context + useEffect cleanup; Vue provide/inject + lifecycle hooks; Svelte setContext + onMount/$effect.' } },

	// LEVEL 5 — Profesional / Misc
	{ slug: 'level-5-profesional/01-best-practices-ts', title: 'Best Practices & TypeScript di Svelte', level: 5, levelTitle: 'Profesional', order: 1, docs: D + 'typescript',
	  cover: 'lang="ts"; mengetik $props (interface), generics komponen, $state/$derived typing; Component type; best practices struktur.', analogy: null, compare: null },
	{ slug: 'level-5-profesional/02-testing', title: 'Testing: Vitest + Testing Library + Playwright', level: 5, levelTitle: 'Profesional', order: 2, docs: D + 'testing',
	  cover: 'Vitest unit (logika .svelte.ts, flushSync, $effect.root); @testing-library/svelte component test; Playwright E2E; kapan pakai yang mana.', analogy: null, compare: null },
	{ slug: 'level-5-profesional/03-custom-elements', title: 'Custom Elements / Web Components & Browser Support', level: 5, levelTitle: 'Profesional', order: 3, docs: D + 'custom-elements',
	  cover: '<svelte:options customElement="nama">; $host(); props/events custom element; shadow DOM; batasan; dukungan browser.', analogy: null, compare: null },
	{ slug: 'level-5-profesional/04-reference-modules', title: 'Reference Modules: motion, transition, easing, action, reactivity, events, store', level: 5, levelTitle: 'Profesional', order: 4, docs: D + 'svelte-motion',
	  cover: 'svelte/motion (Spring/Tween kelas baru); svelte/transition & easing; svelte/action (Action type); svelte/reactivity (SvelteMap/SvelteSet/SvelteDate); svelte/events; svelte/store.', analogy: null, compare: null },
	{ slug: 'level-5-profesional/05-migration', title: 'Migrasi Svelte 4 → 5 (+ Tabel Legacy vs Modern)', level: 5, levelTitle: 'Profesional', order: 5, docs: D + 'v5-migration-guide',
	  cover: 'export let->$props; $:->$derived/$effect; on:->onX; <slot>->snippet; createEventDispatcher->callback prop; svelte:component; tabel lengkap legacy vs modern (pakai <LegacyVsModern>).', analogy: null, compare: null },

	// LEVEL 6 — SvelteKit Dasar
	{ slug: 'level-6-sveltekit-dasar/01-apa-itu-sveltekit', title: 'Apa itu SvelteKit & Beda dengan Svelte', level: 6, levelTitle: 'SvelteKit Dasar', order: 1, docs: K + 'introduction',
	  cover: 'SvelteKit = meta-framework full-stack di atas Svelte+Vite; routing/SSR/build; project types & struktur (project-structure); kapan butuh Kit.', analogy: null, compare: { task: 'Framework vs meta-framework', fw: ['next', 'nuxt'], note: 'Next.js untuk React, Nuxt untuk Vue, SvelteKit untuk Svelte — peran setara.' } },
	{ slug: 'level-6-sveltekit-dasar/02-web-standards', title: 'Web Standards: Request/Response, fetch, FormData', level: 6, levelTitle: 'SvelteKit Dasar', order: 2, docs: K + 'web-standards',
	  cover: 'SvelteKit pakai API web standar: Request/Response, Headers, URL, FormData, fetch; mengapa ini bikin portable.', analogy: null, compare: null },
	{ slug: 'level-6-sveltekit-dasar/03-routing', title: 'Routing: +page/+layout/+server', level: 6, levelTitle: 'SvelteKit Dasar', order: 3, docs: K + 'routing',
	  cover: 'File-based routing; +page.svelte/+page.js/+page.server.js; +layout; +server.js; +error; params; struktur folder.', analogy: null, compare: { task: 'Definisi rute', fw: ['next', 'nuxt'], note: 'Next App Router (page.tsx/route.ts); Nuxt pages/; SvelteKit +page/+server. Konsep mirip, file beda.' } },
	{ slug: 'level-6-sveltekit-dasar/04-loading-data', title: 'Loading Data: load, +page.js vs +page.server.js', level: 6, levelTitle: 'SvelteKit Dasar', order: 4, docs: K + 'load',
	  cover: 'universal load (+page.js) vs server load (+page.server.js); kapan masing-masing; data ke page via $props; layout load; depends/invalidate; streaming.', analogy: null, compare: { task: 'Mengambil data halaman', fw: ['next', 'nuxt'], note: 'Next Server Components/getServerSideProps; Nuxt useFetch/useAsyncData; SvelteKit load (universal vs server).' } },
	{ slug: 'level-6-sveltekit-dasar/05-form-actions', title: 'Form Actions + use:enhance', level: 6, levelTitle: 'SvelteKit Dasar', order: 5, docs: K + 'form-actions',
	  cover: 'export const actions di +page.server.js; default & named actions; progressive enhancement dengan use:enhance; fail()/validasi; ActionData.', analogy: 'formulir kertas yang tetap bisa dikirim via pos walau internet mati, tapi instan kalau ada internet (progressive enhancement).', compare: { task: 'Mutasi data dari form', fw: ['next'], note: 'Next.js Server Actions; SvelteKit form actions bekerja tanpa JS lalu di-enhance.' } },
	{ slug: 'level-6-sveltekit-dasar/06-page-options', title: 'Page Options: SSR/CSR/prerender, trailingSlash', level: 6, levelTitle: 'SvelteKit Dasar', order: 6, docs: K + 'page-options',
	  cover: 'export const ssr/csr/prerender/trailingSlash/config; per-route; kapan SSR vs SSG vs SPA.', analogy: 'restoran: masak lalu antar (SSR), katering disiapkan jauh hari (SSG), kirim bahan mentah biar pelanggan masak (CSR).', compare: { task: 'Mode rendering', fw: ['next', 'nuxt'], note: 'Next/Nuxt punya SSR/SSG/ISR; SvelteKit SSR+prerender; singgung ISR (via cache header/adapter).' } },
	{ slug: 'level-6-sveltekit-dasar/07-state-remote', title: 'State Management di SSR & Remote Functions', level: 6, levelTitle: 'SvelteKit Dasar', order: 7, docs: K + 'state-management',
	  cover: 'Bahaya shared state di server; state aman (context, page data); hindari side-effect di module top-level; Remote functions (query/form/command) type-safe.', analogy: null, compare: null },

	// LEVEL 7 — SvelteKit Lanjutan
	{ slug: 'level-7-sveltekit-lanjutan/01-advanced-routing', title: 'Advanced Routing: rest/optional params, matchers, groups', level: 7, levelTitle: 'SvelteKit Lanjutan', order: 1, docs: K + 'advanced-routing',
	  cover: '[...rest], [[optional]], param matchers (src/params), route groups (group), layout breaking (+page@), encoding.', analogy: null, compare: null },
	{ slug: 'level-7-sveltekit-lanjutan/02-hooks', title: 'Hooks: handle, handleFetch, handleError, reroute', level: 7, levelTitle: 'SvelteKit Lanjutan', order: 2, docs: K + 'hooks',
	  cover: 'hooks.server.js: handle (event+resolve), handleFetch, handleError, locals; hooks.js: reroute, transport; sequence().', analogy: null, compare: null },
	{ slug: 'level-7-sveltekit-lanjutan/03-errors-links-sw', title: 'Error Handling, Link Options, Service Workers', level: 7, levelTitle: 'SvelteKit Lanjutan', order: 3, docs: K + 'errors',
	  cover: 'expected vs unexpected errors; error()/+error.svelte; link options (data-sveltekit-preload-data/reload); service worker bawaan ($service-worker).', analogy: null, compare: null },
	{ slug: 'level-7-sveltekit-lanjutan/04-server-only-advanced', title: 'Server-only Modules, Snapshots, Shallow Routing, Observability, Packaging', level: 7, levelTitle: 'SvelteKit Lanjutan', order: 4, docs: K + 'server-only-modules',
	  cover: '$lib/server & *.server; snapshots (simpan state UI); shallow routing (pushState/preloadData); observability (tracing); packaging library (svelte-package).', analogy: null, compare: null },

	// LEVEL 8 — Expert
	{ slug: 'level-8-expert/01-building-adapters', title: 'Building & Adapters (auto/node/static/Cloudflare/Netlify/Vercel/SPA)', level: 8, levelTitle: 'Expert', order: 1, docs: K + 'adapters',
	  cover: 'vite build; adapter-auto; adapter-node; adapter-static (SSG); Cloudflare/Netlify/Vercel; SPA; writing-adapters singkat.', analogy: null, compare: { task: 'Deployment target', fw: ['next', 'nuxt'], note: 'Next Vercel-native; Nuxt presets (nitro); SvelteKit adapters memilih target.' } },
	{ slug: 'level-8-expert/02-env-vars', title: 'Environment Variables ($env/static, $env/dynamic, public vs private)', level: 8, levelTitle: 'Expert', order: 2, docs: K + '%24env-static-private',
	  cover: '$env/static/private & public; $env/dynamic/private & public; prefix PUBLIC_; kapan static vs dynamic; keamanan (jangan bocor private ke klien).', analogy: null, compare: null },
	{ slug: 'level-8-expert/03-app-modules', title: '$app/* Modules (state, navigation, forms, paths, server, stores)', level: 8, levelTitle: 'Expert', order: 3, docs: K + '%24app-state',
	  cover: '$app/state (page/navigating/updated — runes, pengganti $app/stores); $app/navigation (goto/invalidate/preloadData); $app/forms (enhance/applyAction); $app/paths; $app/server.', analogy: null, compare: null },
	{ slug: 'level-8-expert/04-api-routes', title: 'API Routes +server.js (vs Nest.js, Express, Next route handlers)', level: 8, levelTitle: 'Expert', order: 4, docs: K + 'routing',
	  cover: '+server.js: GET/POST/PUT/PATCH/DELETE; RequestHandler; json() helper; params; content negotiation; kapan SvelteKit saja vs + backend terpisah.', analogy: null, compare: { task: 'Mendefinisikan endpoint API', fw: ['nest', 'next'], note: 'Nest.js = backend API murni (controller/decorator, di atas Express) — beda kategori dari SvelteKit (full-stack meta-framework). Next route handlers mirip +server. Jelaskan kapan pakai SvelteKit saja vs SvelteKit (frontend) + Nest.js (backend terpisah).' } },
	{ slug: 'level-8-expert/05-auth-perf-seo', title: 'Auth, Performance, Images, SEO, Accessibility, Icons', level: 8, levelTitle: 'Expert', order: 5, docs: K + 'auth',
	  cover: 'Auth (session/cookies, locals, hooks); performance (preload, code-split); @sveltejs/enhanced-img; SEO (title/meta, sitemap, SSR); a11y; icons.', analogy: null, compare: null },
	{ slug: 'level-8-expert/06-studi-kasus', title: 'Studi Kasus Akhir: Aplikasi Lengkap (Blog/Dashboard) End-to-End', level: 8, levelTitle: 'Expert', order: 6, docs: K + 'introduction',
	  cover: 'Rangkai semua: routing+layout, load server, form actions+enhance, auth via hooks/locals, +server API, adapter & deploy. Beri arsitektur & potongan kode kunci tiap bagian (statis, beranotasi).', analogy: null, compare: null }
];

// ---------------------------------------------------------------------------
function writerPrompt(b) {
	const fwList = b.compare ? b.compare.fw.join(', ') : '(tidak ada — hapus bagian 4 & nomori ulang jadi 6 bagian)';
	const compareLine = b.compare
		? `Bagian 4 WAJIB: <FrameworkCompare task="${b.compare.task}" ...> dengan framework: ${fwList}. Catatan/objektif: ${b.compare.note || ''}`
		: `Bagian "Kalau di framework lain" TIDAK ADA untuk modul ini — hapus dan jadikan 6 bagian (Konsep, Contoh kode, Coba sendiri, Latihan, Tips & Pitfalls, Docs).`;
	const analogyLine = b.analogy ? `Analogi yang HARUS dipakai di bagian Konsep: ${b.analogy}` : `Pakai analogi sendiri bila ada konsep abstrak.`;
	return `${GUIDE}

=== MODUL YANG DITULIS ===
PATH (Write ke sini, persis): src/lib/content/${b.slug}.svx
title: ${b.title}
level: ${b.level}
levelTitle: ${b.levelTitle}
order: ${b.order}
docs (untuk frontmatter & <DocsLink>): ${b.docs}
Topik yang WAJIB dicakup (kedalaman penuh): ${b.cover}
${analogyLine}
${compareLine}

Tulis filenya sekarang dengan tool Write, lalu kembalikan JSON.`;
}

function verifierPrompt(b, w) {
	return `Periksa file modul Svelte 5 ini: src/lib/content/${b.slug}.svx (modul: "${b.title}", level ${b.level}).
Baca filenya (Read). Periksa & PERBAIKI LANGSUNG (Edit/Write) bila melanggar:
1) Sintaks Svelte 4 dilarang: \`export let\`, \`$:\`, \`on:\` (mis on:click), \`<slot\`, \`createEventDispatcher\`, \`$$props\`, \`$$restProps\`, \`beforeUpdate\`, \`afterUpdate\`. Ganti ke padanan Svelte 5.
2) SvelteKit: pastikan error()/redirect() dipanggil tanpa \`throw\` di depannya.
3) Struktur: ada frontmatter lengkap (title/level/levelTitle/order/description/docs/keywords), blok <script> import komponen yang dipakai, dan heading "## " untuk tiap bagian. ${b.compare ? 'Harus ADA <FrameworkCompare>.' : 'Bagian framework boleh tidak ada.'} Harus ada <Playground> ATAU (untuk modul SvelteKit yang butuh server) contoh kode statis. Harus ada <Exercise> dengan {#snippet solution()} dan <DocsLink href="${b.docs}".
4) Keselamatan mdsvex: TIDAK ada karakter "{" atau "<" mentah di prosa (di luar code block/komponen). Inline simbol harus dalam backtick. Perbaiki yang berisiko bikin gagal build.
5) Playground (jika ada): satu komponen mandiri, runes saja, tanpa backtick/\${} di dalam string code, tanpa import komponen lokal.
Kembalikan JSON: pass=true jika sekarang sudah benar (setelah perbaikan), issues=daftar masalah yang ditemukan, fixed=true jika kamu mengedit file.`;
}

// ---------------------------------------------------------------------------
const wanted = Array.isArray(args && args.levels) ? args.levels : null;
const items = wanted ? BRIEFS.filter((b) => wanted.includes(b.level)) : BRIEFS;
log(`Menulis ${items.length} modul${wanted ? ` (level ${wanted.join(',')})` : ' (semua)'}…`);

const results = await pipeline(
	items,
	(b) => agent(writerPrompt(b), { label: `tulis:${b.slug}`, phase: 'Tulis', schema: SCHEMA_WRITE }),
	(w, b) => agent(verifierPrompt(b, w), { label: `cek:${b.slug}`, phase: 'Verifikasi', schema: SCHEMA_VERIFY })
);

const ok = results.filter(Boolean);
const failed = ok.filter((r) => r && r.pass === false);
log(`Selesai: ${ok.length} modul diproses, ${failed.length} masih bermasalah.`);
return { processed: ok.length, failed: failed.map((f) => ({ slug: f.slug, issues: f.issues })) };
