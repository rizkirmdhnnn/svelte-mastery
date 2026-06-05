# UI Redesign — "Hangat Svelte"

**Date:** 2026-06-05
**Branch:** `feat/ui-redesign`
**Status:** Approved (design), pending implementation plan
**Scope:** Full visual + layout overhaul of the Svelte & SvelteKit Mastery site. **Visual/layout only — no content, copy, routing, or data-model changes.**

---

## 1. Goal

Make the site **clean and easy on the eyes** with a warm, branded, friendly aesthetic ("Hangat Svelte"), while keeping the existing information architecture, content (`.svx` modules), and behavior intact. Every user-facing surface is restyled; a few get structural upgrades (homepage hero, lesson page reading layout).

Non-goals: rewriting content, changing the curriculum, adding new routes, changing the build target (stays Cloudflare Workers via `adapter-cloudflare`), or introducing a CSS framework.

---

## 2. Design decisions (locked via visual brainstorming)

| Decision | Choice |
|---|---|
| Overall mood | **Hangat Svelte** — warm cream paper + true Svelte orange accent |
| Light theme | Warm: cream paper background, white surfaces, charcoal-warm ink |
| Dark theme | **Keep the current cool slate palette** (GitHub-style), but apply new fonts + restyled components |
| Typography | **Fraunces** (soft-serif) for display/headings · **Hanken Grotesk** for body & UI |
| Motion | **Subtle** — hover lifts, gentle fades, progress fills, active-TOC highlight; all behind `prefers-reduced-motion` |
| Ambition | **Full overhaul** — all pages |
| Homepage hero | **Option B** — copy on the left, live reactive preview (code + working counter) on the right |
| Lesson page | **Three-column** reading layout: sidebar · content · new sticky "Di halaman ini" TOC |

---

## 3. Design tokens

Implemented as CSS custom properties in `src/app.css`, replacing the current values. Dark theme keeps its existing cool slate values (listed for completeness) but gains the new font tokens.

### Typography tokens (both themes)
```
--font-display: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
--font-sans:    'Hanken Grotesk Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono:    (unchanged — existing mono stack)
```
- `--font-display` used for: `h1–h3` in `.prose`, hero headline, level-card titles, section headings, glossary terms, callout/exercise titles where a heading is shown.
- `--font-sans` is the body default (set on `body`).
- Headings get slightly tighter `letter-spacing: -0.02em` and `font-weight: 600` (Fraunces 600 reads warmer than 700).

### Light theme — "Hangat Svelte" (replaces current light tokens)
```
--bg:           #faf7f3   /* warm cream paper */
--bg-subtle:    #f4efe8   /* sectioned areas */
--bg-elevated:  #ffffff   /* cards/surfaces */
--bg-code:      #fffdfb   /* code block surface (warm white) */
--bg-inset:     #efe7dc   /* progress track, chips */

--text:         #2a2520   /* warm near-black ink */
--text-muted:   #6f675b
--text-faint:   #a99e8f

--border:       #ece4d9   /* hairline warm */
--border-strong:#ddd2c2

--brand:        #ff3e00   /* true Svelte orange — unchanged */
--brand-2:      #ff7a45
--link:         #d9360c   /* darker orange — AA contrast for text/links on cream */
--accent-soft:  #ffe9e0   /* tint background (pills, active states) */

--ok:   #1f8a4c   --warn: #b3690b   --danger: #c0362c   --info: #1f6fb0
color-scheme: light;
```

### Dark theme (keep current cool slate values)
Unchanged from today's `[data-theme='dark']` block (`--bg:#0d1117`, `--bg-elevated:#161b22`, `--text:#e6edf3`, `--border:#232a33`, `--link:#ff7a45`, etc.). The new `--font-display`/`--font-sans` tokens apply globally, so dark mode automatically gets the new type and the restyled components.

### Shape & elevation (both themes)
- Radii: keep `--radius:10px`, `--radius-sm:6px`, add slightly larger card radius usage (`--radius-lg:16px` already exists; use 14–16px on cards).
- Shadows: warm the light-theme shadows toward brown tint, e.g. `--shadow-md: 0 10px 30px rgba(120,80,40,0.10)`; keep neutral/none in dark.

