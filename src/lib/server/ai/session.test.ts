import { describe, it, expect } from 'vitest';
import { issueSession, verifySession, SESSION_TTL_MS } from '$lib/server/ai/session';

const SECRET = 'super-secret-key';
const IP = '1.2.3.4';
const NOW = 1_000_000_000_000;

describe('session token', () => {
  it('issues a token that verifies for the same secret + ip within TTL', async () => {
    const token = await issueSession(SECRET, IP, NOW);
    expect(token.split('.')).toHaveLength(2);
    expect(await verifySession(SECRET, token, IP, NOW + 1000)).toBe(true);
  });

  it('rejects a token from a different IP', async () => {
    const token = await issueSession(SECRET, IP, NOW);
    expect(await verifySession(SECRET, token, '9.9.9.9', NOW + 1000)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const token = await issueSession(SECRET, IP, NOW);
    expect(await verifySession(SECRET, token, IP, NOW + SESSION_TTL_MS + 1)).toBe(false);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await issueSession(SECRET, IP, NOW);
    expect(await verifySession('other-secret', token, IP, NOW + 1000)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    const token = await issueSession(SECRET, IP, NOW);
    const [p, sig] = token.split('.');
    const forged = `${p}x.${sig}`;
    expect(await verifySession(SECRET, forged, IP, NOW + 1000)).toBe(false);
  });

  it('rejects empty / malformed tokens', async () => {
    expect(await verifySession(SECRET, '', IP, NOW)).toBe(false);
    expect(await verifySession(SECRET, 'not-a-token', IP, NOW)).toBe(false);
    expect(await verifySession(SECRET, 'a.b.c', IP, NOW)).toBe(false);
  });
});
