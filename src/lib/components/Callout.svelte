<script lang="ts">
	type CalloutType = 'info' | 'tip' | 'warning' | 'pitfall' | 'legacy';

	let {
		type = 'info',
		title,
		children
	}: { type?: CalloutType; title?: string; children: any } = $props();

	const META: Record<CalloutType, { icon: string; label: string }> = {
		info: { icon: 'ℹ️', label: 'Info' },
		tip: { icon: '💡', label: 'Tip' },
		warning: { icon: '⚠️', label: 'Perhatian' },
		pitfall: { icon: '🕳️', label: 'Jebakan Umum' },
		legacy: { icon: '🕰️', label: 'Legacy / Deprecated' }
	};
</script>

<aside class="callout {type}">
	<div class="head">
		<span class="ic" aria-hidden="true">{META[type].icon}</span>
		<strong>{title ?? META[type].label}</strong>
	</div>
	<div class="body">{@render children()}</div>
</aside>

<style>
	.callout {
		--c: var(--info);
		margin: 1.3em 0;
		border: 1px solid color-mix(in srgb, var(--c) 35%, var(--border));
		border-left: 4px solid var(--c);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--c) 7%, var(--bg-elevated));
		padding: 0.85rem 1.05rem;
	}
	.info {
		--c: var(--info);
	}
	.tip {
		--c: var(--ok);
	}
	.warning {
		--c: var(--warn);
	}
	.pitfall {
		--c: var(--danger);
	}
	.legacy {
		--c: var(--text-faint);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--c);
		margin-bottom: 0.35rem;
		font-size: 0.95rem;
	}
	.legacy .head {
		color: var(--text-muted);
	}
	.ic {
		font-size: 1.05rem;
	}
	.body :global(p:first-child) {
		margin-top: 0;
	}
	.body :global(p:last-child) {
		margin-bottom: 0;
	}
	.body :global(code) {
		background: var(--bg-inset);
		padding: 0.1em 0.35em;
		border-radius: 4px;
	}
</style>
