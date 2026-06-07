import { describe, it, expect, vi } from 'vitest';
import { workersAI } from '$lib/server/ai/providers/workers-ai';
import type { AiLike } from '$lib/server/ai/types';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    }
  });
}

describe('workersAI.streamChat', () => {
  it('yields .response tokens from the native SSE stream and stops at [DONE]', async () => {
    const ai: AiLike = {
      run: vi.fn().mockResolvedValue(
        streamOf([
          'data: {"response":"Ha"}\n\n',
          'data: {"response":"lo"}\n\n',
          'data: {"response":"","usage":{"prompt_tokens":1},"p":"xxxx"}\n\n',
          'data: [DONE]\n\n'
        ])
      )
    };
    const out: string[] = [];
    for await (const t of workersAI.streamChat({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      model: '@cf/qwen/qwen2.5-coder-32b-instruct',
      bindings: { AI: ai },
      secrets: {}
    })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Halo');
    // system prepended, stream + raised max_tokens passed through
    const [, input] = (ai.run as any).mock.calls[0];
    expect(input.stream).toBe(true);
    expect(input.max_tokens).toBeGreaterThanOrEqual(1024);
    expect(input.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(input.messages.at(-1)).toEqual({ role: 'user', content: 'hi' });
  });

  it('handles a non-stream object response by yielding its .response once', async () => {
    const ai: AiLike = { run: vi.fn().mockResolvedValue({ response: 'fallback' }) };
    const out: string[] = [];
    for await (const t of workersAI.streamChat({
      system: 's', messages: [{ role: 'user', content: 'q' }],
      model: 'm', bindings: { AI: ai }, secrets: {}
    })) out.push(t);
    expect(out).toEqual(['fallback']);
  });
});
