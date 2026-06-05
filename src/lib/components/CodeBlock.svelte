<script lang="ts">
	import { highlight } from '$lib/highlight';

	let {
		code,
		lang = 'svelte',
		diff = []
	}: { code: string; lang?: string; diff?: number[] } = $props();

	let html = $state('');
	let copied = $state(false);

	$effect(() => {
		let alive = true;
		highlight(code, lang, diff).then((h) => {
			if (alive) html = h;
		});
		return () => (alive = false);
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}
</script>

<div class="codeblock">
	<button class="copy" onclick={copy}>{copied ? '✓ Tersalin' : 'Copy'}</button>
	{#if html}
		{@html html}
	{:else}
		<pre class="raw"><code>{code}</code></pre>
	{/if}
</div>

<style>
	.codeblock {
		position: relative;
		margin: 1.2em 0;
	}
	.copy {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 2;
		padding: 0.3rem 0.6rem;
		font-size: 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		color: var(--text-muted);
		opacity: 0;
		transition: opacity 0.15s var(--ease);
	}
	.codeblock:hover .copy {
		opacity: 1;
	}
	/* Touch devices can't hover — keep the copy button visible there. */
	@media (hover: none) {
		.copy {
			opacity: 1;
		}
	}
	.raw {
		margin: 0;
		padding: 1rem 1.1rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--bg-code);
		overflow-x: auto;
		font-size: 0.86rem;
	}
	.codeblock :global(.shiki .hl-line) {
		display: inline-block;
		width: 100%;
		background: var(--accent-soft);
		box-shadow: inset 3px 0 0 var(--brand);
	}
</style>
