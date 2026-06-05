<script lang="ts">
	import { page } from '$app/state';
	import { levels } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	const currentSlug = $derived(
		page.url.pathname.startsWith('/belajar/')
			? decodeURIComponent(page.url.pathname.replace('/belajar/', ''))
			: ''
	);

	const allSlugs = $derived(levels.flatMap((l) => l.modules.map((m) => m.slug)));
	const totalPercent = $derived(progress.percent(allSlugs));

	function levelHasCurrent(lvlModules: { slug: string }[]) {
		return lvlModules.some((m) => m.slug === currentSlug);
	}
</script>

<nav class="sidebar" aria-label="Daftar modul">
	<div class="overall">
		<div class="overall-head">
			<span>Progress</span>
			<span class="pct">{totalPercent}%</span>
		</div>
		<div class="bar"><div class="fill" style="width:{totalPercent}%"></div></div>
	</div>

	{#each levels as lvl (lvl.level)}
		{@const lvlSlugs = lvl.modules.map((m) => m.slug)}
		{@const lvlPct = progress.percent(lvlSlugs)}
		<details class="level" open={levelHasCurrent(lvl.modules) || lvl.level === 1}>
			<summary>
				<span class="lv-num">L{lvl.level}</span>
				<span class="lv-title">{lvl.title}</span>
				<span class="lv-pct" class:done={lvlPct === 100}>{lvlPct}%</span>
			</summary>
			<ul>
				{#each lvl.modules as m (m.slug)}
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
						</a>
					</li>
				{/each}
			</ul>
		</details>
	{/each}

	<div class="extras">
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
	.lv-num {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--brand-ink);
		background: var(--brand);
		padding: 0.1rem 0.35rem;
		border-radius: 5px;
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
</style>
