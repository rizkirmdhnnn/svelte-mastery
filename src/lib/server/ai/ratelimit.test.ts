import { describe, it, expect } from 'vitest';
import { checkAndIncrement } from '$lib/server/ai/ratelimit';

function fakeKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string, _opts?: { expirationTtl?: number }) { store.set(key, value); }
  };
}

const NOW = new Date('2026-06-07T10:00:00Z');

describe('checkAndIncrement', () => {
  it('allows and counts up to the limit, then blocks', async () => {
    const kv = fakeKV();
    const r1 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r1).toMatchObject({ allowed: true, remaining: 1 });
    const r2 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r2).toMatchObject({ allowed: true, remaining: 0 });
    const r3 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r3.allowed).toBe(false);
  });

  it('keys per IP per UTC day and reports the next-midnight reset', async () => {
    const kv = fakeKV();
    await checkAndIncrement(kv as any, '5.5.5.5', 5, NOW);
    expect([...kv.store.keys()][0]).toBe('rl:5.5.5.5:20260607');
    const { resetAt } = await checkAndIncrement(kv as any, '5.5.5.5', 5, NOW);
    expect(resetAt).toBe(Date.parse('2026-06-08T00:00:00Z'));
  });

  it('separate IPs have independent counters', async () => {
    const kv = fakeKV();
    await checkAndIncrement(kv as any, 'a', 1, NOW);
    const other = await checkAndIncrement(kv as any, 'b', 1, NOW);
    expect(other.allowed).toBe(true);
  });
});
