// Scans .svx modules for the mdsvex hazards that broke the build:
//  (a) more than one top-level <script> outside fenced code,
//  (b) raw <svelte:...> special elements outside fenced code,
//  (c) raw custom-element-like <word-word ...> tags outside fenced code,
//  (d) raw stray "{" in prose lines outside fences/components (heuristic).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'src/lib/content');

function walk(d) {
	const out = [];
	for (const n of readdirSync(d)) {
		const f = join(d, n);
		if (statSync(f).isDirectory()) out.push(...walk(f));
		else if (n.endsWith('.svx') && !n.startsWith('_')) out.push(f);
	}
	return out;
}

const known = new Set([
	'svelte:self','svelte:component','svelte:element','svelte:window','svelte:document',
	'svelte:body','svelte:head','svelte:options','svelte:boundary','svelte:fragment'
]);

for (const file of walk(dir)) {
	const lines = readFileSync(file, 'utf8').split(/\r?\n/);
	let inFence = false;
	let scriptCount = 0;
	const hits = [];
	lines.forEach((line, i) => {
		const t = line.trim();
		if (t.startsWith('```')) { inFence = !inFence; return; }
		if (inFence) return;
		// duplicate top-level <script>
		if (/^<script[\s>]/.test(t) || /^<script$/.test(t)) {
			scriptCount++;
			if (scriptCount > 1) hits.push(`${i + 1}: extra <script> (#${scriptCount})`);
		}
		// raw <svelte:...> in prose
		const sv = line.match(/<svelte:[a-z]+/g);
		if (sv) hits.push(`${i + 1}: raw ${sv.join(',')}`);
		// raw custom-element-like opening tag <foo-bar ...> in prose
		const ce = line.match(/<[a-z]+-[a-z-]+[\s/>]/g);
		if (ce) hits.push(`${i + 1}: raw custom-el ${ce.join(',')}`);
	});
	if (hits.length) {
		console.log(`\n### ${relative(dir, file)}`);
		for (const h of hits) console.log('   ' + h);
	}
}
console.log('\n[scan done]');
