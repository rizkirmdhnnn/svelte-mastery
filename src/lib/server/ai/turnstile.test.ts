import { describe, it, expect, vi } from 'vitest';
import { verifyTurnstile } from '$lib/server/ai/turnstile';

describe('verifyTurnstile', () => {
  it('fails immediately for an empty token (missing-input-response) without calling siteverify', async () => {
    const fetchImpl = vi.fn();
    const r = await verifyTurnstile('secret', '', '1.2.3.4', fetchImpl as any);
    expect(r).toEqual({ success: false, errorCodes: ['missing-input-response'] });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs token + secret + remoteip and succeeds with no error codes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
    const r = await verifyTurnstile('sek', 'tok', '9.9.9.9', fetchImpl as any);
    expect(r).toEqual({ success: true, errorCodes: [] });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ secret: 'sek', response: 'tok', remoteip: '9.9.9.9' });
  });

  it('surfaces Cloudflare error-codes when success is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    const r = await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any);
    expect(r).toEqual({ success: false, errorCodes: ['invalid-input-response'] });
  });

  it('returns a synthetic code when siteverify is unreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const r = await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any);
    expect(r).toEqual({ success: false, errorCodes: ['siteverify-unreachable'] });
  });
});
