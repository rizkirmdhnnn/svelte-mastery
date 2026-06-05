# "Terakhir Diperbarui" per Modul — Design Spec

**Tanggal:** 2026-06-05
**Status:** Disetujui (sumber: git otomatis; tampilan: tanggal saja)

## Tujuan
Tiap halaman modul menampilkan kapan materinya terakhir diperbarui, agar pengguna
sadar apakah ada update — otomatis & tanpa perawatan manual.

## Keputusan
- **Sumber tanggal:** otomatis dari git (commit terakhir file `.svx`), bisa di-override
  dengan frontmatter `updated:`.
- **Tampilan:** baris halus "🕒 Terakhir diperbarui <tanggal>" di halaman modul. Tanpa
  badge "Baru" / indikator sidebar.

## Implementasi
1. `scripts/gen-manifest.mjs`:
   - Untuk tiap modul, set `updated` = frontmatter `updated:` (jika ada) ELSE
     `git log -1 --format=%cI -- <file>` (ISO date string).
   - Bungkus pemanggilan git dengan try/catch; jika gagal (bukan repo / file belum
     di-commit / git tak ada), `updated` = undefined (tidak ditampilkan). Tidak boleh
     menggagalkan generate manifest.
2. `src/lib/content.ts` — tambah `updated?: string` di `ModuleMeta`.
3. `src/routes/belajar/[...slug]/+page.svelte` — render "🕒 Terakhir diperbarui
   {format(updated)}" (locale `id-ID`, mis. "5 Jun 2026") di bawah lead; hanya bila
   `meta.updated` ada.

## Sifat & batasan
- Otomatis di `predev`/`prebuild`/`deploy` (gen-manifest sudah terpasang di sana).
- `modules.generated.ts` (yang di-commit) bisa sedikit tertinggal, tapi prebuild
  selalu me-regenerate sebelum build → situs live selalu akurat.
- Tidak menyentuh konten modul atau komponen lain.

## Acceptance
- [ ] Halaman modul menampilkan "Terakhir diperbarui <tanggal>" (format Indonesia)
      sesuai commit terakhir file-nya.
- [ ] Frontmatter `updated:` (bila diisi) menimpa tanggal git.
- [ ] Modul tanpa data tanggal: baris tidak muncul (tidak error).
- [ ] `npm run build` & `npm run check` hijau.
