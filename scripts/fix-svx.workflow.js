export const meta = {
	name: 'fix-svx-mdsvex',
	description: 'Closed-loop fix of mdsvex compile errors in .svx modules (verify via compile-one.mjs)',
	phases: [{ title: 'Perbaiki' }]
};

// Broken files (from per-file compile). Override via args.files.
const FILES = (args && Array.isArray(args.files) && args.files.length ? args.files : [
	'level-1-dasar/04-markup-dasar',
	'level-1-dasar/05-styling',
	'level-2-reactivity/02-state',
	'level-2-reactivity/04-effect',
	'level-3-template/01-control-flow',
	'level-3-template/02-snippets',
	'level-3-template/03-tags',
	'level-3-template/05-transitions',
	'level-3-template/06-async-await',
	'level-4-special-runtime/01-special-elements',
	'level-4-special-runtime/02-stores-vs-runes',
	'level-4-special-runtime/03-context-lifecycle',
	'level-6-sveltekit-dasar/01-apa-itu-sveltekit',
	'level-6-sveltekit-dasar/03-routing',
	'level-6-sveltekit-dasar/04-loading-data',
	'level-6-sveltekit-dasar/05-form-actions',
	'level-6-sveltekit-dasar/06-page-options',
	'level-8-expert/01-building-adapters',
	'level-8-expert/04-api-routes'
]);

const SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['slug', 'ok', 'attempts', 'notes'],
	properties: {
		slug: { type: 'string' },
		ok: { type: 'boolean' },
		attempts: { type: 'number' },
		notes: { type: 'string' }
	}
};

const GUIDE = `PANDUAN BERTAHAN MDSVEX (akar semua error ini: karakter markup MENTAH yang salah-tafsir):

Di file .svx, di luar blok pagar \`\`\` dan di luar string prop Playground/FrameworkCompare, karakter "{" dan "<"
DITAFSIRKAN oleh Svelte (bahkan di dalam <code>...</code> dan di dalam children <Callout>...). Perbaikan per kategori:

- script_duplicate / style_duplicate ("single top-level <script>/<style>"):
  Hanya boleh ADA 1 <script> top-level (blok import paling atas) dan 0 <style> top-level. Setiap contoh <script>/<style>
  lain WAJIB berada di dalam fence \`\`\`svelte ... \`\`\`. Cari <script>/<style> yang berada di prosa lalu pagari.
- block_unclosed ("Block was left open"):
  Ada {#if}/{#each}/{#await}/{#snippet} yang dianggap blok Svelte tapi tak tertutup pada scope-nya. Biasanya contoh blok
  bocor ke prosa. Bungkus contoh dalam fence \`\`\`svelte. Bila hanya menyebut di prosa, escape: tulis &#123;#if&#125;.
  Bila ada di dalam string Playground code={\`...\`}: pastikan setiap {#...} punya penutup {/...} DI DALAM string itu,
  dan tak ada backtick/\${} yang menutup template lebih awal.
- element_invalid_closing_tag ("</code>/</p>/</Callout> attempted to close..."):
  Tag HTML inline tidak seimbang di prosa. Pastikan tiap <code>/<strong>/<em>/<p> punya pasangan tutup. Jangan menaruh
  </code> tanpa <code> pembuka. Hindari mencampur backtick markdown dan <code> di tempat yang sama.
- js_parse_error / expected_token ("Unexpected token", "Expected token }" atau ">"):
  Ada "{" atau "<" MENTAH yang ditafsirkan ekspresi/tag. Di prosa, di dalam <code>, dan di dalam children <Callout>:
  ganti "{"->&#123;  "}"->&#125;  "<"->&lt;  ">"->&gt;. (JANGAN sentuh isi fence \`\`\` atau string prop.)
- block_invalid_placement ("{#snippet} cannot be inside <textarea>"):
  Ada <textarea> mentah di prosa/markup yang menelan snippet/blok. Pagari contoh <textarea> dalam fence, atau escape.
- svelte_meta_duplicate ("only one <svelte:window>"):
  Tag <svelte:window>/<svelte:head>/dll muncul >1x sebagai markup nyata di prosa. Bungkus SEMUA contoh dalam fence \`\`\`svelte.
- attribute_duplicate ("Attributes need to be unique"):
  Ada atribut dobel pada satu tag pada contoh. Perbaiki contoh tsehingga atribut unik.

YANG TIDAK BOLEH DISENTUH: isi blok pagar \`\`\`...\`\`\`, dan string template di dalam <Playground code={\`...\`} /> /
<FrameworkCompare svelte={\`...\`} ... /> (itu STRING, bukan markup) KECUALI memang string itu yang menyebabkan error
block_unclosed/expected_token (mis. {#each} tanpa {/each}, atau backtick/\${} nyasar) — barulah perbaiki di dalamnya.
JANGAN menghapus materi pelajaran; pertahankan playground berfungsi & contoh lengkap. Hanya perbaiki pembungkus/escape/penyeimbang.`;

function prompt(slug) {
	const path = `src/lib/content/${slug}.svx`;
	return `Perbaiki error compile mdsvex pada file: ${path} (modul Svelte 5).

${GUIDE}

ALUR KERJA WAJIB (closed-loop — jangan menebak):
1) Jalankan: node scripts/compile-one.mjs ${path}   -> lihat error persis (kategori + pesan). Catatan: NOMOR BARIS pada error
   sering MELESET karena mdsvex mentransformasi file; jadi jangan paku ke nomor itu — pindai SELURUH file untuk pola hazard sesuai kategori error.
2) Baca file (Read), temukan penyebab, perbaiki (Edit).
3) Jalankan lagi: node scripts/compile-one.mjs ${path}
4) ULANGI langkah 2-3 sampai output diawali "OK ". Maksimum 6 iterasi.
Kembalikan JSON {slug:"${slug}", ok:(true jika compile-one akhirnya "OK"), attempts:(berapa kali compile-one dijalankan), notes:(ringkas perbaikan)}.`;
}

log(`Closed-loop fix ${FILES.length} file…`);
const results = await parallel(
	FILES.map((slug) => () => agent(prompt(slug), { label: `fix:${slug}`, phase: 'Perbaiki', schema: SCHEMA }))
);
const ok = results.filter(Boolean);
return {
	fixedOk: ok.filter((r) => r.ok).length,
	stillBroken: ok.filter((r) => !r.ok).map((r) => r.slug),
	total: ok.length
};
