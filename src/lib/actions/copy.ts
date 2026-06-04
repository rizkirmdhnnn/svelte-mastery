// Svelte action: inject a "Copy" button into every Shiki code block (`pre.shiki`)
// rendered by mdsvex. Runs client-side only (actions run on mount).
export function addCopyButtons(node: HTMLElement) {
	const blocks = node.querySelectorAll<HTMLPreElement>('pre.shiki');
	for (const pre of blocks) {
		if (pre.querySelector('.copy-btn')) continue;
		pre.classList.add('has-copy');
		const btn = document.createElement('button');
		btn.className = 'copy-btn';
		btn.type = 'button';
		btn.textContent = 'Copy';
		btn.addEventListener('click', async () => {
			const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
			try {
				await navigator.clipboard.writeText(code);
				btn.textContent = '✓ Tersalin';
				setTimeout(() => (btn.textContent = 'Copy'), 1300);
			} catch {
				/* ignore */
			}
		});
		pre.appendChild(btn);
	}
	return {};
}
