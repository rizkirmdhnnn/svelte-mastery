import { describe, it, expect, vi } from 'vitest';
import { handleChat } from '$lib/server/ai/handle-chat';
import { parseServerEvents } from '$lib/chat/protocol';

function fakeKV() {
  const store = new Map<string, string>();
  return { store, async get(k: string) { return store.get(k) ?? null; }, async put(k: string, v: string) { store.set(k, v); } };
}

function workersAiStream(text: string) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ response: text })}\n\n`));
      c.enqueue(enc.encode('data: [DONE]\n\n'));
      c.close();
    }
  });
}

function baseDeps(over: Partial<any> = {}) {
  const AI = {
    run: vi.fn(async (model: string) =>
      model.includes('bge') ? { data: [[0.1, 0.2, 0.3]] } : workersAiStream('Halo dari model')
    )
  };
  const VECTORIZE = {
    query: vi.fn().mockResolvedValue({
      count: 1,
      matches: [{ id: 'svelte/runes/state#0', score: 0.9, metadata: { text: '$state reaktif', slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' } }]
    })
  };
  return {
    platform: { env: { AI, VECTORIZE, CHAT_KV: fakeKV() }, context: { waitUntil: vi.fn() } },
    ip: '1.2.3.4',
    config: { provider: 'workers-ai', model: 'm', embedModel: '@cf/baai/bge-m3', turnstileSecret: 'sek', rateLimit: 40, relevanceFloor: 0.5 },
    verifyToken: vi.fn().mockResolvedValue(true),
    ...over
  };
}

async function drain(res: Response): Promise<string> {
  return await res.text();
}

const req = (body: unknown) => new Request('https://x/api/chat', { method: 'POST', body: JSON.stringify(body) });

describe('handleChat', () => {
  it('streams meta+tokens+done for a valid request and caches the answer', async () => {
    const deps = baseDeps();
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'apa itu $state' }], turnstileToken: 'tok' }), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const { events } = parseServerEvents(await drain(res));
    expect(events[0]).toMatchObject({ type: 'meta' });
    expect(events.some((e) => e.type === 'token')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'done' });
    expect(deps.platform.context.waitUntil).toHaveBeenCalled(); // cache write scheduled
  });

  it('refuses an off-materi question whose top similarity is below the relevance floor', async () => {
    const deps = baseDeps();
    // Vectorize returns a weak match (like "resep rendang" → ~0.43 against the real index).
    deps.platform.env.VECTORIZE.query = vi.fn().mockResolvedValue({
      count: 1,
      matches: [{ id: 'x#0', score: 0.43, metadata: { text: 'irrelevant', slug: 'x', title: 'X', product: 'svelte', section: 'misc' } }]
    });
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'resep rendang padang' }], turnstileToken: 'tok' }), deps);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('di luar materi'); // the canned refusal
    // the question was embedded (1 AI.run) but the chat model was NEVER called
    expect(deps.platform.env.AI.run.mock.calls.length).toBe(1);
    expect(deps.platform.env.AI.run.mock.calls[0][0]).toContain('bge');
  });

  it('does NOT refuse a follow-up even if its own similarity is low (relies on history)', async () => {
    const deps = baseDeps();
    deps.platform.env.VECTORIZE.query = vi.fn().mockResolvedValue({
      count: 1,
      matches: [{ id: 'svelte/runes/state#0', score: 0.4, metadata: { text: '$state', slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' } }]
    });
    const res = await handleChat(
      req({
        messages: [
          { role: 'user', content: 'apa itu $state' },
          { role: 'assistant', content: '$state adalah rune reaktif.' },
          { role: 'user', content: 'tadi saya nanya apa?' }
        ],
        turnstileToken: 'tok'
      }),
      deps
    );
    const text = await res.text();
    expect(text).not.toContain('di luar materi'); // floor skipped for follow-ups
    expect(text).toContain('"type":"token"'); // model actually answered
  });

  it('retrieves a follow-up using the previous user turn for context', async () => {
    const deps = baseDeps();
    await handleChat(
      req({
        messages: [
          { role: 'user', content: 'apa itu $derived' },
          { role: 'assistant', content: 'nilai turunan.' },
          { role: 'user', content: 'berikan contoh kodenya' }
        ],
        turnstileToken: 'tok'
      }),
      deps
    );
    const calls = deps.platform.env.AI.run.mock.calls as unknown as unknown[][];
    const embedCall = calls.find((c) => String(c[0]).includes('bge'));
    expect((embedCall?.[1] as { text: string }).text).toBe('apa itu $derived\nberikan contoh kodenya');
  });

  it('returns 403 when the Turnstile token fails', async () => {
    const deps = baseDeps({ verifyToken: vi.fn().mockResolvedValue(false) });
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'hi' }], turnstileToken: 'bad' }), deps);
    expect(res.status).toBe(403);
  });

  it('returns 429 with resetAt once the rate limit is exceeded', async () => {
    const deps = baseDeps({ config: { ...baseDeps().config, rateLimit: 1 } });
    await handleChat(req({ messages: [{ role: 'user', content: 'a' }], turnstileToken: 'tok' }), deps);
    const res2 = await handleChat(req({ messages: [{ role: 'user', content: 'b' }], turnstileToken: 'tok' }), deps);
    expect(res2.status).toBe(429);
    expect(await res2.json()).toHaveProperty('resetAt');
  });

  it('serves a cache hit without calling the model again', async () => {
    const deps = baseDeps();
    await handleChat(req({ messages: [{ role: 'user', content: 'sama' }], turnstileToken: 'tok' }), deps);
    const callsAfterFirst = deps.platform.env.AI.run.mock.calls.length;
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'SAMA' }], turnstileToken: 'tok' }), deps);
    const { events } = parseServerEvents(await drain(res));
    expect(events.some((e) => e.type === 'token')).toBe(true);
    // No new model/embed calls on the cache hit.
    expect(deps.platform.env.AI.run.mock.calls.length).toBe(callsAfterFirst);
  });

  it('returns 400 for a body with no user message', async () => {
    const res = await handleChat(req({ messages: [], turnstileToken: 'tok' }), baseDeps());
    expect(res.status).toBe(400);
  });
});
