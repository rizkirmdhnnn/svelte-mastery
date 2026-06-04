// Lazy, browser-side Shiki for component-driven code (FrameworkCompare, CodeBlock).
// Fenced code inside `.svx` is highlighted at build time by mdsvex; this is only
// for code passed as props. We use the *core* bundle + the JavaScript regex engine
// (no Oniguruma wasm) and load only the langs we need, keeping the lazy client
// chunk small.
import type { HighlighterCore } from 'shiki/core';

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
	highlighterPromise ??= (async () => {
		const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
			import('shiki/core'),
			import('shiki/engine/javascript')
		]);
		return createHighlighterCore({
			themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
			langs: [
				import('shiki/langs/svelte.mjs'),
				import('shiki/langs/tsx.mjs'),
				import('shiki/langs/jsx.mjs'),
				import('shiki/langs/vue.mjs'),
				import('shiki/langs/typescript.mjs'),
				import('shiki/langs/javascript.mjs'),
				import('shiki/langs/bash.mjs'),
				import('shiki/langs/css.mjs'),
				import('shiki/langs/html.mjs')
			],
			engine: createJavaScriptRegexEngine({ forgiving: true })
		});
	})();
	return highlighterPromise;
}

/** Highlight `code` to dual-theme HTML; optionally add `.hl-line` to 1-based `diff` lines. */
export async function highlight(code: string, lang: string, diff: number[] = []): Promise<string> {
	const hl = await getHighlighter();
	const safe = hl.getLoadedLanguages().includes(lang) ? lang : 'text';
	return hl.codeToHtml(code, {
		lang: safe,
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: 'light',
		transformers: diff.length
			? [
					{
						line(node, line) {
							if (diff.includes(line)) this.addClassToHast(node, 'hl-line');
						}
					}
				]
			: []
	});
}
