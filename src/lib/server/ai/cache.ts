import type { ChatSource } from '$lib/chat/types';

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface CachedAnswer {
  text: string;
  sources: ChatSource[];
}

/** FNV-1a 32-bit hash → hex (stable, dependency-free). */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function cacheKey(question: string): string {
  const norm = question.trim().toLowerCase().replace(/\s+/g, ' ');
  return `cache:${fnv1a(norm)}`;
}

export async function getCached(kv: KVLike, key: string): Promise<CachedAnswer | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnswer;
  } catch {
    return null;
  }
}

export async function putCached(kv: KVLike, key: string, value: CachedAnswer): Promise<void> {
  // Cache for 7 days; content changes trigger a re-index but cached answers
  // expire on their own.
  await kv.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 7 });
}
