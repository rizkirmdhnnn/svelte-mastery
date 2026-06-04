<script lang="ts">
	let {
		title = 'Latihan',
		children,
		solution
	}: { title?: string; children: any; solution?: any } = $props();

	let open = $state(false);
</script>

<section class="exercise">
	<header class="ex-head">
		<span aria-hidden="true">🎯</span>
		<h4>{title}</h4>
	</header>

	<div class="prompt">{@render children()}</div>

	{#if solution}
		<button class="reveal" onclick={() => (open = !open)} aria-expanded={open}>
			{open ? '▾ Sembunyikan Solusi' : '▸ Lihat Solusi'}
		</button>
		{#if open}
			<div class="solution">{@render solution()}</div>
		{/if}
	{/if}
</section>

<style>
	.exercise {
		margin: 1.5em 0;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
		padding: 1rem 1.15rem;
		background: var(--bg-subtle);
	}
	.ex-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.ex-head h4 {
		margin: 0;
		font-size: 1.05rem;
	}
	.prompt :global(p:first-child) {
		margin-top: 0;
	}
	.reveal {
		margin-top: 0.6rem;
		padding: 0.45rem 0.85rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		color: var(--text);
		font-weight: 600;
		font-size: 0.88rem;
	}
	.reveal:hover {
		background: var(--bg-inset);
	}
	.solution {
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
	}
</style>
