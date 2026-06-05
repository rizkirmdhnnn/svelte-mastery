# "Hangat Svelte" UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire Svelte & SvelteKit Mastery site into the warm, friendly "Hangat Svelte" look (warm light theme, cool dark theme kept, Fraunces + Hanken Grotesk type, subtle motion) plus two structural upgrades — a live-preview homepage hero and a three-column lesson layout with an on-this-page TOC. Visual/layout only; no content or routing changes.

**Architecture:** The codebase is already token-driven — components reference CSS custom properties (`var(--bg)`, `var(--brand)`, …) and the global `h1–h4` rule. So the bulk of the recolor happens by rewriting the design tokens and adding a display-font token in `src/app.css`; per-surface tasks then add structure (hero, TOC), warm polish (radii/shadows/spacing), and motion. No CSS framework is introduced; styling stays vanilla CSS + Svelte scoped `<style>`.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), mdsvex (`.svx`), Shiki (build-time + client), CodeMirror (playground), Cloudflare adapter. New deps: `@fontsource-variable/fraunces`, `@fontsource-variable/hanken-grotesk`, `rehype-slug`.

**Spec:** `docs/superpowers/specs/2026-06-05-ui-redesign-hangat-svelte-design.md`

**Verification model:** This is a visual redesign — there are no unit tests for styling. Each task's "test" is: (a) `npm run check` passes (svelte-check + wrangler types), and where relevant (b) `npm run build` succeeds, and (c) a **visual check** in `npm run dev` at the noted URL, in **both themes** and at desktop + mobile widths. Commit after each task.

**Branch:** `feat/ui-redesign` (already created).

---

## Phase 0 — Foundation (everything depends on this)

### Task 1: Add font + slug dependencies

**Files:**
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Install the packages**

Run:
```bash
npm install -D @fontsource-variable/fraunces @fontsource-variable/hanken-grotesk rehype-slug
```
Expected: three packages added to `devDependencies`, `package-lock.json` updated, no errors.

- [ ] **Step 2: Verify install**

Run: `node -e "require.resolve('@fontsource-variable/fraunces'); require.resolve('@fontsource-variable/hanken-grotesk'); require.resolve('rehype-slug'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add Fraunces + Hanken Grotesk fonts and rehype-slug"
```

---

### Task 2: Rewrite design tokens, fonts, prose & code base styles in app.css

**Files:**
- Modify: `src/app.css` (whole file)

- [ ] **Step 1: Replace the entire contents of `src/app.css` with:**

