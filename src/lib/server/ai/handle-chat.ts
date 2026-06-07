import type { ChatTurn } from '$lib/chat/types';
import { encodeServerEvent } from '$lib/chat/protocol';
import { getProvider } from '$lib/server/ai/providers';
import { embedQuery, queryChunks } from '$lib/server/ai/retrieval';
import { buildSystemPrompt, dedupeSources, OUT_OF_SCOPE_MESSAGE, type CurrentLesson } from '$lib/server/ai/prompt';
import { buildResponseStream } from '$lib/server/ai/chat-stream';
import { checkAndIncrement } from '$lib/server/ai/ratelimit';
import { cacheKey, getCached, putCached } from '$lib/server/ai/cache';
import { verifyTurnstile, type TurnstileResult } from '$lib/server/ai/turnstile';

export interface HandleChatConfig {
  provider: string;
  model: string;
  embedModel: string;
  turnstileSecret: string;
  rateLimit: number;
  /** Minimum top-match similarity to answer; below this the question is treated as off-materi. */
  relevanceFloor: number;
  secrets?: Record<string, string | undefined>;
}

export interface HandleChatDeps {
  platform: {
    env: { AI: any; VECTORIZE: any; CHAT_KV: any };
    // adapter-cloudflare exposes `context`; this repo's app.d.ts names it `ctx`.
    context?: { waitUntil(p: Promise<unknown>): void };
    ctx?: { waitUntil(p: Promise<unknown>): void };
  };
  ip: string;
  config: HandleChatConfig;
  /** Injectable for tests; defaults to verifyTurnstile. */
  verifyToken?: (secret: string, token: string, ip: string) => Promise<TurnstileResult>;
}

interface ChatBody {
  messages: ChatTurn[];
  turnstileToken?: string;
  currentLesson?: CurrentLesson | null;
}

const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-store',
  connection: 'keep-alive'
};

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function cachedStream(text: string, sources: any[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(encodeServerEvent({ type: 'meta', sources })));
      c.enqueue(enc.encode(encodeServerEvent({ type: 'token', text })));
      c.enqueue(enc.encode(encodeServerEvent({ type: 'done' })));
      c.close();
    }
  });
}

export async function handleChat(request: Request, deps: HandleChatDeps): Promise<Response> {
  const { platform, ip, config } = deps;
  const verify = deps.verifyToken ?? verifyTurnstile;

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const history = (body.messages ?? []).filter((m) => m.role === 'user' || m.role === 'assistant');
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser || !lastUser.content.trim()) {
    return json(400, { error: 'empty_question' });
  }

  // Conversation-aware retrieval: a follow-up like "kasih contohnya" or "tadi
  // nanya apa?" has no topic of its own, so retrieve using the previous user
  // turn for context. `isFollowUp` also relaxes the cold-start relevance guard.
  const userTurns = history.filter((m) => m.role === 'user');
  const isFollowUp = userTurns.length > 1;
  const prevUserContent = isFollowUp ? userTurns[userTurns.length - 2].content : '';
  const retrievalQuery = prevUserContent ? `${prevUserContent}\n${lastUser.content}` : lastUser.content;

  // 1) Turnstile — surface WHY it failed (Cloudflare error-codes) to the client.
  const turnstile = await verify(config.turnstileSecret, body.turnstileToken ?? '', ip);
  if (!turnstile.success) {
    return json(403, { error: 'turnstile_failed', codes: turnstile.errorCodes });
  }

  // 2) Rate limit
  const rl = await checkAndIncrement(platform.env.CHAT_KV, ip, config.rateLimit);
  if (!rl.allowed) {
    return json(429, { error: 'rate_limited', resetAt: rl.resetAt });
  }

  // 3) Cache (first-turn questions only — follow-ups are context-dependent, so
  // keying on the last message alone would serve the wrong cached answer).
  const key = cacheKey(lastUser.content);
  if (!isFollowUp) {
    const hit = await getCached(platform.env.CHAT_KV, key);
    if (hit) {
      return new Response(cachedStream(hit.text, hit.sources), { headers: SSE_HEADERS });
    }
  }

  // 4) Retrieve (context-aware query so follow-ups land on the real topic)
  const vector = await embedQuery(platform.env.AI, config.embedModel, retrievalQuery);
  const chunks = await queryChunks(platform.env.VECTORIZE, vector, 5);
  const sources = dedupeSources(chunks);

  // 4b) Relevance guard — refuse cold off-topic questions on the FIRST turn only.
  // Follow-ups legitimately score low (e.g. "tadi nanya apa?"), so there we trust
  // the conversation history + the system prompt's scope rule instead.
  const topScore = chunks[0]?.score ?? 0;
  if (!isFollowUp && topScore < config.relevanceFloor) {
    return new Response(cachedStream(OUT_OF_SCOPE_MESSAGE, []), { headers: SSE_HEADERS });
  }

  // 5) Prompt + provider stream
  const system = buildSystemPrompt({ chunks, currentLesson: body.currentLesson ?? null });
  const provider = getProvider(config.provider);
  const tokens = provider.streamChat({
    system,
    messages: history,
    model: config.model,
    bindings: { AI: platform.env.AI },
    secrets: config.secrets ?? {}
  });

  // 6) Stream out + schedule cache write
  const waitUntil = platform.context?.waitUntil?.bind(platform.context) ?? platform.ctx?.waitUntil?.bind(platform.ctx);
  const stream = buildResponseStream(sources, tokens, (full) => {
    if (isFollowUp) return; // don't cache context-dependent follow-up answers
    const write = putCached(platform.env.CHAT_KV, key, { text: full, sources });
    if (waitUntil) waitUntil(write);
    else void write;
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
