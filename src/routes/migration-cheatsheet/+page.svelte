<script lang="ts">
	import LegacyVsModern from '$lib/components/LegacyVsModern.svelte';

	const reactMap = [
		{ a: 'useState(0)', b: '$state(0)' },
		{ a: 'useMemo(() => x, [x])', b: '$derived(x)' },
		{ a: 'useEffect(() => {…}, [x])', b: '$effect(() => {…})' },
		{ a: 'useEffect cleanup (return fn)', b: '$effect(() => { return () => {…} })' },
		{ a: 'props (read-only)', b: 'let { … } = $props()' },
		{ a: 'children prop', b: '{#snippet} / {@render children()}' },
		{ a: 'useRef (DOM)', b: 'bind:this={el}' },
		{ a: 'useContext / createContext', b: 'getContext / setContext' },
		{ a: 'cond && <X/> , list.map()', b: '{#if} … {/if} , {#each} … {/each}' },
		{ a: 'onClick={fn}', b: 'onclick={fn}' },
		{ a: 'CSS Modules / styled', b: '<' + 'style> (scoped otomatis)' },
		{ a: 'Redux / Zustand', b: 'runes di .svelte.ts / stores' }
	];

	const vueMap = [
		{ a: 'ref(0) / reactive({})', b: '$state(0)' },
		{ a: 'computed(() => x)', b: '$derived(x)' },
		{ a: 'watch / watchEffect', b: '$effect(() => {…})' },
		{ a: 'defineProps()', b: 'let { … } = $props()' },
		{ a: 'v-model', b: 'bind: + $bindable()' },
		{ a: 'slots / <slot>', b: '{#snippet} / {@render}' },
		{ a: 'v-if / v-for', b: '{#if} / {#each}' },
		{ a: '@click', b: 'onclick' },
		{ a: 'provide / inject', b: 'setContext / getContext' },
		{ a: '<' + 'style scoped>', b: '<' + 'style> (scoped otomatis)' },
		{ a: 'onMounted / onUnmounted', b: '$effect(() => { return cleanup })' },
		{ a: 'Pinia', b: 'runes di .svelte.ts / stores' }
	];

	const s4to5 = [
		{ legacy: 'export let title', modern: 'let { title } = $props()' },
		{ legacy: 'export let x = 1', modern: 'let { x = 1 } = $props()' },
		{ legacy: '$: doubled = n * 2', modern: 'let doubled = $derived(n * 2)' },
		{ legacy: '$: { sideEffect(n) }', modern: '$effect(() => { sideEffect(n) })' },
		{ legacy: 'let count = 0 (reaktif)', modern: 'let count = $state(0)' },
		{ legacy: 'on:click={fn}', modern: 'onclick={fn}' },
		{ legacy: 'on:click|preventDefault', modern: 'onclick={(e)=>{e.preventDefault()}}' },
		{
			legacy: 'createEventDispatcher()',
			modern: 'prop callback: let { onsave } = $props()'
		},
		{ legacy: '<slot />', modern: '{@render children()}' },
		{ legacy: '<slot name="x" />', modern: '{@render x()} (snippet prop)' },
		{ legacy: '$$props / $$restProps', modern: 'let { ...rest } = $props()' },
		{ legacy: '<svelte:component this={C}/>', modern: '<C /> (komponen dinamis langsung)' },
		{ legacy: 'beforeUpdate / afterUpdate', modern: '$effect.pre / $effect' }
	];
</script>

<svelte:head><title>Migration Cheat Sheet — Svelte & SvelteKit Mastery</title></svelte:head>

<article class="prose ref">
	<h1>🔄 Migration Cheat Sheet</h1>
	<p class="lead">
		Peta cepat dari React, Vue, dan Svelte 4 ke Svelte 5 (runes). Bukan terjemahan harfiah — fokus ke
		padanan konsep yang paling lazim.
	</p>

	<h2>React → Svelte 5</h2>
	<div class="table-scroll">
		<table class="map">
			<thead><tr><th>React</th><th>Svelte 5</th></tr></thead>
			<tbody>
				{#each reactMap as r (r.a)}
					<tr><td><code>{r.a}</code></td><td><code class="sv">{r.b}</code></td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h2>Vue 3 → Svelte 5</h2>
	<div class="table-scroll">
		<table class="map">
			<thead><tr><th>Vue 3</th><th>Svelte 5</th></tr></thead>
			<tbody>
				{#each vueMap as r (r.a)}
					<tr><td><code>{r.a}</code></td><td><code class="sv">{r.b}</code></td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h2>Svelte 4 (legacy) → Svelte 5 (modern)</h2>
	<LegacyVsModern rows={s4to5} />

	<p class="src">
		Sumber: <a href="https://svelte.dev/docs/svelte/v5-migration-guide" target="_blank" rel="noopener"
			>Panduan migrasi resmi Svelte 5</a
		>
	</p>
</article>

<style>
	.ref {
		padding: 1.5rem 0 4rem;
		max-width: 880px;
	}
	.lead {
		color: var(--text-muted);
		font-size: 1.05rem;
	}
	/* Horizontal scroll fallback so a wide row never stretches the page. */
	.table-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 1rem 0 2rem;
	}
	.map {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	.map th,
	.map td {
		border: 1px solid var(--border);
		padding: 0.5rem 0.7rem;
		text-align: left;
		width: 50%;
	}
	.map th {
		background: var(--bg-subtle);
	}
	.map code {
		font-size: 0.82rem;
		overflow-wrap: break-word;
		word-break: break-word;
	}
	.sv {
		color: var(--brand);
		font-weight: 600;
	}
	.src {
		font-size: 0.85rem;
		color: var(--text-muted);
	}
</style>
