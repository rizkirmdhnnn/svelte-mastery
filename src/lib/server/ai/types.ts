import type { ChatTurn } from '$lib/chat/types';

/** Minimal shape of the Workers AI binding we use (avoids a hard dep on generated types in tests). */
export interface AiLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface StreamChatOptions {
  /** Full system prompt (guardrails + retrieved context). */
  system: string;
  /** Conversation history (user/assistant turns only). */
  messages: ChatTurn[];
  model: string;
  /** Worker bindings (Workers AI uses `AI`). */
  bindings: { AI: AiLike };
  /** Secrets/keys for external providers (e.g. GEMINI_API_KEY). */
  secrets: Record<string, string | undefined>;
  /** Token cap for the answer. */
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly name: string;
  streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown>;
}
