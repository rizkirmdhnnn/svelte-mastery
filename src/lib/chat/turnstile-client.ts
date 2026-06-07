const SCRIPT_URL =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__tanyaTurnstileOnload&render=explicit';

declare global {
	interface Window {
		turnstile?: {
			render(el: HTMLElement, opts: Record<string, unknown>): string;
			execute(idOrEl: string | HTMLElement): void;
			reset(id?: string): void;
			remove(id?: string): void;
		};
		__tanyaTurnstileOnload?: () => void;
	}
}

let readyPromise: Promise<void> | null = null;

/**
 * Load Turnstile api.js once and resolve when the API is ready to render.
 * Uses the documented `?onload=` global-callback pattern. `turnstile.ready()`
 * does NOT fire its callback for a dynamically-injected script, which silently
 * prevents the widget from ever rendering (and thus produces no token).
 */
function ensureTurnstile(): Promise<void> {
	if (readyPromise) return readyPromise;
	readyPromise = new Promise<void>((resolve, reject) => {
		if (window.turnstile?.render) return resolve();
		window.__tanyaTurnstileOnload = () => resolve();
		const s = document.createElement('script');
		s.src = SCRIPT_URL;
		s.async = true;
		s.defer = true;
		s.onerror = () => reject(new Error('Failed to load Turnstile'));
		document.head.appendChild(s);
	});
	return readyPromise;
}

/**
 * Render an invisible (`interaction-only`) Turnstile widget into `container`
 * and return a function that yields a fresh single-use token per call. The
 * widget auto-solves on render/reset; getToken() returns the current token and
 * resets the widget so a new token is ready for the next call.
 */
export async function createTokenSource(container: HTMLElement, sitekey: string) {
	await ensureTurnstile();
	const ts = window.turnstile!;

	let current: string | null = null;
	let waiters: Array<(token: string) => void> = [];

	const widgetId = ts.render(container, {
		sitekey,
		appearance: 'interaction-only',
		callback: (token: string) => {
			current = token;
			const ws = waiters;
			waiters = [];
			ws.forEach((w) => w(token));
		}
	});

	return {
		getToken(): Promise<string> {
			return new Promise<string>((resolve) => {
				const consume = (token: string) => {
					current = null;
					try {
						ts.reset(widgetId);
					} catch {
						/* ignore — a fresh token will be requested next time */
					}
					resolve(token);
				};
				if (current) consume(current);
				else waiters.push(consume);
			});
		}
	};
}
