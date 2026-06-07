import { streamOpenAICompatible } from '$lib/server/ai/providers/openai-compatible';
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Groq's OpenAI-compatible endpoint. Set CHAT_PROVIDER=groq, pick a Groq
// CHAT_MODEL (e.g. llama-3.3-70b-versatile), and provide GROQ_API_KEY (secret).
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

function streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  return streamOpenAICompatible(opts, {
    endpoint: ENDPOINT,
    apiKey: opts.secrets.GROQ_API_KEY,
    keyName: 'GROQ_API_KEY',
    label: 'Groq'
  });
}

export const groq: ChatProvider = { name: 'groq', streamChat };
