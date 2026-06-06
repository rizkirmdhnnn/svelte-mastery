<script lang="ts">
	import { page } from '$app/state';
	import { products, productOf, type Product } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ProductSwitcher from './ProductSwitcher.svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	const currentSlug = $derived(
		page.url.pathname.startsWith('/belajar/')
			? decodeURIComponent(page.url.pathname.replace('/belajar/', ''))
			: ''
	);
	const activeProduct = $derived<Product>(currentSlug ? productOf(currentSlug) : 'svelte');
	const group = $derived(products.find((p) => p.product === activeProduct) ?? products[0]);

	const productSlugs = $derived(group ? group.modules.map((m) => m.slug) : []);
	const productPercent = $derived(progress.percent(productSlugs));
	const doneCount = $derived(progress.count(productSlugs));

	function sectionHasCurrent(mods: { slug: string }[]) {
		return mods.some((m) => m.slug === currentSlug);
	}
</script>

<nav class="sidebar" aria-label="Daftar modul">
	<div class="mobile-switch"><ProductSwitcher /></div>

	{#if group}
		<div class="overall">
			<div class="overall-head">
				<span>{group.title}</span>
				<span class="pct">{productPercent}%</span>
			</div>
			<div class="bar"><div class="fill" style="width:{productPercent}%"></div></div>
			<div class="count">{doneCount}/{group.modules.length} modul</div>
		</div>

		{#each group.sections as sec (sec.section)}
			{@const secSlugs = sec.modules.map((m) => m.slug)}
			{@const secPct = progress.percent(secSlugs)}
			<details class="level" open={sectionHasCurrent(sec.modules) || sec.order === 1}>
				<summary>
					<span class="lv-title">{sec.title}</span>
					<span class="lv-pct" class:done={secPct === 100}>{secPct}%</span>
				</summary>
				<ul>
					{#each sec.modules as m (m.slug)}
						<li>
							<a
								href="/belajar/{m.slug}"
								class="mod"
								class:active={m.slug === currentSlug}
								onclick={onNavigate}
							>
								<span class="check" class:on={progress.isDone(m.slug)} aria-hidden="true">
									{progress.isDone(m.slug) ? '✓' : '○'}
								</span>
								<span class="m-title">{m.title}</span>
								{#if m.status !== 'stable'}<StatusBadge status={m.status} />{/if}
							</a>
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	{/if}

	<div class="extras">
		<a href="/kelengkapan">✅ Kelengkapan materi</a>
		<a href="/roadmap">🗺️ Roadmap belajar</a>
		<a href="/cheatsheet-runes">📋 Cheat sheet runes</a>
		<a href="/migration-cheatsheet">🔄 Migration cheat sheet</a>
		<a href="/glossary">📖 Glossary</a>
	</div>
</nav>

<style>
	.sidebar {
		padding: 1rem 0.7rem 3rem;
		font-size: 0.88rem;
	}
	.mobile-switch {
		display: none;
		padding: 0 0.6rem 0.8rem;
	}
	.overall {
		padding: 0.5rem 0.6rem 0.9rem;
	}
	.overall-head {
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
		color: var(--text-muted);
		font-weight: 600;
		margin-bottom: 0.35rem;
	}
	.pct {
		color: var(--brand);
	}
	.bar {
		height: 6px;
		border-radius: 99px;
		background: var(--bg-inset);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: linear-gradient(90deg, var(--brand), var(--brand-2));
		transition: width 0.3s var(--ease);
	}
	.count {
		font-size: 0.72rem;
		color: var(--text-faint);
		margin-top: 0.3rem;
	}
	.level {
		margin-bottom: 0.15rem;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius);
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		background: var(--bg-subtle);
	}
	.lv-title {
		flex: 1;
		font-weight: 600;
	}
	.lv-pct {
		font-size: 0.72rem;
		color: var(--text-faint);
	}
	.lv-pct.done {
		color: var(--ok);
	}
	ul {
		list-style: none;
		margin: 0.1rem 0 0.4rem;
		padding: 0 0 0 0.55rem;
		border-left: 1px solid var(--border);
		margin-left: 0.9rem;
	}
	.mod {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		padding: 0.35rem 0.5rem;
		border-radius: var(--radius);
		color: var(--text-muted);
		text-decoration: none;
		line-height: 1.35;
		transition:
			background 0.15s var(--ease),
			color 0.15s var(--ease);
	}
	.mod:hover {
		background: var(--bg-subtle);
		color: var(--text);
	}
	.mod.active {
		background: var(--accent-soft);
		color: var(--brand);
		font-weight: 600;
		box-shadow: inset 0 0 0 1px var(--border);
	}
	.check {
		font-size: 0.78rem;
		color: var(--text-faint);
		margin-top: 0.05rem;
	}
	.check.on {
		color: var(--ok);
	}
	.m-title {
		flex: 1;
	}
	.mod :global(.badge) {
		margin-left: auto;
		align-self: center;
	}
	.extras {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-top: 1rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--border);
	}
	.extras a {
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.84rem;
	}
	.extras a:hover {
		background: var(--bg-subtle);
		color: var(--text);
	}
	@media (max-width: 760px) {
		.mobile-switch {
			display: block;
		}
	}
</style>
