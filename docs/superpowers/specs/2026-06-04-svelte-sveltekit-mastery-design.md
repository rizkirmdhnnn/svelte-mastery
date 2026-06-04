# Svelte & SvelteKit Mastery — Design Spec

**Tanggal:** 2026-06-04
**Status:** Disetujui (semua 8 level, 42 modul, kedalaman penuh)
**Bahasa konten:** Indonesia (istilah teknis & kode tetap Inggris)

---

## 1. Tujuan

Website pembelajaran interaktif **"Svelte & SvelteKit Mastery"** — kurikulum lengkap pemula→expert,
mengacu **100% ke docs resmi terbaru**: `svelte.dev/docs/svelte` (Svelte 5 + runes) &
`svelte.dev/docs/kit` (SvelteKit v2). Setiap modul dilengkapi **playground interaktif**.

### Kriteria sukses
- `npm install && npm run dev` jalan; situs bisa dibuka di browser.
- Playground **benar-benar live**: edit kode Svelte → compile di browser → preview real-time.
- Konten akurat thd Svelte 5/SvelteKit 2; **tidak ada kebocoran Svelte 4** (`export let`, `$:`, `on:`, `<slot>`, `createEventDispatcher`, store-as-default-state).
- Perbandingan framework **inline** (bukan bab terpisah) sesuai peta brief, dgn toggle global.
- 42 modul terisi penuh dengan 7-bagian format standar.

---

## 2. Keputusan teknis (disetujui)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Framework situs | **SvelteKit v2 + Svelte 5**, di-`prerender` statis | Dogfooding subjek, jadi referensi nyata, 1 route/modul |
| Engine playground | **Custom**: CodeMirror 6 + `svelte/compiler` (Web Worker) → iframe sandbox + importmap runtime | Kontrol tema penuh, ringan, jadi contoh Svelte. Fallback: `@sveltejs/repl` |
| Sistem konten | **mdsvex** (`.svx`) — markdown + komponen Svelte embedded | Sisip komponen interaktif di tengah prosa; skalabel ke 42 modul |
| Highlight statis | **Shiki** (build-time) + tombol copy | Direkomendasikan brief; akurat |
| Editor playground | **CodeMirror 6** (`@codemirror/lang-*`, tema serasi) | Standar de-facto (dipakai REPL resmi) |
| State/tema | runes `$state` di `.svelte.ts` + `localStorage` | Dogfood; no-flash via skrip inline `app.html` |
| Package manager | **npm** | Universal; brief menyebut `npx sv create` |

### Modul SvelteKit (butuh server)
Tidak bisa dijalankan di playground browser → pakai **contoh statis beranotasi + penjelasan + diagram** (sesuai brief). Playground live hanya untuk komponen Svelte murni.

---

## 3. Arsitektur

```
src/
├─ routes/
│  ├─ +layout.svelte            # shell: sidebar + header + breadcrumb + footer prev/next
│  ├─ +layout.ts                # prerender = true; bangun nav dari manifest
│  ├─ +page.svelte              # Beranda/landing
│  ├─ belajar/[...slug]/+page   # render modul .svx berdasar slug
│  ├─ glossary/+page.svelte
│  ├─ cheatsheet-runes/+page.svelte
│  └─ migration-cheatsheet/+page.svelte
├─ lib/
│  ├─ content/<level>/<modul>.svx   # 42 modul
│  ├─ components/
│  │  ├─ Playground.svelte          # editor + preview live
│  │  ├─ playground/                # worker compile, iframe runtime, importmap
│  │  ├─ FrameworkCompare.svelte    # callout "Kalau di framework lain"
│  │  ├─ Callout.svelte             # info/tip/warning/pitfall/legacy
│  │  ├─ Exercise.svelte            # soal + Lihat Solusi
│  │  ├─ DocsLink.svelte
│  │  ├─ LegacyVsModern.svelte
│  │  ├─ CodeBlock.svelte           # Shiki + copy
│  │  ├─ Sidebar.svelte / Header.svelte / Breadcrumb.svelte / ProgressBar.svelte / Search.svelte
│  ├─ content.ts                    # import.meta.glob → manifest modul (level, slug, judul, urutan)
│  ├─ stores/
│  │  ├─ theme.svelte.ts            # dark/light
│  │  ├─ progress.svelte.ts         # checklist + persentase (localStorage)
│  │  └─ settings.svelte.ts         # toggle "Mode Perbandingan"
│  └─ search-index.ts               # indeks judul/heading/keyword
├─ app.html                         # no-flash theme script
mdsvex.config.js                    # Shiki highlighter + layout default + komponen global
svelte.config.js                    # mdsvex + adapter-static
```

### Alur data
- `content.ts` memakai `import.meta.glob('./content/**/*.svx', { eager })` → daftar modul terurut → dipakai Sidebar, prev/next, search, progress.
- Slug modul = path file (mis. `level-2-reactivity/02-state`). Route `belajar/[...slug]` cocokkan ke modul.
- Progress disimpan per-slug di `localStorage` (`mastery:progress`).

---

## 4. Kontrak komponen reusable

