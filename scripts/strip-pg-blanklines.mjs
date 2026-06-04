// Removes whitespace-only lines INSIDE component prop template literals
// (name={`...`}) across .svx modules. Blank lines there make mdsvex end the HTML
// block and wrap following lines in <p>, corrupting Playground/FrameworkCompare
// code so the in-browser compiler fails. Code stays valid Svelte without them.
//
// Span = from `={\`` to the next unescaped backtick. Assumes no backticks inside
// the code (the authoring rules forbid them). Run: node scripts/strip-pg-blanklines.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'src/lib/content');

function walk(d) {
	const out = [];
	for (const n of readdirSync(d)) {
		const f = join(d, n);
		if (statSync(f).isDirectory()) out.push(...walk(f));
		else if (n.endsWith('.svx')) out.push(f);
	}
	return out;
}

function strip(text) {
	let out = '';
	let i = 0;
	const n = text.length;
	let removed = 0;
	while (i < n) {
		// detect start of a prop template literal: = { ` (allowing spaces)
		if (text[i] === '=' && text[i + 1] === '{' && text[i + 2] === '`') {
			const litStart = i + 3;
			// find closing backtick (unescaped)
			let k = litStart;
			while (k < n) {
				if (text[k] === '\\') {
					k += 2;
					continue;
				}
				if (text[k] === '`') break;
				k++;
			}
			let lit = text.slice(litStart, k);
			// drop whitespace-only lines
			const before = lit.split('\n').length;
			lit = lit
				.split('\n')
				.filter((line) => line.trim() !== '')
				.join('\n');
			removed += before - lit.split('\n').length;
			out += '={`' + lit;
			i = k; // leave the closing backtick for next iteration
			continue;
		}
		out += text[i];
		i++;
	}
	return { out, removed };
}

let totalRemoved = 0;
for (const file of walk(dir)) {
	const src = readFileSync(file, 'utf8');
	const { out, removed } = strip(src);
	if (removed > 0) {
		writeFileSync(file, out);
		totalRemoved += removed;
		console.log(`${relative(dir, file)}: removed ${removed} blank line(s)`);
	}
}
console.log(`[strip] total blank lines removed: ${totalRemoved}`);
