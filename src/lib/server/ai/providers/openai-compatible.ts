import { parseSSEEvents } from '$lib/chat/sse';
import type { StreamChatOptions } from '$lib/server/ai/types';

export interface OpenAICompatConfig {
  /** Full chat-completions endpoint URL. */
  endpoint: string;
  /** Bearer API key (already resolved from secrets). */
  apiKey: string | undefined;
  /** Secret name, used in the "missing key" error message. */
  keyName: string;
  /** Human label, used in request-failure errors. */
  label: string;
}

/**
 * Stream from any OpenAI-compatible chat-completions endpoint (Gemini, Groq, …).
 * Yields plain-text deltas (`choices[].delta.content`) until `[DONE]`.
 */
export async function* streamOpenAICompatible(
  opts: StreamChatOptions,
  config: OpenAICompatConfig
): AsyncGenerator<string, void, unknown> {
  if (!config.apiKey) {
    throw new Error(
      `${config.keyName} is not set. Add it via \`wrangler secret put ${config.keyName}\` (or .env for local dev).`
    );
  }

  const messages = [{ role: 'system' as const, content: opts.system }, ...opts.messages];
  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      stream: true,
      max_tokens: opts.maxTokens ?? 1024
    }),
    signal: opts.signal
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${config.label} request failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
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
          const obj = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const text = obj.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // ignore non-JSON keep-alive frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
