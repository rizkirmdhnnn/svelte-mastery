import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

class ThemeStore {
	current = $state<Theme>('light');

	constructor() {
		if (browser) {
			const attr = document.documentElement.dataset.theme;
			this.current = attr === 'dark' ? 'dark' : 'light';
		}
	}

	#apply(value: Theme) {
		this.current = value;
		if (browser) {
			document.documentElement.dataset.theme = value;
			try {
				localStorage.setItem('mastery:theme', value);
			} catch {
				/* ignore */
			}
		}
	}

	set(value: Theme) {
		this.#apply(value);
	}

	toggle() {
		this.#apply(this.current === 'light' ? 'dark' : 'light');
	}
}

export const theme = new ThemeStore();
