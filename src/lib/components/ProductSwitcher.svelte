<script lang="ts">
	import { page } from '$app/state';
	import { products, productOf, firstOf, type Product } from '$lib/content';

	// Active product from the current /belajar/<product>/… URL (default svelte).
	const active = $derived<Product>(
		page.url.pathname.startsWith('/belajar/')
			? productOf(decodeURIComponent(page.url.pathname.replace('/belajar/', '')))
			: 'svelte'
	);

	function hrefFor(product: Product): string {
		return `/belajar/${firstOf(product)?.slug ?? product}`;
	}
</script>

<div class="switcher" role="tablist" aria-label="Pilih produk">
	{#each products as p (p.product)}
		<a
			class="seg"
			class:active={p.product === active}
			role="tab"
			aria-selected={p.product === active}
			href={hrefFor(p.product)}
		>
			{p.title}
		</a>
	{/each}
</div>

<style>
	.switcher {
		display: inline-flex;
		gap: 0.15rem;
		padding: 0.2rem;
		background: var(--bg-inset);
		border: 1px solid var(--border);
		border-radius: 999px;
	}
	.seg {
		padding: 0.32rem 0.85rem;
		border-radius: 999px;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
		white-space: nowrap;
		transition:
			background 0.15s var(--ease),
			color 0.15s var(--ease);
	}
	.seg:hover {
		color: var(--text);
		text-decoration: none;
	}
	.seg.active {
		background: var(--bg-elevated);
		color: var(--brand);
		box-shadow: var(--shadow-sm);
	}
	@media (max-width: 560px) {
		.seg {
			padding: 0.3rem 0.6rem;
			font-size: 0.76rem;
		}
	}
</style>
