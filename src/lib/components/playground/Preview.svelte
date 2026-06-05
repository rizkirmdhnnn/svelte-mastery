<script lang="ts">
	type LogEntry = { level: string; text: string };

	let { srcdoc = '' }: { srcdoc?: string } = $props();

	let logs = $state<LogEntry[]>([]);
	let runtimeError = $state<string | null>(null);
	let showConsole = $state(false);

	function onMessage(e: MessageEvent) {
		const d = e.data;
		if (!d || d.source !== 'pg') return;
		if (d.type === 'console') {
			logs = [...logs, { level: d.payload.level, text: d.payload.args.join(' ') }].slice(-100);
		} else if (d.type === 'error') {
			runtimeError = d.payload.message;
		} else if (d.type === 'ready') {
			runtimeError = null;
		}
	}

	// New compile output → reset console + error state.
	$effect(() => {
		srcdoc;
		logs = [];
		runtimeError = null;
	});
</script>

<svelte:window onmessage={onMessage} />

<div class="preview">
	<iframe title="Live preview" sandbox="allow-scripts allow-same-origin" {srcdoc}></iframe>

	{#if runtimeError}
		<pre class="overlay error">⚠️ {runtimeError}</pre>
	{/if}

	<div class="console" class:open={showConsole}>
		<button class="console-toggle" onclick={() => (showConsole = !showConsole)}>
			{showConsole ? '▾' : '▸'} Console{logs.length ? ` (${logs.length})` : ''}
		</button>
		{#if showConsole}
			<div class="logs">
				{#each logs as l, i (i)}
					<div class="log {l.level}">{l.text}</div>
				{:else}
					<div class="log empty">— belum ada output —</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.preview {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}
	iframe {
		flex: 1;
		width: 100%;
		border: none;
		/* The iframe document paints its own themed background (see
		   make-srcdoc); match the app surface to avoid a flash on (re)load. */
		background: var(--bg);
		color-scheme: light dark;
	}
	.overlay.error {
		position: absolute;
		inset: 0.5rem 0.5rem auto 0.5rem;
		margin: 0;
		padding: 0.6rem 0.8rem;
		background: color-mix(in srgb, var(--danger) 12%, var(--bg-elevated));
		border: 1px solid var(--danger);
		border-radius: var(--radius-sm);
		color: var(--danger);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		white-space: pre-wrap;
		max-height: 60%;
		overflow: auto;
	}
	.console {
		border-top: 1px solid var(--border);
		background: var(--bg-elevated);
		font-size: 0.78rem;
	}
	.console-toggle {
		width: 100%;
		text-align: left;
		padding: 0.35rem 0.7rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-weight: 600;
		font-family: var(--font-mono);
	}
	.logs {
		max-height: 110px;
		overflow: auto;
		padding: 0.25rem 0.7rem 0.5rem;
	}
	.log {
		font-family: var(--font-mono);
		padding: 0.1rem 0;
		border-bottom: 1px solid var(--border);
		white-space: pre-wrap;
		word-break: break-word;
	}
	.log.warn {
		color: var(--warn);
	}
	.log.error {
		color: var(--danger);
	}
	.log.empty {
		color: var(--text-faint);
		border: none;
	}
</style>
