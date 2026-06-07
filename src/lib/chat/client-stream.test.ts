import { describe, it, expect, vi } from 'vitest';
import { consumeChatStream } from '$lib/chat/client-stream';
import { encodeServerEvent } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

function bodyOf(events: ServerEvent[], splitMid = false): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const wire = events.map(encodeServerEvent).join('');
  const bytes = enc.encode(wire);
  const mid = Math.floor(bytes.length / 2);
  return new ReadableStream({
    start(c) {
      if (splitMid) {
        c.enqueue(bytes.slice(0, mid));
        c.enqueue(bytes.slice(mid));
      } else {
        c.enqueue(bytes);
      }
      c.close();
    }
  });
}

describe('consumeChatStream', () => {
  it('dispatches each ServerEvent in order', async () => {
    const events: ServerEvent[] = [
      { type: 'meta', sources: [] },
      { type: 'token', text: 'a' },
      { type: 'token', text: 'b' },
      { type: 'done' }
    ];
    const seen: ServerEvent[] = [];
    await consumeChatStream(bodyOf(events), (e) => seen.push(e));
    expect(seen).toEqual(events);
  });

  it('reassembles events split across chunk boundaries', async () => {
    const events: ServerEvent[] = [{ type: 'token', text: 'hello world' }, { type: 'done' }];
    const seen: ServerEvent[] = [];
    await consumeChatStream(bodyOf(events, true), (e) => seen.push(e));
    expect(seen).toEqual(events);
  });

  it('stops reading when the signal is already aborted', async () => {
    const handler = vi.fn();
    const ctrl = new AbortController();
    ctrl.abort();
    await consumeChatStream(bodyOf([{ type: 'token', text: 'x' }]), handler, ctrl.signal);
    expect(handler).not.toHaveBeenCalled();
  });
});
