<script lang="ts">
	import { page } from '$app/state';
	import { modules } from '$lib/content';

	const status = $derived(page.status);
	const is404 = $derived(status === 404);
	const message = $derived(page.error?.message ?? 'Terjadi kesalahan.');
	const firstSlug = $derived(modules[0]?.slug ?? '');
</script>

<svelte:head>
	<title>{status} — Svelte & SvelteKit Mastery</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="err">
	<div class="code" aria-hidden="true">{status}</div>
	<h1>{is404 ? 'Halaman tidak ditemukan' : 'Ada yang tidak beres'}</h1>
	<p class="msg">
		{#if is404}
			Halaman yang kamu cari mungkin sudah pindah atau tidak pernah ada. Yuk, kembali ke jalur
			belajar.
		{:else}
			{message}
		{/if}
	</p>

	<div class="actions">
		<a class="btn btn-primary" href="/">← Ke Beranda</a>
		<a class="btn" href="/roadmap">🗺️ Roadmap belajar</a>
		{#if firstSlug}
			<a class="btn" href="/belajar/{firstSlug}">Mulai dari Level 1</a>
		{/if}
	</div>

	<p class="hint">Tip: tekan <kbd>⌘</kbd> <kbd>K</kbd> untuk mencari modul.</p>
</section>

<style>
	.err {
		max-width: 560px;
		margin: 0 auto;
		padding: 5rem 1rem;
		text-align: center;
	}
	.code {
		font-family: var(--font-display, serif);
		font-size: clamp(4rem, 18vw, 8rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.04em;
		background: linear-gradient(120deg, var(--brand), var(--brand-2));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	h1 {
		margin: 0.4rem 0 0.6rem;
		font-size: 1.6rem;
	}
	.msg {
		color: var(--text-muted);
		font-size: 1.05rem;
		margin: 0 auto 1.6rem;
		max-width: 440px;
	}
	.actions {
		display: flex;
		gap: 0.7rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.hint {
		margin-top: 2rem;
		font-size: 0.85rem;
		color: var(--text-faint);
	}
	kbd {
		background: var(--bg-inset);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 0.05em 0.4em;
		font-size: 0.85em;
	}
</style>