| Komponen | Props | Tanggung jawab | Dependensi |
|---|---|---|---|
| `Playground` | `code` (string/obj multi-file), `height?`, `console?` | Editor live + preview; reset; error overlay | CodeMirror, worker compiler, iframe |
| `FrameworkCompare` | `task` (judul), `svelte`, `react?`, `vue?`, `next?`, `nuxt?`, `nest?`, `note?` | Tab toggle framework, kode side-by-side, highlight baris beda; patuh toggle global | settings store |
| `Callout` | `type` (info\|tip\|warning\|pitfall\|legacy) | Box berwarna + ikon | — |
| `Exercise` | `title`, `prompt`, `solution` (snippet/string) | Soal + "Lihat Solusi" collapsible | — |
| `DocsLink` | `href`, `label?` | Link resmi terstandar | — |
| `LegacyVsModern` | `rows` (array {legacy, modern, note}) | Tabel perbandingan API lama vs baru | — |
| `CodeBlock` | `code`, `lang?`, `highlight?` | Shiki render + copy | Shiki |

**Prinsip:** tiap komponen punya satu tujuan jelas, antarmuka prop terdefinisi, bisa diuji terpisah.

---

## 5. Shell & fitur situs

- **Sidebar** collapsible per level; search; indikator progress per modul (✓).
- **Header**: breadcrumb · toggle dark/light · toggle global **"Mode Perbandingan"** · search box.
- **Progress tracker**: checklist + persentase per level & total.
- **Footer modul**: prev/next + DocsLink.
- **Responsif** (sidebar jadi drawer di mobile); **dark/light** no-flash.
- **Halaman khusus**: Beranda, Glossary, Cheat sheet runes, Migration cheat sheet (React→Svelte & Vue→Svelte: peta hook/API ekuivalen).

---

## 6. Format setiap modul (7 bagian — wajib)
1. **Konsep** + analogi/cerita untuk hal abstrak (papan tulis ajaib `$state`/`$derived`; asisten pengintip `$effect`; tukang pabrik = compiler; restoran = SSR/CSR/SSG; patung dihidupkan = hydration; titip pesan keluarga = context; formulir pos = form actions/progressive enhancement).
2. **Contoh kode** beranotasi.
3. **`<Playground>`** interaktif (modul Svelte) / contoh statis (modul SvelteKit).
4. **`<FrameworkCompare>`** "💡 Kalau di framework lain…" jika relevan.
5. **`<Exercise>`** + tombol Lihat Solusi.
6. **Tips & Common Pitfalls** (`<Callout>`).
7. **`<DocsLink>`** ke halaman resmi relevan.

Penanda **legacy/deprecated** jelas (Callout `legacy` / `LegacyVsModern`).

---

## 7. Kurikulum lengkap — 42 modul

> Tiap baris: `slug` — Judul *(↳ perbandingan inline)*

### LEVEL 1 — Dasar Svelte (5)
1. `01-apa-itu-svelte` — Apa itu Svelte & filosofi compiler *(↳ compiler vs VDOM React/Vue)*
2. `02-setup-tooling` — Setup `npx sv create`, struktur proyek
3. `03-anatomi-komponen` — Anatomi `.svelte` + file `.svelte.js`/`.svelte.ts`
4. `04-markup-dasar` — Basic markup, attributes, text expressions
5. `05-styling` — Scoped styles, global, custom properties, nested `<style>` *(↳ Vue scoped / React CSS Modules)*

### LEVEL 2 — Reactivity / Runes (6)
1. `01-apa-itu-runes` — Apa itu runes & mengapa ada
2. `02-state` — `$state`, deep state, `$state.raw`, `$state.snapshot` *(↳ useState/ref)*
3. `03-derived` — `$derived` & `$derived.by` *(↳ useMemo/computed)*
4. `04-effect` — `$effect`, `$effect.pre`, `$effect.root`, kapan TIDAK pakai *(↳ useEffect/watch)*
5. `05-props-bindable` — `$props` & `$bindable` *(↳ props one-way & v-model)*
6. `06-inspect-host` — `$inspect`, `$host`

### LEVEL 3 — Template Syntax (6)
1. `01-control-flow` — `{#if}`, `{#each}` (key/index), `{#key}`, `{#await}` *(↳ JSX map / v-for)*
2. `02-snippets` — `{#snippet}` & `{@render}` *(↳ slots/children/render props)*
3. `03-tags` — `{@html}`, `{@const}`, `{@debug}`, `{@attach}`
4. `04-directives` — `bind:`, `use:`, `style:`, `class`
5. `05-transitions` — `transition:`, `in:`/`out:`, `animate:`
6. `06-async-await` — `await` expressions (async Svelte)

### LEVEL 4 — Special Elements & Runtime (3)
1. `01-special-elements` — `<svelte:boundary/window/document/body/head/element/options>`
2. `02-stores-vs-runes` — Stores (`writable`/`readable`/`derived`/custom) vs runes *(↳ Redux/Zustand/Pinia)*
3. `03-context-lifecycle` — Context API *(↳ React Context/provide-inject)* + lifecycle *(↳ lifecycle React/Vue)* + imperative component API

