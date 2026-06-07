import { parseSSEEvents } from '$lib/chat/sse';
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

async function* streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  const messages = [{ role: 'system' as const, content: opts.system }, ...opts.messages];
  const res = await opts.bindings.AI.run(opts.model, {
    messages,
    stream: true,
    max_tokens: opts.maxTokens ?? 1024
  });

  // Non-streaming fallback (binding returned a JSON object).
  if (!(res instanceof ReadableStream)) {
    const obj = res as { response?: string };
    if (obj?.response) yield obj.response;
    return;
  }

  const reader = res.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (opts.signal?.aborted) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSSEEvents(buffer);
      buffer = rest;
      for (const payload of events) {
        if (payload === '[DONE]') return;
        try {
          const obj = JSON.parse(payload) as { response?: string };
          if (obj.response) yield obj.response;
        } catch {
          // ignore non-JSON keep-alive frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const workersAI: ChatProvider = { name: 'workers-ai', streamChat };
