import { modules, type ModuleMeta } from './content';

/** Lightweight client-side search over the module manifest (title/keywords/desc). */
export function search(query: string): ModuleMeta[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const terms = q.split(/\s+/);

	const scored = modules.map((m) => {
		const title = m.title.toLowerCase();
		const keywords = (m.keywords ?? []).join(' ').toLowerCase();
		const hay = `${title} ${keywords} ${m.description.toLowerCase()} ${m.levelTitle.toLowerCase()}`;

		let score = 0;
		for (const t of terms) {
			if (!hay.includes(t)) return { m, score: -1 };
			if (title.includes(t)) score += 3;
			else if (keywords.includes(t)) score += 2;
			else score += 1;
		}
		return { m, score };
	});

	return scored
		.filter((x) => x.score >= 0)
		.sort((a, b) => b.score - a.score || a.m.level - b.m.level)
		.slice(0, 12)
		.map((x) => x.m);
}
