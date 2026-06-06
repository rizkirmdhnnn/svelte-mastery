<script lang="ts">
	import { officialPages, coverageByProduct, isPresent } from '$lib/official-pages';
	import { products } from '$lib/content';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	const coverage = coverageByProduct();
	const total = officialPages.length;
	const done = officialPages.filter((p) => isPresent(p.slug)).length;

	// Group official pages by product → sectionTitle for the checklist.
	const grouped = products.map((g) => {
		const pages = officialPages.filter((p) => p.product === g.product);
		const secs = [...new Set(pages.map((p) => p.sectionTitle))].map((title) => ({
			title,
			pages: pages.filter((p) => p.sectionTitle === title)
		}));
		return { product: g.product, title: g.title, secs };
	});
</script>

<svelte:head>
	<title>Kelengkapan materi — Svelte & SvelteKit Mastery</title>
	<meta
		name="description"
		content="Checklist kelengkapan modul vs daftar halaman dokumentasi resmi Svelte, SvelteKit, dan CLI."
	/>
</svelte:head>

<article class="kelengkapan">
	<header>
		<span class="kicker">✅ Kelengkapan</span>
		<h1>Kelengkapan materi vs docs resmi</h1>
		<p class="sub">
			Tiap halaman docs resmi punya satu modul di situs ini. Status keseluruhan:
			<strong>{done}/{total}</strong> terisi.
		</p>
		<div class="tallies">
			{#each coverage as c (c.product)}
				<div class="tally" class:full={c.done === c.total}>
					<span class="t-name">{c.title}</span>
					<span class="t-count">{c.done}/{c.total}</span>
				</div>
			{/each}
		</div>
	</header>

	{#each grouped as g (g.product)}
		<section class="prod">
			<h2>{g.title}</h2>
			{#each g.secs as sec (sec.title)}
				<h3>{sec.title}</h3>
				<ul>
					{#each sec.pages as p (p.slug)}
						<li class:missing={!isPresent(p.slug)}>
							<span class="mark">{isPresent(p.slug) ? '✓' : '○'}</span>
							{#if isPresent(p.slug)}
								<a href="/belajar/{p.slug}">{p.title}</a>
							{:else}
								<span class="t">{p.title}</span>
							{/if}
							<StatusBadge status={p.status} />
							<a class="docs" href={p.docs} target="_blank" rel="noopener noreferrer">docs ↗</a>
						</li>
					{/each}
				</ul>
			{/each}
		</section>
	{/each}
</article>

<style>
	.kelengkapan {
		max-width: 820px;
		margin: 0 auto;
		padding: 1.5rem 0 4rem;
	}
	.kicker {
		display: inline-block;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--brand);
		background: var(--accent-soft);
		padding: 0.25rem 0.7rem;
		border-radius: 99px;
		margin-bottom: 0.8rem;
	}
	h1 {
		font-size: 2rem;
		margin: 0 0 0.4rem;
		letter-spacing: -0.025em;
	}
	.sub {
		color: var(--text-muted);
		margin: 0 0 1.2rem;
	}
	.tallies {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.tally {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.5rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-subtle);
	}
	.tally.full {
		border-color: var(--ok);
	}
	.t-name {
		font-weight: 600;
	}
	.t-count {
		color: var(--brand);
		font-weight: 700;
	}
	.prod {
		margin-top: 2rem;
	}
	.prod h2 {
		font-size: 1.4rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.3rem;
	}
	.prod h3 {
		font-size: 0.95rem;
		color: var(--text-muted);
		margin: 1.2rem 0 0.4rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.28rem 0;
		font-size: 0.9rem;
	}
	.mark {
		color: var(--ok);
		width: 1rem;
	}
	li.missing {
		color: var(--text-faint);
	}
	li.missing .mark {
		color: var(--err, #cf222e);
	}
	.docs {
		margin-left: auto;
		font-size: 0.76rem;
		color: var(--text-muted);
	}
	li a {
		color: var(--text);
		text-decoration: none;
	}
	li a:hover {
		color: var(--brand);
	}
</style>
