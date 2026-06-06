<script lang="ts">
	import type { Status } from '$lib/content';
	let { status }: { status: Status } = $props();
	const LABEL: Record<Status, string> = {
		stable: 'Stable',
		legacy: 'Legacy',
		reference: 'Reference'
	};
</script>

<span class="badge {status}">{LABEL[status]}</span>

<style>
	.badge {
		display: inline-block;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		padding: 0.12rem 0.4rem;
		border-radius: 5px;
		border: 1px solid transparent;
		white-space: nowrap;
		line-height: 1.3;
	}
	.stable {
		color: var(--ok, #1a7f37);
		background: color-mix(in srgb, var(--ok, #1a7f37) 14%, transparent);
	}
	.legacy {
		color: #b25f00;
		background: color-mix(in srgb, #b25f00 16%, transparent);
	}
	.reference {
		color: var(--brand);
		background: var(--accent-soft);
	}
</style>
