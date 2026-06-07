# Design Spec — AI Chatbot "Tanya Svelte"

**Date:** 2026-06-07
**Status:** Approved (brainstorming complete) — ready for implementation planning
**Author:** Achmad Rizki Ramadhan (with Claude)

---

## 1. Summary

A floating, site-wide AI tutor for the Learn-svelte ("Hangat Svelte") learning platform.
Users can ask Svelte / SvelteKit questions in natural Indonesian and get streamed answers
**grounded in the site's own 178 content modules** via semantic retrieval, with citations
back to the relevant lessons. It runs on Cloudflare's **free** Workers AI, sits behind a
**provider adapter** so the model/provider can be swapped later with a single env var, and
is protected against abuse/runaway cost by Turnstile + a per-visitor daily cap.

This is the project's **first dynamic (non-prerendered) feature** — until now the site is 100%
static.

---

## 2. Goals & Non-Goals

### Goals
- Let users "easily ask questions about the available content" from anywhere on the site.
- Answers must be **trustworthy for current Svelte 5** (runes, not legacy `export let`) — achieved
  via strong retrieval over the site's own correct docs, not the model's stale memory.
- **Free to run** for personal traffic; protected so it stays free.
- **Provider/model swappable** in the future without code changes.
- Fit the existing "Hangat Svelte" design system and Indonesian-first tone.

### Non-Goals (initial release)
- User accounts / server-side chat history (history is client-side only).
- Multi-provider automatic fallback (single configurable provider for now; revisit later).
- Hybrid keyword+semantic retrieval (semantic only to start; keyword is a future upgrade).
- A dedicated `/tanya` page (floating panel only).
- Voice, image, or multi-modal input.

---

## 3. Key Decisions (with rationale)

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Bot role | **Broad Svelte tutor** | Docs are primary source, but it may explain beyond them and generate code. More helpful than strict docs-only; retrieval + guardrails keep it accurate. |
| 2 | LLM backend | **Cloudflare Workers AI** (free) | Native `env.AI` binding, no API key, data never leaves Cloudflare, free tier (10k Neurons/day) covers personal traffic; overflow ≈ $0.002/turn. |
| 3 | Provider design | **Single configurable provider** (env-var switchable), default Workers AI | Meets "switch in the future" goal without the complexity of automatic fallback. |
| 4 | Retrieval | **Semantic search via Vectorize + `bge-m3` (multilingual) embeddings** | Site is Indonesian but Svelte terms are English; semantic multilingual search beats keyword on paraphrased/cross-language questions. |
| 5 | UI placement | **Floating bubble → expandable panel**, site-wide | Always one tap away while reading any lesson; fits the existing floating-widget slot; doesn't conflict with Cmd+K search. |
| 6 | Abuse guard | **Per-visitor daily cap (KV) + invisible Turnstile** | Public AI endpoint shares the account's free Neurons; needs strong protection against bots/crawlers exhausting the free tier. |
| 7 | History | **Client-side localStorage only** | Private and free; no server storage or accounts needed. |
| 8 | Citations | **Rendered from retrieval metadata** (deterministic) | Don't rely on the model to cite correctly; the retrieved chunks already carry `slug`/`title`. |
| 9 | Caching | **KV response cache** (normalized question) | Docs Q&A repeats; cache hits cost 0 Neurons + 0 latency, multiplying effective free capacity. |
| 10 | Language | **Indonesian-primary**, mirrors the user's language | Matches the site and the user's stated preference. |

---

## 4. Architecture & Request Flow

The global `prerender = true` (in `src/routes/+layout.ts`) **stays**. The new chat route opts out
with `export const prerender = false`, so `@sveltejs/adapter-cloudflare` serves everything static
**except** `/api/chat`, which runs live in the Worker. This is a supported mixed static + dynamic
deployment.

