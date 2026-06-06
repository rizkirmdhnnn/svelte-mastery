# Complete docs coverage + 3-menu split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for this plan — most framework tasks are inline edits + one big content-generation Workflow) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the 42-module site into a complete mirror of the official Svelte / SvelteKit / CLI docs (~158 modules, including all Reference/API pages), split navigation into three separate top-level menus, and add a completeness dashboard.

**Architecture:** A single canonical page list (`scripts/pages.data.mjs`) drives three derived artifacts: the app's expected-coverage data (`src/lib/pages.generated.ts`), the authoring workflow's briefs (injected into `scripts/author-modules.workflow.js`), and per-module frontmatter (written by writer agents → parsed by `gen-manifest.mjs` into `modules.generated.ts`). The `ModuleMeta` model switches from numeric `level` to `product → section`. Framework code (data model, nav, routing, dashboard, redirects) is written inline; the ~158 deep Indonesian modules are produced by a writer→verifier Workflow, then a compile/fix pass.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), mdsvex (`.svx`), Vite 8, `adapter-cloudflare`, Node ESM scripts, the Workflow orchestration tool.

**Verification surface (this project has no unit-test harness — these are the "tests"):**
- `node scripts/gen-manifest.mjs` — regenerates the manifest (must succeed).
- `node scripts/gen-data.mjs` — regenerates app data from the canonical list.
- `npm run check` — `svelte-kit sync && wrangler types && svelte-check` (type/Svelte errors).
- `npx vite build` — full build incl. mdsvex compile of every `.svx`.
- `node scripts/lint-svx.mjs` — Svelte-4-syntax / mdsvex-safety lint.
- `node scripts/check-playgrounds.mjs` — compiles every `<Playground>` snippet.
- `node scripts/check-coverage.mjs` (new) — asserts the manifest covers every official page.

---

## Phase 0 — Verify the page list against live docs

### Task 0: Confirm the canonical list vs `svelte.dev/llms.txt`

**Files:** none yet (research only).

- [ ] **Step 1: Fetch the docs indices**

WebFetch each of:
- `https://svelte.dev/llms.txt` (index of all doc pages)
- `https://svelte.dev/docs/svelte/llms.txt`, `https://svelte.dev/docs/kit/llms.txt`, `https://svelte.dev/docs/cli/llms.txt` if present

- [ ] **Step 2: Diff against spec §G**

Compare the live page slugs to the spec's canonical list (`docs/superpowers/specs/2026-06-06-docs-complete-3-menu-design.md` §G). Record any **added** pages (new since the spec) and any **renamed** pages. Do NOT drop any spec-listed page that still 200s.

Expected: list is ~stable; note deltas to fold into `pages.data.mjs` in Task 1.1. Also confirm the exact CLI page set under `svelte.dev/docs/cli/`.

- [ ] **Step 3: Record findings** as a short comment block at the top of `scripts/pages.data.mjs` (created next).

---

## Phase 1 — Canonical data + content model + manifest

### Task 1.1: Canonical page list `scripts/pages.data.mjs`

**Files:**
- Create: `scripts/pages.data.mjs`

This is the single source of truth. It is a plain ESM module exporting an array `PAGES`, one entry per official docs page (every page in spec §G, plus any Task 0 additions).

- [ ] **Step 1: Write the schema + helpers header**

```js
// scripts/pages.data.mjs
// SINGLE SOURCE OF TRUTH for every official docs page we mirror.
// Consumed by: scripts/gen-data.mjs (app data + redirects),
//              scripts/gen-briefs.mjs (authoring workflow briefs).
// Task 0 findings (live-doc deltas): <fill in>
//
// Entry shape:
//   product:      'svelte' | 'kit' | 'cli'
//   section:      dir + URL segment, e.g. 'runes' ('cli' for CLI pages)
//   sectionTitle: human heading, e.g. 'Runes'
//   sectionOrder: section order within product (1-based)
//   page:         file basename + URL segment, e.g. 'state'
//   order:        module order within section (1-based)
//   title:        display title, e.g. '$state'
//   status:       'stable' | 'legacy' | 'reference'
//   docs:         official docs URL (source of truth)
//   seed:         old slug under src/lib/content to reuse, or null
//   analogy:      analogy string the writer MUST use, or null
//   compare:      { task, fw:['react','vue','next','nuxt','nest'], note } or null
//   cover:        short must-cover topic brief (1-2 sentences)
//   playground:   true for pure-Svelte demos; false for server-only (Kit/CLI)

const S = 'https://svelte.dev/docs/svelte/';
const K = 'https://svelte.dev/docs/kit/';
const C = 'https://svelte.dev/docs/cli/';

/** Build the app slug + content path from an entry. CLI pages are flat. */
export function slugOf(p) {
  return p.product === 'cli' ? `cli/${p.page}` : `${p.product}/${p.section}/${p.page}`;
}

export const PAGES = [
  // ... entries, see Step 2 ...
];
```

- [ ] **Step 2: Add every page entry**

Add one object per page from spec §G with these deterministic rules:
- **`product`/`section`/`sectionTitle`/`sectionOrder`/`order`** follow spec §G grouping; `sectionOrder` = section position in the product; `order` = position in the section (both 1-based, in listed order).
- **`page`** = the URL segment, slugified for Reference: drop leading `$`/`@`, replace `/` with `-`. Examples: `$state`→`state`, `svelte/reactivity/window`→`svelte-reactivity-window`, `@sveltejs/kit/node/polyfills`→`sveltejs-kit-node-polyfills`, `$app/state`→`app-state`, `$env/dynamic/private`→`env-dynamic-private`, `{#if}`→`if`, `{@render}`→`render`, `in:/out:`→`in-and-out`.
- **`status`**: `legacy` for all Svelte `legacy` section pages; `reference` for all `reference` section pages (both products) + the four error/warning pages; `stable` otherwise.
- **`docs`** = base (`S`/`K`/`C`) + the official page slug exactly as in spec §G (keep `$`/`@`/`/` un-slugified in the URL; for runes use the raw `$state` form — the writer encodes when fetching).
- **`seed`** = the old slug from spec §H mapping (the first/most-relevant old module), else `null`.
- **`analogy`** / **`compare`** / **`cover`**: carry over the rich briefs already present in the current `scripts/author-modules.workflow.js` `BRIEFS` for pages that had them; for newly-split pages, write a focused 1-sentence `cover` and set `analogy`/`compare` only where it genuinely helps (e.g. `compare` for `if`/`each`/`bind`/`transition`; `analogy` for `context`, `@attach`, `form-actions`, `page-options`).
- **`playground`**: `true` for pure-Svelte pages (most of Svelte product); `false` for SvelteKit server-dependent pages (routing/load/hooks/adapters/etc.), all Reference/API pages, error/warning tables, and CLI.

Representative worked entries (match this exact shape for all):

```js
  // Svelte › Runes
  { product:'svelte', section:'runes', sectionTitle:'Runes', sectionOrder:2, page:'state', order:2,
    title:'$state', status:'stable', docs:S+'$state', seed:'level-2-reactivity/02-state',
    analogy:'papan tulis ajaib: ubah satu angka, semua hitungan yang bergantung ikut berubah.',
    compare:{ task:'State reaktif lokal', fw:['react','vue'], note:'useState butuh setter & immutable update; Vue ref butuh .value; $state bisa dimutasi langsung.' },
    cover:'$state dasar; deep reactivity via Proxy untuk object/array; $state.raw (non-deep); $state.snapshot.', playground:true },

  // Svelte › Template syntax (split from old control-flow)
  { product:'svelte', section:'template', sectionTitle:'Template syntax', sectionOrder:3, page:'each', order:3,
    title:'{#each ...}', status:'stable', docs:S+'each', seed:'level-3-template/01-control-flow',
    analogy:null,
    compare:{ task:'List rendering', fw:['react','vue'], note:'JSX .map() butuh key prop; Vue v-for :key; Svelte {#each list as item, i (key)} dengan keyed each eksplisit.' },
    cover:'{#each list as item, i (key)}; keyed vs unkeyed; destructuring; else block; {#each} atas Map/Set; index.', playground:true },

  // Svelte › Reference (reference style; no playground)
  { product:'svelte', section:'reference', sectionTitle:'Reference', sectionOrder:8, page:'svelte-motion', order:9,
    title:'svelte/motion', status:'reference', docs:S+'svelte-motion', seed:'level-5-profesional/04-reference-modules',
    analogy:null, compare:null,
    cover:'Spring & Tween (kelas baru Svelte 5: new Spring(value,opts), .set/.target/.current); prefers-reduced-motion; contoh slider & angka beranimasi.', playground:false },

  // SvelteKit › Core (server; no playground)
  { product:'kit', section:'core', sectionTitle:'Core concepts', sectionOrder:2, page:'load', order:2,
    title:'Loading data', status:'stable', docs:K+'load', seed:'level-6-sveltekit-dasar/04-loading-data',
    analogy:null,
    compare:{ task:'Mengambil data halaman', fw:['next','nuxt'], note:'Next Server Components/getServerSideProps; Nuxt useFetch/useAsyncData; SvelteKit load (universal vs server).' },
    cover:'universal (+page.js) vs server (+page.server.js) load; data ke page via $props; layout load; depends/invalidate; streaming promises.', playground:false },

  // CLI (flat; no playground)
  { product:'cli', section:'cli', sectionTitle:'Perintah sv', sectionOrder:1, page:'sv-create', order:2,
    title:'sv create', status:'stable', docs:C+'sv-create', seed:'level-1-dasar/02-setup-tooling',
    analogy:null, compare:null,
    cover:'npx sv create: memilih template, opsi (TS/ESLint/Prettier/Playwright/Vitest), add-ons; struktur hasil.', playground:false },
```

