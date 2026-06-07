// Auto-built module manifest. Every `.svx` under content/ is a module; its
// frontmatter drives nav, search, prev/next, progress. Taxonomy: product → section.
export type Product = 'svelte' | 'kit' | 'cli';
export type Status = 'stable' | 'legacy' | 'reference';

export type ModuleMeta = {
	slug: string; // "svelte/runes/state" — equals the content path (minus .svx)
	product: Product;
	section: string;
	sectionTitle: string;
	sectionOrder: number;
	order: number;
	title: string;
	description: string;
	status: Status;
	docs?: string;
	keywords?: string[];
	updated?: string; // ISO date (git commit or frontmatter override)
};

import { generatedModules } from './modules.generated';

export const PRODUCT_ORDER: Product[] = ['svelte', 'kit', 'cli'];
export const PRODUCT_TITLES: Record<Product, string> = {
	svelte: 'Svelte',
	kit: 'SvelteKit',
	cli: 'CLI'
};

export const modules: ModuleMeta[] = [...generatedModules]
	.filter((m) => typeof m.product === 'string')
	.sort(
		(a, b) =>
			PRODUCT_ORDER.indexOf(a.product) - PRODUCT_ORDER.indexOf(b.product) ||
			a.sectionOrder - b.sectionOrder ||
			a.order - b.order ||
			a.slug.localeCompare(b.slug)
	);

export type Section = { section: string; title: string; order: number; modules: ModuleMeta[] };
export type ProductGroup = {
	product: Product;
	title: string;
	sections: Section[];
	modules: ModuleMeta[];
};

export const products: ProductGroup[] = PRODUCT_ORDER.map((product) => {
	const inProduct = modules.filter((m) => m.product === product);
	const keys = [...new Set(inProduct.map((m) => m.section))];
	const sections: Section[] = keys
		.map((section) => {
			const inSection = inProduct.filter((m) => m.section === section);
			return {
				section,
				title: inSection[0]?.sectionTitle ?? section,
				order: inSection[0]?.sectionOrder ?? 0,
				modules: inSection
			};
		})
		.sort((a, b) => a.order - b.order);
	return { product, title: PRODUCT_TITLES[product], sections, modules: inProduct };
}).filter((p) => p.modules.length > 0);

export function productOf(slug: string): Product {
	const head = slug.split('/')[0];
	return (PRODUCT_ORDER.includes(head as Product) ? head : 'svelte') as Product;
}

export function getModule(slug: string): ModuleMeta | null {
	return modules.find((m) => m.slug === slug) ?? null;
}

/** Prev/next traverse the full ordered list WITHIN a product. */
export function neighbors(slug: string): {
	current: ModuleMeta | null;
	prev: ModuleMeta | null;
	next: ModuleMeta | null;
} {
	const m = getModule(slug);
	if (!m) return { current: null, prev: null, next: null };
	const inProduct = modules.filter((x) => x.product === m.product);
	const i = inProduct.findIndex((x) => x.slug === slug);
	return { current: m, prev: inProduct[i - 1] ?? null, next: inProduct[i + 1] ?? null };
}

/** First module of a product (for switcher landing). */
export function firstOf(product: Product): ModuleMeta | null {
	return modules.find((m) => m.product === product) ?? null;
}
