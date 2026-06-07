const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Verify a Turnstile token server-side. Returns true only when success === true. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip })
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
