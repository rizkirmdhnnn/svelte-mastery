<script lang="ts">
	import { neighbors } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { addCopyButtons } from '$lib/actions/copy';
	import Toc from '$lib/components/Toc.svelte';
	import type { Component } from 'svelte';

	let { data } = $props();

	const nav = $derived(neighbors(data.slug));
	const Module = $derived(data.Component as Component);
	const done = $derived(progress.isDone(data.slug));
</script>

<svelte:head>
	<title>{data.meta.title} — Svelte & SvelteKit Mastery</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<div class="lesson">
	<article class="prose module" use:addCopyButtons>
	<nav class="crumb">
		<a href="/">Beranda</a>
		<span aria-hidden="true">/</span>
		<span>Level {data.meta.level} · {data.meta.levelTitle}</span>
	</nav>

	<h1>{data.meta.title}</h1>
	<p class="lead">{data.meta.description}</p>

	<Module />

	<div class="done-row">
		<label class="done-toggle">
			<input type="checkbox" checked={done} onchange={() => progress.toggle(data.slug)} />
			<span>Tandai modul ini selesai</span>
		</label>
	</div>

	<nav class="pager">
		{#if nav.prev}
			<a class="pg prev" href="/belajar/{nav.prev.slug}">
				<span class="dir">← Sebelumnya</span>
				<span class="t">{nav.prev.title}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nav.next}
			<a class="pg next" href="/belajar/{nav.next.slug}">
				<span class="dir">Selanjutnya →</span>
				<span class="t">{nav.next.title}</span>
			</a>
		{/if}
	</nav>
	</article>

	<aside class="toc-rail">
		{#key data.slug}
			<Toc key={data.slug} />
		{/key}
	</aside>
</div>

<style>
	.lesson {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 2.5rem;
		align-items: start;
	}
	.lesson .module {
		margin: 0;
	}
	.toc-rail {
		position: sticky;
		top: calc(var(--header-h) + 1.5rem);
		align-self: start;
	}
	@media (max-width: 1100px) {
		.lesson {
			grid-template-columns: minmax(0, 1fr);
		}
		.toc-rail {
			display: none;
		}
	}
	.module {
		padding: 1.5rem 0 4rem;
	}
	.crumb {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 0.82rem;
		color: var(--text-muted);
		margin-bottom: 0.8rem;
	}
	.lead {
		font-size: 1.1rem;
		color: var(--text-muted);
		margin-top: -0.2em;
	}
	.done-row {
		margin: 2.5rem 0 1.5rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--border);
	}
	.done-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.done-toggle input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--brand);
	}
	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.pg {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text);
		background: var(--bg-elevated);
		transition: border-color 0.15s var(--ease), transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}
	.pg:hover {
		border-color: var(--brand);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
	}
	.pg.next {
		text-align: right;
	}
	.dir {
		font-size: 0.78rem;
		color: var(--text-muted);
	}
	.t {
		font-weight: 600;
		overflow-wrap: break-word;
		word-break: break-word;
	}
	@media (max-width: 640px) {
		.pager {
			grid-template-columns: 1fr;
		}
	}
</style>
