<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { theme } from '$lib/stores/theme.svelte';

	let { doc = '', oninput }: { doc?: string; oninput?: (v: string) => void } = $props();

	let host: HTMLDivElement;
	// CodeMirror is browser-only and loaded lazily in onMount so it never runs
	// during SSR / prerender.
	let view: import('@codemirror/view').EditorView | undefined;
	let themeComp: import('@codemirror/state').Compartment | undefined;
	let oneDarkExt: unknown = [];

	onMount(async () => {
		const [{ EditorView, basicSetup }, { EditorState, Compartment }, langSvelte, oneDarkMod] =
			await Promise.all([
				import('codemirror'),
				import('@codemirror/state'),
				import('@replit/codemirror-lang-svelte'),
				import('@codemirror/theme-one-dark')
			]);

		oneDarkExt = oneDarkMod.oneDark;
		themeComp = new Compartment();

		const state = EditorState.create({
			doc,
			extensions: [
				basicSetup,
				langSvelte.svelte(),
				themeComp.of(theme.current === 'dark' ? oneDarkMod.oneDark : []),
				EditorView.theme({
					'&': {
						height: '100%',
						fontSize: '13px',
						backgroundColor: 'transparent',
						color: 'var(--text)'
					},
					'.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
					'.cm-gutters': {
						backgroundColor: 'var(--bg-subtle)',
						borderRight: '1px solid var(--border)',
						color: 'var(--text-faint)'
					},
					'.cm-content': { caretColor: 'var(--brand)' },
					'.cm-activeLine': { backgroundColor: 'var(--accent-soft)' },
					'.cm-activeLineGutter': { backgroundColor: 'var(--accent-soft)' }
				}),
				EditorView.updateListener.of((u) => {
					if (u.docChanged) oninput?.(u.state.doc.toString());
				})
			]
		});

		view = new EditorView({ state, parent: host });
	});

	onDestroy(() => view?.destroy());

	$effect(() => {
		const t = theme.current;
		if (view && themeComp) {
			view.dispatch({ effects: themeComp.reconfigure(t === 'dark' ? (oneDarkExt as never) : []) });
		}
	});

	export function setValue(v: string) {
		if (view && v !== view.state.doc.toString()) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
		}
	}
</script>

<div class="editor" bind:this={host}></div>

<style>
	.editor {
		height: 100%;
		overflow: auto;
		background: var(--bg-code);
	}
	.editor :global(.cm-editor) {
		height: 100%;
	}
	.editor :global(.cm-editor.cm-focused) {
		outline: none;
	}
</style>