- [ ] **Step 3: Sanity-count**

Run: `node -e "import('./scripts/pages.data.mjs').then(m=>{const p=m.PAGES;const by=t=>p.filter(x=>x.product===t).length;console.log('svelte',by('svelte'),'kit',by('kit'),'cli',by('cli'),'total',p.length);const dup=p.map(m.slugOf).filter((s,i,a)=>a.indexOf(s)!==i);console.log('dups',dup);})"`
Expected: `svelte 86 kit 67 cli 5 total 158` (± Task 0 deltas), `dups []`.

- [ ] **Step 4: Commit**

```bash
git add scripts/pages.data.mjs
git commit -m "feat: canonical official-docs page list (single source of truth)"
```

### Task 1.2: App-data generator `scripts/gen-data.mjs` → `src/lib/pages.generated.ts`

**Files:**
- Create: `scripts/gen-data.mjs`
- Create (generated): `src/lib/pages.generated.ts`
- Create: `src/lib/official-pages.ts` (typed wrapper + coverage helpers)

- [ ] **Step 1: Write the generator**

```js
// scripts/gen-data.mjs — emits src/lib/pages.generated.ts from pages.data.mjs.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PAGES, slugOf } from './pages.data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'src/lib/pages.generated.ts');

const official = PAGES.map((p) => ({
  slug: slugOf(p),
  product: p.product,
  section: p.section,
  sectionTitle: p.sectionTitle,
  sectionOrder: p.sectionOrder,
  order: p.order,
  title: p.title,
  status: p.status,
  docs: p.docs
}));

// old slug -> new slug (first page that names it as seed wins)
const redirects = {};
for (const p of PAGES) {
  if (p.seed && !(p.seed in redirects)) redirects[p.seed] = slugOf(p);
}

const banner = `// AUTO-GENERATED by scripts/gen-data.mjs — do not edit by hand.\n`;
const body =
  `import type { Product, Status } from './content';\n\n` +
  `export type OfficialPage = {\n\tslug: string; product: Product; section: string;\n` +
  `\tsectionTitle: string; sectionOrder: number; order: number;\n\ttitle: string; status: Status; docs: string;\n};\n\n` +
  `export const officialPages: OfficialPage[] = ${JSON.stringify(official, null, '\t')};\n\n` +
  `export const redirects: Record<string, string> = ${JSON.stringify(redirects, null, '\t')};\n`;

writeFileSync(out, banner + '\n' + body);
console.log(`[gen-data] ${official.length} pages, ${Object.keys(redirects).length} redirects → ${out}`);
```

- [ ] **Step 2: Wire it into npm scripts** (so it always runs before dev/build)

Modify `package.json` `scripts`:
```json
    "predev": "node scripts/gen-data.mjs && node scripts/gen-manifest.mjs",
    "prebuild": "node scripts/gen-data.mjs && node scripts/gen-manifest.mjs",
    "data": "node scripts/gen-data.mjs",
```
(Keep the existing `manifest` script.)

- [ ] **Step 3: Write the typed wrapper + coverage helpers**

```ts
// src/lib/official-pages.ts
import { officialPages, type OfficialPage } from './pages.generated';
import { modules, PRODUCT_ORDER, PRODUCT_TITLES, type Product } from './content';

export { officialPages, type OfficialPage };

const present = new Set(modules.map((m) => m.slug));

export function isPresent(slug: string): boolean {
  return present.has(slug);
}

export type Coverage = { product: Product; title: string; total: number; done: number };

export function coverageByProduct(): Coverage[] {
  return PRODUCT_ORDER.map((product) => {
    const inProduct = officialPages.filter((p) => p.product === product);
    return {
      product,
      title: PRODUCT_TITLES[product],
      total: inProduct.length,
      done: inProduct.filter((p) => present.has(p.slug)).length
    };
  }).filter((c) => c.total > 0);
}
```

- [ ] **Step 4: Generate + verify**

Run: `node scripts/gen-data.mjs && node -e "import('./src/lib/pages.generated.ts')" 2>/dev/null; ls -l src/lib/pages.generated.ts`
Expected: file written; console prints page/redirect counts. (TS import check happens later via `npm run check`.)

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-data.mjs src/lib/pages.generated.ts src/lib/official-pages.ts package.json
git commit -m "feat: gen-data emits official-pages + redirects from canonical list"
```

### Task 1.3: Rewrite the content model `src/lib/content.ts`

**Files:**
- Modify (rewrite): `src/lib/content.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// Auto-built module manifest. Every `.svx` under content/ is a module; its
// frontmatter drives nav, search, prev/next, progress. Taxonomy: product → section.
export type Product = 'svelte' | 'kit' | 'cli';
export type Status = 'stable' | 'legacy' | 'reference';

export type ModuleMeta = {
	slug: string; // "svelte/runes/state" — equals the content path (minus .svx)
	product: Product;
	section: string;
	sectionTitle: string;
	sectionOrder: number;
	order: number;
	title: string;
	description: string;
	status: Status;
	docs?: string;
	keywords?: string[];
	updated?: string; // ISO date (git commit or frontmatter override)
};

import { generatedModules } from './modules.generated';

export const PRODUCT_ORDER: Product[] = ['svelte', 'kit', 'cli'];
export const PRODUCT_TITLES: Record<Product, string> = {
	svelte: 'Svelte',
	kit: 'SvelteKit',
	cli: 'CLI'
};

export const modules: ModuleMeta[] = [...generatedModules]
	.filter((m) => typeof m.product === 'string')
	.sort(
		(a, b) =>
			PRODUCT_ORDER.indexOf(a.product) - PRODUCT_ORDER.indexOf(b.product) ||
			a.sectionOrder - b.sectionOrder ||
			a.order - b.order ||
			a.slug.localeCompare(b.slug)
	);

export type Section = { section: string; title: string; order: number; modules: ModuleMeta[] };
export type ProductGroup = {
	product: Product;
	title: string;
	sections: Section[];
	modules: ModuleMeta[];
};

export const products: ProductGroup[] = PRODUCT_ORDER.map((product) => {
	const inProduct = modules.filter((m) => m.product === product);
	const keys = [...new Set(inProduct.map((m) => m.section))];
	const sections: Section[] = keys
		.map((section) => {
			const inSection = inProduct.filter((m) => m.section === section);
			return {
				section,
				title: inSection[0]?.sectionTitle ?? section,
				order: inSection[0]?.sectionOrder ?? 0,
				modules: inSection
			};
		})
		.sort((a, b) => a.order - b.order);
	return { product, title: PRODUCT_TITLES[product], sections, modules: inProduct };
}).filter((p) => p.modules.length > 0);

export function productOf(slug: string): Product {
	const head = slug.split('/')[0];
	return (PRODUCT_ORDER.includes(head as Product) ? head : 'svelte') as Product;
}

export function getModule(slug: string): ModuleMeta | null {
	return modules.find((m) => m.slug === slug) ?? null;
}

/** Prev/next traverse the full ordered list WITHIN a product. */
export function neighbors(slug: string): {
	current: ModuleMeta | null;
	prev: ModuleMeta | null;
	next: ModuleMeta | null;
} {
	const m = getModule(slug);
	if (!m) return { current: null, prev: null, next: null };
	const inProduct = modules.filter((x) => x.product === m.product);
	const i = inProduct.findIndex((x) => x.slug === slug);
	return { current: m, prev: inProduct[i - 1] ?? null, next: inProduct[i + 1] ?? null };
}

/** First module of a product (for switcher landing). */
export function firstOf(product: Product): ModuleMeta | null {
	return modules.find((m) => m.product === product) ?? null;
}
```

