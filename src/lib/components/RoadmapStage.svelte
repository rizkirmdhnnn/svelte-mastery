<script lang="ts">
	import { progress } from '$lib/stores/progress.svelte';
	import type { ModuleMeta } from '$lib/content';
	import type { RoadmapMeta } from '$lib/roadmap';

	let {
		title,
		modules,
		meta,
		currentSlug,
		isLast = false
	}: {
		title: string;
		modules: ModuleMeta[];
		meta: RoadmapMeta;
		currentSlug: string;
		isLast?: boolean;
	} = $props();

	const slugs = $derived(modules.map((m) => m.slug));
	const pct = $derived(progress.percent(slugs));
	const status = $derived(pct === 100 ? 'done' : pct > 0 ? 'partial' : 'todo');

	// Render trusted blurb text: escape HTML, then turn `code` into <code>.
	function fmt(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/`([^`]+)`/g, '<code>$1</code>');
	}
</script>

<li class="stage" class:last={isLast}>
	<div class="rail">
		<span class="dot {status}" aria-hidden="true">{status === 'done' ? '✓' : meta.icon}</span>
		<span class="line"></span>
	</div>

	<div class="card">
		<header class="head">
			<h2>{title}</h2>
			<span class="pct" class:full={pct === 100}>{pct}%</span>
		</header>

		<div class="bar"><div class="fill" style="width:{pct}%"></div></div>

		<p class="blurb">{@html fmt(meta.blurb)}</p>

		<ul class="topics">
			{#each modules as m (m.slug)}
				<li class="topic">
					<a href="/belajar/{m.slug}" class:done={progress.isDone(m.slug)}>
						<span class="check" class:on={progress.isDone(m.slug)} aria-hidden="true">
							{progress.isDone(m.slug) ? '✓' : '○'}
						</span>
						<span class="t-title">{m.title}</span>
					</a>
					{#if m.slug === currentSlug}
						<span class="here">📍 Kamu di sini</span>
					{/if}
				</li>
			{/each}
		</ul>

		<a class="docs" href={meta.docsUrl} target="_blank" rel="noopener noreferrer">
			📚 {meta.docsLabel} <span class="ext" aria-hidden="true">↗</span>
		</a>
	</div>
</li>

<style>
	.stage {
		display: flex;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}
	/* rail: marker + connecting line */
	.rail {
		position: relative;
		flex: none;
		width: 2.6rem;
		display: flex;
		justify-content: center;
	}
	.line {
		position: absolute;
		left: 50%;
		top: 0.2rem;
		bottom: 0;
		width: 2px;
		transform: translateX(-50%);
		background: var(--border);
	}
	.last .line {
		bottom: auto;
		height: 1.4rem;
	}
	.dot {
		position: relative;
		z-index: 1;
		width: 2.4rem;
		height: 2.4rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 1.1rem;
		background: var(--bg-elevated);
		border: 2px solid var(--border-strong);
		box-shadow: var(--shadow-sm);
	}
	.dot.partial {
		border-color: var(--brand);
	}
	.dot.done {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--brand-ink);
		font-weight: 700;
	}

	.card {
		flex: 1;
		min-width: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--bg-elevated);
		padding: 1.1rem 1.25rem;
		box-shadow: var(--shadow-sm);
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}
	.head h2 {
		margin: 0;
		font-size: 1.15rem;
		flex: 1;
		min-width: 0;
	}
	.pct {
		font-size: 0.8rem;
		color: var(--text-faint);
		flex: none;
	}
	.pct.full {
		color: var(--ok);
		font-weight: 700;
	}
	.bar {
		height: 6px;
		border-radius: 99px;
		background: var(--bg-inset);
		overflow: hidden;
		margin: 0.6rem 0 0.8rem;
	}
	.fill {
		height: 100%;
		background: linear-gradient(90deg, var(--brand), var(--brand-2));
		transition: width 0.3s var(--ease);
	}
	.blurb {
		margin: 0 0 0.9rem;
		font-size: 0.92rem;
		color: var(--text-muted);
		line-height: 1.55;
	}
	.blurb :global(code) {
		background: var(--accent-soft);
		color: var(--link);
		padding: 0.08em 0.35em;
		border-radius: 4px;
		font-size: 0.86em;
	}
	.topics {
		list-style: none;
		margin: 0 0 0.9rem;
		padding: 0;
		display: grid;
		gap: 0.15rem;
	}
	.topic {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.topic a {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.25rem 0.4rem;
		border-radius: var(--radius-sm);
		color: var(--text);
		text-decoration: none;
		font-size: 0.92rem;
	}
	.topic a:hover {
		background: var(--bg-subtle);
		color: var(--brand);
	}
	.topic a.done .t-title {
		color: var(--text-muted);
	}
	.check {
		font-size: 0.8rem;
		color: var(--text-faint);
	}
	.check.on {
		color: var(--ok);
	}
	.here {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--brand);
		background: var(--accent-soft);
		padding: 0.1rem 0.45rem;
		border-radius: 99px;
		white-space: nowrap;
	}
	.docs {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--text-muted);
		text-decoration: none;
	}
	.docs:hover {
		color: var(--link);
	}
	.ext {
		opacity: 0.7;
		font-size: 0.85em;
	}
	@media (max-width: 560px) {
		.rail {
			width: 2rem;
		}
		.dot {
			width: 2rem;
			height: 2rem;
			font-size: 0.95rem;
		}
		.card {
			padding: 0.9rem 1rem;
		}
	}
</style>
