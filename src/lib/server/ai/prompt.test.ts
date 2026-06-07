import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, dedupeSources } from '$lib/server/ai/prompt';
import type { RetrievedChunk } from '$lib/server/ai/retrieval';

const chunk = (slug: string, text: string): RetrievedChunk => ({
  id: slug + '#0',
  score: 0.9,
  text,
  source: { slug, title: slug.split('/').at(-1)!, product: slug.split('/')[0], section: 'x' }
});

describe('buildSystemPrompt', () => {
  it('includes the Svelte-5 guardrails and the retrieved context with slugs', () => {
    const sys = buildSystemPrompt({
      chunks: [chunk('svelte/runes/state', '$state bikin reaktif')],
      currentLesson: { slug: 'svelte/runes/derived', title: '$derived' }
    });
    expect(sys).toContain('Svelte 5'); // runes-first rule
    expect(sys).toContain('$state bikin reaktif'); // context injected
    expect(sys).toContain('svelte/runes/state'); // source tag for grounding
    expect(sys).toContain('svelte/runes/derived'); // current lesson hint
    expect(sys.toLowerCase()).toContain('bahasa indonesia'); // language rule
  });

  it('states clearly when no context was found', () => {
    const sys = buildSystemPrompt({ chunks: [], currentLesson: null });
    expect(sys.toLowerCase()).toContain('tidak ada konteks');
  });
});

describe('dedupeSources', () => {
  it('dedupes by slug, preserving first occurrence order', () => {
    const sources = dedupeSources([
      chunk('a/b/c', '1'),
      chunk('a/b/c', '2'),
      chunk('d/e/f', '3')
    ]);
    expect(sources.map((s) => s.slug)).toEqual(['a/b/c', 'd/e/f']);
  });
});
