import { parseSSEEvents } from '$lib/chat/sse';
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Gemini's OpenAI-compatible endpoint — same request/SSE shape as OpenAI, so we
// reuse the shared SSE frame parser. Set CHAT_PROVIDER=gemini, pick a Gemini
// CHAT_MODEL (e.g. gemini-2.5-flash-lite), and provide GEMINI_API_KEY (secret).
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

async function* streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  const apiKey = opts.secrets.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it via `wrangler secret put GEMINI_API_KEY` (or .env for local dev).'
    );
  }

  const messages = [{ role: 'system' as const, content: opts.system }, ...opts.messages];
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
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
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`);
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

export const gemini: ChatProvider = { name: 'gemini', streamChat };
