import { describe, it, expect } from 'vitest';
import { parseMessageSegments } from '$lib/chat/segments';

const html = (segs: ReturnType<typeof parseMessageSegments>, i = 0) =>
	(segs[i] as { html: string }).html;

describe('parseMessageSegments', () => {
	it('splits fenced code blocks from prose and captures the language', () => {
		const segs = parseMessageSegments('Pakai rune:\n```svelte\n<script>let n = $state(0)</script>\n```\nselesai.');
		expect(segs[0]).toEqual({ type: 'text', html: '<p>Pakai rune:</p>' });
		expect(segs[1]).toEqual({ type: 'code', code: '<script>let n = $state(0)</script>', lang: 'svelte' });
		expect(segs[2]).toEqual({ type: 'text', html: '<p>selesai.</p>' });
	});

	it('defaults missing fence language to svelte', () => {
		const segs = parseMessageSegments('```\nconst x = 1;\n```');
		expect(segs[0]).toEqual({ type: 'code', code: 'const x = 1;', lang: 'svelte' });
	});

	it('wraps prose in <p>, escapes HTML, and applies inline formatting', () => {
		const segs = parseMessageSegments('untuk <Comp> pakai **bold** dan `kode`');
		expect(html(segs)).toBe('<p>untuk &lt;Comp&gt; pakai <strong>bold</strong> dan <code>kode</code></p>');
	});

	it('renders links with escaped href and target/rel attributes', () => {
		const segs = parseMessageSegments('lihat [docs](/belajar/svelte/runes/state)');
		expect(html(segs)).toBe('<p>lihat <a href="/belajar/svelte/runes/state" target="_blank" rel="noopener">docs</a></p>');
	});

	it('joins single-newline lines within a paragraph with <br>', () => {
		const segs = parseMessageSegments('baris satu\nbaris dua');
		expect(html(segs)).toBe('<p>baris satu<br>baris dua</p>');
	});

	it('renders ATX headings as level-tagged blocks (content kept verbatim, incl. #snippet)', () => {
		expect(html(parseMessageSegments('### Judul'))).toBe('<div class="md-h md-h3">Judul</div>');
		expect(html(parseMessageSegments('#### Contoh Penggunaan #snippet'))).toBe(
			'<div class="md-h md-h4">Contoh Penggunaan #snippet</div>'
		);
	});

	it('renders unordered lists', () => {
		expect(html(parseMessageSegments('- satu\n- dua'))).toBe('<ul><li>satu</li><li>dua</li></ul>');
	});

	it('renders ordered lists', () => {
		expect(html(parseMessageSegments('1. satu\n2. dua'))).toBe('<ol><li>satu</li><li>dua</li></ol>');
	});

	it('handles mixed paragraph + heading + list blocks in order', () => {
		const segs = parseMessageSegments('Intro\n\n### Bagian\n- a\n- b');
		expect(html(segs)).toBe('<p>Intro</p><div class="md-h md-h3">Bagian</div><ul><li>a</li><li>b</li></ul>');
	});

	it('applies inline formatting inside list items and headings', () => {
		expect(html(parseMessageSegments('1. **Tujuan**: pakai `$state`'))).toBe(
			'<ol><li><strong>Tujuan</strong>: pakai <code>$state</code></li></ol>'
		);
	});

	it('returns an empty array for empty input', () => {
		expect(parseMessageSegments('')).toEqual([]);
	});
});
