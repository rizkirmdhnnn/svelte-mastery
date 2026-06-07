import type { ChatProvider } from '$lib/server/ai/types';
import { workersAI } from '$lib/server/ai/providers/workers-ai';
import { gemini } from '$lib/server/ai/providers/gemini';
import { groq } from '$lib/server/ai/providers/groq';

const REGISTRY: Record<string, ChatProvider> = {
  'workers-ai': workersAI,
  gemini,
  groq
};

/** Resolve the active provider by name, defaulting to workers-ai. */
export function getProvider(name: string | undefined): ChatProvider {
  return (name && REGISTRY[name]) || workersAI;
}
