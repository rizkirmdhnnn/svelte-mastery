// scripts/check-coverage.mjs — fails (exit 1) if any official page lacks a
// built module. Run after gen-manifest. The Definition-of-Done gate.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PAGES, slugOf } from './pages.data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = readFileSync(join(root, 'src/lib/modules.generated.ts'), 'utf8');

const missing = [];
for (const p of PAGES) {
	const slug = slugOf(p);
	const file = join(root, 'src/lib/content', slug + '.svx');
	const inManifest = manifest.includes(`"slug": "${slug}"`);
	if (!existsSync(file) || !inManifest) missing.push(slug);
}

const by = (t) => PAGES.filter((p) => p.product === t).length;
const byDone = (t) =>
	PAGES.filter((p) => p.product === t && !missing.includes(slugOf(p))).length;
console.log(
	`Coverage: ${PAGES.length - missing.length}/${PAGES.length} ` +
		`(svelte ${byDone('svelte')}/${by('svelte')}, kit ${byDone('kit')}/${by('kit')}, cli ${byDone('cli')}/${by('cli')})`
);
if (missing.length) {
	console.error('MISSING:\n' + missing.map((s) => '  - ' + s).join('\n'));
	process.exit(1);
}
console.log('✓ All official pages covered.');
