# Svelte & SvelteKit Mastery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Indonesian-language learning website "Svelte & SvelteKit Mastery" (SvelteKit v2 + Svelte 5) with a real in-browser Svelte playground and 42 full-depth modules across 8 levels, accurate to current official docs.

**Architecture:** SvelteKit app prerendered to a static site. Modules authored in mdsvex (`.svx`) with embedded interactive components. A client-side playground compiles Svelte in a Web Worker and runs the output in a sandboxed iframe via an import map pinned to the installed Svelte version (served from esm.sh). Nav/search/progress are derived from an auto-built content manifest (`import.meta.glob`).

**Tech Stack:** SvelteKit 2, Svelte 5, mdsvex, Shiki, CodeMirror 6 (`@replit/codemirror-lang-svelte`), `@sveltejs/adapter-static`, TypeScript.

---

## File Structure

```
svelte.config.js                       # mdsvex + adapter-static + .svx extension
mdsvex.config.js                       # Shiki highlighter, default layout, global components
vite.config.ts
src/
├─ app.html                            # no-flash theme script
├─ app.css                             # design tokens (light/dark vars) + base styles
├─ routes/
│  ├─ +layout.ts                       # prerender=true; trailingSlash
│  ├─ +layout.svelte                   # shell: Sidebar + Header + breadcrumb + footer
│  ├─ +page.svelte                     # Beranda/landing
│  ├─ belajar/[...slug]/+page.ts       # resolve module by slug from manifest
│  ├─ belajar/[...slug]/+page.svelte   # render module component + prev/next + progress toggle
│  ├─ glossary/+page.svelte
│  ├─ cheatsheet-runes/+page.svelte
│  └─ migration-cheatsheet/+page.svelte
├─ lib/
│  ├─ content.ts                       # manifest from import.meta.glob('content/**/*.svx')
│  ├─ search.ts                        # build + query search index
│  ├─ stores/
│  │  ├─ theme.svelte.ts               # 'light'|'dark' + localStorage
│  │  ├─ progress.svelte.ts            # Set<slug> done + percent helpers
│  │  └─ settings.svelte.ts            # comparisonMode boolean
│  ├─ components/
│  │  ├─ Sidebar.svelte  Header.svelte  Breadcrumb.svelte  ProgressBar.svelte  Search.svelte
│  │  ├─ Callout.svelte  DocsLink.svelte  Exercise.svelte  LegacyVsModern.svelte  CodeBlock.svelte
│  │  ├─ FrameworkCompare.svelte
│  │  └─ playground/
│  │     ├─ Playground.svelte          # editor + preview orchestration
│  │     ├─ Editor.svelte              # CodeMirror 6 wrapper
│  │     ├─ Preview.svelte             # iframe + message handling
│  │     ├─ compiler.worker.ts         # svelte.compile in a worker
│  │     └─ make-srcdoc.ts             # build iframe srcdoc (importmap + mount)
│  └─ content/
│     ├─ level-1-dasar/01-apa-itu-svelte.svx ... (5)
│     ├─ level-2-reactivity/...        (6)
│     ├─ level-3-template/...          (6)
│     ├─ level-4-special-runtime/...   (3)
│     ├─ level-5-profesional/...       (5)
│     ├─ level-6-sveltekit-dasar/...   (7)
│     ├─ level-7-sveltekit-lanjutan/...(4)
│     └─ level-8-expert/...            (6)
```

**Boundaries:** playground compile (worker) is isolated from preview (iframe) which is isolated from the editor (CodeMirror). Stores are single-responsibility runes modules. Content components are presentational with explicit props.

---

# FASE A — Platform inti

## Task 1: Scaffold SvelteKit + dependencies + config

