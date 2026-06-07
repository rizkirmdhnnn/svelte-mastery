const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  /** Cloudflare's `error-codes` (e.g. timeout-or-duplicate, invalid-input-secret),
   *  or our own synthetic code when the request never reaches siteverify. */
  errorCodes: string[];
}

/** Verify a Turnstile token server-side, surfacing WHY it failed. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string,
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileResult> {
  if (!token) return { success: false, errorCodes: ['missing-input-response'] };
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip })
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    return { success: data.success === true, errorCodes: data['error-codes'] ?? [] };
  } catch {
    return { success: false, errorCodes: ['siteverify-unreachable'] };
  }
}
