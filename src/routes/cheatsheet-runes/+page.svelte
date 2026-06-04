<script lang="ts">
	type Rune = { rune: string; sig: string; use: string; gotcha?: string };

	const groups: { title: string; intro: string; runes: Rune[] }[] = [
		{
			title: 'State',
			intro: 'Mendeklarasikan nilai reaktif — "papan tulis ajaib" yang memicu update saat berubah.',
			runes: [
				{
					rune: '$state',
					sig: 'let x = $state(awal)',
					use: 'State reaktif. Object/array jadi proxy mendalam (deep).',
					gotcha: 'Hanya di file .svelte / .svelte.js / .svelte.ts.'
				},
				{
					rune: '$state.raw',
					sig: 'let x = $state.raw(awal)',
					use: 'State tanpa proxy mendalam — reaktif hanya saat di-reassign utuh.',
					gotcha: 'Mutasi properti dalamnya TIDAK memicu update.'
				},
				{
					rune: '$state.snapshot',
					sig: '$state.snapshot(x)',
					use: 'Salinan statis non-reaktif (untuk log / kirim ke luar / structuredClone).',
					gotcha: 'Bukan referensi hidup; hasil tidak ikut berubah.'
				}
			]
		},
		{
			title: 'Derived',
			intro: 'Nilai turunan yang dihitung otomatis dari state lain.',
			runes: [
				{
					rune: '$derived',
					sig: 'let d = $derived(ekspresi)',
					use: 'Nilai komputasi dari state lain. Bebas efek samping.',
					gotcha: 'Jangan ubah state di dalamnya.'
				},
				{
					rune: '$derived.by',
					sig: 'let d = $derived.by(() => {…})',
					use: 'Sama, tapi pakai badan fungsi untuk logika kompleks.',
					gotcha: 'Tetap harus mengembalikan nilai, tanpa efek samping.'
				}
			]
		},
		{
			title: 'Effect',
			intro: 'Menjalankan efek samping sebagai reaksi atas perubahan — "asisten yang mengintip".',
			runes: [
				{
					rune: '$effect',
					sig: '$effect(() => {… return cleanup})',
					use: 'Efek samping setelah DOM update (mis. analytics, langganan).',
					gotcha: 'Bukan untuk sinkronisasi state — pakai $derived. Hindari loop.'
				},
				{
					rune: '$effect.pre',
					sig: '$effect.pre(() => {…})',
					use: 'Jalan SEBELUM DOM update (mis. autoscroll sebelum render).'
				},
				{
					rune: '$effect.root',
					sig: 'const stop = $effect.root(() => {…})',
					use: 'Scope efek manual di luar lifecycle komponen; harus dibersihkan sendiri.',
					gotcha: 'Wajib panggil fungsi cleanup yang dikembalikan.'
				},
				{
					rune: '$effect.tracking',
					sig: '$effect.tracking()',
					use: 'Boolean: apakah kode sedang berada di konteks tracking reaktif.'
				},
				{
					rune: '$effect.pending',
					sig: '$effect.pending()',
					use: 'Jumlah promise aktif dalam boundary saat ini (fitur async Svelte).'
				}
			]
		},
		{
			title: 'Props',
			intro: 'Menerima data dari komponen induk.',
			runes: [
				{
					rune: '$props',
					sig: 'let { a, b = 1, ...rest } = $props()',
					use: 'Mengambil semua props (pengganti export let).',
					gotcha: 'Satu pemanggilan per komponen; destrukturisasi untuk default.'
				},
				{
					rune: '$bindable',
					sig: 'let { val = $bindable() } = $props()',
					use: 'Menandai prop dapat di-bind dua arah (opt-in).',
					gotcha: 'Beda dari Svelte 4 yang bindable secara default.'
				},
				{
					rune: '$props.id',
					sig: 'const id = $props.id()',
					use: 'ID unik & stabil per instance komponen (untuk a11y / htmlFor).'
				}
			]
		},
		{
			title: 'Debug & lanjutan',
			intro: 'Alat bantu pengembangan dan kasus khusus.',
			runes: [
				{
					rune: '$inspect',
					sig: '$inspect(a, b)',
					use: 'Hanya saat dev: console.log otomatis tiap nilai reaktif berubah.',
					gotcha: 'Hilang otomatis di build production.'
				},
				{
					rune: '$inspect().with',
					sig: '$inspect(x).with(fn)',
					use: 'Callback kustom saat nilai berubah (mis. debugger).'
				},
				{
					rune: '$inspect.trace',
					sig: '$inspect.trace()',
					use: 'Dev (5.14+): lacak state mana yang memicu rerun. Harus statement pertama.'
				},
				{
					rune: '$host',
					sig: 'const el = $host()',
					use: 'Mengakses elemen host — hanya di dalam custom element (web component).',
					gotcha: 'Error jika dipakai di komponen Svelte biasa.'
				}
			]
		}
	];
</script>

<svelte:head><title>Cheat Sheet Runes — Svelte & SvelteKit Mastery</title></svelte:head>

<article class="prose ref">
	<h1>📋 Cheat Sheet Runes</h1>
	<p class="lead">Ringkasan semua runes Svelte 5. Tanda kurung adalah simbol pemanggilan.</p>

	{#each groups as g (g.title)}
		<section>
			<h2>{g.title}</h2>
			<p>{g.intro}</p>
			<table class="runes">
				<thead>
					<tr><th>Rune</th><th>Tanda tangan</th><th>Kegunaan</th></tr>
				</thead>
				<tbody>
					{#each g.runes as r (r.rune)}
						<tr>
							<td><code class="rn">{r.rune}</code></td>
							<td><code>{r.sig}</code></td>
							<td>
								{r.use}
								{#if r.gotcha}<div class="gotcha">⚠️ {r.gotcha}</div>{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/each}

	<p class="src">
		Sumber: <a href="https://svelte.dev/docs/svelte/what-are-runes" target="_blank" rel="noopener">
			svelte.dev/docs/svelte</a
		>
	</p>
</article>

<style>
	.ref {
		padding: 1.5rem 0 4rem;
		max-width: 900px;
	}
	.lead {
		color: var(--text-muted);
		font-size: 1.05rem;
	}
	.runes {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	.runes th,
	.runes td {
		border: 1px solid var(--border);
		padding: 0.55rem 0.7rem;
		text-align: left;
		vertical-align: top;
	}
	.runes th {
		background: var(--bg-subtle);
	}
	.rn {
		color: var(--brand);
		font-weight: 700;
	}
	td code {
		font-size: 0.82rem;
		white-space: nowrap;
	}
	.gotcha {
		margin-top: 0.3rem;
		font-size: 0.8rem;
		color: var(--warn);
		white-space: normal;
	}
	.src {
		margin-top: 2rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
