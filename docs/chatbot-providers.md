# Tanya Svelte — Switching the chat model / provider

The answer-generating model sits behind a small **provider adapter** layer
(`src/lib/server/ai/providers/`). Switching is **config only — no code change**:
set `CHAT_PROVIDER`, set a matching `CHAT_MODEL`, and provide that provider's
API key (if it needs one).

> **Important:** the provider only changes who *writes the answer*. Retrieval is
> unchanged — embeddings (`bge-m3`) and vector search (Vectorize) always run on
> Cloudflare Workers AI, so you still need the `AI` + `VECTORIZE` bindings even
> when the chat model is Gemini.

| Provider | `CHAT_PROVIDER` | Example `CHAT_MODEL` | Key needed | Status |
|----------|----------------|----------------------|------------|--------|
| Workers AI (default) | `workers-ai` | `@cf/qwen/qwen2.5-coder-32b-instruct` | — (binding) | ✅ |
| Gemini | `gemini` | `gemini-2.5-flash-lite` | `GEMINI_API_KEY` | ✅ |
| Groq | `groq` | `llama-3.3-70b-versatile` | `GROQ_API_KEY` | ✅ |

## Switch to Gemini

1. **Get a key** — Google AI Studio → API keys.
2. **Set the key as a secret**
   - Production: `npx wrangler secret put GEMINI_API_KEY`
   - Local dev: add `GEMINI_API_KEY=...` to `.env` (gitignored; read via `$env/dynamic/private`).
3. **Point config at Gemini** — in `wrangler.jsonc` `vars` (or your env):
   ```jsonc
   "CHAT_PROVIDER": "gemini",
   "CHAT_MODEL": "gemini-2.5-flash-lite"   // or gemini-2.5-flash / gemini-3.5-flash
   ```
4. Redeploy (`npm run deploy`). To switch back, set `CHAT_PROVIDER` to `workers-ai`.

## Switch to Groq

Identical steps, different key + model:
- Key: `npx wrangler secret put GROQ_API_KEY` (prod) / `GROQ_API_KEY` in `.env` (local).
- Config: `"CHAT_PROVIDER": "groq"`, `"CHAT_MODEL": "llama-3.3-70b-versatile"` (or `llama-4-scout-17b-16e-instruct`).

**Free-tier note:** `gemini-2.5-flash-lite` has the highest free-tier request
volume; `gemini-2.5-flash` / `gemini-3.5-flash` are higher quality with lower
daily limits. (Free-tier traffic may be used by Google to improve their
products — see their terms.)

## How the adapter works

Each provider implements the same interface (`ChatProvider.streamChat`) and
returns a normalized `AsyncGenerator<string>` of text deltas, so the endpoint
and UI are provider-agnostic:

- **`workers-ai.ts`** — calls the `env.AI` binding (native SSE: `{response}`).
- **`gemini.ts`** / **`groq.ts`** — thin configs (endpoint + key name) over the
  shared **`openai-compatible.ts`** helper, which streams `{choices[].delta.content}`
  from any OpenAI-shaped `/chat/completions` endpoint. Gemini uses
  `/v1beta/openai/chat/completions` + `GEMINI_API_KEY`; Groq uses
  `https://api.groq.com/openai/v1/chat/completions` + `GROQ_API_KEY`.

`getProvider(name)` (`providers/index.ts`) resolves the active adapter, defaulting
to `workers-ai` for any unknown value.
