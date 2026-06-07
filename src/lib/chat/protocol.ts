import { parseSSEEvents } from '$lib/chat/sse';
import type { ServerEvent } from '$lib/chat/types';

export function encodeServerEvent(event: ServerEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Decode buffered wire text into ServerEvents; malformed frames are skipped. */
export function parseServerEvents(buffer: string): { events: ServerEvent[]; rest: string } {
  const { events: raw, rest } = parseSSEEvents(buffer);
  const events: ServerEvent[] = [];
  for (const payload of raw) {
    try {
      events.push(JSON.parse(payload) as ServerEvent);
    } catch {
      // ignore malformed frame
    }
  }
  return { events, rest };
}
