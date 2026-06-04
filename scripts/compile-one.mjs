// Compile a single .svx exactly like the build does: mdsvex preprocess -> svelte compile.
// Usage: node scripts/compile-one.mjs <path-to-.svx>
// Prints "OK <file>" (exit 0) or "ERR <file>:<line>:<col> <message>" (exit 1).
import { readFileSync } from 'node:fs';
import { preprocess, compile } from 'svelte/compiler';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from '../mdsvex.config.js';

const file = process.argv[2];
if (!file) {
	console.error('usage: node scripts/compile-one.mjs <file.svx>');
	process.exit(2);
}

const pre = mdsvex(mdsvexConfig);

try {
	const source = readFileSync(file, 'utf8');
	const processed = await preprocess(source, pre, { filename: file });
	compile(processed.code, { filename: file, generate: 'client' });
	console.log(`OK ${file}`);
	process.exit(0);
} catch (err) {
	const pos = err && err.position ? ` (orig pos ${err.position})` : '';
	const loc = err && err.start ? `:${err.start.line}:${err.start.column}` : '';
	console.log(`ERR ${file}${loc} ${err && err.message ? err.message : String(err)}${pos}`);
	process.exit(1);
}
