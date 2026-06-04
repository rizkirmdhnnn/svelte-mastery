// Builds the sandboxed iframe document that runs compiled Svelte.
//
// Strategy: the compiled module (with bare `svelte/internal/*` imports + a
// default export) is put into a Blob; the iframe imports that blob URL. Bare
// specifiers resolve through an import map pinned to the EXACT Svelte version
// the compiler reported, so the runtime always matches the compiler — no skew.
// The compiled code is never string-escaped (it lives in the blob), so template
// literals / `${}` in user code can't break the host document.

export type IframeDoc = { srcdoc: string; revoke: () => void };

export function makeIframeDoc(compiledCode: string, version: string): IframeDoc {
	const url = URL.createObjectURL(new Blob([compiledCode], { type: 'text/javascript' }));

	const importmap = JSON.stringify({
		imports: {
			svelte: `https://esm.sh/svelte@${version}`,
			'svelte/': `https://esm.sh/svelte@${version}/`
		}
	});

	const srcdoc = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1rem; line-height: 1.5; }
  #app:empty::after { content: '⏳ memuat runtime Svelte…'; color: #888; font-size: .9rem; }
  .__pg_error { color: #c0362c; background: #fdecea; border: 1px solid #f5c2c0; padding: .6rem .8rem; border-radius: 8px; font-family: ui-monospace, monospace; font-size: .8rem; white-space: pre-wrap; }
</style>
<script type="importmap">${importmap}<\/script>
<script>
  (function () {
    function fmt(v) { try { return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v); } catch (e) { return String(v); } }
    function post(type, payload) { try { parent.postMessage({ source: 'pg', type: type, payload: payload }, '*'); } catch (e) {} }
    ['log', 'info', 'warn', 'error'].forEach(function (k) {
      var orig = console[k];
      console[k] = function () { post('console', { level: k, args: [].map.call(arguments, fmt) }); orig.apply(console, arguments); };
    });
    window.addEventListener('error', function (e) { post('error', { message: String((e.error && e.error.stack) || e.message) }); });
    window.addEventListener('unhandledrejection', function (e) { post('error', { message: String((e.reason && e.reason.stack) || e.reason) }); });
    window.__pgpost = post;
  })();
<\/script>
</head>
<body>
<div id="app"></div>
<script type="module">
  import { mount } from 'svelte';
  try {
    const mod = await import('${url}');
    const target = document.getElementById('app');
    mount(mod.default, { target });
    window.__pgpost('ready', {});
  } catch (e) {
    const box = document.createElement('pre');
    box.className = '__pg_error';
    box.textContent = String((e && e.stack) || e);
    document.body.innerHTML = '';
    document.body.appendChild(box);
    window.__pgpost('error', { message: String((e && e.stack) || e) });
  }
<\/script>
</body>
</html>`;

	return { srcdoc, revoke: () => URL.revokeObjectURL(url) };
}
