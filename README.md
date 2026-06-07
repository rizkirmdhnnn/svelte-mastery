# 🔥 Svelte & SvelteKit Mastery

Kurikulum interaktif berbahasa Indonesia untuk belajar **Svelte 5**, **SvelteKit v2**, dan **CLI `sv`**, dari pemula sampai expert. Tiap konsep dijelaskan dengan analogi, langsung dipraktikkan di playground yang meng-compile Svelte di browser, dan disandingkan dengan padanannya di React, Vue, Next.js, Nuxt, dan Nest.js.

> **Mirror 100% dokumentasi resmi.** Setiap halaman docs Svelte, SvelteKit, dan CLI punya satu modul tersendiri — **178 modul**, termasuk seluruh halaman Reference/API dan Legacy. Sintaks legacy ditandai dengan jelas, bukan dicampur diam-diam.

## Fitur

- **178 modul — satu per halaman dokumentasi resmi**, terbagi dalam **tiga menu yang benar-benar terpisah**: **Svelte** (86), **SvelteKit** (71), dan **CLI** (21). Switcher di header mengganti seluruh isi sidebar sesuai produk.
- **Sidebar mengikuti struktur docs resmi** (Introduction, Runes, Template syntax, … Reference, Legacy APIs), dengan **badge status** tiap modul: `Stable` / `Legacy` / `Reference`.
- **Dashboard kelengkapan** (`/kelengkapan`) — checklist semua modul vs daftar halaman docs resmi, biar ketahuan kalau ada yang belum lengkap.
- **Playground interaktif** yang meng-compile komponen Svelte langsung di browser lewat Web Worker, dengan preview live + panel console, mengikuti tema gelap/terang.
- **Perbandingan framework** di banyak konsep lewat blok "💡 Kalau di framework lain…" untuk React, Vue, Next.js, Nuxt, dan Nest.js.
- **Cheat sheet runes**, **panduan migrasi** (React / Vue / Svelte 4 → Svelte 5), **roadmap belajar**, dan **glossary** istilah penting dengan analogi.
- **Pencarian global** lintas ketiga menu (⌘K / Ctrl+K), hasil menandai "Produk › Bagian".
- **Progress tracking** per-produk dan total, tersimpan di browser.
- **Tema gelap/terang** dan tampilan **responsif** sampai layar selebar 320px.

## Peta belajar

### Svelte — 86 modul

| Bagian | Modul |
| ------ | :---: |
| Introduction | 4 |
| Runes | 8 |
| Template syntax | 20 |
| Styling | 4 |
| Special elements | 7 |
| Runtime | 5 |
| Misc | 8 |
| Reference | 18 |
| Legacy APIs | 12 |

### SvelteKit — 71 modul

| Bagian | Modul |
| ------ | :---: |
| Getting started | 5 |
| Core concepts | 7 |
| Build and deploy | 11 |
| Advanced | 10 |
| Best practices | 6 |
| Appendix | 7 |
| Reference | 25 |

### CLI (`sv`) — 21 modul

| Bagian | Modul |
| ------ | :---: |
| Pengantar | 2 |
| Perintah | 4 |
| Add-ons | 13 |
| API | 2 |

## Tech stack

- [SvelteKit v2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev) (runes)
- [mdsvex](https://mdsvex.pngwn.io) untuk menulis modul sebagai Markdown + komponen Svelte (`.svx`)
- [Shiki](https://shiki.style) untuk syntax highlighting, [CodeMirror 6](https://codemirror.net) untuk editor playground
- Deploy ke [Cloudflare Workers](https://developers.cloudflare.com/workers/) via `@sveltejs/adapter-cloudflare` (Workers + Static Assets)

## Menjalankan secara lokal

Butuh Node.js 20+ dan npm.

```bash
npm install
npm run dev
```

Lalu buka http://localhost:5173.

## Build & deploy

Situs ini di-prerender penuh menjadi file statis, lalu dilayani oleh Cloudflare Workers.

```bash
# build ke .svelte-kit/cloudflare
npm run build

# preview runtime Workers asli secara lokal (workerd)
npm run cf:preview

# deploy ke Cloudflare (jalankan `npx wrangler login` sekali dulu)
npm run deploy
```

Nama dan konfigurasi Worker ada di `wrangler.jsonc`.

## Arsitektur konten

Sumber kebenaran daftar halaman ada di **`scripts/pages.data.mjs`** — satu file yang memetakan setiap halaman docs resmi (produk, bagian, urutan, status, URL docs). Dari sini:

- `scripts/gen-data.mjs` → `src/lib/pages.generated.ts` (daftar `officialPages` untuk dashboard kelengkapan + peta redirect URL lama → baru).
- `scripts/gen-briefs.mjs` menyuntik brief penulisan ke workflow penulisan modul.

Tiap modul adalah satu file `.svx` di **`src/lib/content/<produk>/<bagian>/<halaman>.svx`** (CLI: `src/lib/content/cli/<halaman>.svx`). URL-nya `/belajar/<produk>/<bagian>/<halaman>`; URL lama berbasis `level-*` otomatis di-redirect (308). Saat `dev`/`build`, `scripts/gen-manifest.mjs` memindai folder dan menyusun manifest dari frontmatter, jadi sidebar & navigasi tidak diatur manual.

Komponen yang tersedia di dalam modul: `Playground`, `FrameworkCompare`, `Callout`, `Exercise`, `LegacyVsModern`, `StatusBadge`, dan `DocsLink`.

## Scripts

| Perintah | Fungsi |
| -------- | ------ |
| `npm run dev` | Server pengembangan Vite |
| `npm run build` | Build produksi (adapter Cloudflare) |
| `npm run preview` | Preview hasil build via Vite |
| `npm run cf:preview` | Build lalu jalankan runtime Workers (`wrangler dev`) |
| `npm run deploy` | Build lalu `wrangler deploy` |
| `npm run check` | Type-check dengan `svelte-check` |
| `npm run data` | Regenerasi `pages.generated.ts` dari daftar halaman |
| `npm run manifest` | Regenerasi manifest modul dari frontmatter |
| `npm run coverage` | Cek kelengkapan: tiap halaman docs resmi punya modul |

Selain itu, untuk memverifikasi konten: `node scripts/compile-one.mjs <file.svx>` (compile satu modul seperti build), `node scripts/check-playgrounds.mjs` (semua playground compile), dan `node scripts/lint-svx.mjs <file.svx>` (deteksi `{ekspresi}` liar di prosa).

---

Dibuat untuk belajar. Koreksi dan tambahan konten dipersilakan lewat issue atau pull request.
