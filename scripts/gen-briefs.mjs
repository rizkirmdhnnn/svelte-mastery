// scripts/gen-briefs.mjs — injects BRIEFS (from pages.data.mjs) into the
// authoring workflow between // <BRIEFS-START> and // <BRIEFS-END>.
// The Workflow engine sandbox can't import files, so we inline the data.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PAGES, slugOf } from './pages.data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const wf = join(root, 'scripts/author-modules.workflow.js');

const briefs = PAGES.map((p) => ({
	slug: slugOf(p),
	path: `src/lib/content/${slugOf(p)}.svx`,
	product: p.product,
	section: p.section,
	sectionTitle: p.sectionTitle,
	sectionOrder: p.sectionOrder,
	order: p.order,
	title: p.title,
	status: p.status,
	docs: p.docs,
	seed: p.seed,
	analogy: p.analogy ?? null,
	compare: p.compare ?? null,
	cover: p.cover,
	playground: p.playground
}));

const src = readFileSync(wf, 'utf8');
const start = src.indexOf('// <BRIEFS-START>');
const end = src.indexOf('// <BRIEFS-END>');
if (start === -1 || end === -1) throw new Error('BRIEFS markers not found in workflow');
const next =
	src.slice(0, start) +
	'// <BRIEFS-START>\nconst BRIEFS = ' +
	JSON.stringify(briefs, null, '\t') +
	';\n' +
	src.slice(end);
writeFileSync(wf, next);
console.log(`[gen-briefs] injected ${briefs.length} briefs → scripts/author-modules.workflow.js`);
