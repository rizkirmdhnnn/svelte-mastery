<script lang="ts">
	import { products, modules } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { officialPages } from '$lib/official-pages';
	import { SITE_DESCRIPTION } from '$lib/site';
	import HeroDemo from '$lib/components/HeroDemo.svelte';

	const firstSlug = $derived(modules[0]?.slug ?? '');
	const totalPercent = $derived(progress.percent(modules.map((m) => m.slug)));
	const total = officialPages.length;

	const features = [
		{
			icon: '🎮',
			title: 'Playground interaktif',
			body: 'Edit kode Svelte, lihat hasilnya live — di-compile langsung di browser-mu.'
		},
		{
			icon: '💡',
			title: 'Kalau di framework lain…',
			body: 'Tiap konsep disandingkan dengan React, Vue, Next.js, Nuxt, dan Nest.js.'
		},
		{
			icon: '📚',
			title: '100% docs resmi',
			body: `${total} modul — satu untuk tiap halaman docs Svelte, SvelteKit & CLI, termasuk Reference & API.`
		},
		{
			icon: '🧭',
			title: 'Tiga menu terpisah',
			body: 'Svelte, SvelteKit, dan CLI dipisah lewat switcher — sidebar mengikuti struktur docs resmi.'
		}
	];

	const PRODUCT_BLURB: Record<string, string> = {
		svelte: 'Bahasa & compiler: runes, template, styling, special elements, runtime, reference, legacy.',
		kit: 'Meta-framework full-stack: routing, load, form actions, deploy/adapters, advanced, reference.',
		cli: 'Perintah sv: create, add, check, migrate — plus add-ons & API.'
	};
</script>

