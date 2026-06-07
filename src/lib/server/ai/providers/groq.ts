import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Stub: ready to implement against the Groq (OpenAI-compatible) streaming API.
async function* streamChat(_opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  throw new Error("Provider 'groq' is not implemented yet. Set CHAT_PROVIDER=workers-ai.");
}

export const groq: ChatProvider = { name: 'groq', streamChat };
