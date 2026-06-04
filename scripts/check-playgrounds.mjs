// Verifies every <Playground code={`...`} /> compiles AND that no component prop
// template literal got corrupted by mdsvex (smart quotes, <p> injection). Runs
// mdsvex preprocessing (the step that previously corrupted code), extracts the
// template-literal prop values from the OUTPUT, and svelte-compiles the Playground
// ones. Run: node scripts/check-playgrounds.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from '../mdsvex.config.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'src/lib/content');
const pre = mdsvex(mdsvexConfig);

function walk(d) {
	const out = [];
	for (const n of readdirSync(d)) {
		const f = join(d, n);
		if (statSync(f).isDirectory()) out.push(...walk(f));
		else if (n.endsWith('.svx') && !n.startsWith('_')) out.push(f);
	}
	return out;
}

// Extract all `name={`...`}` template-literal prop values from processed markup.
function extractPropLiterals(text) {
	const found = [];
	let i = 0;
	const n = text.length;
	while (i < n) {
		// match <ident>={`
		if (text[i] === '=' && text[i + 1] === '{' && text[i + 2] === '`') {
			// the prop name precedes the '='
			let p = i - 1;
			let name = '';
			while (p >= 0 && /[a-zA-Z]/.test(text[p])) {
				name = text[p] + name;
				p--;
			}
			const start = i + 3;
			let k = start;
			while (k < n) {
				if (text[k] === '\\') {
					k += 2;
					continue;
				}
				if (text[k] === '`') break;
				k++;
			}
			found.push({ name, code: text.slice(start, k) });
			i = k + 1;
			continue;
		}
		i++;
	}
	return found;
}

const SMART = /[‘’“”]/; // curly single/double quotes only
let problems = 0;

for (const file of walk(dir)) {
	const rel = relative(dir, file);
	let processed;
	try {
		const res = await pre.markup({ content: readFileSync(file, 'utf8'), filename: file });
		processed = res ? res.code : '';
	} catch (e) {
		console.log(`PREPROCESS-FAIL ${rel}: ${e.message}`);
		problems++;
		continue;
	}
	const lits = extractPropLiterals(processed);
	for (const { name, code } of lits) {
		// corruption signatures
		if (SMART.test(code)) {
			console.log(`SMARTQUOTE ${rel} (${name}=)`);
			problems++;
		}
		// Playground code must compile as a Svelte component
		if (name === 'code') {
			try {
				compile(code, { generate: 'client', dev: false, runes: true });
			} catch (e) {
				console.log(`PG-COMPILE-FAIL ${rel}: ${e.message}`);
				problems++;
			}
		}
	}
}

console.log(problems === 0 ? '\n[check-playgrounds] ALL CLEAN ✓' : `\n[check-playgrounds] ${problems} problem(s)`);
process.exit(problems === 0 ? 0 : 1);
