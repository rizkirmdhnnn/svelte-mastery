<script lang="ts">
	import CodeBlock from './CodeBlock.svelte';

	let count = $state(0);

	// Real Svelte snippet shown beside the working button. The `<\/script>`
	// escape keeps this string from closing THIS component's script tag.
	const snippet = `<script>
  let count = $state(0);
<\/script>

<button onclick={() => count++}>
  Klik: {count}
</button>`;
</script>

<div class="hero-demo">
	<div class="hd-code">
		<CodeBlock code={snippet} lang="svelte" />
	</div>
	<div class="hd-preview">
		<span class="hd-tag">▶ live preview</span>
		<button class="hd-counter" onclick={() => count++}>Klik: {count}</button>
		<span class="hd-hint">Coba klik — reaktif, tanpa setter.</span>
	</div>
</div>

<style>
	.hero-demo {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.hd-code :global(.codeblock) {
		margin: 0;
	}
	.hd-preview {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.7rem;
		padding: 1.1rem 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-subtle);
	}
	.hd-tag {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
	}
	.hd-counter {
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--brand-ink);
		background: var(--brand);
		border: none;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-sm);
		box-shadow: 0 4px 12px rgba(255, 62, 0, 0.22);
		transition: transform 0.12s var(--ease), background 0.15s var(--ease);
	}
	.hd-counter:hover {
		background: var(--brand-2);
		transform: translateY(-1px);
	}
	.hd-counter:active {
		transform: translateY(0) scale(0.97);
	}
	.hd-hint {
		font-size: 0.82rem;
		color: var(--text-muted);
	}
</style>
