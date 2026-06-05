<script lang="ts">
	import { tick } from 'svelte';

	// `key` changes per module so the TOC re-scans on client-side navigation.
	let { key, containerSelector = '.prose' }: { key: string; containerSelector?: string } =
		$props();

	type Item = { id: string; text: string; level: number };
	let items = $state<Item[]>([]);
	let activeId = $state('');

	$effect(() => {
		key; // re-run this effect whenever the module changes
		let observer: IntersectionObserver | undefined;
		let cancelled = false;

		(async () => {
			await tick(); // wait for the new module's DOM to render
			if (cancelled) return;
			const container = document.querySelector(containerSelector);
			if (!container) {
				items = [];
				return;
			}
			const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLElement[];
			items = headings
				.filter((h) => h.id)
				.map((h) => ({ id: h.id, text: h.textContent ?? '', level: h.tagName === 'H2' ? 2 : 3 }));
			if (!items.length) return;

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) activeId = (entry.target as HTMLElement).id;
					}
				},
				{ rootMargin: '-80px 0px -70% 0px', threshold: 0 }
			);
			headings.filter((h) => h.id).forEach((h) => observer!.observe(h));
		})();

		return () => {
			cancelled = true;
			observer?.disconnect();
		};
	});
</script>

{#if items.length > 1}
	<nav class="toc" aria-label="Di halaman ini">
		<p class="toc-title">Di halaman ini</p>
		<ul>
			{#each items as item (item.id)}
				<li class:sub={item.level === 3}>
					<a href="#{item.id}" class:active={activeId === item.id}>{item.text}</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc {
		position: sticky;
		top: calc(var(--header-h) + 1.5rem);
		font-size: 0.85rem;
		max-height: calc(100vh - var(--header-h) - 3rem);
		overflow-y: auto;
	}
	.toc-title {
		font-weight: 700;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin: 0 0 0.7rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 1px solid var(--border);
	}
	li {
		margin: 0;
	}
	a {
		display: block;
		padding: 0.3rem 0 0.3rem 0.9rem;
		margin-left: -1px;
		border-left: 2px solid transparent;
		color: var(--text-muted);
		text-decoration: none;
		line-height: 1.4;
		transition: color 0.15s var(--ease), border-color 0.15s var(--ease);
	}
	li.sub a {
		padding-left: 1.6rem;
		font-size: 0.8rem;
	}
	a:hover {
		color: var(--text);
		text-decoration: none;
	}
	a.active {
		color: var(--link);
		border-left-color: var(--brand);
		font-weight: 600;
	}
</style>
