<script lang="ts">
	type Term = { term: string; def: string; analogi?: string };

	const terms: Term[] = [
		{
			term: 'Compiler',
			def: 'Svelte mengubah komponenmu menjadi JavaScript efisien saat build, bukan saat runtime.',
			analogi: 'Seperti tukang yang merakit furniture di pabrik — yang dikirim ke rumah sudah jadi & ringan.'
		},
		{
			term: 'Runes',
			def: 'Simbol fungsi diawali $ (mis. $state, $derived) yang memberi tahu compiler bagian mana yang reaktif.'
		},
		{
			term: 'Reactivity',
			def: 'Kemampuan UI memperbarui diri otomatis saat data berubah.',
			analogi: 'Papan tulis ajaib: ubah satu angka, semua hitungan yang bergantung ikut berubah.'
		},
		{
			term: 'Proxy / deep state',
			def: '$state membungkus object/array dengan Proxy sehingga mutasi properti dalam pun terdeteksi reaktif.'
		},
		{
			term: 'Snippet',
			def: 'Potongan markup yang bisa dipakai ulang & dioper sebagai prop, dideklarasi {#snippet} dan dipanggil {@render}.',
			analogi: 'Pengganti modern untuk <slot> dan render props.'
		},
		{
			term: 'Attachment (@attach)',
			def: 'Fungsi yang dijalankan saat elemen dipasang ke DOM — versi modern & lebih fleksibel dari action use:.'
		},
		{
			term: 'Action (use:)',
			def: 'Fungsi yang menerima elemen DOM untuk menambah perilaku (mis. tooltip, autofokus).'
		},
		{
			term: 'Store',
			def: 'Objek dengan kontrak subscribe untuk state lintas komponen (writable/readable/derived). Di Svelte 5 sering digantikan runes di .svelte.ts.'
		},
		{
			term: 'Context API',
			def: 'Cara mengoper data ke komponen turunan tanpa prop drilling, via setContext/getContext.',
			analogi: 'Titip pesan lewat keluarga — tak perlu oper tangan ke tangan tiap level.'
		},
		{
			term: 'Props',
			def: 'Data yang dioper dari induk ke komponen anak, diterima lewat $props().'
		},
		{
			term: 'Binding (bind:)',
			def: 'Ikatan dua arah antara nilai komponen/elemen dan state (mis. bind:value pada input).'
		},
		{
			term: 'Virtual DOM (VDOM)',
			def: 'Teknik React/Vue: menyimpan salinan DOM di memori lalu mem-diff. Svelte TIDAK pakai VDOM — ia meng-compile update langsung.'
		},
		{
			term: 'Hydration',
			def: 'Proses "menghidupkan" HTML hasil server di browser agar interaktif.',
			analogi: 'Patung yang dihidupkan sehingga bisa bergerak setelah sampai di browser.'
		},
		{
			term: 'SSR (Server-Side Rendering)',
			def: 'HTML dirender di server tiap request, lalu dikirim siap tampil.',
			analogi: 'Restoran: dimasak lalu diantar ke pelanggan.'
		},
		{
			term: 'CSR (Client-Side Rendering)',
			def: 'Browser merender halaman dari JavaScript setelah memuat app.',
			analogi: 'Kirim bahan mentah, pelanggan masak sendiri di rumah.'
		},
		{
			term: 'SSG (Static Site Generation)',
			def: 'Halaman dirender sekali saat build menjadi file statis (prerender).',
			analogi: 'Katering yang disiapkan jauh-jauh hari.'
		},
		{
			term: 'ISR (Incremental Static Regeneration)',
			def: 'Konsep Next.js: halaman statis diregenerasi berkala di latar belakang. SvelteKit mencapainya via cache header / adapter tertentu.'
		},
		{
			term: 'Prerender',
			def: 'Opsi SvelteKit untuk menghasilkan HTML statis suatu route saat build.'
		},
		{
			term: 'SPA (Single Page Application)',
			def: 'Aplikasi yang memuat satu shell HTML lalu berpindah halaman via JavaScript tanpa reload penuh.'
		},
		{
			term: 'Adapter',
			def: 'Plugin SvelteKit yang menyesuaikan output build ke target deploy (Node, static, Vercel, Cloudflare, dll).'
		},
		{
			term: 'load function',
			def: 'Fungsi di +page.js/+page.server.js yang menyiapkan data sebelum halaman dirender.'
		},
		{
			term: 'Form actions & progressive enhancement',
			def: 'Form yang berfungsi via request HTTP biasa, lalu di-"tingkatkan" jadi instan dengan use:enhance bila JS aktif.',
			analogi: 'Formulir kertas yang tetap bisa dikirim via pos walau internet mati — tapi instan kalau ada internet.'
		},
		{
			term: 'Endpoint (+server.js)',
			def: 'Route yang mengembalikan Response (JSON/teks/biner) — API di dalam SvelteKit.'
		},
		{
			term: 'Hooks',
			def: 'Fungsi di hooks.server.js (handle, handleFetch, handleError, reroute) yang menyisip di alur request/render.'
		},
		{
			term: 'Remote functions',
			def: 'Fungsi server yang dapat dipanggil dari klien secara type-safe (fitur SvelteKit terbaru).'
		},
		{
			term: 'Custom element / Web component',
			def: 'Komponen Svelte yang di-compile menjadi elemen kustom standar web, dipakai di luar Svelte.'
		},
		{
			term: 'Lifecycle (onMount)',
			def: 'Kait siklus hidup komponen. Di Svelte 5 banyak kebutuhan lifecycle digantikan $effect.'
		},
		{
			term: 'Scoped styles',
			def: 'Gaya di <' + 'style> komponen otomatis terbatas ke komponen itu saja (tak bocor ke global).'
		}
	];

	const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'id'));
</script>

<svelte:head><title>Glossary — Svelte & SvelteKit Mastery</title></svelte:head>

<article class="prose ref">
	<h1>📖 Glossary</h1>
	<p class="lead">Istilah penting di dunia Svelte & SvelteKit, dengan analogi untuk yang abstrak.</p>

	<dl class="glossary">
		{#each sorted as t (t.term)}
			<div class="entry">
				<dt>{t.term}</dt>
				<dd>
					{t.def}
					{#if t.analogi}<div class="analogi">🔮 {t.analogi}</div>{/if}
				</dd>
			</div>
		{/each}
	</dl>
</article>

<style>
	.ref {
		padding: 1.5rem 0 4rem;
		max-width: 820px;
	}
	.lead {
		color: var(--text-muted);
		font-size: 1.05rem;
	}
	.glossary {
		display: grid;
		gap: 0.8rem;
		margin-top: 1.5rem;
	}
	.entry {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.9rem 1.1rem;
		background: var(--bg-elevated);
	}
	dt {
		font-weight: 700;
		color: var(--brand);
		margin-bottom: 0.25rem;
	}
	dd {
		margin: 0;
		color: var(--text);
		font-size: 0.95rem;
	}
	.analogi {
		margin-top: 0.4rem;
		font-size: 0.88rem;
		color: var(--text-muted);
		font-style: italic;
	}
</style>
