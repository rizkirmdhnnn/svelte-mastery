# 🔥 Svelte & SvelteKit Mastery

Kurikulum interaktif berbahasa Indonesia untuk belajar **Svelte 5** dan **SvelteKit v2**, dari pemula sampai expert. Tiap konsep dijelaskan dengan analogi, langsung dipraktikkan di playground yang meng-compile Svelte di browser, dan disandingkan dengan padanannya di React, Vue, Next.js, Nuxt, dan Nest.js.

> Mengacu 100% ke dokumentasi resmi terbaru: Svelte 5 (runes) dan SvelteKit v2. Sintaks legacy ditandai dengan jelas, bukan dicampur diam-diam.

## Fitur

- **42 modul dalam 8 level terstruktur**, dari "Apa itu Svelte" sampai topik expert seperti environment variables dan deployment.
- **Playground interaktif** yang meng-compile komponen Svelte langsung di browser lewat Web Worker, dengan preview live dan panel console. Preview ikut menyesuaikan tema gelap/terang.
- **Perbandingan framework** di tiap konsep lewat blok "💡 Kalau di framework lain…" untuk React, Vue, Next.js, Nuxt, dan Nest.js.
- **Cheat sheet runes** dan **panduan migrasi** (React / Vue / Svelte 4 ke Svelte 5), plus **glossary** istilah penting dengan analogi.
- **Pencarian modul** cepat (⌘K / Ctrl+K).
- **Tema gelap/terang** dan **progress tracking** yang tersimpan di browser.
- **Responsif** sampai layar selebar 320px.

## Peta belajar

| Level | Topik | Modul |
| :---: | ----- | :---: |
| 1 | Dasar Svelte | 5 |
| 2 | Reactivity (Runes) | 6 |
| 3 | Template Syntax | 6 |
| 4 | Special Elements & Runtime | 3 |
| 5 | Profesional | 5 |
| 6 | SvelteKit Dasar | 7 |
| 7 | SvelteKit Lanjutan | 4 |
| 8 | Expert | 6 |

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

## Menulis konten

Tiap modul adalah satu file `.svx` di `src/lib/content/<level>/<urutan>-<slug>.svx`. Saat `dev` dan `build`, `scripts/gen-manifest.mjs` memindai folder tersebut dan menyusun daftar modul secara otomatis, jadi sidebar dan navigasi tidak perlu diatur manual.

Komponen yang tersedia di dalam modul antara lain `Playground`, `FrameworkCompare`, `Callout`, `Exercise`, `LegacyVsModern`, dan `DocsLink`.

## Scripts

| Perintah | Fungsi |
| -------- | ------ |
| `npm run dev` | Server pengembangan Vite |
| `npm run build` | Build produksi (adapter Cloudflare) |
| `npm run preview` | Preview hasil build via Vite |
| `npm run cf:preview` | Build lalu jalankan runtime Workers (`wrangler dev`) |
| `npm run deploy` | Build lalu `wrangler deploy` |
| `npm run check` | Type-check dengan `svelte-check` |

---

Dibuat untuk belajar. Koreksi dan tambahan konten dipersilakan lewat issue atau pull request.
