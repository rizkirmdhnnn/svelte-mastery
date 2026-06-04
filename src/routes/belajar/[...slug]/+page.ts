import { error } from '@sveltejs/kit';
import { getModule, modules } from '$lib/content';

export const prerender = true;

export function entries() {
	return modules.map((m) => ({ slug: m.slug }));
}

const loaders = import.meta.glob('$lib/content/**/*.svx');

export async function load({ params }) {
	const slug = params.slug;
	const meta = getModule(slug);
	const key = Object.keys(loaders).find((k) => k.endsWith(`/content/${slug}.svx`));
	if (!meta || !key) error(404, `Modul tidak ditemukan: ${slug}`);
	const mod = (await loaders[key]()) as { default: unknown; metadata: unknown };
	return { slug, meta, Component: mod.default };
}
