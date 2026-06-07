import { describe, it, expect, vi } from 'vitest';
import { buildResponseStream } from '$lib/server/ai/chat-stream';
import { parseServerEvents } from '$lib/chat/protocol';
import type { ChatSource } from '$lib/chat/types';

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

async function* tokens(parts: string[]) {
  for (const p of parts) yield p;
}

const SOURCES: ChatSource[] = [{ slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }];

describe('buildResponseStream', () => {
  it('emits meta, then tokens, then done; and calls onComplete with the full text', async () => {
    const onComplete = vi.fn();
    const stream = buildResponseStream(SOURCES, tokens(['Ha', 'lo']), onComplete);
    const { events } = parseServerEvents(await drain(stream));
    expect(events[0]).toEqual({ type: 'meta', sources: SOURCES });
    expect(events.filter((e) => e.type === 'token').map((e: any) => e.text)).toEqual(['Ha', 'lo']);
    expect(events.at(-1)).toEqual({ type: 'done' });
    expect(onComplete).toHaveBeenCalledWith('Halo');
  });

  it('emits an error event (and no done) if the generator throws, without calling onComplete', async () => {
    const onComplete = vi.fn();
    async function* boom() {
      yield 'partial';
      throw new Error('model exploded');
    }
    const stream = buildResponseStream(SOURCES, boom(), onComplete);
    const { events } = parseServerEvents(await drain(stream));
    expect(events.some((e) => e.type === 'token')).toBe(true);
    const err = events.find((e) => e.type === 'error') as any;
    expect(err).toBeTruthy();
    expect(err.message).toContain('model exploded');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
