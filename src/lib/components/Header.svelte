<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import Search from './Search.svelte';
	import ProductSwitcher from './ProductSwitcher.svelte';

	let { onMenuToggle }: { onMenuToggle?: () => void } = $props();
</script>

<header class="header">
	<button class="menu" onclick={onMenuToggle} aria-label="Buka menu">☰</button>

	<a class="brand" href="/">
		<span class="logo" aria-hidden="true">🔥</span>
		<span class="name">Svelte &amp; SvelteKit <strong>Mastery</strong></span>
	</a>

	<div class="switcher-wrap"><ProductSwitcher /></div>

	<div class="search-wrap">
		<Search />
	</div>

	<div class="actions">
		<a class="nav-link" href="/roadmap" title="Peta belajar (roadmap)">
			<span aria-hidden="true">🗺️</span><span class="nav-label">Roadmap</span>
		</a>
		<button
			class="toggle theme"
			onclick={() => theme.toggle()}
			aria-label="Ganti tema gelap/terang"
			title="Tema gelap/terang"
		>
			{theme.current === 'dark' ? '☀️' : '🌙'}
		</button>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 40;
		height: var(--header-h);
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0 1rem;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.menu {
		display: none;
		font-size: 1.2rem;
		background: transparent;
		border: none;
		color: var(--text);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
		text-decoration: none;
		white-space: nowrap;
	}
	.logo {
		font-size: 1.2rem;
	}
	.name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.05rem;
	}
	.name strong {
		color: var(--brand);
	}
	.switcher-wrap {
		flex: none;
	}
	.search-wrap {
		flex: 1;
		display: flex;
		justify-content: center;
		min-width: 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--bg-subtle);
		color: var(--text);
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s var(--ease), transform 0.15s var(--ease), color 0.15s var(--ease);
	}
	.nav-link:hover {
		background: var(--bg-inset);
		color: var(--brand);
		transform: translateY(-1px);
		text-decoration: none;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.65rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--bg-subtle);
		color: var(--text);
		font-size: 0.82rem;
		font-weight: 600;
		transition: background 0.15s var(--ease), transform 0.15s var(--ease);
	}
	.toggle:hover {
		background: var(--bg-inset);
		transform: translateY(-1px);
	}
	.theme {
		font-size: 0.95rem;
		padding: 0.4rem 0.55rem;
	}
	@media (max-width: 900px) {
		.menu {
			display: inline-flex;
		}
		.name {
			display: none;
		}
		.nav-label {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.switcher-wrap {
			display: none;
		}
	}
</style>