### LEVEL 5 — Profesional / Misc (5)
1. `01-best-practices-ts` — Best practices & TypeScript di Svelte
2. `02-testing` — Vitest + Testing Library + Playwright
3. `03-custom-elements` — Custom elements/web components & browser support
4. `04-reference-modules` — `svelte/motion`, `transition`, `easing`, `action`, `reactivity`, `events`, `store`
5. `05-migration` — Migration Svelte 4 → 5 + tabel legacy vs modern

### LEVEL 6 — SvelteKit Dasar (7)
1. `01-apa-itu-sveltekit` — Apa itu SvelteKit & beda dgn Svelte; project types & struktur
2. `02-web-standards` — Request/Response, fetch, FormData
3. `03-routing` — `+page`/`+layout`/`+server` *(↳ Next App Router / Nuxt pages)*
4. `04-loading-data` — `load`, `+page.js` vs `+page.server.js` *(↳ Server Components/getServerSideProps, useFetch)*
5. `05-form-actions` — Form actions + `use:enhance` *(↳ Next Server Actions)*
6. `06-page-options` — SSR/CSR/prerender, `trailingSlash` *(↳ rendering modes Next/Nuxt + ISR)*
7. `07-state-remote` — State management di SSR + Remote functions

### LEVEL 7 — SvelteKit Lanjutan (4)
1. `01-advanced-routing` — rest/optional params, matchers, route groups `(group)`, layout breaking
2. `02-hooks` — `handle`, `handleFetch`, `handleError`, `reroute`
3. `03-errors-links-sw` — Error handling, link options (preload), service workers
4. `04-server-only-advanced` — Server-only modules, snapshots, shallow routing, observability, packaging

### LEVEL 8 — Expert (6)
1. `01-building-adapters` — Building & adapters (auto/node/static/Cloudflare/Netlify/Vercel/SPA/writing) *(↳ deployment Next/Nuxt)*
2. `02-env-vars` — `$env/static`, `$env/dynamic`, public vs private
3. `03-app-modules` — `$app/*` (state, navigation, forms, paths, server, stores)
4. `04-api-routes` — `+server.js` *(↳ **Nest.js** controller+Express + Next route handlers; jelaskan beda kategori full-stack vs backend murni)*
5. `05-auth-perf-seo` — Auth, performance, images, SEO, accessibility, icons
6. `06-studi-kasus` — Studi kasus akhir: aplikasi lengkap (blog/dashboard) end-to-end

**Total: 5+6+6+3+5+7+4+6 = 42 modul.**

### Singgungan opsional (di callout, ringkas)
Solid.js (fine-grained reactivity), Astro (situs konten/MPA), Qwik (resumability) — kapan masing-masing cocok.

---

## 8. Strategi akurasi (kritis)

- Tiap modul: tarik halaman docs resmi relevan (Context7 / fetch) saat penulisan.
- **Verifikator adversarial** memeriksa tiap modul: buru kebocoran Svelte 4 & API keliru sebelum dimasukkan.
- API modern wajib dicakup benar: runes lengkap (`$state/$derived/$effect/$props/$bindable/$inspect/$host`), snippets, attachments (`{@attach}`/`@attach`), async `await` expressions, Remote functions, `error/redirect` SvelteKit 2 (tanpa `throw`).
- Penanda legacy jelas di mana relevan.

---

## 9. Rencana build (bertahap, workflow multi-agent — ultracode)

**Fase A — Platform inti** (sampai `npm run dev` jalan & playground hidup)
1. Scaffold SvelteKit + mdsvex + adapter-static + Shiki.
2. `content.ts` manifest + routing `belajar/[...slug]`.
3. Komponen shell (layout, sidebar, header, breadcrumb, footer, progress, search).
4. Komponen konten reusable (Callout, FrameworkCompare, Exercise, DocsLink, LegacyVsModern, CodeBlock).
5. **Playground** (CodeMirror + worker compile + iframe runtime) — verifikasi nyata hidup.
6. Tema dark/light, progress store, toggle Mode Perbandingan.
7. Halaman: Beranda, Glossary, Cheat sheet runes, Migration cheat sheet.

**Fase B — Konten** (level demi level, agen penulis + verifikator docs paralel)
- Author 42 modul `.svx` format 7-bagian, dgn FrameworkCompare sesuai peta.
- Tiap modul diverifikasi adversarial.

**Fase C — Verifikasi akhir**
- `npm run build` (prerender) pass; cek render halaman & playground real (Playwright/manual).

---

## 10. Acceptance criteria
- [ ] `npm install && npm run dev` sukses; situs terbuka.
- [ ] Playground live untuk modul Svelte (edit→preview).
- [ ] 42 modul terisi penuh (7 bagian), nav & prev/next & progress & search berfungsi.
- [ ] FrameworkCompare inline sesuai peta; toggle global jalan.
- [ ] Dark/light no-flash; responsif mobile.
- [ ] Glossary + 2 cheat sheet ada.
- [ ] Tidak ada sintaks Svelte 4; tiap modul punya DocsLink resmi.
- [ ] `npm run build` (prerender) sukses.
