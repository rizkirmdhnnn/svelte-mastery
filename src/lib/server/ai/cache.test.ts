import { describe, it, expect } from 'vitest';
import { cacheKey, getCached, putCached } from '$lib/server/ai/cache';
import type { ChatSource } from '$lib/chat/types';

function fakeKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); }
  };
}

describe('cacheKey', () => {
  it('normalizes case/whitespace so equivalent questions share a key', () => {
    expect(cacheKey('  Apa  itu   $STATE? ')).toBe(cacheKey('apa itu $state?'));
  });
  it('produces a cache:-prefixed key', () => {
    expect(cacheKey('halo').startsWith('cache:')).toBe(true);
  });
  it('different questions produce different keys', () => {
    expect(cacheKey('a')).not.toBe(cacheKey('b'));
  });
});

describe('get/putCached', () => {
  it('round-trips text + sources', async () => {
    const kv = fakeKV();
    const sources: ChatSource[] = [{ slug: 's', title: 't', product: 'svelte', section: 'r' }];
    await putCached(kv as any, 'cache:x', { text: 'jawaban', sources });
    expect(await getCached(kv as any, 'cache:x')).toEqual({ text: 'jawaban', sources });
  });
  it('returns null on miss', async () => {
    const kv = fakeKV();
    expect(await getCached(kv as any, 'cache:nope')).toBeNull();
  });
});
