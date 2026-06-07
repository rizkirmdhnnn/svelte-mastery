interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms of next UTC midnight
}

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function nextUtcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

/**
 * Atomically-ish increment a per-IP, per-UTC-day counter in KV. KV is not truly
 * atomic, but for abuse/cost protection an occasional race is acceptable.
 */
export async function checkAndIncrement(
  kv: KVLike,
  ip: string,
  limit: number,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const key = `rl:${ip}:${utcDayKey(now)}`;
  const resetAt = nextUtcMidnight(now);
  const current = Number((await kv.get(key)) ?? '0');
  if (current >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: Math.max(0, limit - next), resetAt };
}
