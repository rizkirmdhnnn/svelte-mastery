<script lang="ts">
	import { levels, modules } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';

	const firstSlug = $derived(modules[0]?.slug ?? '');
	const totalPercent = $derived(progress.percent(modules.map((m) => m.slug)));

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
			title: '100% docs terbaru',
			body: 'Svelte 5 (runes) & SvelteKit v2 — bukan sintaks lama. Legacy ditandai jelas.'
		},
		{
			icon: '🧭',
			title: 'Pemula → Expert',
			body: '8 level, 42 modul terstruktur, dengan analogi untuk konsep yang sulit.'
		}
	];
</script>

<svelte:head>
	<title>Svelte &amp; SvelteKit Mastery — Belajar dari Pemula hingga Expert</title>
</svelte:head>

<section class="hero">
	<span class="kicker">🔥 Svelte 5 · SvelteKit v2</span>
	<h1>Kuasai <span class="grad">Svelte &amp; SvelteKit</span><br />dari pemula hingga expert</h1>
	<p class="sub">
		Kurikulum interaktif berbahasa Indonesia, mengacu 100% ke dokumentasi resmi terbaru.
		Belajar konsep, langsung praktik di playground, dan lihat padanannya di framework lain.
	</p>
	<div class="cta">
		{#if firstSlug}
			<a class="btn btn-primary big" href="/belajar/{firstSlug}">Mulai Belajar →</a>
		{/if}
		<a class="btn big" href="/cheatsheet-runes">Cheat Sheet Runes</a>
	</div>
	{#if totalPercent > 0}
		<p class="resume">Progress kamu: <strong>{totalPercent}%</strong> selesai.</p>
	{/if}
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
	<h2>Peta Belajar</h2>
	<div class="level-grid">
		{#each levels as lvl (lvl.level)}
			{@const slugs = lvl.modules.map((m) => m.slug)}
			{@const pct = progress.percent(slugs)}
			<a class="level-card" href="/belajar/{lvl.modules[0]?.slug ?? ''}">
				<div class="lc-head">
					<span class="lc-num">Level {lvl.level}</span>
					<span class="lc-count">{lvl.modules.length} modul</span>
				</div>
				<h3>{lvl.title}</h3>
				<div class="lc-bar"><div class="lc-fill" style="width:{pct}%"></div></div>
				<span class="lc-pct">{pct}% selesai</span>
			</a>
		{/each}
	</div>
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
		text-align: center;
		padding: 4rem 1rem 3rem;
		max-width: 780px;
		margin: 0 auto;
	}
	.kicker {
		display: inline-block;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--brand);
		background: var(--accent-soft);
		padding: 0.3rem 0.8rem;
		border-radius: 99px;
		margin-bottom: 1.2rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 5vw, 3.1rem);
		line-height: 1.1;
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
		font-size: 1.1rem;
		color: var(--text-muted);
		margin: 0 auto 1.8rem;
		max-width: 620px;
	}
	.cta {
		display: flex;
		gap: 0.7rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.big {
		padding: 0.7rem 1.3rem;
		font-size: 1rem;
	}
	.resume {
		margin-top: 1.2rem;
		font-size: 0.9rem;
		color: var(--text-muted);
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
		transition: border-color 0.15s var(--ease), transform 0.15s var(--ease);
	}
	.level-card:hover {
		border-color: var(--brand);
		transform: translateY(-2px);
		text-decoration: none;
	}
	.lc-head {
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
		margin-bottom: 0.4rem;
	}
	.lc-num {
		font-weight: 700;
		color: var(--brand);
	}
	.lc-count {
		color: var(--text-faint);
	}
	.level-card h3 {
		margin: 0 0 0.8rem;
		font-size: 1.05rem;
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
	.compare-note p {
		font-size: 1rem;
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.3rem;
		background: var(--bg-subtle);
	}
</style>