<svelte:head>
	<title>Svelte &amp; SvelteKit Mastery — Belajar dari Pemula hingga Expert</title>
	<meta name="description" content={SITE_DESCRIPTION} />
	<meta property="og:title" content="Svelte & SvelteKit Mastery — dari Pemula hingga Expert" />
	<meta property="og:description" content={SITE_DESCRIPTION} />
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<span class="kicker">🔥 Svelte 5 · SvelteKit v2 · CLI sv</span>
		<h1>Kuasai <span class="grad">Svelte &amp; SvelteKit</span><br />dari pemula hingga expert</h1>
		<p class="sub">
			Kurikulum interaktif berbahasa Indonesia, mengacu 100% ke dokumentasi resmi terbaru —
			{total} modul, satu untuk tiap halaman docs. Belajar konsep, langsung praktik di playground,
			dan lihat padanannya di framework lain.
		</p>
		<div class="cta">
			{#if firstSlug}
				<a class="btn btn-primary big" href="/belajar/{firstSlug}">Mulai Belajar →</a>
			{/if}
			<a class="btn big" href="/cheatsheet-runes">Cheat Sheet Runes</a>
		</div>
		<div class="prod-links">
			{#each products as p (p.product)}
				<a class="prod-link" href="/belajar/{p.modules[0]?.slug ?? p.product}">
					{p.title} <span class="pc">{p.modules.length}</span>
				</a>
			{/each}
		</div>
		{#if totalPercent > 0}
			<p class="resume">Progress kamu: <strong>{totalPercent}%</strong> selesai.</p>
		{/if}
	</div>
	<div class="hero-demo-col">
		<HeroDemo />
	</div>
</section>

<section class="features">
	{#each features as f (f.title)}
		<div class="feature">
			<div class="f-ic" aria-hidden="true">{f.icon}</div>
			<h3>{f.title}</h3>
			<p>{f.body}</p>
		</div>
	{/each}
</section>

<section class="levels">
	<div class="levels-head">
		<h2>Tiga jalur belajar</h2>
		<a class="roadmap-link" href="/roadmap">🗺️ Lihat roadmap lengkap →</a>
	</div>
	<div class="level-grid">
		{#each products as p (p.product)}
			{@const slugs = p.modules.map((m) => m.slug)}
			{@const pct = progress.percent(slugs)}
			<a class="level-card" href="/belajar/{p.modules[0]?.slug ?? ''}">
				<div class="lc-head">
					<span class="lc-num">{p.title}</span>
					<span class="lc-count">{p.modules.length} modul · {p.sections.length} bagian</span>
				</div>
				<p class="lc-blurb">{PRODUCT_BLURB[p.product] ?? ''}</p>
				<div class="lc-bar"><div class="lc-fill" style="width:{pct}%"></div></div>
				<span class="lc-pct">{pct}% selesai</span>
			</a>
		{/each}
	</div>
	<p class="coverage-note">
		Mau lihat kelengkapan vs docs resmi? <a href="/kelengkapan">Buka dashboard kelengkapan →</a>
	</p>
</section>

<section class="compare-note">
	<h2>Datang dari framework lain?</h2>
	<p>
		Sudah jago React/Vue? Tiap modul otomatis menyandingkan konsep Svelte dengan padanannya di
		<strong>React, Vue, Next.js, Nuxt, dan Nest.js</strong> lewat blok
		<em>"💡 Kalau di framework lain…"</em> — jadi kamu bisa langsung memetakan apa yang sudah kamu
		kuasai ke Svelte 5.
	</p>
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 2.5rem;
		align-items: center;
		max-width: 1060px;
		margin: 0 auto;
		padding: 4rem 1rem 3rem;
	}
	.kicker {
		display: inline-block;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--link);
		background: var(--accent-soft);
		padding: 0.3rem 0.8rem;
		border-radius: 99px;
		margin-bottom: 1.2rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 4.5vw, 3rem);
		line-height: 1.08;
		letter-spacing: -0.03em;
		margin: 0 0 1rem;
	}
	.grad {
		background: linear-gradient(120deg, var(--brand), var(--brand-2));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.sub {
		font-size: 1.08rem;
		color: var(--text-muted);
		margin: 0 0 1.8rem;
		max-width: 540px;
	}
	.cta {
		display: flex;
		gap: 0.7rem;
		flex-wrap: wrap;
	}
	.big {
		padding: 0.7rem 1.3rem;
		font-size: 1rem;
	}
	.prod-links {
		display: flex;
		gap: 0.6rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}
	.prod-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--bg-subtle);
		color: var(--text);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.85rem;
	}
	.prod-link:hover {
		color: var(--brand);
		border-color: var(--brand);
	}
	.prod-link .pc {
		font-size: 0.72rem;
		color: var(--text-muted);
		background: var(--bg-inset);
		padding: 0.05rem 0.35rem;
		border-radius: 5px;
	}
	.resume {
		margin-top: 1.2rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
			gap: 1.8rem;
			padding: 2.5rem 1rem;
		}
		.cta {
			justify-content: flex-start;
		}
	}
	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 1rem;
		max-width: 1000px;
		margin: 1rem auto 3rem;
	}
	.feature {
		padding: 1.3rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--bg-elevated);
		box-shadow: var(--shadow-sm);
		transition:
			transform 0.15s var(--ease),
			box-shadow 0.15s var(--ease);
	}
	.feature:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-md);
	}
	.f-ic {
		font-size: 1.6rem;
		margin-bottom: 0.5rem;
	}
	.feature h3 {
		margin: 0 0 0.35rem;
		font-size: 1.05rem;
	}
	.feature p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	.levels,
	.compare-note {
		max-width: 1000px;
		margin: 0 auto 3rem;
	}
	.levels h2,
	.compare-note h2 {
		font-size: 1.5rem;
		margin-bottom: 1.2rem;
	}
	.levels-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1.2rem;
	}
	.levels-head h2 {
		margin-bottom: 0;
	}
	.roadmap-link {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--brand);
		white-space: nowrap;
	}
	.roadmap-link:hover {
		text-decoration: underline;
	}
	.level-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1rem;
	}
	.level-card {
		display: block;
		padding: 1.2rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--bg-elevated);
		color: var(--text);
		text-decoration: none;
		transition:
			border-color 0.15s var(--ease),
			transform 0.15s var(--ease);
	}
	.level-card:hover {
		border-color: var(--brand);
		transform: translateY(-3px);
		box-shadow: var(--shadow-md);
		text-decoration: none;
	}
	.lc-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		margin-bottom: 0.5rem;
	}
	.lc-num {
		font-weight: 700;
		color: var(--brand-ink);
		background: var(--brand);
		padding: 0.12rem 0.5rem;
		border-radius: 5px;
		font-size: 0.8rem;
	}
	.lc-count {
		color: var(--text-faint);
		text-align: right;
	}
	.lc-blurb {
		margin: 0 0 0.8rem;
		font-size: 0.86rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
	.lc-bar {
		height: 6px;
		border-radius: 99px;
		background: var(--bg-inset);
		overflow: hidden;
		margin-bottom: 0.4rem;
	}
	.lc-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--brand), var(--brand-2));
	}
	.lc-pct {
		font-size: 0.76rem;
		color: var(--text-muted);
	}
	.coverage-note {
		margin-top: 1.2rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	.coverage-note a {
		color: var(--brand);
		font-weight: 600;
	}
	.compare-note p {
		font-size: 1rem;
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.3rem;
		background: var(--bg-subtle);
	}
</style>