**Files:**
- Create: `package.json`, `svelte.config.js`, `mdsvex.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `.npmrc`

- [ ] **Step 1: Scaffold non-interactively** (create-svelte's clack prompts can't run in non-TTY; scaffold by hand or use `npx sv create --template minimal --types ts --no-add-ons . ` if it runs non-interactively; otherwise hand-write files below).

- [ ] **Step 2: `package.json`** (pin versions at install time; these are the libs):

```jsonc
{
  "name": "svelte-sveltekit-mastery",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3",
    "@sveltejs/kit": "^2",
    "@sveltejs/vite-plugin-svelte": "^5",
    "mdsvex": "^0.12",
    "shiki": "^1",
    "svelte": "^5",
    "svelte-check": "^4",
    "typescript": "^5",
    "vite": "^6",
    "codemirror": "^6",
    "@codemirror/state": "^6",
    "@codemirror/view": "^6",
    "@codemirror/commands": "^6",
    "@replit/codemirror-lang-svelte": "^6"
  }
}
```

- [ ] **Step 3: `svelte.config.js`**:

```js
import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
export default {
  extensions: ['.svelte', '.svx'],
  preprocess: [mdsvex(mdsvexConfig)],
  kit: {
    adapter: adapter({ fallback: '404.html' }),
    prerender: { entries: ['*'] }
  }
};
```

- [ ] **Step 4: `mdsvex.config.js`** (Shiki highlighter; auto-import global components into every `.svx`):

```js
import { createHighlighter } from 'shiki';

let highlighter;
async function highlight(code, lang) {
  highlighter ??= await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['svelte', 'js', 'ts', 'html', 'css', 'jsx', 'tsx', 'vue', 'bash', 'json']
  });
  const safe = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
  const html = highlighter.codeToHtml(code, {
    lang: safe, themes: { light: 'github-light', dark: 'github-dark' }
  });
  return `{@html \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`}`;
}

/** @type {import('mdsvex').MdsvexOptions} */
export default {
  extensions: ['.svx'],
  highlight: { highlighter: highlight },
  layout: { _: './src/lib/components/ModuleLayout.svelte' }
};
```

- [ ] **Step 5: `mdsvex.config.js` global components** — add a `<script context="module">` injection so `.svx` files can use `<Playground>`, `<FrameworkCompare>`, `<Callout>`, `<Exercise>`, `<DocsLink>`, `<LegacyVsModern>` without importing. Implement via mdsvex `layout` re-exports OR an explicit import line per module. **Decision:** ModuleLayout imports + re-exports nothing; instead each `.svx` gets a small autogenerated `<script>` import block (the content-authoring template includes the imports). Keep mdsvex config minimal.

- [ ] **Step 6: `src/app.html`** with no-flash theme script:

```html
<!doctype html>
<html lang="id" data-theme="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script>
      try {
        const t = localStorage.getItem('mastery:theme');
        if (t) document.documentElement.dataset.theme = t;
        else if (matchMedia('(prefers-color-scheme: dark)').matches)
          document.documentElement.dataset.theme = 'dark';
      } catch {}
    </script>
    %sveltekit.head%
  </head>
  <body><div style="display:contents">%sveltekit.body%</div></body>
</html>
```

- [ ] **Step 7: `src/app.css`** — design tokens for light/dark via `[data-theme]`, base typography, prose styles for `.svx` content, code block theming that respects `data-theme` (toggle Shiki dual themes via CSS variables).

- [ ] **Step 8: Verify scaffold boots**

Run: `npm install && npm run dev`
Expected: dev server starts on localhost; a blank/placeholder home renders without errors.

- [ ] **Step 9: Commit** — `git add -A && git commit -m "feat: scaffold SvelteKit + mdsvex + shiki"`

---

## Task 2: Content manifest + dynamic module route

**Files:** Create `src/lib/content.ts`, `src/routes/belajar/[...slug]/+page.ts`, `src/routes/belajar/[...slug]/+page.svelte`, `src/routes/+layout.ts`

- [ ] **Step 1: `src/lib/content.ts`** — build ordered manifest from `.svx` frontmatter:

```ts
export type ModuleMeta = {
  slug: string;        // e.g. "level-2-reactivity/02-state"
  level: number;       // 1..8
  levelTitle: string;
  order: number;       // within level
  title: string;
  description: string;
  docs?: string;       // official docs URL
  keywords?: string[];
};

const files = import.meta.glob('./content/**/*.svx', { eager: true });

export const modules: ModuleMeta[] = Object.entries(files)
  .map(([path, mod]: any) => {
    const slug = path.replace('./content/', '').replace('.svx', '');
    return { slug, ...(mod.metadata ?? {}) } as ModuleMeta;
  })
  .sort((a, b) => a.level - b.level || a.order - b.order);

export const levels = [...new Set(modules.map((m) => m.level))].map((lvl) => ({
  level: lvl,
  title: modules.find((m) => m.level === lvl)!.levelTitle,
  modules: modules.filter((m) => m.level === lvl)
}));

export function neighbors(slug: string) {
  const i = modules.findIndex((m) => m.slug === slug);
  return { prev: modules[i - 1] ?? null, next: modules[i + 1] ?? null, current: modules[i] };
}
```

