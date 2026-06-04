import { createHighlighter } from 'shiki';

const THEMES = { light: 'github-light', dark: 'github-dark' };
const LANGS = [
	'svelte',
	'javascript',
	'typescript',
	'html',
	'css',
	'jsx',
	'tsx',
	'vue',
	'bash',
	'json',
	'svelte'
];

let highlighterPromise;
function getHighlighter() {
	highlighterPromise ??= createHighlighter({
		themes: [THEMES.light, THEMES.dark],
		langs: LANGS
	});
	return highlighterPromise;
}

const ALIAS = { js: 'javascript', ts: 'typescript', shell: 'bash', sh: 'bash' };

// mdsvex calls this for every fenced code block. We return Svelte-safe markup:
// the Shiki HTML wrapped in {@html `...`} (a JS template literal), so backslash,
// backtick and ${ must be escaped — in that order.
async function highlighter(code, lang) {
	const hl = await getHighlighter();
	const resolved = ALIAS[lang] ?? lang ?? 'text';
	const safe = hl.getLoadedLanguages().includes(resolved) ? resolved : 'text';
	const html = hl.codeToHtml(code, {
		lang: safe,
		themes: THEMES,
		defaultColor: 'light'
	});
	const escaped = html
		.replace(/\\/g, '\\\\')
		.replace(/`/g, '\\`')
		.replace(/\$/g, '\\$');
	return `{@html \`${escaped}\`}`;
}

/** @type {import('mdsvex').MdsvexOptions} */
const config = {
	extensions: ['.svx'],
	highlight: { highlighter }
	// No global `layout`: prose-wrapping + frontmatter H1 are handled by the
	// module route (`belajar/[...slug]/+page.svelte`). Avoids mdsvex trying to
	// wrap non-.svx components (e.g. SvelteKit's internal error.svelte).
};

export default config;
