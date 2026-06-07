import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTokenSource } from '$lib/chat/turnstile-client';

type Opts = Record<string, any>;

/**
 * Install a fake `window.turnstile` and expose hooks to drive its callbacks.
 * The real widget auto-solves and invokes `callback`; here we fire it manually
 * so each test controls the solve/error/timeout/expiry timing.
 */
function installTurnstile() {
  let opts: Opts = {};
  const ts = {
    render: vi.fn((_el: unknown, o: Opts) => {
      opts = o;
      return 'widget-1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
    execute: vi.fn()
  };
  (globalThis as any).window = { turnstile: ts };
  return {
    ts,
    getOpts: () => opts,
    fireSolve: (token: string) => opts.callback?.(token),
    fireError: () => opts['error-callback']?.(),
    fireTimeout: () => opts['timeout-callback']?.(),
    fireExpired: () => opts['expired-callback']?.()
  };
}

const fakeEl = {} as unknown as HTMLElement;

describe('createTokenSource / getToken', () => {
  afterEach(() => {
    delete (globalThis as any).window;
    vi.restoreAllMocks();
  });

  it('resolves with the freshly solved token and resets for the next call', async () => {
    const h = installTurnstile();
    const src = await createTokenSource(fakeEl, 'sk');
    const p = src.getToken();
    h.fireSolve('tok-123');
    await expect(p).resolves.toBe('tok-123');
    expect(h.ts.reset).toHaveBeenCalledWith('widget-1');
  });

  it('rejects after the timeout instead of hanging when the widget never solves', async () => {
    installTurnstile(); // callback is never fired — the interaction-only hang scenario
    const src = await createTokenSource(fakeEl, 'sk');
    await expect(src.getToken({ timeoutMs: 20 })).rejects.toThrow();
  });

  it('registers an error-callback that rejects pending waiters', async () => {
    const h = installTurnstile();
    const src = await createTokenSource(fakeEl, 'sk');
    expect(h.getOpts()['error-callback']).toBeTypeOf('function');
    const p = src.getToken({ timeoutMs: 1000 });
    h.fireError();
    await expect(p).rejects.toThrow();
  });

  it('rejects immediately when given an already-aborted signal so Stop can cancel the wait', async () => {
    installTurnstile();
    const src = await createTokenSource(fakeEl, 'sk');
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(src.getToken({ signal: ctrl.signal, timeoutMs: 1000 })).rejects.toThrow();
  });

  it('exposes destroy() that removes the widget (no leak across panel open/close)', async () => {
    const h = installTurnstile();
    const src = await createTokenSource(fakeEl, 'sk');
    src.destroy();
    expect(h.ts.remove).toHaveBeenCalledWith('widget-1');
  });
});
