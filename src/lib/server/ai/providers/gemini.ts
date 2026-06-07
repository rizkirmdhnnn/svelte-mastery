import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Stub: ready to implement against the Gemini streaming API. Flip CHAT_PROVIDER
// to 'gemini' and set GEMINI_API_KEY (Worker secret) once implemented.
async function* streamChat(_opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  throw new Error("Provider 'gemini' is not implemented yet. Set CHAT_PROVIDER=workers-ai.");
}

export const gemini: ChatProvider = { name: 'gemini', streamChat };
