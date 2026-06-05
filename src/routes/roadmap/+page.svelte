<script lang="ts">
	import { levels, modules } from '$lib/content';
	import { progress } from '$lib/stores/progress.svelte';
	import { roadmapMeta, FALLBACK_META, TUTORIAL_URL, SVELTEKIT_FROM_LEVEL } from '$lib/roadmap';
	import RoadmapStage from '$lib/components/RoadmapStage.svelte';

	const allSlugs = $derived(modules.map((m) => m.slug));
	const totalPct = $derived(progress.percent(allSlugs));
	const currentSlug = $derived(modules.find((m) => !progress.isDone(m.slug))?.slug ?? '');
	const allDone = $derived(allSlugs.length > 0 && totalPct === 100);
</script>

<svelte:head>
	<title>Roadmap Belajar — Svelte & SvelteKit Mastery</title>
	<meta
		name="description"
		content="Peta belajar Svelte 5 & SvelteKit v2 dari pemula hingga expert, mengikuti urutan dokumentasi resmi."
	/>
</svelte:head>

<article class="roadmap">
	<header class="rm-head">
		<span class="kicker">🗺️ Roadmap</span>
		<h1>Peta belajar Svelte &amp; SvelteKit</h1>
		<p class="sub">
			Jalur dari pemula hingga expert, mengikuti urutan <strong>dokumentasi resmi</strong>. Tiap
			tahap menaut ke modulnya di situs ini dan ke halaman docs resmi.
		</p>
		<p class="tut">
			💡 Mau langsung hands-on? Ikuti juga
			<a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer">tutorial interaktif resmi ↗</a
			>.
		</p>
		<div class="overall">
			<div class="o-bar"><div class="o-fill" style="width:{totalPct}%"></div></div>
			<span class="o-pct">{totalPct}% selesai</span>
		</div>
	</header>

	<ol class="timeline">
		<li class="row milestone start">
			<div class="rail"><span class="m-dot">🏁</span><span class="line"></span></div>
			<div class="m-label">Mulai di sini</div>
		</li>

		{#each levels as lvl, i (lvl.level)}
			{#if lvl.level === SVELTEKIT_FROM_LEVEL}
				<li class="row divider">
					<div class="rail"><span class="line"></span></div>
					<div class="d-label">↓ Lanjut ke SvelteKit</div>
				</li>
			{/if}
			<RoadmapStage
				level={lvl.level}
				title={lvl.title}
				modules={lvl.modules}
				meta={roadmapMeta[lvl.level] ?? FALLBACK_META}
				{currentSlug}
			/>
		{/each}

		<li class="row milestone end" class:done={allDone}>
			<div class="rail"><span class="m-dot">🚀</span><span class="line"></span></div>
			<div class="m-label">
				{allDone ? 'Selesai — kamu siap membangun app!' : 'Tujuan: siap membangun app lengkap'}
			</div>
		</li>
	</ol>
</article>

<style>
	.roadmap {
		max-width: 760px;
		margin: 0 auto;
		padding: 1.5rem 0 4rem;
	}
	.rm-head {
		margin-bottom: 2rem;
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
	.rm-head h1 {
		font-size: 2.1rem;
		margin: 0 0 0.4rem;
		letter-spacing: -0.025em;
	}
	.sub {
		font-size: 1.05rem;
		color: var(--text-muted);
		margin: 0 0 0.6rem;
	}
	.tut {
		font-size: 0.92rem;
		color: var(--text-muted);
		margin: 0 0 1.2rem;
	}
	.overall {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.o-bar {
		flex: 1;
		height: 8px;
		border-radius: 99px;
		background: var(--bg-inset);
		overflow: hidden;
	}
	.o-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--brand), var(--brand-2));
		transition: width 0.3s var(--ease);
	}
	.o-pct {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--brand);
		flex: none;
	}

	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	/* Milestone / divider rows reuse the stage rail so the spine stays continuous */
	.row {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	.rail {
		position: relative;
		flex: none;
		width: 2.6rem;
		display: flex;
		justify-content: center;
		align-self: stretch;
	}
	.line {
		position: absolute;
		left: 50%;
		width: 2px;
		transform: translateX(-50%);
		background: var(--border);
		top: 0;
		bottom: 0;
	}
	.milestone {
		padding: 0.4rem 0;
	}
	.milestone .m-dot {
		position: relative;
		z-index: 1;
		width: 2.4rem;
		height: 2.4rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 1.2rem;
		background: var(--bg-subtle);
		border: 2px dashed var(--border-strong);
	}
	.start .line {
		top: 50%;
	}
	.end .line {
		bottom: 50%;
	}
	.end.done .m-dot {
		background: var(--brand);
		border-style: solid;
		border-color: var(--brand);
	}
	.m-label {
		font-weight: 700;
		font-family: var(--font-display);
		color: var(--text-muted);
	}
	.end .m-label {
		color: var(--text);
	}
	.divider {
		padding: 0.1rem 0;
	}
	.divider .d-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--brand);
		background: var(--accent-soft);
		padding: 0.2rem 0.7rem;
		border-radius: 99px;
	}
	@media (max-width: 560px) {
		.rail {
			width: 2rem;
		}
		.milestone .m-dot {
			width: 2rem;
			height: 2rem;
			font-size: 1rem;
		}
	}
</style>