- [ ] **Step 2: `+layout.ts`** — `export const prerender = true; export const trailingSlash = 'never';`

- [ ] **Step 3: `belajar/[...slug]/+page.ts`** — resolve the component lazily and the meta:

```ts
import { error } from '@sveltejs/kit';
import { modules } from '$lib/content';

export const prerender = true;
export function entries() { return modules.map((m) => ({ slug: m.slug })); }

export async function load({ params }) {
  const slug = params.slug;
  const all = import.meta.glob('$lib/content/**/*.svx');
  const key = Object.keys(all).find((k) => k.endsWith(`/content/${slug}.svx`));
  if (!key) throw error(404, `Modul tak ditemukan: ${slug}`);
  const mod: any = await all[key]();
  return { slug, Component: mod.default, meta: mod.metadata };
}
```

- [ ] **Step 4: `belajar/[...slug]/+page.svelte`** — render `data.Component`, breadcrumb, "Tandai selesai" toggle (progress store), prev/next from `neighbors`.

- [ ] **Step 5: Add one temporary `.svx` smoke module** (`content/level-1-dasar/01-apa-itu-svelte.svx` minimal) and verify the route renders it.

Run: `npm run dev` → open `/belajar/level-1-dasar/01-apa-itu-svelte`
Expected: module title + body render; prev/next present.

- [ ] **Step 6: Commit** — `feat: content manifest + dynamic module route`

---

## Task 3: Stores (theme, progress, settings)

**Files:** Create `src/lib/stores/theme.svelte.ts`, `progress.svelte.ts`, `settings.svelte.ts`

- [ ] **Step 1: `theme.svelte.ts`** — `$state` of `'light'|'dark'`, `toggle()`, `$effect` syncs to `document.documentElement.dataset.theme` + `localStorage('mastery:theme')`. Initialize from current `data-theme`.

- [ ] **Step 2: `progress.svelte.ts`** — `$state` `Set<string>` of completed slugs, hydrate from `localStorage('mastery:progress')`, `toggle(slug)`, `isDone(slug)`, `percent(slugs)` and `percentTotal()`.

- [ ] **Step 3: `settings.svelte.ts`** — `$state` `comparisonMode = true`, `toggle()`, persist to `localStorage('mastery:compare')`.

- [ ] **Step 4:** Manual check in dev: toggling theme persists across reload; progress checkbox persists.

- [ ] **Step 5: Commit** — `feat: theme/progress/settings runes stores`

---

## Task 4: Shell (layout, sidebar, header, breadcrumb, footer, progress bar)

**Files:** Create `src/lib/components/Sidebar.svelte`, `Header.svelte`, `Breadcrumb.svelte`, `ProgressBar.svelte`; modify `src/routes/+layout.svelte`

- [ ] **Step 1: `+layout.svelte`** — CSS grid: `Header` top, `Sidebar` left (drawer on mobile), `<main>{@render children()}</main>` right.
- [ ] **Step 2: `Sidebar.svelte`** — iterate `levels` from `content.ts`; collapsible `<details>` per level; per-module link with done ✓ from progress store; highlight active route via `page.url.pathname`.
- [ ] **Step 3: `Header.svelte`** — logo/title, theme toggle (theme store), "Mode Perbandingan" toggle (settings store), `<Search>` slot, mobile menu button.
- [ ] **Step 4: `Breadcrumb.svelte`** + `ProgressBar.svelte` (per-level + total percent).
- [ ] **Step 5:** Verify shell renders, sidebar navigates, mobile drawer works.
- [ ] **Step 6: Commit** — `feat: site shell (sidebar/header/breadcrumb/progress)`

---

## Task 5: Reusable content components

**Files:** Create `Callout.svelte`, `DocsLink.svelte`, `Exercise.svelte`, `LegacyVsModern.svelte`, `CodeBlock.svelte`, `FrameworkCompare.svelte`, `ModuleLayout.svelte`

