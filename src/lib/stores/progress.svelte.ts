import { browser } from '$app/environment';

const KEY = 'mastery:progress';

class ProgressStore {
	// Reassigned as a whole on every change so reads stay reactive.
	done = $state<Set<string>>(new Set());

	constructor() {
		if (browser) {
			try {
				const raw = localStorage.getItem(KEY);
				if (raw) this.done = new Set(JSON.parse(raw) as string[]);
			} catch {
				/* ignore */
			}
		}
	}

	#save() {
		if (browser) {
			try {
				localStorage.setItem(KEY, JSON.stringify([...this.done]));
			} catch {
				/* ignore */
			}
		}
	}

	isDone(slug: string): boolean {
		return this.done.has(slug);
	}

	toggle(slug: string) {
		const next = new Set(this.done);
		if (next.has(slug)) next.delete(slug);
		else next.add(slug);
		this.done = next;
		this.#save();
	}

	/** Percent (0..100) of the given slugs that are done. */
	percent(slugs: string[]): number {
		if (slugs.length === 0) return 0;
		const n = slugs.filter((s) => this.done.has(s)).length;
		return Math.round((n / slugs.length) * 100);
	}

	/** Count of done slugs among the given list. */
	count(slugs: string[]): number {
		return slugs.filter((s) => this.done.has(s)).length;
	}
}

export const progress = new ProgressStore();
