<script lang="ts">
	type Row = { legacy: string; modern: string; note?: string };

	let {
		rows = [],
		legacyLabel = 'Svelte 4 (legacy)',
		modernLabel = 'Svelte 5 (modern)'
	}: { rows?: Row[]; legacyLabel?: string; modernLabel?: string } = $props();
</script>

<div class="lvm-wrap">
	<table class="lvm">
		<thead>
			<tr>
				<th class="legacy-h">{legacyLabel}</th>
				<th class="modern-h">{modernLabel}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.legacy + r.modern)}
				<tr>
					<td><code class="legacy">{r.legacy}</code></td>
					<td>
						<code class="modern">{r.modern}</code>
						{#if r.note}<div class="note">{r.note}</div>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.lvm-wrap {
		overflow-x: auto;
		margin: 1.3em 0;
	}
	.lvm {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
	}
	.lvm th,
	.lvm td {
		border: 1px solid var(--border);
		padding: 0.55em 0.8em;
		text-align: left;
		vertical-align: top;
	}
	.legacy-h {
		background: color-mix(in srgb, var(--danger) 10%, var(--bg-subtle));
	}
	.modern-h {
		background: color-mix(in srgb, var(--ok) 10%, var(--bg-subtle));
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}
	.legacy {
		color: var(--danger);
		text-decoration: line-through;
		text-decoration-color: color-mix(in srgb, var(--danger) 50%, transparent);
	}
	.modern {
		color: var(--ok);
		font-weight: 600;
	}
	.note {
		margin-top: 0.3rem;
		font-size: 0.82rem;
		color: var(--text-muted);
	}
</style>