- [ ] **Step 1: `Callout.svelte`** — prop `type: 'info'|'tip'|'warning'|'pitfall'|'legacy'`; colored box + icon + `{@render children()}`.
- [ ] **Step 2: `DocsLink.svelte`** — props `href`, `label?`; external link with icon, standardized styling.
- [ ] **Step 3: `Exercise.svelte`** — props `title`; children = prompt; a `solution` snippet prop rendered inside a collapsible "Lihat Solusi" (`$state` open).
- [ ] **Step 4: `LegacyVsModern.svelte`** — prop `rows: {legacy, modern, note?}[]`; two-column table with legacy struck/marked.
- [ ] **Step 5: `CodeBlock.svelte`** — props `code`, `lang`, `highlight?`; render via Shiki (reuse highlighter) + copy button. (For `.svx` fenced code, mdsvex already highlights; this is for component-driven code.)
- [ ] **Step 6: `FrameworkCompare.svelte`** — props `task` (string), and optional `svelte/react/vue/next/nuxt/nest` code strings + `note?`. Renders only when `settings.comparisonMode`. Tabs across provided frameworks; highlight differing lines (prop `highlight` per framework or `// [!diff]` comment convention). Title: "💡 Kalau di framework lain…". Default-open tab = Svelte vs first other.
- [ ] **Step 7: `ModuleLayout.svelte`** — mdsvex default layout; wraps `.svx` body in `<article class="prose">`, shows `{title}` H1 from frontmatter, renders `{@render children()}`.
- [ ] **Step 8:** Render all components in the smoke module; verify visuals + comparison toggle hides/shows FrameworkCompare.
- [ ] **Step 9: Commit** — `feat: reusable content components`

---

## Task 6: Playground (worker compile + iframe runtime + CodeMirror) — CRITICAL

**Files:** Create `src/lib/components/playground/{Playground,Editor,Preview}.svelte`, `compiler.worker.ts`, `make-srcdoc.ts`

- [ ] **Step 1: `compiler.worker.ts`** — compile Svelte in a worker (Vite bundles `svelte/compiler`):

```ts
import * as svelte from 'svelte/compiler';

self.onmessage = (e: MessageEvent<{ id: number; source: string }>) => {
  const { id, source } = e.data;
  try {
    const { js, css, warnings } = svelte.compile(source, {
      generate: 'client', dev: true, runes: true, css: 'injected'
    });
    self.postMessage({ id, ok: true, code: js.code, version: svelte.VERSION, warnings });
  } catch (err: any) {
    self.postMessage({ id, ok: false, error: err.message ?? String(err) });
  }
};
```

- [ ] **Step 2: `make-srcdoc.ts`** — build the iframe document. Pin importmap to the exact compiler version (no skew); mount via Svelte 5 `mount`; capture console + errors back to parent:

```ts
export function makeSrcdoc(compiledCode: string, version: string): string {
  const importmap = {
    imports: { svelte: `https://esm.sh/svelte@${version}`, 'svelte/': `https://esm.sh/svelte@${version}/` }
  };
  // compiledCode is an ES module text with bare `svelte/internal/*` imports + `export default`.
  const escaped = compiledCode.replace(/<\/script>/g, '<\\/script>');
  return `<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui;padding:1rem;color-scheme:light dark}</style>
<script type="importmap">${JSON.stringify(importmap)}<\/script>
</head><body><div id="app"></div>
<script type="module">
const post=(t,p)=>parent.postMessage({source:'pg',type:t,payload:p},'*');
['log','warn','error','info'].forEach(k=>{const o=console[k];console[k]=(...a)=>{post('console',{level:k,args:a.map(String)});o(...a)}});
window.onerror=(m,s,l,c,e)=>post('error',{message:String(e?.stack||m)});
try{
${escaped}
import('svelte').then(({mount})=>{ mount(__pg_default, { target: document.getElementById('app') }); }).catch(e=>post('error',{message:String(e?.stack||e)}));
}catch(e){post('error',{message:String(e?.stack||e)})}
<\/script></body></html>`;
}
```

  Note: rename the compiled default export. Before injecting, transform `compiledCode` by replacing the trailing `export default X;` with `const __pg_default = X;` (Svelte 5 emits `export default Component;`). If the compiler emits `export default function`, normalize to `function __c(){...}; const __pg_default=__c;`. Implement a small `stripDefaultExport(code)` helper that turns `export default ` into `const __pg_default = ` for the expression form, and handles the `function`/`class` form by appending `const __pg_default = <Name>;`. Keep top-level `import` statements intact (they resolve via importmap).

- [ ] **Step 3: `Editor.svelte`** — CodeMirror 6 with `@replit/codemirror-lang-svelte`, controlled value, `oninput` debounced (250ms), theme follows `data-theme`.

- [ ] **Step 4: `Preview.svelte`** — `<iframe sandbox="allow-scripts">` set via `srcdoc`; listen to `message` events for console/error; render an error overlay + console panel.

- [ ] **Step 5: `Playground.svelte`** — props `code` (string) + `height?`; split pane (editor | preview), "Reset" button, status (compiling/error). On code change → post to worker → on result build srcdoc → set iframe. Lazy-init worker in `onMount` (browser only; guard SSR with `browser` from `$app/environment`).

- [ ] **Step 6: Smoke test the playground**

Run: `npm run dev`, open the smoke module, edit a counter, confirm preview updates live and a thrown error shows in the overlay.
Expected: live recompile + mount; console panel shows logs; importmap resolves `svelte/internal/client` from esm.sh at pinned version.

- [ ] **Step 7: Playwright smoke (optional but recommended)** — script that loads a page, types in the editor, asserts iframe DOM updates. Add `@playwright/test` if included.

- [ ] **Step 8: Commit** — `feat: in-browser Svelte playground (worker+iframe)`

**Fallback (documented):** if esm.sh/runtime integration is flaky, swap `Preview`/`make-srcdoc` for `@sveltejs/repl` mounted client-only. Keep the `Playground` public prop API identical so content is unaffected.

---

## Task 7: Search

**Files:** Create `src/lib/search.ts`, modify `Search.svelte`

- [ ] **Step 1: `search.ts`** — build an index from `modules` (title, description, keywords, level). Simple case-insensitive substring + token scoring; return ranked `ModuleMeta[]`.
- [ ] **Step 2: `Search.svelte`** — input + dropdown results; keyboard nav (↑/↓/Enter); navigate to slug. Cmd/Ctrl-K to focus.
- [ ] **Step 3:** Verify searching "derived" finds the `$derived` module.
- [ ] **Step 4: Commit** — `feat: client-side search`

---

## Task 8: Special pages (home, glossary, cheat sheets)

**Files:** Create `+page.svelte` (home), `glossary/+page.svelte`, `cheatsheet-runes/+page.svelte`, `migration-cheatsheet/+page.svelte`

- [ ] **Step 1: Home** — hero, value prop, "Mulai dari Level 1" CTA, level grid with progress, "Mode Perbandingan" explainer.
- [ ] **Step 2: Glossary** — term list (compiler, runes, hydration, SSR/CSR/SSG, snippet, attachment, store, context, adapter, prerender, …) with short Indonesian definitions + analogies.
- [ ] **Step 3: Cheat sheet runes** — table of all runes (`$state`, `$state.raw`, `$state.snapshot`, `$derived`, `$derived.by`, `$effect`, `$effect.pre`, `$effect.root`, `$props`, `$bindable`, `$inspect`, `$host`) with signature + 1-line use + gotcha.
- [ ] **Step 4: Migration cheat sheet** — two `LegacyVsModern`-style tables: React→Svelte and Vue→Svelte (hook/API equivalents) + Svelte4→5 legacy vs modern.
- [ ] **Step 5:** Verify pages render + linked from header/footer.
- [ ] **Step 6: Commit** — `feat: home + glossary + cheat sheets`

---

## Task 9: Build verification

- [ ] **Step 1:** `npm run check` → 0 errors.
- [ ] **Step 2:** `npm run build` → prerender succeeds for all module entries.
- [ ] **Step 3:** `npm run preview` → spot-check 3 modules + playground + theme + search.
- [ ] **Step 4: Commit** — `chore: platform build verification green`

---

# FASE B — Konten (42 modul)

Content is repetitive across modules, so it is specified once as a **template** + a **manifest** and executed via a multi-agent workflow (one writer agent + one adversarial docs-verifier per module, per the spec's accuracy strategy).

## Module `.svx` template (every module follows this)

```markdown
---
title: <Judul modul>
level: <1..8>
levelTitle: <Judul level>
order: <urutan dalam level>
description: <1 kalimat untuk search & meta>
docs: <URL halaman docs resmi relevan>
keywords: [<kata kunci>]
---