```css
/* ============================================================
   Svelte & SvelteKit Mastery — Design tokens & base styles
   "Hangat Svelte" redesign
   ============================================================ */

:root {
	/* Brand */
	--brand: #ff3e00;
	--brand-2: #ff7a45;
	--brand-ink: #ffffff;

	/* Framework accents (FrameworkCompare tabs) */
	--fw-react: #61dafb;
	--fw-vue: #42b883;
	--fw-next: #000000;
	--fw-nuxt: #00dc82;
	--fw-nest: #e0234e;

	/* Typography */
	--font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
	--font-sans: 'Hanken Grotesk Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
		Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
	--font-mono: 'SFMono-Regular', ui-monospace, 'Cascadia Code', 'Fira Code', Menlo, Consolas,
		'Liberation Mono', monospace;

	--radius: 10px;
	--radius-sm: 6px;
	--radius-lg: 16px;

	--maxw: 1340px;
	--sidebar-w: 300px;
	--header-h: 60px;

	/* Warm-tinted elevation */
	--shadow-sm: 0 1px 2px rgba(80, 50, 20, 0.05), 0 1px 3px rgba(80, 50, 20, 0.07);
	--shadow-md: 0 4px 14px rgba(120, 80, 40, 0.08), 0 2px 6px rgba(120, 80, 40, 0.06);
	--shadow-lg: 0 14px 40px rgba(120, 80, 40, 0.14);

	--ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ---------- Light theme (Hangat Svelte) ---------- */
:root,
[data-theme='light'] {
	--bg: #faf7f3;
	--bg-subtle: #f4efe8;
	--bg-elevated: #ffffff;
	--bg-code: #fffdfb;
	--bg-inset: #efe7dc;

	--text: #2a2520;
	--text-muted: #6f675b;
	--text-faint: #a99e8f;

	--border: #ece4d9;
	--border-strong: #ddd2c2;

	--link: #d9360c;
	--accent-soft: #ffe9e0;

	--ok: #1f8a4c;
	--warn: #b3690b;
	--danger: #c0362c;
	--info: #1f6fb0;

	color-scheme: light;
}

/* ---------- Dark theme (cool slate — palette unchanged) ---------- */
[data-theme='dark'] {
	--bg: #0d1117;
	--bg-subtle: #11161d;
	--bg-elevated: #161b22;
	--bg-code: #161b22;
	--bg-inset: #1c2330;

	--text: #e6edf3;
	--text-muted: #9da7b3;
	--text-faint: #6e7781;

	--border: #232a33;
	--border-strong: #313a46;

	--link: #ff7a45;
	--accent-soft: rgba(255, 122, 69, 0.12);

	--ok: #3fb950;
	--warn: #d29922;
	--danger: #f85149;
	--info: #58a6ff;

	color-scheme: dark;
}

/* ---------- Reset / base ---------- */
*,
*::before,
*::after {
	box-sizing: border-box;
}

html {
	scroll-behavior: smooth;
	scroll-padding-top: calc(var(--header-h) + 1rem);
}

body {
	margin: 0;
	font-family: var(--font-sans);
	background: var(--bg);
	color: var(--text);
	line-height: 1.65;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
	transition: background 0.2s var(--ease), color 0.2s var(--ease);
}

a {
	color: var(--link);
	text-decoration: none;
}
a:hover {
	text-decoration: underline;
}

h1,
h2,
h3,
h4 {
	font-family: var(--font-display);
	line-height: 1.2;
	font-weight: 600;
	letter-spacing: -0.02em;
	scroll-margin-top: calc(var(--header-h) + 1rem);
}

code,
kbd {
	font-family: var(--font-mono);
	font-size: 0.875em;
}

:focus-visible {
	outline: 2px solid var(--brand);
	outline-offset: 2px;
	border-radius: 4px;
}

button {
	font-family: inherit;
	cursor: pointer;
}

/* ============================================================
   Prose (rendered .svx module content)
   ============================================================ */
.prose {
	max-width: 760px;
	margin: 0 auto;
	font-size: 1.02rem;
	line-height: 1.7;
}
.prose h1 {
	font-size: 2.3rem;
	margin: 0 0 0.4em;
	letter-spacing: -0.025em;
}
.prose h2 {
	font-size: 1.55rem;
	margin: 2.2em 0 0.7em;
	padding-bottom: 0.3em;
	border-bottom: 1px solid var(--border);
}
.prose h3 {
	font-size: 1.22rem;
	margin: 1.8em 0 0.5em;
}
.prose p {
	margin: 0 0 1.1em;
}
.prose ul,
.prose ol {
	margin: 0 0 1.1em;
	padding-left: 1.4em;
}
.prose li {
	margin: 0.3em 0;
}
.prose strong {
	font-weight: 700;
	color: var(--text);
}
.prose blockquote {
	margin: 1.2em 0;
	padding: 0.4em 1.1em;
	border-left: 4px solid var(--brand);
	background: var(--accent-soft);
	border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	color: var(--text-muted);
}
.prose :not(pre) > code {
	background: var(--accent-soft);
	color: var(--link);
	padding: 0.15em 0.4em;
	border-radius: 5px;
	border: 1px solid var(--border);
	overflow-wrap: break-word;
	word-break: break-word;
}
.prose table {
	width: 100%;
	border-collapse: collapse;
	margin: 1.3em 0;
	font-size: 0.94rem;
}
.prose th,
.prose td {
	border: 1px solid var(--border);
	padding: 0.55em 0.8em;
	text-align: left;
	vertical-align: top;
}
.prose th {
	background: var(--bg-subtle);
	font-weight: 600;
}
.prose hr {
	border: none;
	border-top: 1px solid var(--border);
	margin: 2em 0;
}

/* ============================================================
   Shiki code blocks (dual theme via data-theme)
   ============================================================ */
.shiki {
	margin: 1.2em 0;
	padding: 1rem 1.1rem;
	border-radius: var(--radius);
	border: 1px solid var(--border);
	background: var(--bg-code) !important;
	overflow-x: auto;
	font-size: 0.86rem;
	line-height: 1.6;
	tab-size: 2;
}
.shiki code {
	font-family: var(--font-mono);
}
.shiki.has-copy {
	position: relative;
}
.copy-btn {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	padding: 0.25rem 0.55rem;
	font-size: 0.72rem;
	font-weight: 600;
	border: 1px solid var(--border-strong);
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	color: var(--text-muted);
	opacity: 0;
	transition: opacity 0.15s var(--ease);
}
.shiki.has-copy:hover .copy-btn,
.copy-btn:focus-visible {
	opacity: 1;
}
@media (hover: none) {
	.copy-btn {
		opacity: 1;
	}
}
/* Dark palette: keep Shiki's own dark bg + colors. */
[data-theme='dark'] .shiki,
[data-theme='dark'] .shiki span {
	color: var(--shiki-dark) !important;
	background-color: var(--shiki-dark-bg) !important;
	font-style: var(--shiki-dark-font-style) !important;
	font-weight: var(--shiki-dark-font-weight) !important;
	text-decoration: var(--shiki-dark-text-decoration) !important;
}

/* ============================================================
   Small shared utilities
   ============================================================ */
.btn {
	display: inline-flex;
	align-items: center;
	gap: 0.45em;
	padding: 0.55em 0.95em;
	border: 1px solid var(--border-strong);
	border-radius: var(--radius-sm);
	background: var(--bg-elevated);
	color: var(--text);
	font-size: 0.9rem;
	font-weight: 600;
	transition: background 0.15s var(--ease), border-color 0.15s var(--ease),
		transform 0.15s var(--ease);
}
.btn:hover {
	background: var(--bg-subtle);
	text-decoration: none;
	transform: translateY(-1px);
}
.btn-primary {
	background: var(--brand);
	border-color: var(--brand);
	color: var(--brand-ink);
	box-shadow: 0 4px 12px rgba(255, 62, 0, 0.22);
}
.btn-primary:hover {
	background: var(--brand-2);
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

/* ============================================================
   Reduced motion — disable non-essential animation globally
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

- [ ] **Step 2: Load the fonts** — modify `src/routes/+layout.svelte`. After the existing `import '../app.css';` line, add the two font imports:

```svelte
	import '../app.css';
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/hanken-grotesk';
```

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: completes with 0 errors (warnings about unrelated files are fine).

- [ ] **Step 4: Visual check**

Run: `npm run dev`, open `http://localhost:5173/`. Toggle the theme. Expected: light mode shows warm cream background, charcoal text, Fraunces headings, Hanken body; dark mode is the same cool slate as before but with the new fonts. No font flash on reload.

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/routes/+layout.svelte
git commit -m "feat(ui): warm Hangat Svelte tokens, Fraunces + Hanken type, prose & code base"
```

---

### Task 3: Warm code-highlight theme + heading anchors

**Files:**
- Modify: `mdsvex.config.js:3` (THEMES) and config object (rehypePlugins)
- Modify: `src/lib/highlight.ts` (theme imports + `themes` arg)

- [ ] **Step 1: Update `mdsvex.config.js`** — change the light theme and add `rehype-slug`. Add the import at the top:

```js
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';
```

Change the THEMES constant:

```js
const THEMES = { light: 'vitesse-light', dark: 'github-dark' };
```

Add `rehypePlugins` to the exported `config` object (alongside the existing keys):

```js
const config = {
	extensions: ['.svx'],
	smartypants: false,
	rehypePlugins: [rehypeSlug],
	highlight: { highlighter }
};
```

- [ ] **Step 2: Update `src/lib/highlight.ts`** — match the light theme in two places.

In `getHighlighter`, change the themes import line:
```ts
			themes: [import('shiki/themes/vitesse-light.mjs'), import('shiki/themes/github-dark.mjs')],