- [ ] **Step 2: Commit** (will not typecheck until consumers updated — that's expected; we commit at the end of the phase)

Defer commit to Task 1.4.

### Task 1.4: Update `scripts/gen-manifest.mjs`

**Files:**
- Modify: `scripts/gen-manifest.mjs`

- [ ] **Step 1: Change the require-guard**

Replace:
```js
	if (!meta || typeof meta.level !== 'number') continue;
```
with:
```js
	if (!meta || typeof meta.product !== 'string') continue;
```

- [ ] **Step 2: Change the sort** to product → sectionOrder → order

Replace:
```js
modules.sort((a, b) => a.level - b.level || a.order - b.order || a.slug.localeCompare(b.slug));
```
with:
```js
const PRODUCT_ORDER = ['svelte', 'kit', 'cli'];
modules.sort(
	(a, b) =>
		PRODUCT_ORDER.indexOf(a.product) - PRODUCT_ORDER.indexOf(b.product) ||
		(a.sectionOrder ?? 0) - (b.sectionOrder ?? 0) ||
		(a.order ?? 0) - (b.order ?? 0) ||
		a.slug.localeCompare(b.slug)
);
```

- [ ] **Step 3: Regenerate against the OLD content** (still level-based) to confirm the script runs without crashing — it will emit 0 modules now (no `product` frontmatter yet), which is fine; the real run happens after content generation.

Run: `node scripts/gen-manifest.mjs`
Expected: `[gen-manifest] wrote 0 modules` (old files lack `product:`), no crash.

- [ ] **Step 4: Commit the model + manifest changes**

```bash
git add src/lib/content.ts scripts/gen-manifest.mjs src/lib/modules.generated.ts
git commit -m "feat: switch content model from level to product/section"
```

---

## Phase 2 — Routing + redirects

### Task 2.1: Redirect + product-landing in the route loader

**Files:**
- Modify: `src/routes/belajar/[...slug]/+page.ts`

- [ ] **Step 1: Rewrite the loader**

```ts
import { error, redirect } from '@sveltejs/kit';
import { getModule, modules, firstOf, PRODUCT_ORDER, type Product } from '$lib/content';
import { redirects } from '$lib/pages.generated';

export const prerender = true;

export function entries() {
	return modules.map((m) => ({ slug: m.slug }));
}

const loaders = import.meta.glob('$lib/content/**/*.svx');

export async function load({ params }) {
	const slug = params.slug;

	// Old level-* URL → new product/section URL (308 permanent).
	if (redirects[slug]) redirect(308, `/belajar/${redirects[slug]}`);

	// Bare product URL (/belajar/svelte) → that product's first module.
	if (PRODUCT_ORDER.includes(slug as Product)) {
		const first = firstOf(slug as Product);
		if (first) redirect(307, `/belajar/${first.slug}`);
	}

	const meta = getModule(slug);
	const key = Object.keys(loaders).find((k) => k.endsWith(`/content/${slug}.svx`));
	if (!meta || !key) error(404, `Modul tidak ditemukan: ${slug}`);
	const mod = (await loaders[key]()) as { default: unknown; metadata: unknown };
	return { slug, meta, Component: mod.default };
}
```

Note: `entries()` only enumerates real modules for prerender; redirect slugs are hit on demand (prerendered redirects are emitted by SvelteKit when crawled from old links — acceptable, and the sitemap only lists real modules).

- [ ] **Step 2: Commit** (defer until module page updated in 2.2 to keep build green; or commit now — `redirects` already exists from Task 1.2). Commit now:

```bash
git add src/routes/belajar/[...slug]/+page.ts
git commit -m "feat: 308 redirects old level URLs + product landing"
```

### Task 2.2: Update the module page (badge + product-aware breadcrumb)

**Files:**
- Modify: `src/routes/belajar/[...slug]/+page.svelte`

- [ ] **Step 1: Replace the script imports + breadcrumb**

Change the import block to add `StatusBadge` and product title, and the crumb to use product/section instead of `level`/`levelTitle`.

Replace lines 1-22 script with:
```ts
	import { neighbors, PRODUCT_TITLES } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { addCopyButtons } from '$lib/actions/copy';
	import Toc from '$lib/components/Toc.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { Component } from 'svelte';

	let { data } = $props();

	const nav = $derived(neighbors(data.slug));
	const Module = $derived(data.Component as Component);
	const done = $derived(progress.isDone(data.slug));

	const updated = $derived(
		data.meta.updated
			? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(
					new Date(data.meta.updated)
				)
			: null
	);
```

Replace the crumb block (the `<nav class="crumb">…</nav>` and the `<h1>` area) with:
```svelte
	<nav class="crumb">
		<a href="/">Beranda</a>
		<span aria-hidden="true">/</span>
		<a href="/belajar/{data.meta.product}">{PRODUCT_TITLES[data.meta.product]}</a>
		<span aria-hidden="true">/</span>
		<span>{data.meta.sectionTitle}</span>
	</nav>

	<div class="title-row">
		<h1>{data.meta.title}</h1>
		<StatusBadge status={data.meta.status} />
	</div>
	<p class="lead">{data.meta.description}</p>
```

- [ ] **Step 2: Add a `.title-row` style** (inside the existing `<style>`):
```css
	.title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.title-row h1 {
		margin: 0;
	}
	.crumb a {
		color: var(--text-muted);
		text-decoration: none;
	}
	.crumb a:hover {
		color: var(--brand);
	}
```

- [ ] **Step 3: Commit** (after StatusBadge exists — Task 3.1). Defer commit; note dependency.

---

## Phase 3 — Navigation UI

### Task 3.1: `StatusBadge.svelte`

**Files:**
- Create: `src/lib/components/StatusBadge.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
	import type { Status } from '$lib/content';
	let { status }: { status: Status } = $props();
	const LABEL: Record<Status, string> = { stable: 'Stable', legacy: 'Legacy', reference: 'Reference' };
</script>

<span class="badge {status}">{LABEL[status]}</span>

<style>
	.badge {
		display: inline-block;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		padding: 0.12rem 0.4rem;
		border-radius: 5px;
		border: 1px solid transparent;
		white-space: nowrap;
	}
	.stable {
		color: var(--ok, #1a7f37);
		background: color-mix(in srgb, var(--ok, #1a7f37) 14%, transparent);
	}
	.legacy {
		color: #b25f00;
		background: color-mix(in srgb, #b25f00 16%, transparent);
	}
	.reference {
		color: var(--brand);
		background: var(--accent-soft);
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/StatusBadge.svelte
git commit -m "feat: StatusBadge (Stable/Legacy/Reference)"
```

Now commit the deferred Task 2.2 module-page change too:
```bash
git add src/routes/belajar/[...slug]/+page.svelte
git commit -m "feat: module page uses product breadcrumb + status badge"
```

### Task 3.2: `ProductSwitcher.svelte`

**Files:**
- Create: `src/lib/components/ProductSwitcher.svelte`

- [ ] **Step 1: Write the segmented control**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { products, productOf, firstOf, type Product } from '$lib/content';

	// Active product from the current /belajar/<product>/… URL (default svelte).
	const active = $derived<Product>(
		page.url.pathname.startsWith('/belajar/')
			? productOf(decodeURIComponent(page.url.pathname.replace('/belajar/', '')))
			: 'svelte'
	);

	function hrefFor(product: Product): string {
		return `/belajar/${firstOf(product)?.slug ?? product}`;
	}
</script>

<div class="switcher" role="tablist" aria-label="Pilih produk">
	{#each products as p (p.product)}
		<a
			class="seg"
			class:active={p.product === active}
			role="tab"
			aria-selected={p.product === active}
			href={hrefFor(p.product)}
		>
			{p.title}
		</a>
	{/each}
</div>

<style>
	.switcher {
		display: inline-flex;
		gap: 0.15rem;
		padding: 0.2rem;
		background: var(--bg-inset);
		border: 1px solid var(--border);
		border-radius: 999px;
	}
	.seg {
		padding: 0.32rem 0.85rem;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s var(--ease), color 0.15s var(--ease);
	}
	.seg:hover {
		color: var(--text);
	}
	.seg.active {
		background: var(--bg-elevated);
		color: var(--brand);
		box-shadow: var(--shadow-sm);
	}
	@media (max-width: 560px) {
		.seg {
			padding: 0.3rem 0.6rem;
			font-size: 0.76rem;
		}
	}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/ProductSwitcher.svelte
git commit -m "feat: ProductSwitcher segmented control (Svelte/SvelteKit/CLI)"
```

### Task 3.3: Insert the switcher into `Header.svelte`

**Files:**
- Modify: `src/lib/components/Header.svelte`

- [ ] **Step 1: Import + render the switcher** between brand and search.

Add to the script:
```ts
	import ProductSwitcher from './ProductSwitcher.svelte';
```
Add after the `</a>` closing the `.brand` (line 14), before `.search-wrap`:
```svelte
	<div class="switcher-wrap"><ProductSwitcher /></div>
```
Add to `<style>`:
```css
	.switcher-wrap {
		flex: none;
	}
	@media (max-width: 760px) {
		.switcher-wrap {
			display: none;
		}
	}
```
(On small screens the sidebar drawer carries the switcher — Task 3.4 adds it there.)

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Header.svelte
git commit -m "feat: header hosts the product switcher"
```

### Task 3.4: Rewrite `Sidebar.svelte` (per-product, section groups, badges)

**Files:**
- Modify (rewrite): `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Replace script + markup**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { products, productOf, type Product } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProductSwitcher from './ProductSwitcher.svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	const currentSlug = $derived(
		page.url.pathname.startsWith('/belajar/')
			? decodeURIComponent(page.url.pathname.replace('/belajar/', ''))
			: ''
	);
	const activeProduct = $derived<Product>(currentSlug ? productOf(currentSlug) : 'svelte');
	const group = $derived(products.find((p) => p.product === activeProduct) ?? products[0]);

	const productSlugs = $derived(group.modules.map((m) => m.slug));
	const productPercent = $derived(progress.percent(productSlugs));

	function sectionHasCurrent(mods: { slug: string }[]) {
		return mods.some((m) => m.slug === currentSlug);
	}
</script>

<nav class="sidebar" aria-label="Daftar modul">
	<div class="mobile-switch"><ProductSwitcher /></div>

	<div class="overall">
		<div class="overall-head">
			<span>{group.title}</span>
			<span class="pct">{productPercent}%</span>
		</div>
		<div class="bar"><div class="fill" style="width:{productPercent}%"></div></div>
		<div class="count">{group.modules.filter((m) => progress.isDone(m.slug)).length}/{group.modules.length} modul</div>
	</div>

	{#each group.sections as sec (sec.section)}
		{@const secSlugs = sec.modules.map((m) => m.slug)}
		{@const secPct = progress.percent(secSlugs)}
		<details class="level" open={sectionHasCurrent(sec.modules) || sec.order === 1}>
			<summary>
				<span class="lv-title">{sec.title}</span>
				<span class="lv-pct" class:done={secPct === 100}>{secPct}%</span>
			</summary>
			<ul>
				{#each sec.modules as m (m.slug)}
					<li>
						<a
							href="/belajar/{m.slug}"
							class="mod"
							class:active={m.slug === currentSlug}
							onclick={onNavigate}
						>
							<span class="check" class:on={progress.isDone(m.slug)} aria-hidden="true">
								{progress.isDone(m.slug) ? '✓' : '○'}
							</span>
							<span class="m-title">{m.title}</span>
							{#if m.status !== 'stable'}<StatusBadge status={m.status} />{/if}
						</a>
					</li>
				{/each}
			</ul>
		</details>
	{/each}

	<div class="extras">
		<a href="/kelengkapan">✅ Kelengkapan materi</a>
		<a href="/roadmap">🗺️ Roadmap belajar</a>
		<a href="/cheatsheet-runes">📋 Cheat sheet runes</a>
		<a href="/migration-cheatsheet">🔄 Migration cheat sheet</a>
		<a href="/glossary">📖 Glossary</a>
	</div>
</nav>
```

- [ ] **Step 2: Reuse the existing `<style>` block** from the current Sidebar (it already styles `.overall/.bar/.fill/.level/summary/.lv-title/.lv-pct/.mod/.check/.m-title/.extras`). Remove the now-unused `.lv-num` rule. Add:
```css
	.count {
		font-size: 0.72rem;
		color: var(--text-faint);
		margin-top: 0.3rem;
	}
	.mobile-switch {
		display: none;
		padding: 0 0.6rem 0.8rem;
	}
	@media (max-width: 760px) {
		.mobile-switch {
			display: block;
		}
	}
	/* Keep status badges from stretching rows */
	.mod :global(.badge) {
		margin-left: auto;
		align-self: center;
	}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Sidebar.svelte
git commit -m "feat: per-product sidebar grouped by docs section + status badges"
```

### Task 3.5: Per-product progress helper (optional convenience)

**Files:**
- Modify: `src/lib/stores/progress.svelte.ts`

- [ ] **Step 1: Add a helper** (the sidebar already computes counts inline; add a typed helper for the dashboard/home).

After `percent(...)`:
```ts
	/** Count of done slugs among the given list. */
	count(slugs: string[]): number {
		return slugs.filter((s) => this.done.has(s)).length;
	}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/progress.svelte.ts
git commit -m "feat: progress.count helper"
```

---

## Phase 4 — Search, dashboard, home, roadmap

### Task 4.1: Update `src/lib/search.ts`

**Files:**
- Modify: `src/lib/search.ts`

- [ ] **Step 1: Replace `level`/`levelTitle` references** (which no longer exist) with `sectionTitle` + product, and add `PRODUCT_TITLES` to the haystack.

```ts
import { modules, PRODUCT_TITLES, type ModuleMeta } from './content';

/** Lightweight client-side search over the module manifest. */
export function search(query: string): ModuleMeta[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const terms = q.split(/\s+/);

	const scored = modules.map((m) => {
		const title = m.title.toLowerCase();
		const keywords = (m.keywords ?? []).join(' ').toLowerCase();
		const hay = `${title} ${keywords} ${m.description.toLowerCase()} ${m.sectionTitle.toLowerCase()} ${PRODUCT_TITLES[m.product].toLowerCase()}`;

		let score = 0;
		for (const t of terms) {
			if (!hay.includes(t)) return { m, score: -1 };
			if (title.includes(t)) score += 3;
			else if (keywords.includes(t)) score += 2;
			else score += 1;
		}
		return { m, score };
	});

	return scored
		.filter((x) => x.score >= 0)
		.sort((a, b) => b.score - a.score || a.m.sectionOrder - b.m.sectionOrder)
		.slice(0, 12)
		.map((x) => x.m);
}
```

- [ ] **Step 2: Commit** (with Search.svelte in 4.2).

### Task 4.2: Update `Search.svelte` result rows

**Files:**
- Modify: `src/lib/components/Search.svelte`

- [ ] **Step 1: Add product title import + context row.**

Add to script:
```ts
	import { PRODUCT_TITLES } from '$lib/content';
```
Replace the result-row inner markup (lines 83-84):
```svelte
							<span class="r-title">{m.title}</span>
							<span class="r-level">{PRODUCT_TITLES[m.product]} › {m.sectionTitle}</span>
```
(`.r-level` style already exists — reuse.)

- [ ] **Step 2: Commit**

```bash
git add src/lib/search.ts src/lib/components/Search.svelte
git commit -m "feat: search shows product › section context (global across menus)"
```

### Task 4.3: Completeness dashboard `/kelengkapan`

**Files:**
- Create: `src/routes/kelengkapan/+page.svelte`

- [ ] **Step 1: Write the page**

```svelte
<script lang="ts">
	import { officialPages, coverageByProduct, isPresent } from '$lib/official-pages';
	import { products } from '$lib/content';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	const coverage = coverageByProduct();
	const total = officialPages.length;
	const done = officialPages.filter((p) => isPresent(p.slug)).length;

	// Group official pages by product → sectionTitle for the checklist.
	const grouped = products.map((g) => {
		const pages = officialPages.filter((p) => p.product === g.product);
		const secs = [...new Set(pages.map((p) => p.sectionTitle))].map((title) => ({
			title,
			pages: pages.filter((p) => p.sectionTitle === title)
		}));
		return { product: g.product, title: g.title, secs };
	});
</script>

<svelte:head>
	<title>Kelengkapan materi — Svelte & SvelteKit Mastery</title>
	<meta name="description" content="Checklist kelengkapan modul vs daftar halaman dokumentasi resmi Svelte, SvelteKit, dan CLI." />
</svelte:head>

<article class="kelengkapan">
	<header>
		<span class="kicker">✅ Kelengkapan</span>
		<h1>Kelengkapan materi vs docs resmi</h1>
		<p class="sub">Tiap halaman docs resmi punya satu modul. Status: <strong>{done}/{total}</strong> terisi.</p>
		<div class="tallies">
			{#each coverage as c (c.product)}
				<div class="tally" class:full={c.done === c.total}>
					<span class="t-name">{c.title}</span>
					<span class="t-count">{c.done}/{c.total}</span>
				</div>
			{/each}
		</div>
	</header>

	{#each grouped as g (g.product)}
		<section class="prod">
			<h2>{g.title}</h2>
			{#each g.secs as sec (sec.title)}
				<h3>{sec.title}</h3>
				<ul>
					{#each sec.pages as p (p.slug)}
						<li class:missing={!isPresent(p.slug)}>
							<span class="mark">{isPresent(p.slug) ? '✓' : '○'}</span>
							{#if isPresent(p.slug)}
								<a href="/belajar/{p.slug}">{p.title}</a>
							{:else}
								<span class="t">{p.title}</span>
							{/if}
							<StatusBadge status={p.status} />
							<a class="docs" href={p.docs} target="_blank" rel="noopener noreferrer">docs ↗</a>
						</li>
					{/each}
				</ul>
			{/each}
		</section>
	{/each}
</article>

<style>
	.kelengkapan { max-width: 820px; margin: 0 auto; padding: 1.5rem 0 4rem; }
	.kicker {
		display: inline-block; font-size: 0.8rem; font-weight: 700; color: var(--brand);
		background: var(--accent-soft); padding: 0.25rem 0.7rem; border-radius: 99px; margin-bottom: 0.8rem;
	}
	h1 { font-size: 2rem; margin: 0 0 0.4rem; letter-spacing: -0.025em; }
	.sub { color: var(--text-muted); margin: 0 0 1.2rem; }
	.tallies { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; }
	.tally {
		display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem 0.9rem;
		border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-subtle);
	}
	.tally.full { border-color: var(--ok); }
	.t-name { font-weight: 600; }
	.t-count { color: var(--brand); font-weight: 700; }
	.prod { margin-top: 2rem; }
	.prod h2 { font-size: 1.4rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
	.prod h3 { font-size: 0.95rem; color: var(--text-muted); margin: 1.2rem 0 0.4rem; }
	ul { list-style: none; margin: 0; padding: 0; }
	li { display: flex; align-items: center; gap: 0.5rem; padding: 0.28rem 0; font-size: 0.9rem; }
	.mark { color: var(--ok); width: 1rem; }
	li.missing { color: var(--text-faint); }
	li.missing .mark { color: var(--err, #cf222e); }
	.docs { margin-left: auto; font-size: 0.76rem; color: var(--text-muted); }
	li a { color: var(--text); text-decoration: none; }
	li a:hover { color: var(--brand); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/kelengkapan/+page.svelte
git commit -m "feat: /kelengkapan completeness dashboard vs official docs"
```

### Task 4.4: Update the home page

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Replace `levels`/`42 modul` references** with product counts.

Change the script imports:
```ts
	import { products, modules } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { officialPages } from '$lib/official-pages';
	import { SITE_DESCRIPTION } from '$lib/site';
	import HeroDemo from '$lib/components/HeroDemo.svelte';

	const firstSlug = $derived(modules[0]?.slug ?? '');
	const totalPercent = $derived(progress.percent(modules.map((m) => m.slug)));
	const total = officialPages.length;
```
Update the 4th feature blurb body to:
```ts
			body: `${total} modul terstruktur dalam 3 menu (Svelte, SvelteKit, CLI), satu per halaman docs resmi.`
```
(Keep the other three features.)

- [ ] **Step 2: Add product entry buttons** to the hero CTA (optional but recommended). After the existing `.cta` block, add a small product nav:
```svelte
		<div class="prod-links">
			{#each products as p (p.product)}
				<a class="prod-link" href="/belajar/{p.modules[0]?.slug ?? p.product}">
					{p.title} <span class="pc">{p.modules.length}</span>
				</a>
			{/each}
		</div>
```
And style:
```css
	.prod-links { display: flex; gap: 0.6rem; margin-top: 1rem; flex-wrap: wrap; }
	.prod-link {
		display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem;
		border: 1px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-subtle);
		color: var(--text); text-decoration: none; font-weight: 600; font-size: 0.85rem;
	}
	.prod-link:hover { color: var(--brand); border-color: var(--brand); }
	.prod-link .pc { font-size: 0.72rem; color: var(--text-muted); background: var(--bg-inset); padding: 0.05rem 0.35rem; border-radius: 5px; }
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: home shows 3-product entry points + live module count"
```

### Task 4.5: Rework the roadmap for product/section

**Files:**
- Modify: `src/lib/roadmap.ts`
- Modify: `src/routes/roadmap/+page.svelte`
- Modify: `src/lib/components/RoadmapStage.svelte`

- [ ] **Step 1: Rewrite `roadmap.ts`** keyed by section key instead of numeric level.

```ts
// Per-section metadata for the learning roadmap (/roadmap). Keyed by
// "<product>/<section>" — add a section, add an entry (fallback is safe).
export type RoadmapMeta = { icon: string; blurb: string; docsUrl: string; docsLabel: string };

export const roadmapMeta: Record<string, RoadmapMeta> = {
	'svelte/introduction': { icon: '🌱', blurb: 'Filosofi compiler Svelte, setup `npx sv create`, anatomi `.svelte` & `.svelte.js`.', docsUrl: 'https://svelte.dev/docs/svelte/overview', docsLabel: 'Svelte · Introduction' },
	'svelte/runes': { icon: '⚡', blurb: 'Inti Svelte 5: `$state`, `$derived`, `$effect`, `$props`/`$bindable`, `$inspect`, `$host`.', docsUrl: 'https://svelte.dev/docs/svelte/what-are-runes', docsLabel: 'Svelte · Runes' },
	'svelte/template': { icon: '🧩', blurb: 'Markup: `{#if}`/`{#each}`, snippets, tags, directives, transitions, async.', docsUrl: 'https://svelte.dev/docs/svelte/basic-markup', docsLabel: 'Svelte · Template' },
	'svelte/styling': { icon: '🎨', blurb: 'Scoped & global styles, custom properties, nested `<style>`.', docsUrl: 'https://svelte.dev/docs/svelte/scoped-styles', docsLabel: 'Svelte · Styling' },
	'svelte/special-elements': { icon: '🪄', blurb: 'Elemen `<svelte:*>`: window, document, head, element, boundary, options.', docsUrl: 'https://svelte.dev/docs/svelte/svelte-window', docsLabel: 'Svelte · Special elements' },
	'svelte/runtime': { icon: '🛠️', blurb: 'Stores, Context, lifecycle hooks, imperative API, hydratable data.', docsUrl: 'https://svelte.dev/docs/svelte/stores', docsLabel: 'Svelte · Runtime' },
	'svelte/misc': { icon: '🎓', blurb: 'TypeScript, testing, custom elements, browser support, migrasi, FAQ.', docsUrl: 'https://svelte.dev/docs/svelte/typescript', docsLabel: 'Svelte · Misc' },
	'svelte/reference': { icon: '📖', blurb: 'Reference API tiap modul `svelte/*` + daftar error/warning compiler & runtime.', docsUrl: 'https://svelte.dev/docs/svelte/svelte', docsLabel: 'Svelte · Reference' },
	'svelte/legacy': { icon: '🕰️', blurb: 'Sintaks Svelte 4 (legacy) untuk membaca kode lama: `export let`, `$:`, `<slot>`, dll.', docsUrl: 'https://svelte.dev/docs/svelte/legacy-overview', docsLabel: 'Svelte · Legacy APIs' },
	'kit/getting-started': { icon: '🚦', blurb: 'Apa itu SvelteKit, buat proyek, project types & structure, web standards.', docsUrl: 'https://svelte.dev/docs/kit/introduction', docsLabel: 'Kit · Getting started' },
	'kit/core': { icon: '🧱', blurb: 'Routing, `load`, form actions, page options, state management, remote functions.', docsUrl: 'https://svelte.dev/docs/kit/routing', docsLabel: 'Kit · Core concepts' },
	'kit/build-deploy': { icon: '🚀', blurb: 'Build & adapters (auto/node/static/Cloudflare/Netlify/Vercel/SPA), writing adapters.', docsUrl: 'https://svelte.dev/docs/kit/adapters', docsLabel: 'Kit · Build & deploy' },
	'kit/advanced': { icon: '🧭', blurb: 'Advanced routing, hooks, errors, link options, service workers, packaging.', docsUrl: 'https://svelte.dev/docs/kit/advanced-routing', docsLabel: 'Kit · Advanced' },
	'kit/best-practices': { icon: '🏅', blurb: 'Auth, performance, images, accessibility, SEO, icons.', docsUrl: 'https://svelte.dev/docs/kit/auth', docsLabel: 'Kit · Best practices' },
	'kit/appendix': { icon: '📎', blurb: 'FAQ, integrations, debugging, migrasi v2/Sapper, resources, glossary.', docsUrl: 'https://svelte.dev/docs/kit/faq', docsLabel: 'Kit · Appendix' },
	'kit/reference': { icon: '📚', blurb: 'Reference API `@sveltejs/kit`, `$app/*`, `$env/*`, configuration, CLI, types.', docsUrl: 'https://svelte.dev/docs/kit/@sveltejs-kit', docsLabel: 'Kit · Reference' },
	'cli/cli': { icon: '⌨️', blurb: 'Perintah `sv`: create, add, check, migrate.', docsUrl: 'https://svelte.dev/docs/cli/overview', docsLabel: 'CLI · sv' }
};

export const FALLBACK_META: RoadmapMeta = { icon: '📘', blurb: 'Tahap belajar berikutnya.', docsUrl: 'https://svelte.dev/docs', docsLabel: 'Dokumentasi resmi' };
export const TUTORIAL_URL = 'https://svelte.dev/tutorial';
/** Product whose first section starts a new roadmap band (drives dividers). */
export const PRODUCT_DIVIDERS: Record<string, string> = { kit: '↓ Lanjut ke SvelteKit', cli: '↓ Lanjut ke CLI (sv)' };
```

- [ ] **Step 2: Rewrite the roadmap page** to iterate `products → sections`.

```svelte
<script lang="ts">
	import { products, modules } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { roadmapMeta, FALLBACK_META, TUTORIAL_URL, PRODUCT_DIVIDERS } from '$lib/roadmap';
	import RoadmapStage from '$lib/components/RoadmapStage.svelte';

	const allSlugs = $derived(modules.map((m) => m.slug));
	const totalPct = $derived(progress.percent(allSlugs));
	const currentSlug = $derived(modules.find((m) => !progress.isDone(m.slug))?.slug ?? '');
	const allDone = $derived(allSlugs.length > 0 && totalPct === 100);
</script>

<svelte:head>
	<title>Roadmap Belajar — Svelte & SvelteKit Mastery</title>
	<meta name="description" content="Peta belajar Svelte 5, SvelteKit v2, dan CLI dari pemula hingga expert, mengikuti urutan dokumentasi resmi." />
</svelte:head>

<article class="roadmap">
	<header class="rm-head">
		<span class="kicker">🗺️ Roadmap</span>
		<h1>Peta belajar Svelte, SvelteKit &amp; CLI</h1>
		<p class="sub">Jalur lengkap mengikuti urutan <strong>dokumentasi resmi</strong>. Tiap tahap menaut ke modulnya dan ke docs resmi.</p>
		<p class="tut">💡 Mau hands-on? Ikuti juga <a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer">tutorial interaktif resmi ↗</a>.</p>
		<div class="overall">
			<div class="o-bar"><div class="o-fill" style="width:{totalPct}%"></div></div>
			<span class="o-pct">{totalPct}% selesai</span>
		</div>
	</header>

	<ol class="timeline">
		<li class="row milestone start">
			<div class="rail"><span class="m-dot">🏁</span><span class="line"></span></div>
			<div class="m-label">Mulai di sini</div>
		</li>

		{#each products as prod (prod.product)}
			{#if PRODUCT_DIVIDERS[prod.product]}
				<li class="row divider">
					<div class="rail"><span class="line"></span></div>
					<div class="d-label">{PRODUCT_DIVIDERS[prod.product]}</div>
				</li>
			{/if}
			{#each prod.sections as sec (sec.section)}
				<RoadmapStage
					title={sec.title}
					modules={sec.modules}
					meta={roadmapMeta[`${prod.product}/${sec.section}`] ?? FALLBACK_META}
					{currentSlug}
				/>
			{/each}
		{/each}

		<li class="row milestone end" class:done={allDone}>
			<div class="rail"><span class="m-dot">🚀</span><span class="line"></span></div>
			<div class="m-label">{allDone ? 'Selesai — kamu siap membangun app!' : 'Tujuan: kuasai seluruh docs'}</div>
		</li>
	</ol>
</article>

<!-- keep the existing <style> block unchanged -->
```
(Copy the existing `<style>` block from the current roadmap page verbatim.)

- [ ] **Step 3: Update `RoadmapStage.svelte`** to drop the numeric `level` prop.

Read the component; replace its props `let { level, title, modules, meta, currentSlug } = $props()` with `let { title, modules, meta, currentSlug } = $props()` and remove any `L{level}` / `level`-based rendering (replace a `level` badge, if present, with the `meta.icon`). Keep everything else. (Exact edit determined when reading the file during execution — the only change is removing the `level` prop and its usages.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/roadmap.ts src/routes/roadmap/+page.svelte src/lib/components/RoadmapStage.svelte
git commit -m "feat: roadmap iterates product → section (3 products)"
```

---

## Phase 5 — Authoring workflow

### Task 5.1: Brief injector `scripts/gen-briefs.mjs`

**Files:**
- Create: `scripts/gen-briefs.mjs`

The workflow script cannot import files (sandboxed), so we inject the brief array literal into `author-modules.workflow.js` between markers.

- [ ] **Step 1: Write the injector**

```js
// scripts/gen-briefs.mjs — injects BRIEFS (from pages.data.mjs) into the
// authoring workflow between // <BRIEFS-START> and // <BRIEFS-END>.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PAGES, slugOf } from './pages.data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const wf = join(root, 'scripts/author-modules.workflow.js');

const briefs = PAGES.map((p) => ({
	slug: slugOf(p),
	path: `src/lib/content/${slugOf(p)}.svx`,
	product: p.product,
	section: p.section,
	sectionTitle: p.sectionTitle,
	sectionOrder: p.sectionOrder,
	order: p.order,
	title: p.title,
	status: p.status,
	docs: p.docs,
	seed: p.seed,
	analogy: p.analogy ?? null,
	compare: p.compare ?? null,
	cover: p.cover,
	playground: p.playground
}));

const src = readFileSync(wf, 'utf8');
const start = src.indexOf('// <BRIEFS-START>');
const end = src.indexOf('// <BRIEFS-END>');
if (start === -1 || end === -1) throw new Error('BRIEFS markers not found in workflow');
const next =
	src.slice(0, start) +
	'// <BRIEFS-START>\nconst BRIEFS = ' +
	JSON.stringify(briefs, null, '\t') +
	';\n' +
	src.slice(end);
writeFileSync(wf, next);
console.log(`[gen-briefs] injected ${briefs.length} briefs → ${wf}`);
```

- [ ] **Step 2: Commit** (with the workflow in 5.2).

### Task 5.2: Rewrite `scripts/author-modules.workflow.js`

**Files:**
- Modify (rewrite): `scripts/author-modules.workflow.js`

- [ ] **Step 1: Write the workflow** (writer fetches docs `llms.txt`, reads seed, writes new frontmatter; verifier fixes). Keep the proven GUIDE, extend for the new model. Replace the whole file:

```js
export const meta = {
	name: 'author-docs-modules',
	description: 'Author + verify every Svelte/SvelteKit/CLI docs module (.svx)',
	phases: [
		{ title: 'Tulis', detail: 'satu agen penulis per modul (fetch docs + seed)' },
		{ title: 'Verifikasi', detail: 'agen verifikator memeriksa & memperbaiki' }
	]
};

const GUIDE = `Kamu menulis SATU modul pembelajaran berbahasa Indonesia tentang Svelte 5 / SvelteKit v2 / CLI sv,
sebagai file mdsvex (.svx). Pembaca sudah paham React & Vue; kaitkan ke sana bila relevan. Tujuan: lebih DALAM &
lebih mudah dipahami daripada docs resmi (analogi, contoh nyata, latihan) — bukan menyalin.

LANGKAH:
1) WebFetch URL docs resmi (field 'docs' + '/llms.txt') untuk fakta/akurasi API terbaru. Jika gagal, andalkan 'cover' + pengetahuanmu.
2) Jika ada 'seed' (slug modul lama), Read file src/lib/content/<seed>.svx dan DAUR ULANG prosa/analogi/contoh yang relevan.
3) Write file ke PATH yang diberikan (timpa jika ada), lalu kembalikan JSON sesuai schema.

FRONTMATTER (persis, semua field):
---
title: <judul>
product: <svelte|kit|cli>
section: <section key>
sectionTitle: <judul section>
sectionOrder: <angka>
order: <angka>
status: <stable|legacy|reference>
description: <1 kalimat>
docs: <URL docs resmi>
keywords: [<3-6 kata>]
---

Lalu <script> meng-import HANYA komponen yang dipakai:
import Playground from '$lib/components/playground/Playground.svelte';
import FrameworkCompare from '$lib/components/FrameworkCompare.svelte';
import Callout from '$lib/components/Callout.svelte';
import Exercise from '$lib/components/Exercise.svelte';
import DocsLink from '$lib/components/DocsLink.svelte';
import LegacyVsModern from '$lib/components/LegacyVsModern.svelte';

BAGIAN (heading "## ", berurutan; hapus yang tak relevan & nomori ulang):
## 1. Konsep        -> penjelasan dalam + ANALOGI bila abstrak
## 2. Contoh kode   -> blok \`\`\`svelte/js/ts beranotasi
## 3. Coba sendiri  -> <Playground .../> JIKA playground=true; jika false, contoh statis beranotasi
## 4. Kalau di framework lain -> <FrameworkCompare .../> HANYA jika compare ada
## 5. Latihan       -> <Exercise> + {#snippet solution()}…{/snippet}  (skip untuk modul Reference murni; ganti 'Ringkasan API')
## 6. Tips & Pitfalls -> >=2 <Callout type="pitfall|warning|tip|legacy">
## 7. Docs resmi    -> <DocsLink href="<docs>" label="..." />

TIPE MODUL:
- status=reference: GAYA REFERENSI — tabel LENGKAP export/fungsi/tipe + tanda tangan & parameter, lalu 1-2 contoh praktis per item penting. (Playground biasanya false.)
- halaman error/warning (compiler-errors, compiler-warnings, runtime-errors, runtime-warnings): tabel kode → arti → penyebab umum → cara perbaiki (ambil daftar dari llms.txt).
- status=legacy: tandai jelas dengan <Callout type="legacy"> / <LegacyVsModern>; tunjukkan padanan modern.

ATURAN AKURASI (KETAT — diperiksa verifikator):
- HANYA Svelte 5 (runes). DILARANG di contoh modern: export let, $: , on:click (pakai onclick), <slot> (pakai {@render}/snippet), createEventDispatcher (pakai prop callback), $$props/$$restProps, beforeUpdate/afterUpdate. (Pengecualian: modul di section 'legacy' MEMANG menampilkan sintaks lama — beri konteks "ini API lama".)
- SvelteKit 2: error()/redirect() dipanggil TANPA throw; pakai event.fetch; tanda tangan load/actions terbaru.

BATASAN PLAYGROUND (jika playground=true):
- SATU komponen .svelte mandiri, runes saja, sintaks valid.
- Hanya import dari 'svelte' & submodulnya ('svelte/transition','svelte/motion','svelte/easing','svelte/store','svelte/animate','svelte/events'). JANGAN import file lokal.
- JANGAN pakai backtick atau \${ } di dalam string code Playground.

KESELAMATAN mdsvex:
- Di PROSA jangan tulis "{" atau "<" mentah — pakai inline code backtick atau entitas.
- Pasangkan semua tag komponen; indentasi snippet solution rapi.

GAYA: Bahasa Indonesia santai-jelas; istilah/kode tetap Inggris. Kedalaman penuh: jelaskan "mengapa". Objektif saat membandingkan.`;

const SCHEMA_WRITE = {
	type: 'object', additionalProperties: false,
	required: ['slug', 'written', 'usedPlayground', 'summary'],
	properties: {
		slug: { type: 'string' }, written: { type: 'boolean' },
		usedPlayground: { type: 'boolean' }, summary: { type: 'string' }
	}
};
const SCHEMA_VERIFY = {
	type: 'object', additionalProperties: false,
	required: ['slug', 'pass', 'issues', 'fixed'],
	properties: {
		slug: { type: 'string' }, pass: { type: 'boolean' },
		issues: { type: 'array', items: { type: 'string' } }, fixed: { type: 'boolean' }
	}
};

// <BRIEFS-START>
const BRIEFS = [];
// <BRIEFS-END>

function writerPrompt(b) {
	const compareLine = b.compare
		? `Bagian 4 WAJIB: <FrameworkCompare task="${b.compare.task}" ...> framework: ${b.compare.fw.join(', ')}. Catatan objektif: ${b.compare.note || ''}`
		: `TIDAK ada bagian "Kalau di framework lain" — hapus & nomori ulang.`;
	const analogyLine = b.analogy ? `Analogi WAJIB di bagian Konsep: ${b.analogy}` : `Pakai analogi sendiri bila konsepnya abstrak.`;
	const seedLine = b.seed ? `SEED untuk didaur ulang: Read src/lib/content/${b.seed}.svx lalu pakai ulang bagian yang relevan.` : `Tidak ada seed — tulis dari nol berbasis docs.`;
	const pgLine = b.playground ? `playground=true: bagian "Coba sendiri" pakai <Playground code={...} />.` : `playground=false: bagian "Coba sendiri" pakai contoh kode statis beranotasi (modul ini butuh server / referensi).`;
	return `${GUIDE}

=== MODUL ===
PATH (Write persis ke sini): ${b.path}
title: ${b.title}
product: ${b.product}
section: ${b.section}
sectionTitle: ${b.sectionTitle}
sectionOrder: ${b.sectionOrder}
order: ${b.order}
status: ${b.status}
docs (frontmatter + WebFetch ${b.docs}/llms.txt + <DocsLink>): ${b.docs}
Topik WAJIB (kedalaman penuh): ${b.cover}
${seedLine}
${analogyLine}
${compareLine}
${pgLine}

Fetch docs, (baca seed), lalu Write filenya sekarang, lalu kembalikan JSON.`;
}

function verifierPrompt(b) {
	return `Periksa modul: ${b.path} ("${b.title}", product ${b.product}, status ${b.status}).
Read filenya. Periksa & PERBAIKI LANGSUNG (Edit/Write) bila melanggar:
1) Frontmatter lengkap & benar: title, product=${b.product}, section=${b.section}, sectionTitle, sectionOrder=${b.sectionOrder}, order=${b.order}, status=${b.status}, description, docs=${b.docs}, keywords.
2) Sintaks Svelte 4 dilarang di contoh MODERN (export let, $:, on:, <slot, createEventDispatcher, $$props, $$restProps, beforeUpdate, afterUpdate). ${b.status === 'legacy' ? 'Section legacy BOLEH menampilkan sintaks lama TAPI harus diberi konteks "API lama".' : 'Ganti ke padanan Svelte 5.'}
3) SvelteKit: error()/redirect() tanpa throw.
4) Struktur: <script> import komponen yang dipakai; heading "## " tiap bagian; ${b.compare ? 'ADA <FrameworkCompare>;' : ''} ${b.playground ? 'ADA <Playground> valid;' : 'contoh statis (bukan Playground server);'} ada <DocsLink href="${b.docs}".
5) mdsvex: tidak ada "{" atau "<" mentah di prosa (di luar code/komponen); tag berpasangan.
6) ${b.status === 'reference' ? 'Gaya referensi: ada tabel export/fungsi/tipe + contoh.' : ''}
Kembalikan JSON: pass=true bila sudah benar (setelah perbaikan), issues=daftar masalah, fixed=true bila kamu mengedit.`;
}

const wantProducts = Array.isArray(args && args.products) ? args.products : null;
const wantSlugs = Array.isArray(args && args.slugs) ? args.slugs : null;
let items = BRIEFS;
if (wantProducts) items = items.filter((b) => wantProducts.includes(b.product));
if (wantSlugs) items = items.filter((b) => wantSlugs.includes(b.slug));
log(`Menulis ${items.length} modul${wantProducts ? ` (produk ${wantProducts.join(',')})` : ''}${wantSlugs ? ` (slug terpilih)` : ''}…`);

const results = await pipeline(
	items,
	(b) => agent(writerPrompt(b), { label: `tulis:${b.slug}`, phase: 'Tulis', schema: SCHEMA_WRITE }),
	(_w, b) => agent(verifierPrompt(b), { label: `cek:${b.slug}`, phase: 'Verifikasi', schema: SCHEMA_VERIFY })
);

const ok = results.filter(Boolean);
const failed = ok.filter((r) => r && r.pass === false);
log(`Selesai: ${ok.length} diproses, ${failed.length} masih bermasalah.`);
return { processed: ok.length, failed: failed.map((f) => ({ slug: f.slug, issues: f.issues })) };
```

