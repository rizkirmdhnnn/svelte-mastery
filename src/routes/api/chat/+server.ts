import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { handleChat } from '$lib/server/ai/handle-chat';

// Opt out of the site-wide prerender so this route runs live in the Worker.
export const prerender = false;

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
  if (!platform) {
    return new Response(JSON.stringify({ error: 'no_platform' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
  const ip = getClientAddress();
  return handleChat(request, {
    platform: platform as any,
    ip,
    config: {
      provider: env.CHAT_PROVIDER ?? 'workers-ai',
      model: env.CHAT_MODEL ?? '@cf/qwen/qwen2.5-coder-32b-instruct',
      embedModel: env.EMBED_MODEL ?? '@cf/baai/bge-m3',
      turnstileSecret: env.TURNSTILE_SECRET_KEY ?? '',
      rateLimit: Number(env.CHAT_RATE_LIMIT ?? '40'),
      relevanceFloor: Number(env.CHAT_RELEVANCE_FLOOR ?? '0.5'),
      secrets: env as unknown as Record<string, string | undefined>
    }
  });
};