```

In `highlight()`, change the `themes` argument:
```ts
		return hl.codeToHtml(code, {
			lang: safe,
			themes: { light: 'vitesse-light', dark: 'github-dark' },
			defaultColor: 'light',
```

- [ ] **Step 3: Typecheck & build**

Run: `npm run check && npm run build`
Expected: both succeed. (If `vitesse-light` is unavailable in this Shiki version, fall back to `min-light` or `catppuccin-latte` — change it in BOTH files identically.)

- [ ] **Step 4: Visual check**

Run `npm run dev`. Open a lesson page (e.g. `http://localhost:5173/belajar/<first-slug>`). Expected: fenced code blocks render on a warm-white surface with warm syntax colors in light mode; dark mode unchanged. Open a page with a `FrameworkCompare` (client-highlighted) and confirm its code matches the fenced-code colors (same theme).

- [ ] **Step 5: Commit**

```bash
git add mdsvex.config.js src/lib/highlight.ts
git commit -m "feat(ui): warm light Shiki theme + heading anchors (rehype-slug)"
```

---

## Phase 1 — Chrome

### Task 4: Header polish

**Files:**
- Modify: `src/lib/components/Header.svelte` (`<style>` + brand markup)

The header already uses tokens, so it recolors automatically. Apply warm polish:

- [ ] **Step 1: Brand wordmark in display font.** In the `.brand .name` rule, set the family and weight:

```css
	.name {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 600;
	}
```

- [ ] **Step 2: Soften the theme toggle.** In the `.toggle` rule change `border-radius` to `var(--radius)` and add `transition: background 0.15s var(--ease), transform 0.15s var(--ease);`, and add:

```css
	.toggle:hover {
		background: var(--bg-inset);
		transform: translateY(-1px);
	}
```

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Visual check** — `npm run dev`, confirm header reads "Svelte & SvelteKit **Mastery**" with a Fraunces wordmark, warm sticky bar with blur, working theme toggle (both themes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Header.svelte
git commit -m "feat(ui): warm header polish + display wordmark"
```

---

### Task 5: Sidebar polish

**Files:**
- Modify: `src/lib/components/Sidebar.svelte` (`<style>`)

Token-driven already (orange progress, active = `--accent-soft` + `--brand`, done = `--ok`). Apply warm polish:

- [ ] **Step 1: Rounder, softer module rows.** In `.mod` change `border-radius` to `var(--radius)`; add `transition: background 0.15s var(--ease), color 0.15s var(--ease);`. In `.mod.active` add `box-shadow: inset 0 0 0 1px var(--border);` for a soft chip edge.

- [ ] **Step 2: Level summary as a subtle chip.** In `summary` change `border-radius` to `var(--radius)`. In `.lv-num` change `border-radius` to `5px` and `font-weight` to `700`.

- [ ] **Step 3: Extras links in display-free sans (leave as is) but warm hover.** In `.extras a:hover` confirm `background: var(--bg-subtle)`. No change needed if already so.

- [ ] **Step 4: Typecheck** — `npm run check`. Expected: 0 errors.

- [ ] **Step 5: Visual check** — open a lesson page, confirm the sidebar: orange progress bar, active module has a warm tinted chip with orange text, completed modules show a green check. Test the mobile drawer (< 900px).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Sidebar.svelte
git commit -m "feat(ui): warm sidebar polish"
```

---

## Phase 2 — New components

### Task 6: `Toc.svelte` — on-this-page navigation with scroll-spy

**Files:**
- Create: `src/lib/components/Toc.svelte`

- [ ] **Step 1: Create `src/lib/components/Toc.svelte` with:**

```svelte
<script lang="ts">
	import { tick } from 'svelte';

	// `key` changes per module so the TOC re-scans on client-side navigation.
	let { key, containerSelector = '.prose' }: { key: string; containerSelector?: string } =
		$props();

	type Item = { id: string; text: string; level: number };
	let items = $state<Item[]>([]);
	let activeId = $state('');

	$effect(() => {
		key; // re-run this effect whenever the module changes
		let observer: IntersectionObserver | undefined;
		let cancelled = false;

		(async () => {
			await tick(); // wait for the new module's DOM to render
			if (cancelled) return;
			const container = document.querySelector(containerSelector);
			if (!container) {
				items = [];
				return;
			}
			const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLElement[];
			items = headings
				.filter((h) => h.id)
				.map((h) => ({ id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 }));
			if (!items.length) return;

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) activeId = (entry.target as HTMLElement).id;
					}
				},
				{ rootMargin: '-80px 0px -70% 0px', threshold: 0 }
			);
			headings.filter((h) => h.id).forEach((h) => observer!.observe(h));
		})();

		return () => {
			cancelled = true;
			observer?.disconnect();
		};
	});
</script>

{#if items.length > 1}
	<nav class="toc" aria-label="Di halaman ini">
		<p class="toc-title">Di halaman ini</p>
		<ul>
			{#each items as item (item.id)}
				<li class:sub={item.level === 3}>
					<a href="#{item.id}" class:active={activeId === item.id}>{item.text}</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: calc(var(--header-h) + 1.5rem);
		font-size: 0.85rem;
		max-height: calc(100vh - var(--header-h) - 3rem);
		overflow-y: auto;
	}
	.toc-title {
		font-weight: 700;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin: 0 0 0.7rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--border);
	}
	li {
		margin: 0;
	}
	a {
		display: block;
		padding: 0.3rem 0 0.3rem 0.9rem;
		margin-left: -1px;
		border-left: 2px solid transparent;
		color: var(--text-muted);
		text-decoration: none;
		line-height: 1.4;
		transition: color 0.15s var(--ease), border-color 0.15s var(--ease);
	}
	li.sub a {
		padding-left: 1.6rem;
		font-size: 0.8rem;
	}
	a:hover {
		color: var(--text);
		text-decoration: none;
	}
	a.active {
		color: var(--link);
		border-left-color: var(--brand);
		font-weight: 600;
	}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: 0 errors. (Wired into the lesson page in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Toc.svelte
git commit -m "feat(ui): add on-this-page Toc component with scroll-spy"
```

---

### Task 7: `HeroDemo.svelte` — live reactive preview for the homepage hero

**Files:**
- Create: `src/lib/components/HeroDemo.svelte`

- [ ] **Step 1: Create `src/lib/components/HeroDemo.svelte` with:**

```svelte
<script lang="ts">
	import CodeBlock from './CodeBlock.svelte';

	let count = $state(0);

	// Real Svelte snippet shown beside the working button. The `<\/script>`
	// escape keeps this string from closing THIS component's script tag.
	const snippet = `<script>
  let count = $state(0);
<\/script>

<button onclick={() => count++}>
  Klik: {count}
</button>`;
</script>

<div class="hero-demo">
	<div class="hd-code">
		<CodeBlock code={snippet} lang="svelte" />
	</div>
	<div class="hd-preview">
		<span class="hd-tag">▶ live preview</span>
		<button class="hd-counter" onclick={() => count++}>Klik: {count}</button>
		<span class="hd-hint">Coba klik — reaktif, tanpa setter.</span>
	</div>
</div>

<style>
	.hero-demo {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.hd-code :global(.shiki) {
		margin: 0;
	}
	.hd-preview {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.7rem;
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-subtle);
	}
	.hd-tag {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	.hd-counter {
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--brand-ink);
		background: var(--brand);
		border: none;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-sm);
		box-shadow: 0 4px 12px rgba(255, 62, 0, 0.22);
		transition: transform 0.12s var(--ease), background 0.15s var(--ease);
	}
	.hd-counter:hover {
		background: var(--brand-2);
		transform: translateY(-1px);
	}
	.hd-counter:active {
		transform: translateY(0) scale(0.97);
	}
	.hd-hint {
		font-size: 0.82rem;
		color: var(--text-muted);
	}
</style>
```

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: 0 errors. (Wired into the homepage in Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/HeroDemo.svelte
git commit -m "feat(ui): add HeroDemo live-preview component"
```

---

## Phase 3 — Pages

### Task 8: Homepage — hero B + warm sections + level path

**Files:**
- Modify: `src/routes/+page.svelte` (markup + `<style>`)

- [ ] **Step 1: Import HeroDemo.** At the top of the `<script>` add:

```svelte
	import HeroDemo from '$lib/components/HeroDemo.svelte';
```

- [ ] **Step 2: Replace the `<section class="hero">…</section>` block with the two-column hero:**

```svelte
<section class="hero">
	<div class="hero-copy">
		<span class="kicker">🔥 Svelte 5 · SvelteKit v2</span>
		<h1>Kuasai <span class="grad">Svelte &amp; SvelteKit</span><br />dari pemula hingga expert</h1>
		<p class="sub">
			Kurikulum interaktif berbahasa Indonesia, mengacu 100% ke dokumentasi resmi terbaru.
			Belajar konsep, langsung praktik di playground, dan lihat padanannya di framework lain.
		</p>
		<div class="cta">
			{#if firstSlug}
				<a class="btn btn-primary big" href="/belajar/{firstSlug}">Mulai Belajar →</a>
			{/if}
			<a class="btn big" href="/cheatsheet-runes">Cheat Sheet Runes</a>
		</div>
		{#if totalPercent > 0}
			<p class="resume">Progress kamu: <strong>{totalPercent}%</strong> selesai.</p>
		{/if}
	</div>
	<div class="hero-demo-col">
		<HeroDemo />
	</div>
</section>
```

- [ ] **Step 3: Replace the `.hero` style rules** (the old centered `.hero`, `.kicker`, `.hero h1`, `.sub`, `.cta`, `.big`, `.resume`) with:

```css
	.hero {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 2.5rem;
		align-items: center;
		max-width: 1060px;
		margin: 0 auto;
		padding: 4rem 1rem 3rem;
	}
	.kicker {
		display: inline-block;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--link);
		background: var(--accent-soft);
		padding: 0.3rem 0.8rem;
		border-radius: 99px;
		margin-bottom: 1.2rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 4.5vw, 3rem);
		line-height: 1.08;
		letter-spacing: -0.03em;
		margin: 0 0 1rem;
	}
	.grad {
		background: linear-gradient(120deg, var(--brand), var(--brand-2));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.sub {
		font-size: 1.08rem;
		color: var(--text-muted);
		margin: 0 0 1.8rem;
		max-width: 540px;
	}
	.cta {
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
	}
	.big {
		padding: 0.7rem 1.3rem;
		font-size: 1rem;
	}
	.resume {
		margin-top: 1.2rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
			gap: 1.8rem;
			padding: 2.5rem 1rem;
		}
		.cta {
			justify-content: flex-start;
		}
	}
```

- [ ] **Step 4: Warm the feature cards + level cards.** In `.feature` add `box-shadow: var(--shadow-sm); transition: transform 0.15s var(--ease), box-shadow 0.15s var(--ease);` and add:

```css
	.feature:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-md);
	}
```

In `.level-card:hover` replace the body with:

```css
	.level-card:hover {
		border-color: var(--brand);
		transform: translateY(-3px);
		box-shadow: var(--shadow-md);
		text-decoration: none;
	}
```

Add a numbered look to the level badge — change `.lc-num` to:

```css
	.lc-num {
		font-weight: 700;
		color: var(--brand-ink);
		background: var(--brand);
		padding: 0.12rem 0.45rem;
		border-radius: 5px;
		font-size: 0.72rem;
	}
```

- [ ] **Step 5: Typecheck & build**

Run: `npm run check && npm run build`
Expected: both succeed.

- [ ] **Step 6: Visual check** — `npm run dev`, open `/`. Expected: left copy + right live-preview hero; clicking "Klik: N" increments live; feature cards lift on hover; level cards show numbered orange badges + progress and lift on hover. Check mobile (< 860px): hero stacks, demo below copy. Check both themes.

- [ ] **Step 7: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(ui): homepage hero with live preview + warm sections"
```

---

### Task 9: Lesson page — three-column layout + TOC + warm header/pager

**Files:**
- Modify: `src/routes/belajar/[...slug]/+page.svelte` (markup + `<style>`)

- [ ] **Step 1: Import Toc.** At the top of the `<script>` add:

```svelte
	import Toc from '$lib/components/Toc.svelte';
```

- [ ] **Step 2: Wrap the article + TOC in a grid.** Replace the opening `<article class="prose module" use:addCopyButtons>` and its closing `</article>` so the article is wrapped by a `.lesson` grid with the TOC as a sibling rail. The new structure:

```svelte
<div class="lesson">
	<article class="prose module" use:addCopyButtons>
		<nav class="crumb">
			<a href="/">Beranda</a>
			<span aria-hidden="true">/</span>
			<span>Level {data.meta.level} · {data.meta.levelTitle}</span>
		</nav>

		<h1>{data.meta.title}</h1>
		<p class="lead">{data.meta.description}</p>

		<Module />

		<div class="done-row">
			<label class="done-toggle">
				<input type="checkbox" checked={done} onchange={() => progress.toggle(data.slug)} />
				<span>Tandai modul ini selesai</span>
			</label>
		</div>

		<nav class="pager">
			{#if nav.prev}
				<a class="pg prev" href="/belajar/{nav.prev.slug}">
					<span class="dir">← Sebelumnya</span>
					<span class="t">{nav.prev.title}</span>
				</a>
			{:else}
				<span></span>
			{/if}
			{#if nav.next}
				<a class="pg next" href="/belajar/{nav.next.slug}">
					<span class="dir">Selanjutnya →</span>
					<span class="t">{nav.next.title}</span>
				</a>
			{/if}
		</nav>
	</article>

	<aside class="toc-rail">
		{#key data.slug}
			<Toc key={data.slug} />
		{/key}
	</aside>
</div>
```

- [ ] **Step 3: Add the grid styles.** At the top of the `<style>` block add:

```css
	.lesson {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 2.5rem;
		align-items: start;
	}
	.lesson .module {
		/* article keeps its own readable max-width but no longer auto-centers
		   inside the grid cell */
		margin: 0;
	}
	.toc-rail {
		padding-top: 1.5rem;
	}
	@media (max-width: 1100px) {
		.lesson {
			grid-template-columns: 1fr;
		}
		.toc-rail {
			display: none;
		}
	}
```

Note: `.prose` sets `max-width: 760px; margin: 0 auto;`. Inside the grid the `margin: 0` override above left-aligns it within the content column, with the TOC to its right.

- [ ] **Step 4: Warm the lead + pager.** Change `.lead` to use the display font tone (it's a paragraph, keep sans) — no change needed. In `.pg:hover` replace with:

```css
	.pg:hover {
		border-color: var(--brand);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
	}
```

Add `transition: border-color 0.15s var(--ease), transform 0.15s var(--ease), box-shadow 0.15s var(--ease);` to `.pg`.

- [ ] **Step 5: Typecheck & build**

Run: `npm run check && npm run build`
Expected: both succeed.

- [ ] **Step 6: Visual check** — open a long lesson (one with multiple `##` headings). Expected at desktop width (> 1100px): article on the left, a sticky "Di halaman ini" TOC on the right that highlights the active section as you scroll; clicking a TOC item jumps to the heading. Navigate to another module (prev/next) and confirm the TOC re-scans for the new headings. Below 1100px the TOC disappears and the article flows full-width. Check both themes.

- [ ] **Step 7: Commit**

```bash
git add src/routes/belajar/[...slug]/+page.svelte
git commit -m "feat(ui): 3-column lesson layout with on-this-page TOC"
```

---

### Task 10: Cheatsheet & glossary pages polish

**Files:**
- Modify: `src/routes/cheatsheet-runes/+page.svelte` (`<style>`)
- Modify: `src/routes/migration-cheatsheet/+page.svelte` (`<style>`)
- Modify: `src/routes/glossary/+page.svelte` (`<style>`)

These are token-driven `.prose` pages. They recolor automatically; apply card/table warmth.

- [ ] **Step 1: Glossary term cards.** In `glossary/+page.svelte`, find the `.entry` rule and ensure it reads (adjust values to match):

```css
	.entry {
		padding: 1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--bg-elevated);
		box-shadow: var(--shadow-sm);
		transition: transform 0.15s var(--ease), box-shadow 0.15s var(--ease);
	}
	.entry:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
```
(If the existing class differs, apply the same treatment to whatever wraps each term.)

- [ ] **Step 2: Cheatsheet table wrappers.** In both cheatsheet pages, ensure any scrollable table wrapper uses `border: 1px solid var(--border); border-radius: var(--radius);` and tables inherit `.prose table` styling. Add a warm header tint if a custom table header class exists: `background: var(--bg-subtle);`.

- [ ] **Step 3: Typecheck** — `npm run check`. Expected: 0 errors.

- [ ] **Step 4: Visual check** — open `/glossary`, `/cheatsheet-runes`, `/migration-cheatsheet`. Expected: warm cards/tables, Fraunces headings, readable in both themes; tables scroll on mobile.

- [ ] **Step 5: Commit**

```bash
git add src/routes/cheatsheet-runes/+page.svelte src/routes/migration-cheatsheet/+page.svelte src/routes/glossary/+page.svelte
git commit -m "feat(ui): warm polish for cheatsheet & glossary pages"
```

---

## Phase 4 — Content & interactive components

### Task 11: Content components polish (Callout, Exercise, FrameworkCompare, LegacyVsModern, DocsLink, CodeBlock)

**Files:**
- Modify: `src/lib/components/Callout.svelte`
- Modify: `src/lib/components/Exercise.svelte`
- Modify: `src/lib/components/FrameworkCompare.svelte`
- Modify: `src/lib/components/LegacyVsModern.svelte`
- Modify: `src/lib/components/DocsLink.svelte`
- Modify: `src/lib/components/CodeBlock.svelte`

All six already consume tokens, so they recolor for free. Verify + light polish:

- [ ] **Step 1: Callout** — ensure the title (if present) uses the display font. In the rule for the callout title/header text add `font-family: var(--font-display);`. Confirm the soft background uses `color-mix(... var(--accent-soft) ...)` or a token; it inherits warm colors automatically.

- [ ] **Step 2: Exercise** — confirm the dashed border uses `var(--border-strong)` and the reveal button is a `.btn` or token-styled; round the container to `var(--radius-lg)`. Title gets `font-family: var(--font-display);`.

- [ ] **Step 3: FrameworkCompare** — the active tab underline already uses `var(--brand)`; confirm the header badge background uses `var(--accent-soft)`. Round the outer aside to `var(--radius-lg)`. No color literals to change (framework accents come from `--fw-*` tokens, intentionally kept).

- [ ] **Step 4: LegacyVsModern** — uses `var(--danger)`/`var(--ok)`; these are warm-tuned in the new tokens, so it recolors automatically. Confirm the table wrapper border is `var(--border)`.

- [ ] **Step 5: DocsLink** — token-driven; round to `var(--radius-sm)` and confirm hover uses `var(--bg-subtle)`. No structural change.

- [ ] **Step 6: CodeBlock** — token-driven; the `.hl-line` brand shadow stays. Confirm the container background uses `var(--bg-code)` (matches `.shiki`). No change if already tokenized.

- [ ] **Step 7: Typecheck & build** — `npm run check && npm run build`. Expected: both succeed.

- [ ] **Step 8: Visual check** — open a lesson page that uses these components (callouts, a FrameworkCompare, a LegacyVsModern table, an Exercise, DocsLink). Expected: all read warm and consistent in light; unchanged-but-fonts in dark.

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/Callout.svelte src/lib/components/Exercise.svelte src/lib/components/FrameworkCompare.svelte src/lib/components/LegacyVsModern.svelte src/lib/components/DocsLink.svelte src/lib/components/CodeBlock.svelte
git commit -m "feat(ui): warm polish for content components"
```

---

### Task 12: Search modal polish

**Files:**
- Modify: `src/lib/components/Search.svelte` (`<style>`)

- [ ] **Step 1: Round + warm the input.** Ensure the search input wrapper uses `border-radius: var(--radius); background: var(--bg-subtle); border: 1px solid var(--border);`.

- [ ] **Step 2: Results dropdown.** Ensure the dropdown uses `background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg);`, and the active/hover result uses `background: var(--accent-soft);`.

- [ ] **Step 3: Typecheck** — `npm run check`. Expected: 0 errors.

- [ ] **Step 4: Visual check** — press ⌘K (or focus the search), type a query. Expected: warm input + dropdown, keyboard nav (↑↓/Enter) works, active row tinted. Both themes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Search.svelte
git commit -m "feat(ui): warm search modal polish"
```

---

### Task 13: Playground polish (Playground, Editor, Preview)

**Files:**
- Modify: `src/lib/components/playground/Playground.svelte` (`<style>`)
- Modify: `src/lib/components/playground/Editor.svelte` (CodeMirror theme tokens)
- Modify: `src/lib/components/playground/Preview.svelte` (`<style>`)

- [ ] **Step 1: Playground shell.** In `Playground.svelte`, ensure the outer container + status bar use `var(--bg-elevated)`/`var(--bg-subtle)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`. The status dot keeps `--ok`/`--warn`/`--danger`. Round the outer container corners and clip the panes with `overflow: hidden`.

- [ ] **Step 2: Editor (CodeMirror) light theme.** In `Editor.svelte`, the theme compartment styles the gutter/active-line via tokens. Confirm gutter background = `var(--bg-subtle)`, active line = `var(--accent-soft)`, text = `var(--text)`. If any literal hex exists for the light theme, replace with the matching token. (Dark uses the existing CodeMirror dark theme — leave it.)

- [ ] **Step 3: Preview drawer.** In `Preview.svelte`, ensure the console drawer + error overlay use `var(--bg-elevated)`/`var(--danger)` and `border: 1px solid var(--border)`. The iframe srcdoc theming from prior commits MUST be preserved — do not alter the postMessage/theme logic, only the surrounding chrome colors.

- [ ] **Step 4: Typecheck & build** — `npm run check && npm run build`. Expected: both succeed.

- [ ] **Step 5: Visual check** — open a lesson with a `<Playground>`. Expected: warm shell in light mode, editable code, live preview updates on edit, console drawer toggles, error overlay shows on bad code. Toggle theme: editor + preview both follow. Test mobile (< 720px) stacked layout.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/playground/Playground.svelte src/lib/components/playground/Editor.svelte src/lib/components/playground/Preview.svelte
git commit -m "feat(ui): warm playground polish (shell, editor, preview)"
```

---

## Phase 5 — Final verification

### Task 14: Full-site verification & contrast pass

**Files:** none (verification only; small fixes as found)

- [ ] **Step 1: Typecheck + build**

Run: `npm run check && npm run build`
Expected: both pass with 0 errors.

- [ ] **Step 2: Walk every surface in `npm run dev`, in BOTH themes, at desktop + mobile widths:**
  - `/` — hero live counter works; feature + level cards; framework band
  - `/belajar/<slug>` (a long one) — 3-col + TOC scroll-spy; prev/next; mark-complete; a Playground; callouts; FrameworkCompare
  - `/cheatsheet-runes`, `/migration-cheatsheet`, `/glossary`
  - Search (⌘K)
  - Mobile (< 900px): sidebar drawer + scrim; (< 1100px) TOC hidden; (< 860px) hero stacks

- [ ] **Step 3: Contrast spot-check.** Confirm body text (`--text` on `--bg`) and links (`--link` on `--bg`) read clearly in light mode; confirm orange (`--brand`) is only used for fills (white text), large display accents, icons, and borders — never small body text. Fix any low-contrast spot by swapping `--brand` → `--link` for text.

- [ ] **Step 4: Reduced motion.** In browser devtools, emulate `prefers-reduced-motion: reduce` and confirm hover lifts/fades are suppressed and nothing breaks.

- [ ] **Step 5: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix(ui): verification pass — contrast & responsive tweaks"
```

- [ ] **Step 6: Hand off** — branch `feat/ui-redesign` is ready for review/PR (use the finishing-a-development-branch skill).

---

## Self-review notes

- **Spec coverage:** tokens (§3 → Task 2), fonts (§4 → Tasks 1–2), Shiki warm theme (§5 → Task 3), hero B (§6.1 → Tasks 7, 8), 3-col + TOC + rehype-slug (§6.2 → Tasks 1, 3, 6, 9), per-file plan (§7 → Tasks 4–13), a11y/contrast/reduced-motion (§8 → Tasks 2, 14), verification (§9 → Task 14). All covered.
- **Type/name consistency:** `Toc` takes `key: string` (used as `<Toc key={data.slug} />`); `HeroDemo` is prop-less; both imported via `$lib/components/…`. `CodeBlock` props `code`/`lang` match its existing API.
- **Ordering:** Foundation (Tasks 1–3) lands first so every later task inherits the new look; new components (6–7) precede the pages that consume them (8–9).