> Exact hex values above are the source of truth (taken from the approved style tile). Contrast note: never use `--brand` (`#ff3e00`) for small body text on cream — use `--link` (`#d9360c`). Orange is for fills, large display accents, icons, and borders.

---

## 4. Fonts — loading strategy

- Add dev deps: `@fontsource-variable/fraunces`, `@fontsource-variable/hanken-grotesk`.
- Import the variable CSS once (in `src/app.css` top, or `+layout.svelte`), exposing families `'Fraunces Variable'` and `'Hanken Grotesk Variable'`.
- Self-hosted & bundled by Vite → no external request, works on Cloudflare Workers, no FOUT flash. Use `font-display: swap` (Fontsource default) and rely on the system fallback in the token stack to avoid layout shift.
- Subset: latin is sufficient (content is Indonesian + English, no special scripts).

---

## 5. Code highlighting (Shiki)

Both highlighters must use the **same** theme pair to stay visually consistent:
- **Light:** swap `github-light` → a warm light theme (target **`vitesse-light`**; `min-light` or `catppuccin-latte` are acceptable fallbacks if a syntax color clashes — decide via visual check).
- **Dark:** keep **`github-dark`**.

Touch points:
- `mdsvex.config.js` — `THEMES.light` (build-time highlighting of fenced code in `.svx`). The chosen light theme must be passed to `createHighlighter({ themes: [...] })`.
- `src/lib/highlight.ts` — client-side highlighter for `FrameworkCompare`/`CodeBlock`: update the `import('shiki/themes/…')` for light and the `themes:` object in `highlight()`.
- `src/app.css` `.shiki` rules — set the code surface to `--bg-code` so it reads as warm-white in light mode regardless of the theme's own bg; keep the existing `[data-theme='dark'] .shiki` override path for dark.

---

## 6. Structural changes (the only layout additions)

### 6.1 Homepage hero — Option B
`src/routes/+page.svelte`. Replace the centered hero with a two-column hero (stacks on mobile):
- **Left:** kicker pill, Fraunces headline ("Kuasai Svelte & SvelteKit"), sub-paragraph, primary CTA "Mulai Belajar →" + ghost "Cheat Sheet", and the existing resume-progress line.
- **Right:** a new **`HeroDemo.svelte`** — a highlighted code snippet (a `$state` counter) beside a live, working reactive counter button. Implemented as plain Svelte with `$state` (NO compiler worker — keep the landing page light). Snippet highlighting can reuse `CodeBlock` (client-side) or a prebuilt static block.
- Rest of homepage keeps its sections but restyled: feature cards (lighter, warmer), "Peta Belajar" as a numbered 8-level path with progress bars/rings, and the "Datang dari framework lain?" band with framework chips (React · Vue · Next · Nuxt · Nest).

### 6.2 Lesson page — three-column reading layout + TOC
`src/routes/belajar/[...slug]/+page.svelte` + a new **`Toc.svelte`**.
- On wide screens (≥ ~1100px), content area becomes `grid: minmax(0,1fr) 230px` → article + sticky right rail.
- **`Toc.svelte`** ("Di halaman ini"): after mount, queries the rendered `.prose` for `h2, h3`, builds an anchored list, and uses `IntersectionObserver` (scroll-spy) to highlight the active section. Sticky under the header. Hidden below the breakpoint (heading anchors still work via the IDs).
- **Heading IDs:** add `rehype-slug` to `mdsvex.config.js` (`rehypePlugins: [rehypeSlug]`) so every `h2/h3` gets a stable `id`. New dev dep: `rehype-slug`.
- Keep existing breadcrumb, lead, "Tandai modul selesai", and prev/next pager — all restyled.
- The global layout (`+layout.svelte`) keeps `sidebar | content`; the third (TOC) column lives inside the lesson route so other pages are unaffected.

All other surfaces are **restyle-only** (no structural change).

---

## 7. Per-file work plan

**Foundation (do first — everything depends on it):**
- `package.json` — add deps: `@fontsource-variable/fraunces`, `@fontsource-variable/hanken-grotesk`, `rehype-slug`.
- `src/app.css` — new tokens (light), font imports, font tokens, prose typography (Fraunces headings + Hanken body, line-height ~1.7), `.shiki`/code surface, `.btn`/`.btn-primary`, callout/blockquote, table, utilities. Add a global `prefers-reduced-motion` block.
- `mdsvex.config.js` — warm light Shiki theme + `rehype-slug`.
- `src/lib/highlight.ts` — matching warm light theme imports.

