import { error, redirect } from '@sveltejs/kit';
import { getModule, modules, firstOf, PRODUCT_ORDER, type Product } from '$lib/content';
import { redirects } from '$lib/pages.generated';

export const prerender = true;

export function entries() {
	return modules.map((m) => ({ slug: m.slug }));
}

const loaders = import.meta.glob('$lib/content/**/*.svx');

export async function load({ params }) {
	const slug = params.slug;

	// Old level-* URL → new product/section URL (308 permanent).
	if (redirects[slug]) redirect(308, `/belajar/${redirects[slug]}`);

	// Bare product URL (/belajar/svelte) → that product's first module.
	if (PRODUCT_ORDER.includes(slug as Product)) {
		const first = firstOf(slug as Product);
		if (first) redirect(307, `/belajar/${first.slug}`);
	}

	const meta = getModule(slug);
	const key = Object.keys(loaders).find((k) => k.endsWith(`/content/${slug}.svx`));
	if (!meta || !key) error(404, `Modul tidak ditemukan: ${slug}`);
	const mod = (await loaders[key]()) as { default: unknown; metadata: unknown };
	return { slug, meta, Component: mod.default };
}
