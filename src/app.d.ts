// See https://svelte.dev/docs/kit/types#app.d.ts
// `Env`, `CfProperties`, and `ExecutionContext` are global types produced by
// `wrangler types` (worker-configuration.d.ts), regenerated via the `prepare`
// script. The Cloudflare adapter exposes these on `event.platform`.
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