- [ ] **Step 2: Inject the briefs + commit**

Run: `node scripts/gen-briefs.mjs`
Expected: `[gen-briefs] injected 158 briefs → …/author-modules.workflow.js`

```bash
git add scripts/gen-briefs.mjs scripts/author-modules.workflow.js
git commit -m "feat: authoring workflow for all docs pages (fetch+seed+verify)"
```

---

## Phase 6 — Generate content

### Task 6: Run the authoring workflow (the big pass)

**Files:** creates ~158 `.svx` files under `src/lib/content/{svelte,kit,cli}/…`.

- [ ] **Step 1: Run the workflow** via the Workflow tool with `{ scriptPath: "scripts/author-modules.workflow.js" }` (no args = all products). This spawns ~158 writer + ~158 verifier agents (concurrency-capped). Single review at the end (per the chosen one-pass strategy).

- [ ] **Step 2: If it fails partway**, relaunch with `{ scriptPath, resumeFromRunId: "<runId>" }` to reuse cached completed agents, or re-run for a subset with `args: { slugs: [...] }` / `args: { products: ['kit'] }`.

- [ ] **Step 3: Regenerate the manifest**

Run: `node scripts/gen-data.mjs && node scripts/gen-manifest.mjs`
Expected: `[gen-manifest] wrote 158 modules` (± deltas).

