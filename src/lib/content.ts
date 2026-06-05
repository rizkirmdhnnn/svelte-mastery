// Auto-built module manifest. Every `.svx` file under `content/` becomes a
// module; its frontmatter (`metadata`) drives nav, search, prev/next, progress.

export type ModuleMeta = {
	slug: string; // e.g. "level-2-reactivity/02-state"
	level: number; // 1..8
	levelTitle: string;
	order: number; // order within the level
	title: string;
	description: string;
	docs?: string; // official docs URL
	keywords?: string[];
	updated?: string; // ISO date of last update (git commit or frontmatter override)
};

// Metadata comes from a generated manifest (scripts/gen-manifest.mjs), NOT from
// importing the `.svx` modules — so the sidebar never pulls lesson code into the
// shared layout chunk, and each module stays in its own lazy chunk.
import { generatedModules } from './modules.generated';

export const modules: ModuleMeta[] = [...generatedModules]
	.filter((m) => typeof m.level === 'number')
	.sort((a, b) => a.level - b.level || a.order - b.order);

export type Level = { level: number; title: string; modules: ModuleMeta[] };

export const levels: Level[] = [...new Set(modules.map((m) => m.level))]
	.sort((a, b) => a - b)
	.map((level) => {
		const inLevel = modules.filter((m) => m.level === level);
		return { level, title: inLevel[0]?.levelTitle ?? `Level ${level}`, modules: inLevel };
	});

export function neighbors(slug: string): {
	current: ModuleMeta | null;
	prev: ModuleMeta | null;
	next: ModuleMeta | null;
} {
	const i = modules.findIndex((m) => m.slug === slug);
	if (i === -1) return { current: null, prev: null, next: null };
	return {
		current: modules[i],
		prev: modules[i - 1] ?? null,
		next: modules[i + 1] ?? null
	};
}

export function getModule(slug: string): ModuleMeta | null {
	return modules.find((m) => m.slug === slug) ?? null;
}
