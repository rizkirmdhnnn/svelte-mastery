import { describe, it, expect, vi, afterEach } from 'vitest';
import { gemini } from '$lib/server/ai/providers/gemini';
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
  model: 'gemini-2.5-flash-lite',
  bindings: { AI: {} as never },
  secrets: { GEMINI_API_KEY: 'k' },
  ...over
});

afterEach(() => vi.unstubAllGlobals());

describe('gemini.streamChat', () => {
  it('throws a clear error when GEMINI_API_KEY is missing', async () => {
    await expect(collect(gemini.streamChat(opts({ secrets: {} })))).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('POSTs to the OpenAI-compatible endpoint with bearer auth + system message, yields delta content until [DONE]', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Ha"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: {"choices":[{"delta":{}}]}\n\n',
        'data: [DONE]\n\n'
      ])
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await collect(gemini.streamChat(opts()));
    expect(out.join('')).toBe('Halo');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(init.body);
    expect(body.stream).toBe(true);
    expect(body.model).toBe('gemini-2.5-flash-lite');
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'hi' });
  });

  it('throws on a non-OK response (e.g. rate limit / bad key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([], false, 429)));
    await expect(collect(gemini.streamChat(opts()))).rejects.toThrow(/Gemini request failed \(429\)/);
  });
});
