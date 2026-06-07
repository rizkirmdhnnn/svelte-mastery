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

/** Give up loading api.js after this long so a blocked/slow script doesn't hang forever. */
const SCRIPT_TIMEOUT_MS = 10_000;
/** Default ceiling on waiting for a single token before surfacing a recoverable error. */
const DEFAULT_TOKEN_TIMEOUT_MS = 8_000;

let readyPromise: Promise<void> | null = null;

/**
 * Load Turnstile api.js once and resolve when the API is ready to render.
 * Uses the documented `?onload=` global-callback pattern. `turnstile.ready()`
 * does NOT fire its callback for a dynamically-injected script, which silently
 * prevents the widget from ever rendering (and thus produces no token).
 *
 * A failed/timed-out load is NOT cached: the memo is cleared on rejection so the
 * next open retries, rather than being stuck behind a poisoned promise until a
 * full page reload.
 */
function ensureTurnstile(): Promise<void> {
	if (readyPromise) return readyPromise;
	const p = new Promise<void>((resolve, reject) => {
		if (window.turnstile?.render) return resolve();
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			reject(new Error('Turnstile script load timed out'));
		}, SCRIPT_TIMEOUT_MS);
		window.__tanyaTurnstileOnload = () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve();
		};
		const s = document.createElement('script');
		s.src = SCRIPT_URL;
		s.async = true;
		s.defer = true;
		s.onerror = () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			reject(new Error('Failed to load Turnstile'));
		};
		document.head.appendChild(s);
	});
	readyPromise = p;
	p.catch(() => {
		if (readyPromise === p) readyPromise = null;
	});
	return p;
}

export interface GetTokenOptions {
	/** Reject if no fresh token arrives within this many ms (default 8s). */
	timeoutMs?: number;
	/** Abort the wait early (e.g. the user pressed Stop). */
	signal?: AbortSignal;
}

export interface TokenSource {
	getToken(opts?: GetTokenOptions): Promise<string>;
	/** Remove the widget from Turnstile's registry (call on panel unmount). */
	destroy(): void;
}

/**
 * Render a visible managed Turnstile widget into `container` and return a source
 * that yields a fresh single-use token per `getToken()`.
 * The widget auto-solves on render/reset; getToken() returns the current token
 * and resets the widget so a new one is ready for the next call.
 *
 * Crucially, getToken() can no longer hang forever: it is bounded by a timeout,
 * cancellable via an AbortSignal, and rejected when Turnstile reports an error
 * or challenge timeout (e.g. a managed challenge that needs interaction the
 * invisible widget can't surface). Callers turn a rejection into a visible,
 * retryable error instead of a stuck spinner.
 */
export async function createTokenSource(container: HTMLElement, sitekey: string): Promise<TokenSource> {
	await ensureTurnstile();
	const ts = window.turnstile!;

	let current: string | null = null;
	type Waiter = { resolve: (t: string) => void; reject: (e: Error) => void };
	let waiters: Waiter[] = [];

	const rejectAll = (err: Error) => {
		const ws = waiters;
		waiters = [];
		ws.forEach((w) => w.reject(err));
	};

	const widgetId = ts.render(container, {
		sitekey,
		// Visible managed widget: shows "verifying"/success, and crucially surfaces
		// an interactive challenge when one is required so the user can complete it
		// (an invisible interaction-only widget would silently time out instead).
		appearance: 'always',
		callback: (token: string) => {
			current = token;
			const ws = waiters;
			waiters = [];
			ws.forEach((w) => w.resolve(token));
		},
		'error-callback': () => {
			current = null;
			rejectAll(new Error('Turnstile error'));
		},
		'timeout-callback': () => {
			current = null;
			rejectAll(new Error('Turnstile challenge timed out'));
		},
		'expired-callback': () => {
			current = null;
		}
	});

	return {
		getToken(opts: GetTokenOptions = {}): Promise<string> {
			const { timeoutMs = DEFAULT_TOKEN_TIMEOUT_MS, signal } = opts;
			return new Promise<string>((resolve, reject) => {
				if (signal?.aborted) {
					reject(new DOMException('Aborted', 'AbortError'));
					return;
				}

				let settled = false;
				let waiter: Waiter | null = null;

				const cleanup = () => {
					clearTimeout(timer);
					signal?.removeEventListener('abort', onAbort);
					if (waiter) waiters = waiters.filter((w) => w !== waiter);
				};
				const succeed = (token: string) => {
					if (settled) return;
					settled = true;
					cleanup();
					current = null;
					try {
						ts.reset(widgetId);
					} catch {
						/* ignore — a fresh token will be requested next time */
					}
					resolve(token);
				};
				const fail = (err: Error) => {
					if (settled) return;
					settled = true;
					cleanup();
					try {
						ts.reset(widgetId);
					} catch {
						/* ignore */
					}
					reject(err);
				};

				const timer = setTimeout(() => fail(new Error('Turnstile token timed out')), timeoutMs);
				const onAbort = () => fail(new DOMException('Aborted', 'AbortError'));
				signal?.addEventListener('abort', onAbort, { once: true });

				if (current) {
					succeed(current);
					return;
				}
				waiter = { resolve: succeed, reject: fail };
				waiters.push(waiter);
			});
		},
		destroy() {
			rejectAll(new Error('Turnstile widget destroyed'));
			try {
				ts.remove(widgetId);
			} catch {
				/* ignore */
			}
		}
	};
}