- [ ] **Step 4: Commit the generated content**

```bash
git add src/lib/content src/lib/modules.generated.ts
git commit -m "feat: author all Svelte/SvelteKit/CLI docs modules (~158)"
```

---

## Phase 7 — Cleanup + verification

### Task 7.1: Remove old combined modules

**Files:** delete `src/lib/content/level-1-dasar/` … `level-8-expert/` (after confirming their content was reused/superseded).

- [ ] **Step 1: Confirm the bonus capstone is preserved** — if keeping `level-8-expert/06-studi-kasus`, move it to `src/lib/content/kit/appendix/studi-kasus.svx` with proper frontmatter (product `kit`, section `appendix`, status `stable`) BEFORE deleting; add it to `pages.data.mjs` as a non-official bonus (or accept it shows as an "extra" not in officialPages — the dashboard only lists official pages, extras are harmless).

- [ ] **Step 2: Delete the old level dirs**

```bash
git rm -r src/lib/content/level-1-dasar src/lib/content/level-2-reactivity src/lib/content/level-3-template src/lib/content/level-4-special-runtime src/lib/content/level-5-profesional src/lib/content/level-6-sveltekit-dasar src/lib/content/level-7-sveltekit-lanjutan src/lib/content/level-8-expert
```

- [ ] **Step 3: Regenerate + commit**

