<script lang="ts">
	import { goto } from '$app/navigation';
	import { search } from '$lib/search';
	import { PRODUCT_TITLES, type ModuleMeta } from '$lib/content';

	let query = $state('');
	let open = $state(false);
	let activeIndex = $state(0);
	let inputEl: HTMLInputElement;

	const results = $derived<ModuleMeta[]>(query ? search(query) : []);

	$effect(() => {
		// reset highlight when results change
		results;
		activeIndex = 0;
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter') {
			const m = results[activeIndex];
			if (m) select(m);
		} else if (e.key === 'Escape') {
			open = false;
			inputEl?.blur();
		}
	}

	function select(m: ModuleMeta) {
		query = '';
		open = false;
		goto(`/belajar/${m.slug}`);
	}

	// Global Cmd/Ctrl-K to focus search.
	function onGlobalKey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			inputEl?.focus();
			open = true;
		}
	}
</script>

<svelte:window onkeydown={onGlobalKey} />

<div class="search" class:open>
	<span class="ic" aria-hidden="true">🔎</span>
	<input
		bind:this={inputEl}
		bind:value={query}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={onKey}
		type="search"
		placeholder="Cari modul…"
		aria-label="Cari modul"
		autocomplete="off"
	/>

	{#if !query}
		<kbd class="kbd-hint" aria-hidden="true">⌘K</kbd>
	{/if}

	{#if open && results.length > 0}
		<ul class="results" role="listbox">
			{#each results as m, i (m.slug)}
				<li>
					<button
						class="result"
						class:active={i === activeIndex}
						role="option"
						aria-selected={i === activeIndex}
						onmousedown={() => select(m)}
						onmouseenter={() => (activeIndex = i)}
					>
						<span class="r-title">{m.title}</span>
						<span class="r-level">{PRODUCT_TITLES[m.product]} › {m.sectionTitle}</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if open && query}
		<div class="results empty">Tidak ada hasil untuk “{query}”.</div>
	{/if}
</div>

<style>
	.search {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		flex: 1;
		max-width: 360px;
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-subtle);
	}
	.search.open {
		border-color: var(--brand);
	}
	.ic {
		font-size: 0.85rem;
		opacity: 0.7;
	}
	input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: var(--text);
		font-size: 0.88rem;
		outline: none;
	}
	/* Keyboard-shortcut badge: only meaningful where there's a physical
	   keyboard, so it's hidden on touch devices (no ⌘/Ctrl to press). */
	.kbd-hint {
		display: none;
		flex: none;
		padding: 0.05rem 0.32rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--text-faint);
		background: var(--bg-elevated);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		white-space: nowrap;
	}
	@media (hover: hover) and (pointer: fine) {
		.kbd-hint {
			display: inline-block;
		}
	}
	.results {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 50;
		margin: 0;
		padding: 0.3rem;
		list-style: none;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
		max-height: 60vh;
		overflow: auto;
	}
	.results.empty {
		padding: 0.7rem 0.8rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.result {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		width: 100%;
		text-align: left;
		padding: 0.45rem 0.6rem;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text);
	}
	.result.active {
		background: var(--accent-soft);
	}
	.r-title {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.r-level {
		font-size: 0.76rem;
		color: var(--text-muted);
	}
</style>
