const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string;
      execute(idOrEl: string | HTMLElement): void;
      reset(id?: string): void;
      ready(cb: () => void): void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Render an invisible Turnstile widget into `container` once and return a
 * function that produces a fresh single-use token per call (execute → callback).
 */
export async function createTokenSource(container: HTMLElement, sitekey: string) {
  await loadScript();
  let widgetId = '';
  let pending: ((token: string) => void) | null = null;
  let failed: ((err: Error) => void) | null = null;

  await new Promise<void>((resolve) => {
    window.turnstile!.ready(() => {
      widgetId = window.turnstile!.render(container, {
        sitekey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => pending?.(token),
        'error-callback': (code: string) => failed?.(new Error('turnstile:' + code))
      });
      resolve();
    });
  });

  return {
    getToken(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        pending = (t) => {
          window.turnstile!.reset(widgetId);
          resolve(t);
        };
        failed = reject;
        window.turnstile!.execute(widgetId);
      });
    }
  };
}
