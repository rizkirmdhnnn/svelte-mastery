import { encodeServerEvent } from '$lib/chat/protocol';
import type { ChatSource } from '$lib/chat/types';

/**
 * Build a ReadableStream of our SSE protocol from a token generator.
 * onComplete receives the full accumulated answer (used for caching); it is
 * NOT called if the generator errors.
 */
export function buildResponseStream(
  sources: ChatSource[],
  tokens: AsyncGenerator<string, void, unknown>,
  onComplete?: (fullText: string) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let full = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      send(encodeServerEvent({ type: 'meta', sources }));
      try {
        for await (const t of tokens) {
          if (!t) continue;
          full += t;
          send(encodeServerEvent({ type: 'token', text: t }));
        }
        send(encodeServerEvent({ type: 'done' }));
        onComplete?.(full);
      } catch (err) {
        send(encodeServerEvent({ type: 'error', message: err instanceof Error ? err.message : 'stream error' }));
      } finally {
        controller.close();
      }
    }
  });
}
