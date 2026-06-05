<script lang="ts">
	let { href, label = 'Baca di dokumentasi resmi' }: { href: string; label?: string } = $props();
</script>

<a class="docs-link" {href} target="_blank" rel="noopener noreferrer">
	<span class="ic" aria-hidden="true">📄</span>
	<span>{label}</span>
	<span class="ext" aria-hidden="true">↗</span>
</a>

<style>
	.docs-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 1em 0;
		padding: 0.6rem 0.95rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--accent-soft);
		color: var(--link);
		font-weight: 600;
		font-size: 0.92rem;
		text-decoration: none;
		transition:
			border-color 0.15s var(--ease),
			background 0.15s var(--ease),
			transform 0.15s var(--ease);
	}
	.docs-link:hover {
		border-color: var(--brand);
		background: var(--bg-subtle);
		transform: translateY(-1px);
		text-decoration: none;
	}
	.ext {
		opacity: 0.7;
		font-size: 0.85em;
		transition: transform 0.15s var(--ease);
	}
	.docs-link:hover .ext {
		transform: translate(1px, -1px);
	}
</style>
