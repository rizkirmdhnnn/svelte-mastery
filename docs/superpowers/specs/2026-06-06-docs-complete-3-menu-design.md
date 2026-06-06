# Spec — Complete docs coverage + 3-menu split (Svelte / SvelteKit / CLI)

**Date:** 2026-06-06
**Branch:** `feat/docs-complete-3-menu`
**Status:** Approved design → ready for implementation plan

## Goal

Turn the existing 42-module learning site into a **complete mirror of the official
docs** (`svelte.dev/docs`): every Svelte, SvelteKit, and CLI page — *including all
Reference/API pages* — becomes its own learning module, explained more deeply and
more accessibly than the source. Navigation splits into **three fully separate
top-level menus** (Svelte | SvelteKit | CLI) via a header switcher.

Decisions locked during brainstorming:
- **Build strategy:** everything in one pass (framework + all modules + verify), single review at the end.
- **Existing content:** decompose & reuse — split each combined module into per-page modules, seeding from existing prose, then expand to full depth.
- **URLs:** product-based (`/belajar/<product>/<section>/<page>`) with 308 redirects from old `level-*` slugs.

## A. Data model

Replace the numeric `level` taxonomy with **product → section → module**.

```ts
// src/lib/content.ts
type Product = 'svelte' | 'kit' | 'cli';
type Status  = 'stable' | 'legacy' | 'reference';

type ModuleMeta = {
  slug: string;          // "svelte/runes/state" == product/section/page (path-relative)
  product: Product;
  section: string;       // "runes"
  sectionTitle: string;  // "Runes"
  sectionOrder: number;  // section order within product
  order: number;         // module order within section
  title: string;
  description: string;
  status: Status;        // drives badge
  docs: string;          // official docs URL (source of truth)
  keywords?: string[];
  updated?: string;      // ISO git date (mechanism unchanged)
};
```

Derived structures in `content.ts`:
- `products: { product, title, sections: { section, title, order, modules }[] }[]`
- `productOf(slug)`, `neighbors(slug)` (prev/next traverse the full ordered list **within a product**, crossing section boundaries in `sectionOrder`/`order`).
- `officialPages` canonical list (see §G) for the completeness dashboard.

`scripts/gen-manifest.mjs`: change the require-guard from `typeof meta.level === 'number'`
to `typeof meta.product === 'string'`; sort by `product`, `sectionOrder`, `order`, `slug`.
Frontmatter parser already handles string/number/array values, so no parser change needed.

## B. Content layout, URLs, redirects

```
src/lib/content/
  svelte/  introduction/ runes/ template/ styling/ special-elements/
           runtime/ misc/ reference/ legacy/
  kit/     getting-started/ core/ build-deploy/ advanced/
           best-practices/ appendix/ reference/
  cli/     <flat>
```

- **URL** = `/belajar/<product>/<section>/<page>` (CLI is flat: `/belajar/cli/<page>`).
- Reference page names containing slashes/`@`/`$` are slugified:
  - `svelte/reactivity/window` → `svelte/reference/svelte-reactivity-window`
  - `@sveltejs/kit/node/polyfills` → `kit/reference/sveltejs-kit-node-polyfills`
  - `$app/state` → `kit/reference/app-state`; `$env/dynamic/private` → `kit/reference/env-dynamic-private`
- **Redirects:** `src/lib/redirects.ts` maps every old slug → best new slug; the
  `belajar/[...slug]/+page.ts` loader issues `redirect(308, …)` on a hit. Combined old
  modules redirect to their primary new page (e.g. `level-3-template/01-control-flow` → `svelte/template/if`).
- **Sitemap** (`sitemap.xml/+server.ts`) regenerates from the manifest automatically.

## C. Navigation UI

- **Header switcher** (`Header.svelte`): segmented control `Svelte | SvelteKit | CLI`.
  Active product derived from URL (`/belajar/<product>/…`), default `svelte`.
  Clicking a product navigates to that product's first module (or a product landing).
- **Sidebar** (`Sidebar.svelte`): renders **only the active product**, grouped by
  section (collapsible `<details>`, current section auto-open), per-section + per-product
  progress bars. A `<StatusBadge>` (`Stable` / `Legacy` / `Reference`) shows on rows and
  in the module header.
- New component `StatusBadge.svelte`. Progress store gains per-product percent helpers.

## D. Completeness dashboard

