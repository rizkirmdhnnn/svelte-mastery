import { describe, it, expect } from 'vitest';
import { parseMessageSegments } from '$lib/chat/segments';

describe('parseMessageSegments', () => {
  it('splits fenced code blocks from prose and captures the language', () => {
    const segs = parseMessageSegments('Pakai rune:\n```svelte\n<script>let n = $state(0)</script>\n```\nselesai.');
    expect(segs[0]).toEqual({ type: 'text', html: 'Pakai rune:' });
    expect(segs[1]).toEqual({ type: 'code', code: '<script>let n = $state(0)</script>', lang: 'svelte' });
    expect(segs[2]).toEqual({ type: 'text', html: 'selesai.' });
  });

  it('defaults missing fence language to svelte', () => {
    const segs = parseMessageSegments('```\nconst x = 1;\n```');
    expect(segs[0]).toEqual({ type: 'code', code: 'const x = 1;', lang: 'svelte' });
  });

  it('escapes HTML in prose before applying inline formatting', () => {
    const [seg] = parseMessageSegments('untuk <Comp> pakai **bold** dan `kode`');
    expect(seg).toEqual({
      type: 'text',
      html: 'untuk &lt;Comp&gt; pakai <strong>bold</strong> dan <code>kode</code>'
    });
  });

  it('renders links with escaped href and target/rel attributes', () => {
    const [seg] = parseMessageSegments('lihat [docs](/belajar/svelte/runes/state)');
    expect(seg.type).toBe('text');
    expect((seg as { html: string }).html).toBe(
      'lihat <a href="/belajar/svelte/runes/state" target="_blank" rel="noopener">docs</a>'
    );
  });

  it('converts newlines in prose to <br>', () => {
    const [seg] = parseMessageSegments('baris satu\nbaris dua');
    expect((seg as { html: string }).html).toBe('baris satu<br>baris dua');
  });

  it('returns an empty array for empty input', () => {
    expect(parseMessageSegments('')).toEqual([]);
  });
});
