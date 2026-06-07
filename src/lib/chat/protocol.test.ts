import { describe, it, expect } from 'vitest';
import { encodeServerEvent, parseServerEvents } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

describe('protocol', () => {
  it('encodes an event as a single SSE data frame ending in a blank line', () => {
    expect(encodeServerEvent({ type: 'token', text: 'hi' })).toBe('data: {"type":"token","text":"hi"}\n\n');
  });

  it('round-trips a sequence of events', () => {
    const out: ServerEvent[] = [
      { type: 'meta', sources: [{ slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }] },
      { type: 'token', text: 'Halo' },
      { type: 'done' }
    ];
    const wire = out.map(encodeServerEvent).join('');
    const { events, rest } = parseServerEvents(wire);
    expect(events).toEqual(out);
    expect(rest).toBe('');
  });

  it('buffers a partial trailing frame as rest', () => {
    const { events, rest } = parseServerEvents('data: {"type":"token","text":"a"}\n\ndata: {"type":"to');
    expect(events).toEqual([{ type: 'token', text: 'a' }]);
    expect(rest).toBe('data: {"type":"to');
  });

  it('skips malformed JSON frames without throwing', () => {
    const { events } = parseServerEvents('data: not-json\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: 'done' }]);
  });
});
