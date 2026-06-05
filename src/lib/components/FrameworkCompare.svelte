<script lang="ts">
	import { highlight } from '$lib/highlight';

	type FwKey = 'svelte' | 'react' | 'vue' | 'next' | 'nuxt' | 'nest';

	let {
		task,
		svelte: svelteCode,
		react,
		vue,
		next,
		nuxt,
		nest,
		diff = {},
		note
	}: {
		task: string;
		svelte?: string;
		react?: string;
		vue?: string;
		next?: string;
		nuxt?: string;
		nest?: string;
		diff?: Partial<Record<FwKey, number[]>>;
		note?: string;
	} = $props();

	// Read props inside $derived so they stay reactive (and silence
	// `state_referenced_locally`). These are static per instance in practice.
	const tabs = $derived(
		(
			[
				{ key: 'svelte', label: 'Svelte', lang: 'svelte', code: svelteCode },
				{ key: 'react', label: 'React', lang: 'tsx', code: react },
				{ key: 'vue', label: 'Vue', lang: 'vue', code: vue },
				{ key: 'next', label: 'Next.js', lang: 'tsx', code: next },
				{ key: 'nuxt', label: 'Nuxt', lang: 'vue', code: nuxt },
				{ key: 'nest', label: 'Nest.js', lang: 'typescript', code: nest }
			] as { key: FwKey; label: string; lang: string; code?: string }[]
		).filter((t) => t.code != null)
	);

	let activeKey = $state<FwKey | null>(null);
	const active = $derived(activeKey ?? tabs[0]?.key ?? null);
	const activeTab = $derived(tabs.find((t) => t.key === active) ?? null);
	const activeCode = $derived(activeTab?.code ?? '');

	let rendered = $state<Partial<Record<FwKey, string>>>({});

	$effect(() => {
		const tab = activeTab;
		if (tab && active && rendered[active] == null) {
			highlight(tab.code as string, tab.lang, diff[active] ?? []).then((h) => {
				rendered = { ...rendered, [active]: h };
			});
		}
	});
</script>

{#if tabs.length > 0}
	<aside class="fc">
		<header class="fc-head">
			<span class="badge">💡 Kalau di framework lain…</span>
			<span class="task">{task}</span>
		</header>

		<div class="tabs" role="tablist">
			{#each tabs as t (t.key)}
				<button
					role="tab"
					aria-selected={t.key === active}
					class="tab {t.key}"
					class:active={t.key === active}
					onclick={() => (activeKey = t.key)}
				>
					{t.label}
				</button>
			{/each}
		</div>

		<div class="panel">
			{#if active && rendered[active]}
				{@html rendered[active]}
			{:else}
				<pre class="raw"><code>{activeCode}</code></pre>
			{/if}
		</div>

		{#if note}
			<p class="note">{note}</p>
		{/if}
	</aside>
{/if}

<style>
	.fc {
		margin: 1.5em 0;
		border: 1px solid color-mix(in srgb, var(--brand) 30%, var(--border));
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--bg-elevated);
		box-shadow: var(--shadow-sm);
	}
	.fc-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.95rem;
		background: var(--accent-soft);
		border-bottom: 1px solid var(--border);
	}
	.badge {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--brand);
	}
	.task {
		font-size: 0.86rem;
		color: var(--text-muted);
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.5rem 0.7rem 0;
		border-bottom: 1px solid var(--border);
	}
	.tab {
		padding: 0.4rem 0.8rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		background: transparent;
		color: var(--text-muted);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			color 0.15s var(--ease),
			background 0.15s var(--ease);
	}
	.tab:hover {
		color: var(--text);
		background: var(--bg-subtle);
	}
	.tab.active {
		color: var(--text);
		background: var(--bg-code);
		border-color: var(--border);
		border-bottom: 1px solid var(--bg-code);
		margin-bottom: -1px;
	}
	.panel {
		padding: 0;
	}
	.panel :global(.shiki) {
		margin: 0;
		border: none;
		border-radius: 0;
	}
	.panel :global(.shiki .hl-line) {
		display: inline-block;
		width: 100%;
		background: color-mix(in srgb, var(--brand) 12%, transparent);
		box-shadow: inset 3px 0 0 var(--brand);
	}
	.raw {
		margin: 0;
		padding: 1rem 1.1rem;
		overflow-x: auto;
		font-size: 0.84rem;
		background: var(--bg-code);
	}
	.note {
		margin: 0;
		padding: 0.7rem 0.95rem;
		font-size: 0.85rem;
		color: var(--text-muted);
		border-top: 1px solid var(--border);
		background: var(--bg-subtle);
	}
</style>