Route `/kelengkapan` (linked from sidebar extras + home). Renders `officialPages`
checked against the manifest: per-product tally ("Svelte 86/86 · SvelteKit 67/67 ·
CLI 5/5"), grouped checklist with ✓ / missing, and links to each present module. This
is the visible Definition-of-Done gate.

## E. Search

`Search.svelte` already indexes the manifest. Add product + section context to each
result row (e.g. "Svelte › Runes › $state") and a small product/status badge; search
stays global across all three products.

## F. Content authoring

Extend the existing **`scripts/author-modules.workflow.js`** (writer→verifier pipeline)
to a brief table covering **every page in §G**. The framework code (data model, nav,
routing, dashboard, redirects) is written directly by the main agent; the **content**
is produced by the workflow.

Each **writer agent**:
1. `WebFetch`es the page's official `<docs-url>/llms.txt` for ground-truth API
   signatures/examples (fallback: the brief's `cover` + model knowledge if fetch fails).
2. For decomposed pages, reads the **seed** old `.svx` (path in brief) and reuses its
   prose, analogies, and examples.
3. Writes a deepened Indonesian `.svx` in the established multi-section format:
   Konsep (+analogy for abstract concepts) → Contoh kode → Coba sendiri (Playground) →
   Kalau di framework lain (when `compare` set) → Latihan (+solution snippet) →
   Tips & Pitfalls → Docs resmi (`<DocsLink>`).

Module-type rules:
- **Reference/API** modules (`svelte/*`, `@sveltejs/kit`, `$app/*`, `$env/*`): reference
  style — full table of exports/signatures/types/params + 1–2 practical examples each.
  `status: reference`.
- **Compiler/Runtime errors & warnings**: code → meaning → common cause → fix table.
- **Legacy APIs**: `status: legacy`; use `<LegacyVsModern>` / `<Callout type="legacy">`.
- **Server-dependent Kit/CLI** modules: no live `<Playground>`; use annotated static
  ` ```svelte / ```js / ```ts ` blocks (per the existing playground constraints).

A **verifier agent** per module enforces Svelte-5-only syntax (no `export let`, `$:`,
`on:`, `<slot>`, `createEventDispatcher`, `$$props`/`$$restProps`, `beforeUpdate`/`afterUpdate`),
SvelteKit-2 conventions (`error()`/`redirect()` called without `throw`), structure
completeness, mdsvex safety (no raw `{`/`<` in prose), and playground constraints —
fixing in place.

**Compile/verify phase** (after authoring): run `scripts/lint-svx.mjs`,
`scripts/check-playgrounds.mjs`, `npm run check`, and `svelte-kit build`; route any
failures through `scripts/fix-svx.workflow.js` (or targeted re-runs) until green.

## G. Canonical page list (the brief source — verify vs live `svelte.dev/llms.txt` first)

The **first implementation step** fetches `svelte.dev/llms.txt` (and the kit/cli docs
index) to confirm this list; add pages that appeared since, never silently drop listed
pages. Counts below are the target.

### Svelte (86) — product `svelte`
- **introduction** (4): overview · getting-started · svelte-files · svelte-js-files
- **runes** (8): what-are-runes · $state · $derived · $effect · $props · $bindable · $inspect · $host
- **template** (20): basic-markup · {#if} · {#each} · {#key} · {#await} · {#snippet} · {@render} · {@html} · {@attach} · {@const} · {@debug} · declaration-tags (let/const) · bind: · use: · transition: · in:/out: · animate: · style: · class · await-expressions
- **styling** (4): scoped-styles · global-styles · custom-properties · nested-style-elements
- **special-elements** (7): svelte:boundary · svelte:window · svelte:document · svelte:body · svelte:head · svelte:element · svelte:options
- **runtime** (5): stores · context · lifecycle-hooks · imperative-component-api · hydratable
- **misc** (8): best-practices · testing · typescript · custom-elements · browser-support · v4-migration-guide · v5-migration-guide · faq
- **reference** (18): svelte · svelte/action · svelte/animate · svelte/attachments · svelte/compiler · svelte/easing · svelte/events · svelte/legacy · svelte/motion · svelte/reactivity/window · svelte/reactivity · svelte/server · svelte/store · svelte/transition · compiler-errors · compiler-warnings · runtime-errors · runtime-warnings
- **legacy** (12): legacy-overview · legacy-let · legacy-reactive-assignments · legacy-export-let · legacy-$$props-and-$$restProps · legacy-on · legacy-slots · legacy-$$slots · legacy-svelte-fragment · legacy-svelte-component · legacy-svelte-self · legacy-component-api

### SvelteKit (67) — product `kit`
- **getting-started** (5): introduction · creating-a-project · project-types · project-structure · web-standards
- **core** (6): routing · load · form-actions · page-options · state-management · remote-functions
- **build-deploy** (11): building-your-app · adapters · adapter-auto · adapter-node · adapter-static · single-page-apps · adapter-cloudflare · adapter-cloudflare-workers · adapter-netlify · adapter-vercel · writing-adapters
- **advanced** (10): advanced-routing · hooks · errors · link-options · service-workers · server-only-modules · snapshots · shallow-routing · observability · packaging
- **best-practices** (6): auth · performance · icons · images · accessibility · seo
- **appendix** (7): faq · integrations · debugging · migrating-to-sveltekit-2 · migrating · additional-resources · glossary
- **reference** (22): @sveltejs/kit · @sveltejs/kit/hooks · @sveltejs/kit/node/polyfills · @sveltejs/kit/node · @sveltejs/kit/vite · $app/environment · $app/forms · $app/navigation · $app/paths · $app/server · $app/state · $app/stores · $app/types · $env/dynamic/private · $env/dynamic/public · $env/static/private · $env/static/public · $lib · $service-worker · configuration · cli · types

### CLI (5) — product `cli`
- overview · sv-create · sv-add · sv-check · sv-migrate (+ any extra pages found under `svelte.dev/docs/cli/`)

**Target total: ~158 modules** (verify against live; adjust up if docs added pages).

## H. Decompose & reuse mapping (seed sources)

Existing combined modules seed the new per-page modules (writer reads the old file):

| Old module | Seeds new pages |
|---|---|
| level-1-dasar/01-apa-itu-svelte | svelte/introduction/overview |
| level-1-dasar/02-setup-tooling | svelte/introduction/getting-started; cli/overview, cli/sv-create |
| level-1-dasar/03-anatomi-komponen | svelte/introduction/svelte-files, svelte-js-files |
| level-1-dasar/04-markup-dasar | svelte/template/basic-markup |
| level-1-dasar/05-styling | svelte/styling/* (scoped, global, custom-properties, nested) |
| level-2-reactivity/01-apa-itu-runes | svelte/runes/what-are-runes |
| level-2-reactivity/02-state | svelte/runes/state |
| level-2-reactivity/03-derived | svelte/runes/derived |
| level-2-reactivity/04-effect | svelte/runes/effect |
| level-2-reactivity/05-props-bindable | svelte/runes/props, bindable |
| level-2-reactivity/06-inspect-host | svelte/runes/inspect, host |
| level-3-template/01-control-flow | svelte/template/if, each, key, await |
| level-3-template/02-snippets | svelte/template/snippet, @render |
| level-3-template/03-tags | svelte/template/@html, @const, @debug, @attach |
| level-3-template/04-directives | svelte/template/bind, use, style, class |
| level-3-template/05-transitions | svelte/template/transition, in-and-out, animate |
| level-3-template/06-async-await | svelte/template/await-expressions |
| level-4-special-runtime/01-special-elements | svelte/special-elements/* (7) |
| level-4-special-runtime/02-stores-vs-runes | svelte/runtime/stores |
| level-4-special-runtime/03-context-lifecycle | svelte/runtime/context, lifecycle-hooks, imperative-component-api |
| level-5-profesional/01-best-practices-ts | svelte/misc/best-practices, typescript |
| level-5-profesional/02-testing | svelte/misc/testing |
| level-5-profesional/03-custom-elements | svelte/misc/custom-elements, browser-support |
| level-5-profesional/04-reference-modules | svelte/reference/* (motion, transition, easing, action, reactivity, events, store) |
| level-5-profesional/05-migration | svelte/misc/v5-migration-guide, v4-migration-guide; svelte/legacy/* |
| level-6-sveltekit-dasar/01-apa-itu-sveltekit | kit/getting-started/introduction |
| level-6-sveltekit-dasar/02-web-standards | kit/getting-started/web-standards |
| level-6-sveltekit-dasar/03-routing | kit/core/routing |
| level-6-sveltekit-dasar/04-loading-data | kit/core/load |
| level-6-sveltekit-dasar/05-form-actions | kit/core/form-actions |
| level-6-sveltekit-dasar/06-page-options | kit/core/page-options |
| level-6-sveltekit-dasar/07-state-remote | kit/core/state-management, remote-functions |
| level-7-sveltekit-lanjutan/01-advanced-routing | kit/advanced/advanced-routing |
| level-7-sveltekit-lanjutan/02-hooks | kit/advanced/hooks |
| level-7-sveltekit-lanjutan/03-errors-links-sw | kit/advanced/errors, link-options, service-workers |
| level-7-sveltekit-lanjutan/04-server-only-advanced | kit/advanced/server-only-modules, snapshots, shallow-routing, observability, packaging |
| level-8-expert/01-building-adapters | kit/build-deploy/* |
| level-8-expert/02-env-vars | kit/reference/env-* |
| level-8-expert/03-app-modules | kit/reference/app-* |
| level-8-expert/04-api-routes | kit/core/routing (seed for +server section) |
| level-8-expert/05-auth-perf-seo | kit/best-practices/* (auth, performance, images, seo, accessibility, icons) |
| level-8-expert/06-studi-kasus | preserved as a **bonus capstone** (kit/appendix/additional-resources companion) — not counted against the official tally |

Old `level-*` directories are deleted after authoring; redirects preserve old URLs.

## I. Touch-points to update

- `roadmap/+page.svelte` + its manifest: new slugs/structure.
- `cheatsheet-runes`, `migration-cheatsheet`, `glossary`: fix any internal links.
- `+page.svelte` (home): module counts and product entry points.
- `sitemap.xml` / `robots.txt`: auto from manifest (verify).

## J. Definition of done

- `/kelengkapan` shows **158/158** (or the live-verified total) across the three menus.
- No empty/placeholder modules — every page has full explanation + examples.
- Header switcher fully separates Svelte / SvelteKit / CLI; sidebar swaps entirely.
- Every module links to its official docs source.
- Status badges (Stable/Legacy/Reference) present.
- Old URLs redirect; `npm run check` + `svelte-kit build` pass; playgrounds compile.

## K. Out of scope

- No backend/runtime features beyond static learning content.
- No redesign of the "Hangat Svelte" visual system (reuse existing tokens/components).
- The bonus capstone is preserved but not part of the 1:1 docs tally.
