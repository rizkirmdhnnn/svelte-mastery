import { browser } from '$app/environment';

const KEY = 'mastery:compare';

class SettingsStore {
	/** Global "Mode Perbandingan" toggle — shows/hides all FrameworkCompare callouts. */
	comparisonMode = $state(true);

	constructor() {
		if (browser) {
			const v = localStorage.getItem(KEY);
			if (v !== null) this.comparisonMode = v === '1';
		}
	}

	toggleComparison() {
		this.comparisonMode = !this.comparisonMode;
		if (browser) {
			try {
				localStorage.setItem(KEY, this.comparisonMode ? '1' : '0');
			} catch {
				/* ignore */
			}
		}
	}
}

export const settings = new SettingsStore();