```bash
node scripts/gen-manifest.mjs
git add -A && git commit -m "chore: remove old level-based modules (decomposed into product/section)"
```

### Task 7.2: Coverage gate `scripts/check-coverage.mjs`

**Files:**
- Create: `scripts/check-coverage.mjs`

- [ ] **Step 1: Write the checker**

```js
// scripts/check-coverage.mjs — fails if any official page lacks a module.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PAGES, slugOf } from './pages.data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = readFileSync(join(root, 'src/lib/modules.generated.ts'), 'utf8');

let missing = [];
for (const p of PAGES) {
	const slug = slugOf(p);
	const file = join(root, 'src/lib/content', slug + '.svx');
	const inManifest = manifest.includes(`"slug": "${slug}"`);
	if (!existsSync(file) || !inManifest) missing.push(slug);
}
const by = (t) => PAGES.filter((p) => p.product === t).length;
console.log(`Coverage: ${PAGES.length - missing.length}/${PAGES.length} (svelte ${by('svelte')}, kit ${by('kit')}, cli ${by('cli')})`);
if (missing.length) {
	console.error('MISSING:\n' + missing.map((s) => '  - ' + s).join('\n'));
	process.exit(1);
}
console.log('✓ All official pages covered.');
```

- [ ] **Step 2: Run it**