```
Browser (ChatPanel.svelte)
   │  POST /api/chat  { messages, clientId, turnstileToken }
   ▼
src/routes/api/chat/+server.ts   (prerender = false; runs in the Worker)
   1. Verify Turnstile token (siteverify)            → reject bots
   2. Rate-limit check (KV RATE_LIMIT, per visitor/day) → reject if over cap
   3. Cache lookup (KV CACHE, normalized question)   → HIT: return cached answer, 0 Neurons
   4. Embed latest user question → env.AI  @cf/baai/bge-m3
   5. Vectorize query (top-k ≈ 5) → doc chunks + {slug, title, product, section}
   6. Build prompt: system(guardrails) + retrieved context + chat history + question
   7. Provider adapter (Workers AI) → streamChat({ stream: true })
   8. Stream tokens to client (SSE) + final "sources" event for citation chips
   9. Increment rate-limit counter; write final answer + sources to cache
```

---

## 5. Retrieval Index (built at deploy time)

A Node script `scripts/index-content.mjs` (run via `npm run index`):
1. Walks `src/lib/content/**/*.svx`.
2. Strips YAML frontmatter and `<script>`/component markup, keeping prose + code.
3. **Chunks by heading** (~300–500 tokens per chunk), each tagged with metadata:
   `{ slug, title, product, section, headingPath }`.
4. Embeds each chunk with `@cf/baai/bge-m3` via the **Workers AI REST API**
   (uses `CF_API_TOKEN` + `CF_ACCOUNT_ID`, supplied via `.dev.vars`/CI — never bundled in the Worker).
5. Upserts vectors + metadata into the **Vectorize** index.

Re-run whenever content changes (can be wired into the existing `prebuild`/CI pipeline later).
Corpus size (≈178 modules → low thousands of chunks) fits comfortably in the Vectorize free tier.
(Exact Vectorize free-tier limits to be confirmed at planning time, same as the LLM numbers were.)

---

## 6. Provider Adapter ("switch anytime")

```ts
// shape (illustrative)
interface ChatProvider {
  streamChat(opts: {
    system: string;
    messages: ChatMessage[];
    model: string;
    signal?: AbortSignal;
  }): Promise<ReadableStream<Uint8Array>>; // normalized token stream
}
```

- Adapters: `src/lib/server/ai/providers/workers-ai.ts` (default, implemented) +
  ready-to-fill stubs `gemini.ts`, `groq.ts`, `claude.ts`.
- A registry selects the active adapter from env: `CHAT_PROVIDER`, `CHAT_MODEL`, `EMBED_MODEL`.
- The `+server.ts` endpoint and all UI components are **provider-agnostic** — they speak one shape.
- Switching providers = change env var (+ add a secret if the new provider needs a key) + redeploy.
  **Zero code changes.**

---

## 7. Frontend Components (Svelte 5 runes)

All under `src/lib/components/chat/`:

- **`ChatBubble.svelte`** — floating launcher, bottom-right (z-index ≈ 45, above content/sidebar,
  below the Search/modal overlays at z-50). Mounted once in `src/routes/+layout.svelte` → site-wide.
- **`ChatPanel.svelte`** — expandable panel: scrollable message list, input box, streaming
  indicator, "clear chat", and (when empty) a few **suggested starter prompts**.
- **`ChatMessage.svelte`** — renders assistant markdown + code blocks by **reusing the existing
  Shiki/CodeBlock** components (no reinvention). Citation chips link to `/belajar/<slug>`.
  Svelte code blocks get a **"Buka di Playground"** action that hands the snippet to the existing
  Playground.
- **`chat.svelte.ts`** (store) — `$state` for `messages`, `streaming` status, anonymous `clientId`,
  and **history persisted to `localStorage`** (own key, e.g. `mastery:chat`).
- **Turnstile** — invisible widget; token attached to the request (first message / per session).

The panel passes the **current lesson** (route slug/title) as lightweight context so follow-ups
like *"jelasin ini"* work even though the tutor is general-purpose.

---

## 8. Guardrails (system prompt)

- Answer **Svelte 5-first**: runes (`$state`, `$derived`, `$effect`, `$props`), never legacy
  `export let` / `$:` / stores-by-default.
