<script lang="ts">
	import '../app.css';
	import '@fontsource-variable/fraunces';
	import '@fontsource-variable/hanken-grotesk';
	import { page } from '$app/state';
	import { SITE_URL, SITE_NAME, canonical } from '$lib/site';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	const canonicalUrl = $derived(canonical(page.url.pathname));

	let drawerOpen = $state(false);

	// Close the mobile drawer whenever the route changes.
	$effect(() => {
		page.url.pathname;
		drawerOpen = false;
	});
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content="{SITE_URL}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="{SITE_URL}/og.png" />
	<meta name="theme-color" content="#ff3e00" />
</svelte:head>

<div class="app">
	<Header onMenuToggle={() => (drawerOpen = !drawerOpen)} />

	<div class="body">
		<aside class="sidebar-col" class:open={drawerOpen}>
			<Sidebar onNavigate={() => (drawerOpen = false)} />
		</aside>

		{#if drawerOpen}
			<button class="scrim" aria-label="Tutup menu" onclick={() => (drawerOpen = false)}></button>
		{/if}

		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app {
		min-height: 100vh;
	}
	.body {
		display: grid;
		grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
		max-width: var(--maxw);
		margin: 0 auto;
	}
	.sidebar-col {
		position: sticky;
		top: var(--header-h);
		align-self: start;
		height: calc(100vh - var(--header-h));
		overflow-y: auto;
		border-right: 1px solid var(--border);
	}
	.content {
		min-width: 0;
		padding: 0 2rem;
	}
	.scrim {
		display: none;
	}
	@media (max-width: 900px) {
		.body {
			grid-template-columns: 1fr;
		}
		.sidebar-col {
			position: fixed;
			top: var(--header-h);
			left: 0;
			width: var(--sidebar-w);
			max-width: 85vw;
			background: var(--bg);
			z-index: 35;
			transform: translateX(-100%);
			transition: transform 0.22s var(--ease);
			box-shadow: var(--shadow-lg);
		}
		.sidebar-col.open {
			transform: translateX(0);
		}
		.scrim {
			display: block;
			position: fixed;
			inset: var(--header-h) 0 0 0;
			z-index: 34;
			border: none;
			background: rgba(0, 0, 0, 0.4);
		}
		.content {
			padding: 0 1.1rem;
		}
	}
</style>
