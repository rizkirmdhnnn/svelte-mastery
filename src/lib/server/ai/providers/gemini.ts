import { streamOpenAICompatible } from '$lib/server/ai/providers/openai-compatible';
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Gemini's OpenAI-compatible endpoint. Set CHAT_PROVIDER=gemini, pick a Gemini
// CHAT_MODEL (e.g. gemini-2.5-flash-lite), and provide GEMINI_API_KEY (secret).
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

function streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  return streamOpenAICompatible(opts, {
    endpoint: ENDPOINT,
    apiKey: opts.secrets.GEMINI_API_KEY,
    keyName: 'GEMINI_API_KEY',
    label: 'Gemini'
  });
}

export const gemini: ChatProvider = { name: 'gemini', streamChat };
