// Compiles Svelte source off the main thread. Vite bundles `svelte/compiler`
// into this worker. We compile in production mode (`dev: false`) so the output
// only needs the production client runtime — which we serve from esm.sh pinned
// to this exact compiler version (see make-srcdoc.ts), guaranteeing no skew.
import * as svelte from 'svelte/compiler';

type Req = { id: number; source: string };
type Res =
	| { id: number; ok: true; code: string; version: string; warnings: string[] }
	| { id: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<Req>) => {
	const { id, source } = e.data;
	try {
		const { js, warnings } = svelte.compile(source, {
			generate: 'client',
			dev: false,
			runes: true,
			css: 'injected'
		});
		const res: Res = {
			id,
			ok: true,
			code: js.code,
			version: svelte.VERSION,
			warnings: warnings.map((w) => w.message)
		};
		self.postMessage(res);
	} catch (err) {
		const res: Res = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
		self.postMessage(res);
	}
};

export {};
