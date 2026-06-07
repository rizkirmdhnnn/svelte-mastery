// Stateless, signed session token so Turnstile only has to be solved ONCE per
// session: after a Turnstile pass we issue one of these, and subsequent messages
// present it instead of a fresh Turnstile token. Bound to IP + expiry, HMAC-signed
// with a server secret (reuses TURNSTILE_SECRET_KEY) — no KV needed.

export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const enc = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function strToB64url(str: string): string {
  return bytesToB64url(enc.encode(str));
}
function b64urlToStr(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

async function importKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

/** Issue a session token: base64url({ip,exp}) + '.' + base64url(HMAC). */
export async function issueSession(secret: string, ip: string, now: number = Date.now()): Promise<string> {
  const payload = strToB64url(JSON.stringify({ ip, exp: now + SESSION_TTL_MS }));
  const key = await importKey(secret, 'sign');
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  return `${payload}.${bytesToB64url(sig)}`;
}

/** Verify HMAC (constant-time via subtle.verify), then IP + expiry. */
export async function verifySession(
  secret: string,
  token: string,
  ip: string,
  now: number = Date.now()
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  try {
    const key = await importKey(secret, 'verify');
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), enc.encode(payload));
    if (!ok) return false;
    const data = JSON.parse(b64urlToStr(payload)) as { ip?: string; exp?: number };
    return data.ip === ip && typeof data.exp === 'number' && data.exp > now;
  } catch {
    return false;
  }
}
