import { describe, it, expect, vi } from 'vitest';
import { embedQuery, queryChunks } from '$lib/server/ai/retrieval';

describe('embedQuery', () => {
  it('calls the embed model with the text and returns the first vector', async () => {
    const ai = { run: vi.fn().mockResolvedValue({ shape: [1, 3], data: [[0.1, 0.2, 0.3]] }) };
    const vec = await embedQuery(ai, '@cf/baai/bge-m3', 'apa itu $state');
    expect(vec).toEqual([0.1, 0.2, 0.3]);
    expect(ai.run).toHaveBeenCalledWith('@cf/baai/bge-m3', { text: 'apa itu $state' });
  });
});

describe('queryChunks', () => {
  it('maps Vectorize matches into RetrievedChunk objects with source + text', async () => {
    const index = {
      query: vi.fn().mockResolvedValue({
        count: 1,
        matches: [
          {
            id: 'svelte/runes/state#0',
            score: 0.82,
            metadata: { text: '$state membuat nilai reaktif', slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }
          }
        ]
      })
    };
    const chunks = await queryChunks(index, [0.1, 0.2], 5);
    expect(index.query).toHaveBeenCalledWith([0.1, 0.2], { topK: 5, returnMetadata: 'all' });
    expect(chunks).toEqual([
      {
        id: 'svelte/runes/state#0',
        score: 0.82,
        text: '$state membuat nilai reaktif',
        source: { slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }
      }
    ]);
  });

  it('returns [] when there are no matches', async () => {
    const index = { query: vi.fn().mockResolvedValue({ count: 0, matches: [] }) };
    expect(await queryChunks(index, [0], 5)).toEqual([]);
  });
});
