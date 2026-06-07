import { describe, it, expect, vi, afterEach } from 'vitest';
import { groq } from '$lib/server/ai/providers/groq';
import type { StreamChatOptions } from '$lib/server/ai/types';

function sseResponse(chunks: string[], ok = true, status = 200): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    }
  });
  return { ok, status, body, text: async () => 'upstream error body' } as unknown as Response;
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const t of gen) out.push(t);
  return out;
}

const opts = (over: Partial<StreamChatOptions> = {}): StreamChatOptions => ({
  system: 'sys',
  messages: [{ role: 'user', content: 'hi' }],
  model: 'llama-3.3-70b-versatile',
  bindings: { AI: {} as never },
  secrets: { GROQ_API_KEY: 'k' },
  ...over
});

afterEach(() => vi.unstubAllGlobals());

describe('groq.streamChat', () => {
  it('throws a clear error when GROQ_API_KEY is missing', async () => {
    await expect(collect(groq.streamChat(opts({ secrets: {} })))).rejects.toThrow(/GROQ_API_KEY/);
  });

  it('POSTs to the Groq endpoint with bearer auth + system message, yields delta content until [DONE]', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Ha"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await collect(groq.streamChat(opts()));
    expect(out.join('')).toBe('Halo');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(init.body);
    expect(body.stream).toBe(true);
    expect(body.model).toBe('llama-3.3-70b-versatile');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
  });

  it('throws on a non-OK response (e.g. rate limit / bad key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([], false, 401)));
    await expect(collect(groq.streamChat(opts()))).rejects.toThrow(/Groq request failed \(401\)/);
  });
});
