// Detects STRAY live `{expr}` expressions in .svx prose/markup that compile fine
// but throw ReferenceError at SSR/render time (e.g. `{expr}`, `{data}` written as
// illustrative text). These must be escaped (&#123;..&#125;) or fenced.
//
// A `{` is a HAZARD when, outside fenced code:
//   - it is in TEXT position (the previous non-space char is NOT `=`, i.e. not an
//     attribute value like name={...}), AND
//   - it is NOT a block/tag opener `{#`, `{/`, `{:`, `{@`.
// Attribute expressions (name={...}, including code={`...`}) and fenced code are
// skipped wholesale (their braces are legitimate).
//
// Usage: node scripts/lint-svx.mjs <file.svx>   -> prints hazards, exit 1 if any.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const text = readFileSync(file, 'utf8');
const n = text.length;

function lineAt(idx) {
	let l = 1;
	for (let k = 0; k < idx && k < n; k++) if (text[k] === '\n') l++;
	return l;
}

// Skip a balanced {...} starting at index of `{`; respects nested braces and
// '..', "..", `..` strings (with ${} inside template literals). Returns index
// just AFTER the matching `}`.
function skipBraces(start) {
	let depth = 0;
	for (let k = start; k < n; k++) {
		const c = text[k];
		if (c === "'" || c === '"') {
			const q = c;
			k++;
			while (k < n && text[k] !== q) {
				if (text[k] === '\\') k++;
				k++;
			}
		} else if (c === '`') {
			k++;
			while (k < n && text[k] !== '`') {
				if (text[k] === '\\') k++;
				else if (text[k] === '$' && text[k + 1] === '{') {
					// nested template-literal expression
					let d2 = 0;
					k++; // at {
					for (; k < n; k++) {
						if (text[k] === '{') d2++;
						else if (text[k] === '}') {
							d2--;
							if (d2 === 0) break;
						}
					}
				}
				k++;
			}
		} else if (c === '{') depth++;
		else if (c === '}') {
			depth--;
			if (depth === 0) return k + 1;
		}
	}
	return n;
}

const hazards = [];
let inFence = false;
let i = 0;
while (i < n) {
	// fence detection at line start (ignore leading whitespace — fences can be indented)
	if (i === 0 || text[i - 1] === '\n') {
		let j = i;
		while (j < n && (text[j] === ' ' || text[j] === '\t')) j++;
		if (text.slice(j, j + 3) === '```') {
			inFence = !inFence;
			const nl = text.indexOf('\n', j);
			i = nl === -1 ? n : nl + 1;
			continue;
		}
	}
	if (inFence) {
		i++;
		continue;
	}
	const c = text[i];
	// Skip markdown inline-code spans (`code`, ``code``): mdsvex escapes their
	// braces, so `{count}` inside backticks is SAFE. Attribute template literals
	// (name={`...`}) are already skipped via the prev==='=' branch below.
	if (c === '`') {
		let run = 0;
		let k = i;
		while (k < n && text[k] === '`') {
			run++;
			k++;
		}
		const close = text.indexOf('`'.repeat(run), k);
		i = close === -1 ? n : close + run;
		continue;
	}
	if (c === '{') {
		// previous non-space char
		let p = i - 1;
		while (p >= 0 && (text[p] === ' ' || text[p] === '\t')) p--;
		const prev = p >= 0 ? text[p] : '';
		const next = text[i + 1] ?? '';
		if (prev === '=') {
			// attribute expression — skip wholesale
			i = skipBraces(i);
			continue;
		}
		if (next === '#' || next === '/' || next === ':' || next === '@') {
			// block/tag opener — skip just this tag
			i = skipBraces(i);
			continue;
		}
		// string-literal expression like {'...'} / {`...`} / {"..."} renders literally — safe
		let q = i + 1;
		while (q < n && (text[q] === ' ' || text[q] === '\t')) q++;
		if (text[q] === "'" || text[q] === '"' || text[q] === '`') {
			i = skipBraces(i);
			continue;
		}
		// text-position expression referencing identifiers -> HAZARD (ReferenceError at render)
		const end = skipBraces(i);
		const snippet = text.slice(i, Math.min(end, i + 40)).replace(/\s+/g, ' ');
		hazards.push({ line: lineAt(i), snippet });
		i = end;
		continue;
	}
	i++;
}

if (hazards.length) {
	for (const h of hazards) console.log(`HAZARD ${file}:${h.line}  ${h.snippet}`);
	process.exit(1);
} else {
	console.log(`CLEAN ${file}`);
	process.exit(0);
}
