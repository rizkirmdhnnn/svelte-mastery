import { describe, it, expect } from 'vitest';
import { chunkSvx, stripSvxBody } from '../lib/chunk.mjs';

const meta = { slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' };

describe('stripSvxBody', () => {
  it('removes <script>/<style> blocks and import lines', () => {
    const out = stripSvxBody('<script>\nimport X from "x";\n</script>\n\n## Judul\nisi teks');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('import X');
    expect(out).toContain('## Judul');
    expect(out).toContain('isi teks');
  });
});

describe('chunkSvx', () => {
  it('creates one chunk per ## section, each prefixed with title + heading', () => {
    const body = '## Apa itu\n$state bikin reaktif.\n\n## Contoh\nlet n = $state(0)';
    const chunks = chunkSvx(meta, body, 4000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe('svelte/runes/state#0');
    expect(chunks[0].metadata).toMatchObject({ slug: meta.slug, title: '$state', product: 'svelte', section: 'runes' });
    expect(chunks[0].text).toContain('# $state');
    expect(chunks[0].text).toContain('## Apa itu');
    expect(chunks[0].text).toContain('$state bikin reaktif');
    expect(chunks[1].text).toContain('## Contoh');
  });

  it('captures intro text before the first ## as its own chunk', () => {
    const chunks = chunkSvx(meta, 'kalimat pembuka\n\n## Bagian\nisi', 4000);
    expect(chunks[0].text).toContain('kalimat pembuka');
    expect(chunks[0].id).toBe('svelte/runes/state#0');
  });

  it('splits a section longer than maxChars into multiple chunks', () => {
    const long = 'x'.repeat(50) + '\n\n' + 'y'.repeat(50) + '\n\n' + 'z'.repeat(50);
    const chunks = chunkSvx(meta, '## Besar\n' + long, 80);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(80 + 60)); // + prefix headroom
  });

  it('drops empty sections', () => {
    const chunks = chunkSvx(meta, '## Kosong\n\n## Isi\nada', 4000);
    expect(chunks.every((c) => c.text.trim().length > 0)).toBe(true);
    expect(chunks.some((c) => c.text.includes('ada'))).toBe(true);
  });

  it('hard-splits a single oversized paragraph that has no blank lines', () => {
    const huge = 'a'.repeat(500); // one paragraph, no \n\n boundaries to split on
    const chunks = chunkSvx(meta, '## Besar\n' + huge, 100);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(100 + 60)); // + prefix headroom
  });
});