- **Prefer the retrieved docs**; ground answers in them and cite sources.
- **Admit uncertainty** instead of guessing; if retrieval found nothing relevant, say so and
  suggest browsing.
- Stay on-topic: Svelte / SvelteKit / web dev.
- **Reply in the user's language** (Indonesian by default).
- Warm, friendly "Hangat Svelte" tone.

---

## 9. Cost & Limits

- Workers AI free tier: **10,000 Neurons/day** (resets 00:00 UTC).
- A typical RAG turn (~3k in / ~500 out on a 70B-class model) ≈ ~180 Neurons → ~55 uncached
  heavy turns/day; the **KV response cache** multiplies effective capacity for repeated questions.
- Overflow past free tier ≈ **$0.002/turn**.
- **Turnstile + per-visitor daily cap (~40/day)** prevent a single bad actor from draining the
  account's free Neurons or triggering paid overflow.

---

## 10. Error Handling

| Situation | Behavior |
|-----------|----------|
| Over daily cap | Friendly Indonesian notice with reset time; input disabled until reset. |
| Turnstile fails | Re-challenge; block request until a valid token is present. |
| Provider/timeout error | Graceful "maaf, lagi ada gangguan" message + retry affordance. |
| No relevant chunks | Still answers but flags lower confidence and suggests browsing the docs. |
| User aborts / closes | `AbortController` cancels the in-flight stream cleanly. |

---

## 11. Testing Strategy

- **Unit:** provider adapter (mocked `fetch`/`env.AI`), chunker, rate-limiter, cache key
  normalization, prompt builder.
- **Integration:** `/api/chat` with mocked `AI`/`VECTORIZE`/`KV` bindings (Vitest Workers pool /
  Miniflare).
- **E2E (Playwright):** open bubble → ask a question → see streamed answer + citation chip →
  exceed cap → see rate-limit notice.
- **Manual smoke:** real Workers AI in `wrangler dev`.

---

## 12. New Infrastructure / Config

`wrangler.jsonc` additions:
- `ai = { binding = "AI" }` (Workers AI)
- `vectorize` binding (e.g. `VECTORIZE` → index `tanya-svelte`)
- `kv_namespaces`: `RATE_LIMIT`, `CACHE`
- vars: `CHAT_PROVIDER`, `CHAT_MODEL`, `EMBED_MODEL`, `TURNSTILE_SITE_KEY`
- secret: `TURNSTILE_SECRET_KEY`

`src/app.d.ts`: extend `Platform.env` with `AI`, `VECTORIZE`, `RATE_LIMIT`, `CACHE`,
`TURNSTILE_SECRET_KEY`, and the chat vars.

Offline indexing (`scripts/index-content.mjs`) uses `CF_API_TOKEN` + `CF_ACCOUNT_ID` from
`.dev.vars` / CI secrets — **not** bundled into the Worker.

New dependency: Turnstile is script-tag based (no heavy SDK); no LLM SDK needed (Workers AI is a
binding). Provider stubs for Gemini/Groq/Claude will use `fetch` (no SDK) to stay light.

---

## 13. Suggested Implementation Phases (for the plan)

1. **Backend foundation** — bindings, `app.d.ts`, provider adapter + Workers AI impl, `/api/chat`
   endpoint with streaming (no retrieval yet; echo/grounding stub).
2. **Retrieval** — `index-content.mjs`, Vectorize index, query + prompt assembly wired into the
   endpoint.
3. **Abuse + cost controls** — Turnstile verify, KV rate-limit, KV response cache.
4. **Frontend** — bubble, panel, message rendering (reuse Shiki/CodeBlock), store + localStorage,
   Turnstile widget, citations, "Buka di Playground", suggested prompts.
5. **Polish & tests** — error states, guardrail tuning, unit/integration/E2E, `wrangler dev` smoke.

---

## 14. Future Enhancements (out of scope now)

- Automatic provider fallback chain.
- Hybrid keyword + semantic retrieval.
- Per-page "explain this lesson" / "quiz me" actions.
- Streaming citations highlighting in-text.
- Optional server-side conversation analytics (privacy-respecting).