Run: `node scripts/gen-manifest.mjs && node scripts/check-coverage.mjs`
Expected: `✓ All official pages covered.` If any missing, re-run the workflow for those slugs (Task 6 Step 2), then re-check.

- [ ] **Step 3: Add to package scripts + commit**
```json
    "coverage": "node scripts/check-coverage.mjs",
```
```bash
git add scripts/check-coverage.mjs package.json
git commit -m "feat: coverage gate — every official page has a module"
```

### Task 7.3: Compile / lint / typecheck — fix until green

**Files:** various `.svx` (fixes), as needed.

- [ ] **Step 1: Lint Svelte-4 syntax + mdsvex safety**

Run: `node scripts/lint-svx.mjs`
Expected: no errors. Fix any flagged file (or re-run the verifier agent for it).

- [ ] **Step 2: Compile every playground**

Run: `node scripts/check-playgrounds.mjs`
Expected: all pass. For failures, run `scripts/fix-svx.workflow.js` via the Workflow tool, or hand-fix.

- [ ] **Step 3: Typecheck + Svelte-check**

Run: `npm run check`
Expected: 0 errors. Common fixes: a consumer still referencing `m.level`/`levelTitle` (grep `level` across `src/`), or a `.svx` frontmatter typo.

Run: `git grep -nE "\.level\b|levelTitle|\.levels\b" -- src/ ':!*.svx'`
Expected: no remaining references (all migrated to product/section).

