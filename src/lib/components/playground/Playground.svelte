<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Editor from './Editor.svelte';
	import Preview from './Preview.svelte';
	import { makeIframeDoc } from './make-srcdoc';

	let { code = '', height = 340 }: { code?: string; height?: number } = $props();

	let srcdoc = $state('');
	let status = $state<'idle' | 'compiling' | 'error'>('compiling');
	let compileError = $state<string | null>(null);

	let worker: Worker | undefined;
	let editorRef: ReturnType<typeof Editor> | undefined;
	let reqId = 0;
	let revokePrev: (() => void) | null = null;
	let debounce: ReturnType<typeof setTimeout> | undefined;

	function compile(source: string) {
		if (!worker) return;
		status = 'compiling';
		const id = ++reqId;
		worker.postMessage({ id, source });
	}

	function onWorkerMessage(e: MessageEvent) {
		const d = e.data;
		if (d.id !== reqId) return; // ignore stale results
		if (d.ok) {
			compileError = null;
			revokePrev?.();
			const { srcdoc: doc, revoke } = makeIframeDoc(d.code, d.version);
			revokePrev = revoke;
			srcdoc = doc;
			status = 'idle';
		} else {
			compileError = d.error;
			status = 'error';
		}
	}

	onMount(() => {
		worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = onWorkerMessage;
		compile(code);
	});

	onDestroy(() => {
		worker?.terminate();
		revokePrev?.();
		clearTimeout(debounce);
	});

	function handleInput(v: string) {
		clearTimeout(debounce);
		debounce = setTimeout(() => compile(v), 300);
	}

	function reset() {
		editorRef?.setValue(code);
		compile(code);
	}
</script>

<div class="pg" style="--pg-h: {height}px">
	<div class="bar">
		<span class="dot {status}" aria-hidden="true"></span>
		<span class="title">Playground</span>
		<span class="status">
			{status === 'compiling' ? 'meng-compile…' : status === 'error' ? 'error' : 'live'}
		</span>
		<button class="reset" onclick={reset} title="Kembalikan kode awal">↺ Reset</button>
	</div>

	<div class="panes">
		<div class="pane editor-pane">
			<Editor bind:this={editorRef} doc={code} oninput={handleInput} />
		</div>
		<div class="pane preview-pane">
			{#if compileError}
				<pre class="compile-error">❌ Compile error:
{compileError}</pre>
			{:else}
				<Preview {srcdoc} />
			{/if}
		</div>
	</div>
</div>

<style>
	.pg {
		margin: 1.4em 0;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--bg-elevated);
		box-shadow: var(--shadow-sm);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid var(--border);
		background: var(--bg-subtle);
		font-size: 0.82rem;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--ok);
	}
	.dot.compiling {
		background: var(--warn);
	}
	.dot.error {
		background: var(--danger);
	}
	.title {
		font-weight: 700;
	}
	.status {
		color: var(--text-muted);
	}
	.reset {
		margin-left: auto;
		padding: 0.25rem 0.6rem;
		font-size: 0.78rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		color: var(--text);
	}
	.reset:hover {
		background: var(--bg-inset);
	}
	.panes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: var(--pg-h);
	}
	.pane {
		min-width: 0;
		overflow: hidden;
	}
	.editor-pane {
		border-right: 1px solid var(--border);
	}
	.compile-error {
		margin: 0;
		padding: 1rem;
		height: 100%;
		overflow: auto;
		color: var(--danger);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		white-space: pre-wrap;
	}
	@media (max-width: 720px) {
		.panes {
			grid-template-columns: 1fr;
			height: auto;
		}
		.editor-pane {
			border-right: none;
			border-bottom: 1px solid var(--border);
			height: var(--pg-h);
		}
		.preview-pane {
			height: var(--pg-h);
		}
	}
</style>
