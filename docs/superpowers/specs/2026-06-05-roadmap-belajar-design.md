# Roadmap Belajar Svelte — Design Spec

**Tanggal:** 2026-06-05
**Status:** Disetujui (jalur vertikal journey, cakupan Svelte + SvelteKit penuh)

## Tujuan
Halaman `/roadmap` — peta perjalanan belajar pemula→expert sebagai **garis waktu vertikal**,
mengikuti urutan **dokumentasi resmi** Svelte/SvelteKit, progress-aware, menaut ke modul situs &
halaman docs resmi. Pelengkap sidebar (yang flat/navigasi); roadmap = view bird's-eye + motivasi
("kamu di mana, apa berikutnya").

## Prinsip kunci: MUDAH DI-UPDATE
- Daftar topik/level **dikomposisi dari manifest yang sudah ada** (`$lib/content` → `levels`,
  `modules`) + `progress` store. **Tambah modul `.svx` → otomatis muncul di roadmap.** Tidak ada
  daftar modul yang di-hardcode.
- Satu-satunya data tambahan: `src/lib/roadmap.ts` = peta per-level `{ icon, blurb, docsUrl,
  docsLabel }` (8 entri, ber-komentar). Edit cukup di sini bila menambah level/menyesuaikan teks.
  Bila menambah level baru di konten, tambah satu entri di sini (fallback aman bila entri tak ada).

## Tata letak
- Garis vertikal; tiap **level** = satu simpul (`RoadmapStage`):
  - Penanda status: ✓ penuh (semua modul selesai) · ◑ sebagian · ○ belum (dari `progress`).
  - Nomor + judul level + ikon + bar progress & % per level.
  - Blurb "yang kamu kuasai di sini".
  - Daftar topik = modul level itu; tiap link ke `/belajar/<slug>`, ✓ bila selesai.
  - Badge **"📍 Kamu di sini"** pada modul pertama yang belum selesai (global).
  - Link **"📚 Docs resmi"** → `docsUrl`.
- Simpul awal "Mulai di sini" + transisi **"↓ Lanjut ke SvelteKit"** (antara level Svelte & Kit) +
  simpul akhir "Siap membangun app 🚀".
- Header roadmap: ringkas + catatan "ikuti juga **tutorial interaktif resmi**" → svelte.dev/tutorial.
- Overall progress bar di atas.

## Sumber & akurasi
Urutan & pengelompokan tahap mengikuti `svelte.dev/docs/svelte`, `svelte.dev/docs/kit`, dan tutorial
resmi `svelte.dev/tutorial` (8 tahap = 8 level situs, yang memang diturunkan dari struktur docs).
`docsUrl` tiap tahap diverifikasi resolve (HTTP 200).

## Arsitektur (file)
- `src/lib/roadmap.ts` — meta per-level (data; mudah diedit).
- `src/lib/components/RoadmapStage.svelte` — satu simpul (reusable, presentasional).
- `src/routes/roadmap/+page.svelte` — halaman (prerender), komposisi `levels`+`progress`+roadmap meta.
- Tautan masuk: link "Roadmap" di `Header.svelte`, CTA di Beranda (`+page.svelte`), link di sidebar extras.

## Responsif & tema
1 kolom + garis di mobile; pakai token "Hangat Svelte" + `--font-display` yang ada. Tidak menyentuh
konten/komponen modul lain.

## Acceptance
- [ ] `/roadmap` render: 8 tahap, progress per-level & total benar (sinkron `progress` store).
- [ ] Tiap topik menaut ke modulnya; "Kamu di sini" pada modul belum-selesai pertama.
- [ ] Tiap tahap punya link docs resmi yang valid (HTTP 200).
- [ ] Tautan masuk dari header + beranda + sidebar.
- [ ] Tambah modul `.svx` baru → muncul otomatis di roadmap tanpa edit roadmap.ts.
- [ ] `npm run build` (Cloudflare) & `npm run check` hijau; responsif mobile.