<script>
  import Playground from '$lib/components/playground/Playground.svelte';
  import FrameworkCompare from '$lib/components/FrameworkCompare.svelte';
  import Callout from '$lib/components/Callout.svelte';
  import Exercise from '$lib/components/Exercise.svelte';
  import DocsLink from '$lib/components/DocsLink.svelte';
  import LegacyVsModern from '$lib/components/LegacyVsModern.svelte';
</script>

## 1. Konsep
<!-- Penjelasan + analogi WAJIB untuk konsep abstrak -->

## 2. Contoh kode
<!-- fenced ```svelte beranotasi -->

## 3. Coba sendiri
<Playground code={`...`} />

## 4. 💡 Kalau di framework lain… (jika relevan)
<FrameworkCompare task="..." svelte={`...`} react={`...`} vue={`...`} />

## 5. Latihan
<Exercise title="...">
  ...prompt...
  {#snippet solution()} ...solusi... {/snippet}
</Exercise>

## 6. Tips & Common Pitfalls
<Callout type="pitfall">...</Callout>

## 7. Docs resmi
<DocsLink href="..." />
```

## Authoring rules (enforced by verifier agent)
- NO Svelte 4 syntax: `export let`, `$:`, `on:click`, `<slot>`, `createEventDispatcher`, `$$props/$$restProps`, store-as-component-state-by-default.
- SvelteKit 2: `error()`/`redirect()` are called (not `throw`n by the author), `event.fetch`, current `load`/actions signatures.
- Every module: ≥1 analogy where abstract, ≥1 Playground (Svelte modules) or annotated static example (SvelteKit modules), FrameworkCompare per the spec map, Exercise+solution, ≥2 pitfalls, a real `docs` URL.
- Mark legacy/deprecated explicitly with `<Callout type="legacy">` or `<LegacyVsModern>`.

## Module manifest (42) + comparison mapping
Per the spec §7. Each module is one workflow item. Comparison targets:
- `$state`→useState/ref · `$derived`→useMemo/computed · `$effect`→useEffect/watch · `$props/$bindable`→props/v-model · snippets→slots/children · control-flow→map/v-for · scoped styles→Vue scoped/CSS Modules · compiler→VDOM · stores→Redux/Zustand/Pinia · context→React Context/provide-inject · lifecycle→useEffect cleanup/Vue hooks · routing→Next App Router/Nuxt · load→Server Components/getServerSideProps/useFetch · form actions→Next Server Actions · rendering→Next/Nuxt modes+ISR · adapters→Next/Nuxt deploy · `+server.js`→Nest.js controller+Express+Next route handlers (explain full-stack vs backend-only).

## Per-level execution (workflow)
For each level (1→8): pipeline over its modules → (stage 1) writer agent drafts `.svx` from the template, fetching the relevant docs page; (stage 2) adversarial verifier checks against authoring rules and the live docs, returns pass/fix-list; writer applies fixes. After each level: `npm run build` to confirm all new `.svx` prerender.

## Task B-final: Full content verification
- [ ] All 42 `.svx` present and prerender (`npm run build`).
- [ ] Spot-check each level's playgrounds run.
- [ ] Grep for banned Svelte-4 tokens across `src/lib/content` → none.
- [ ] Commit per level: `content(level-N): <level title>`.

---

## Self-Review (against spec)

**Spec coverage:** §1 goal→Tasks 1-9+B · §2 decisions→Task 1/6 · §3 architecture→file structure+Task 2 · §4 components→Task 5 · §5 shell→Task 4 · §6 module format→Fase B template · §7 curriculum→Fase B manifest · §8 accuracy→Fase B verifier rules · §9 build phases→Fase A/B split · §10 acceptance→Task 9 + B-final. No gaps.

**Placeholder scan:** No "TBD/TODO" left as deliverables; the two "Decision" notes (mdsvex global import strategy in Task 1.5; `stripDefaultExport` in Task 6.2) are specified, not deferred.

**Type consistency:** `ModuleMeta` fields used consistently in `content.ts`, `neighbors`, route `load`, Sidebar, Search. Playground public prop `code` consistent across Task 6 + Fase B template. `Callout type` enum consistent (Task 5.1 ↔ authoring rules).

**Adaptation note:** Strict unit-TDD is low-value for presentational Svelte components; verification uses real signals instead (dev boot, `svelte-check`, prerender build, playground smoke, banned-token grep). The playground worker/srcdoc logic — the one piece with real logic — gets the Playwright smoke (Task 6.7).