**Chrome:**
- `src/lib/components/Header.svelte` — warm restyle (brand wordmark in Fraunces, search field, theme toggle), keep sticky + blur.
- `src/lib/components/Sidebar.svelte` — warm restyle of progress bar, level `<details>`, active/done module items (orange tint active, green check done).
- `src/routes/+layout.svelte` — background, spacing; ensure lesson route's TOC column fits within `--maxw`.

**Pages:**
- `src/routes/+page.svelte` — hero B + restyled features/level-path/compare band.
- `src/routes/belajar/[...slug]/+page.svelte` — 3-col layout + TOC + restyled header/pager/done-row.
- `src/routes/cheatsheet-runes/+page.svelte`, `migration-cheatsheet/+page.svelte`, `glossary/+page.svelte` — restyle (cards, tables, term entries) to new tokens/type.

**Components:**
- New: `src/lib/components/Toc.svelte`, `src/lib/components/HeroDemo.svelte`.
- Restyle: `Callout.svelte`, `Exercise.svelte`, `FrameworkCompare.svelte` (tabs, active underline in orange), `LegacyVsModern.svelte`, `DocsLink.svelte`, `CodeBlock.svelte`, `Search.svelte`.
- Playground: `playground/Playground.svelte` (status bar, pane borders), `Editor.svelte` (CodeMirror gutter/active-line to warm tokens in light), `Preview.svelte` (console drawer/error overlay). The live-preview iframe theming work from prior commits must be preserved.

**Motion (cross-cutting):** add subtle, reusable transitions (hover translate/box-shadow on cards & buttons, fade/slide-in for level cards, progress-bar fill, TOC active highlight). Everything wrapped so `prefers-reduced-motion: reduce` disables non-essential motion.

---

## 8. Accessibility & quality bar

- **Contrast:** body text and links meet WCAG AA on cream (`--text`/`--link` chosen for this). Verify orange usages: orange fills use white text (`--brand-ink`), orange-on-cream only for large/non-text.
- **Focus:** keep visible `:focus-visible` outline (orange).
- **Reduced motion:** honored globally.
- **Keyboard:** Search (⌘K), sidebar, TOC links all keyboard reachable; TOC is `<nav aria-label>`.
- **Both themes** must be checked — light (warm) and dark (cool).

---

## 9. Verification plan

1. `npm run check` (svelte-check + wrangler types) passes — no type/Svelte errors.
2. `npm run build` succeeds (Cloudflare adapter).
3. Run `npm run dev` and visually verify, in **both themes** and at desktop + mobile widths:
   - Homepage (hero B live counter works; level path; framework band)
   - A lesson page (3-col layout; TOC scroll-spy highlights; prev/next; mark-complete)
   - cheatsheet-runes, migration-cheatsheet, glossary
   - Playground (editor + live preview, light & dark)
   - Search modal (⌘K)
4. Spot-check orange-on-cream contrast and that no FOUT/font flash occurs.

Automated browser checks (Playwright MCP) may assist, but final sign-off is visual.

---

## 10. Risks & mitigations

- **Font flash / shift** → self-hosted Fontsource + system fallback in stack + `font-display: swap`.
- **Shiki theme mismatch** between build-time and client → change both `mdsvex.config.js` and `highlight.ts` together; verify a `FrameworkCompare` (client) and a fenced `.svx` block (build) render identically.
- **TOC needs heading IDs** → add `rehype-slug`; verify anchors resolve.
- **Dark mode regressions** → since only light tokens change but components are rewritten, explicitly re-check every surface in dark.
- **Playground iframe theming** (fixed in prior commits) must not regress → keep the existing preview theming logic, only adjust colors via tokens.
- **Scope is large** → foundation first (tokens/fonts/shiki), then chrome, then pages, then components; each component is independently restyleable and testable.

---

## 11. Out of scope

Content/copy edits, new modules, curriculum changes, new routes, analytics, i18n beyond existing, backend, and any change to the build/deploy target.