- [ ] **Step 4: Full build**

Run: `npx vite build`
Expected: build succeeds; every `.svx` compiles via mdsvex; prerender of `/belajar/**` + `/kelengkapan` + `/roadmap` works.

- [ ] **Step 5: Commit fixes**

```bash
git add -A && git commit -m "fix: typecheck + mdsvex compile across all modules"
```

### Task 7.4: Touch-up cross-links

**Files:** `src/routes/cheatsheet-runes/+page.svelte`, `src/routes/migration-cheatsheet/+page.svelte`, `src/routes/glossary/+page.svelte`.

- [ ] **Step 1: Grep for stale `/belajar/level-` links** in these pages.

Run: `git grep -n "belajar/level-" -- src/routes`
Expected: none, or a small list. Update each to the new product/section slug (or rely on the 308 redirect — but prefer fixing internal links).

- [ ] **Step 2: Commit (if changed)**

```bash
git add -A && git commit -m "chore: update cross-links to new module slugs"
```

---

## Phase 8 — Finalize

### Task 8: Manual verification + branch wrap-up

- [ ] **Step 1: Dev smoke test**

Run: `npm run dev` and verify in the browser:
- Header switcher toggles Svelte / SvelteKit / CLI; sidebar swaps entirely.
- A Reference module (e.g. `/belajar/svelte/reference/svelte-motion`) shows the `Reference` badge + API tables.
- A Legacy module shows the `Legacy` badge.
- `/kelengkapan` shows **158/158** (or live total) with all three products full.
- Search returns results across products with "Product › Section" context.
- An old URL (`/belajar/level-2-reactivity/02-state`) 308-redirects to `/belajar/svelte/runes/state`.
- A Kit module (e.g. `/belajar/kit/core/load`) renders annotated static code (no broken playground).

- [ ] **Step 2: Final commit** (any smoke-test fixes), then summarize for review.

- [ ] **Step 3: Offer the finishing-a-development-branch skill** to decide merge/PR.

---

## Self-review notes (spec coverage)

- Data model (spec §A) → Task 1.3, 1.4. URLs/redirects (§B) → 1.1 (slug rules), 2.1. Nav UI + switcher + badges + per-product progress (§C) → 3.1–3.5. Dashboard (§D) → 4.3. Search (§E) → 4.1–4.2. Authoring workflow incl. llms.txt fetch, seed reuse, reference/error/legacy styles, playground constraints (§F) → 5.1–5.2, 6. Canonical list + live verification (§G) → 0, 1.1. Decompose & reuse seeds (§H) → 1.1 (`seed`), 5.2 (writer reads seed), 7.1. Touch-points (§I) → 4.4, 4.5, 7.4. DoD (§J) → 7.2 (coverage), 7.3 (build), 8 (manual). Out of scope (§K) respected (no visual redesign; capstone preserved as bonus).
- Type consistency: `ModuleMeta` fields (`product/section/sectionTitle/sectionOrder/order/status`) used identically in content.ts, gen-manifest, gen-data, official-pages, Sidebar, Search, module page, dashboard. `slugOf` defined once in pages.data.mjs and reused by both generators. `redirects` exported from pages.generated.ts and consumed in +page.ts.
- No placeholders: every framework file has complete code; the only data artifact produced at execution (the 158-row `pages.data.mjs` body and the ~158 `.svx` files) has explicit, deterministic construction rules (Task 1.1 Step 2) and a worked example per category.
