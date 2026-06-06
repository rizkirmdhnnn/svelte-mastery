// Typed wrapper over the generated official-docs list + coverage helpers.
// Used by the /kelengkapan completeness dashboard and the home page count.
import { officialPages, type OfficialPage } from './pages.generated';
import { modules, PRODUCT_ORDER, PRODUCT_TITLES, type Product } from './content';

export { officialPages, type OfficialPage };

const present = new Set(modules.map((m) => m.slug));

export function isPresent(slug: string): boolean {
	return present.has(slug);
}

export type Coverage = { product: Product; title: string; total: number; done: number };

export function coverageByProduct(): Coverage[] {
	return PRODUCT_ORDER.map((product) => {
		const inProduct = officialPages.filter((p) => p.product === product);
		return {
			product,
			title: PRODUCT_TITLES[product],
			total: inProduct.length,
			done: inProduct.filter((p) => present.has(p.slug)).length
		};
	}).filter((c) => c.total > 0);
}
