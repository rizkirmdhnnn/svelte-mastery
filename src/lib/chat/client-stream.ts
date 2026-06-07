import { parseServerEvents } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

/** Read a fetch response body and dispatch each decoded ServerEvent. */
export async function consumeChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: ServerEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseServerEvents(buffer);
      buffer = rest;
      for (const e of events) onEvent(e);
    }
  } finally {
    reader.releaseLock();
  }
}
