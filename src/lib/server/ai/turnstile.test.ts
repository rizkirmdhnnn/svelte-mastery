import { describe, it, expect, vi } from 'vitest';
import { verifyTurnstile } from '$lib/server/ai/turnstile';

describe('verifyTurnstile', () => {
  it('returns false immediately for an empty token without calling siteverify', async () => {
    const fetchImpl = vi.fn();
    expect(await verifyTurnstile('secret', '', '1.2.3.4', fetchImpl as any)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs token + secret + remoteip and returns true on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
    const ok = await verifyTurnstile('sek', 'tok', '9.9.9.9', fetchImpl as any);
    expect(ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ secret: 'sek', response: 'tok', remoteip: '9.9.9.9' });
  });

  it('returns false when success is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    expect(await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any)).toBe(false);
  });

  it('returns false when siteverify throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    expect(await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any)).toBe(false);
  });
});
