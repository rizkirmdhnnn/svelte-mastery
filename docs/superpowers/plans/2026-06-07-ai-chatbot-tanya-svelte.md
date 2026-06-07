# AI Chatbot "Tanya Svelte" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free, floating, site-wide AI tutor that answers Svelte/SvelteKit questions in Indonesian, grounded in the site's own 178 modules via Vectorize semantic retrieval, streaming on Cloudflare Workers AI behind a swappable provider adapter, protected by Turnstile + KV rate-limiting.

**Architecture:** One dynamic SvelteKit endpoint (`POST /api/chat`, `prerender = false`) runs in the Cloudflare Worker. A thin `+server.ts` reads `$env` + `platform.env` and delegates to a fully unit-testable `handleChat(request, deps)`. That orchestrator verifies Turnstile, rate-limits via KV, checks a KV answer cache, embeds the question with `bge-m3`, queries Vectorize for top-k doc chunks, builds a system prompt, and streams the model's answer back through a provider adapter using a normalized SSE protocol. A floating bubble/panel UI (runes-class store, `localStorage` history) consumes that stream and renders markdown + reused `CodeBlock` + citation chips.

**Tech Stack:** Svelte 5 (runes) + SvelteKit 2, `@sveltejs/adapter-cloudflare`, Cloudflare Workers AI (`@cf/qwen/qwen2.5-coder-32b-instruct`, `@cf/baai/bge-m3`), Vectorize (1024-dim cosine), Workers KV, Turnstile, Vitest (new), Node index script via Cloudflare REST API.

---

## Conventions to mirror (from the existing codebase)

- **Runes everywhere:** `<script lang="ts">`, `$state`, `$derived`, `$effect`, `$props`, `{@render children()}`.
- **Stores = exported singleton classes** with `$state` fields + private `#method()`, `browser` guard before `localStorage`/DOM (see `src/lib/stores/theme.svelte.ts`, `progress.svelte.ts`). Reassign Sets/objects, never mutate in place.
- **Imports use `$lib/...`** (no relative paths). Server-only code under `src/lib/server/`.
- **Styling:** scoped `<style>`, vanilla CSS, design tokens via `var(--name)`: `--brand #ff3e00`, `--bg-elevated`, `--bg-subtle`, `--border`, `--text`, `--text-muted`, `--shadow-lg`, `--radius 10px`, `--ease`, `--font-mono`. Dark via `[data-theme='dark']`.
- **Z-index map:** Header 40, mobile Sidebar 35, Search/modal 50 → **chat bubble & panel = 45** (above content, below Search).
- **Code rendering:** `highlight(code, lang, diff)` from `$lib/highlight.ts`; `CodeBlock.svelte` props `{ code, lang='svelte', diff=[] }`. `Playground.svelte` props `{ code='', height=340 }`.
- **Content model:** `ModuleMeta { slug, product, section, sectionTitle, sectionOrder, order, title, description, status, docs?, keywords?, updated? }`; helpers in `src/lib/content.ts` (`modules`, `getModule`, `productOf`, `neighbors`). Slug = content path minus `.svx`.

## Shared identifiers (use these EXACT names in every task)

- Bindings: `AI`, `VECTORIZE` (index `tanya-svelte`), `CHAT_KV`.
- Runtime vars (`$env/dynamic/private`): `CHAT_PROVIDER='workers-ai'`, `CHAT_MODEL='@cf/qwen/qwen2.5-coder-32b-instruct'`, `EMBED_MODEL='@cf/baai/bge-m3'`, `CHAT_RATE_LIMIT='40'`, `TURNSTILE_SECRET_KEY`.
- Public var (`$env/static/public`): `PUBLIC_TURNSTILE_SITE_KEY`.
- Index-script env (Node `process.env`): `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `VECTORIZE_INDEX='tanya-svelte'`.
- KV key prefixes: rate-limit `rl:<ip>:<YYYYMMDD>`, cache `cache:<hash>`.
- Types: `Role`, `ChatTurn{role,content}`, `ChatSource{slug,title,product,section}`, `UIMessage{id,role,content,sources?,status}`, `ServerEvent` = `{type:'meta',sources}` | `{type:'token',text}` | `{type:'done'}` | `{type:'error',message}`.
- SSE protocol: each event is `data: <json>\n\n`. Server emits `meta` (sources) first, then `token`*, then `done` (or `error`).

## Testing approach (this repo has NO test runner yet)

- Add **Vitest** (Vite-native). TDD the **pure** modules: `sse`, `protocol`, `segments`, `prompt`, `cache`, `ratelimit`, `turnstile` (mock `fetch`), `workers-ai` token extraction (mock stream), provider registry, `buildResponseStream`, and `handleChat` (mock `platform`/bindings).
- The endpoint `+server.ts` (which imports `$env`) is verified **manually** via `wrangler dev` (final task) — all logic lives in the testable `handleChat`.
- No Playwright (disproportionate here); a documented `wrangler dev` smoke checklist is the E2E substitute. Playwright is a future option (noted in spec §14).

---

## Task 0: One-time infrastructure setup (Cloudflare resources)

**Files:** none (CLI + dashboard). Produces IDs used in Task 1.

- [ ] **Step 1: Authenticate wrangler**

Run: `npx wrangler login`
Expected: browser auth completes; `npx wrangler whoami` shows your account + Account ID. Copy the Account ID.

- [ ] **Step 2: Create the Vectorize index (1024-dim cosine for bge-m3)**

Run:
```bash
npx wrangler vectorize create tanya-svelte --dimensions=1024 --metric=cosine
```
Expected: "✅ Successfully created index 'tanya-svelte'". (Dimensions/metric are fixed at creation — to change, delete and recreate.)

- [ ] **Step 3: Create the KV namespace**

Run:
```bash
npx wrangler kv namespace create CHAT_KV
```
Expected: prints a block like `{ "binding": "CHAT_KV", "id": "abc123..." }`. Copy the `id`.

- [ ] **Step 4: Create a Turnstile widget (production keys)**

In the Cloudflare dashboard → Turnstile → Add widget: Mode **Managed**, add your domain(s). Copy the **Site Key** (24 chars, public) and **Secret Key** (35 chars, private).
For local dev you will instead use the documented test keys (Task 1, Step 4).

- [ ] **Step 5: Create an API token for the offline index script**

Dashboard → My Profile → API Tokens → Create Token with permissions: **Workers AI → Read** and **Vectorize → Edit** (account-scoped). Copy the token. (Used only by `scripts/index-content.mjs`, never bundled in the Worker.)

---

## Task 1: Wire bindings, vars, secrets, and types

**Files:**
- Modify: `wrangler.jsonc`
- Create: `.dev.vars`
- Create: `.env`
- Modify: `.gitignore`
- Modify/regenerate: `worker-configuration.d.ts` (via `wrangler types`) and confirm `src/app.d.ts`

- [ ] **Step 1: Add bindings + vars to `wrangler.jsonc`**

Merge these keys into the existing object (keep `name`, `compatibility_date`, `compatibility_flags: ["nodejs_compat"]`, `main`, `assets`, `observability`):
```jsonc
{
  "ai": { "binding": "AI" },
  "vectorize": [{ "binding": "VECTORIZE", "index_name": "tanya-svelte" }],
  "kv_namespaces": [{ "binding": "CHAT_KV", "id": "PASTE_KV_ID_FROM_TASK_0_STEP_3" }],
  "vars": {
    "CHAT_PROVIDER": "workers-ai",
    "CHAT_MODEL": "@cf/qwen/qwen2.5-coder-32b-instruct",
    "EMBED_MODEL": "@cf/baai/bge-m3",
    "CHAT_RATE_LIMIT": "40"
  }
}
```
Note: `TURNSTILE_SECRET_KEY` is a **secret**, not a var — set via `wrangler secret put TURNSTILE_SECRET_KEY` before production deploy (Task 13). `PUBLIC_TURNSTILE_SITE_KEY` is build-time public (Step 3).

- [ ] **Step 2: Create `.dev.vars` (local runtime secrets/vars — gitignored)**

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
CF_ACCOUNT_ID=PASTE_ACCOUNT_ID
CF_API_TOKEN=PASTE_API_TOKEN_FROM_TASK_0_STEP_5
VECTORIZE_INDEX=tanya-svelte
```
(`1x0000...AA` is Cloudflare's always-pass test secret. `CF_*` are read by the Node index script.)

- [ ] **Step 3: Create `.env` (build-time public key)**

```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```
(`1x00...AA` is the always-pass test sitekey. Replace with your real Site Key for production builds.)

- [ ] **Step 4: Ensure secrets are gitignored**

Confirm `.gitignore` contains `.dev.vars` and `.env` (add them if missing). `.env` containing only a public test sitekey is safe, but keep prod values out of git.

- [ ] **Step 5: Regenerate Cloudflare types**

Run: `npx wrangler types`
Expected: updates the generated `Env` interface (e.g. `worker-configuration.d.ts`) to include `AI: Ai`, `VECTORIZE: VectorizeIndex`, `CHAT_KV: KVNamespace`, and the vars. Confirm `src/app.d.ts`'s `App.Platform.env` resolves these (it references the generated `Env`). If your `Env` is hand-maintained instead, add to `src/app.d.ts`:
```ts
// inside declare global > namespace App > interface Platform > env
AI: import('@cloudflare/workers-types').Ai;
VECTORIZE: import('@cloudflare/workers-types').VectorizeIndex;
CHAT_KV: import('@cloudflare/workers-types').KVNamespace;
```

- [ ] **Step 6: Commit**
```bash
git add wrangler.jsonc .gitignore src/app.d.ts worker-configuration.d.ts
git commit -m "chore: add Workers AI, Vectorize, KV bindings and chat config"
```

---

## Task 2: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/chat/.gitkeep` (placeholder so the folder exists; removed once real files land)

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest@^3`
Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Add test scripts to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"index": "node scripts/index-content.mjs"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
```
(All tested modules are pure and import only via `$lib` — none import `$env`/`$app`, so this minimal config suffices.)

- [ ] **Step 4: Verify the runner works**

Run: `npm test`
Expected: exits 0 with "No test files found" (no tests yet). Confirms config loads.

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest test runner"
```

---

## Task 3: Shared chat types + SSE frame parser

**Files:**
- Create: `src/lib/chat/types.ts`
- Create: `src/lib/chat/sse.ts`
- Test: `src/lib/chat/sse.test.ts`

- [ ] **Step 1: Create shared types**

`src/lib/chat/types.ts`:
```ts
export type Role = 'user' | 'assistant';

/** A turn sent to the model (system is passed separately). */
export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A cited source lesson, derived from retrieval metadata. */
export interface ChatSource {
  slug: string;
  title: string;
  product: string;
  section: string;
}

/** A message as held in the client store / rendered in the UI. */
export interface UIMessage {
  id: string;
  role: Role;
  content: string;
  sources?: ChatSource[];
  status: 'streaming' | 'done' | 'error';
}

/** Normalized server→client stream events (our SSE protocol). */
export type ServerEvent =
  | { type: 'meta'; sources: ChatSource[] }
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

- [ ] **Step 2: Write the failing test for the SSE frame parser**

`src/lib/chat/sse.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseSSEEvents } from '$lib/chat/sse';

describe('parseSSEEvents', () => {
  it('extracts complete data events and keeps the trailing partial as rest', () => {
    const { events, rest } = parseSSEEvents('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"');
    expect(events).toEqual(['{"a":1}', '{"b":2}']);
    expect(rest).toBe('data: {"c"');
  });

  it('joins multiple data: lines within one event with newlines', () => {
    const { events } = parseSSEEvents('data: line1\ndata: line2\n\n');
    expect(events).toEqual(['line1\nline2']);
  });

  it('ignores non-data lines (comments, event:) and tolerates no space after colon', () => {
    const { events } = parseSSEEvents(': keep-alive\nevent: x\ndata:{"ok":true}\n\n');
    expect(events).toEqual(['{"ok":true}']);
  });

  it('returns no events and full rest when no blank-line terminator yet', () => {
    const { events, rest } = parseSSEEvents('data: {"partial":1}\n');
    expect(events).toEqual([]);
    expect(rest).toBe('data: {"partial":1}\n');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/chat/sse.test.ts`
Expected: FAIL — "Failed to resolve import '$lib/chat/sse'".

- [ ] **Step 4: Implement the parser**

`src/lib/chat/sse.ts`:
```ts
/**
 * Parse a buffer of Server-Sent-Events text. Events are separated by a blank
 * line (`\n\n`). Within an event, the payload is the concatenation of every
 * `data:` line (joined by `\n`). Non-`data:` lines are ignored. Returns the
 * decoded payload strings plus any trailing partial text that has not yet been
 * terminated by a blank line (carry it into the next call).
 */
export function parseSSEEvents(buffer: string): { events: string[]; rest: string } {
  const events: string[] = [];
  let rest = buffer;
  let sep = rest.indexOf('\n\n');
  while (sep !== -1) {
    const block = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length > 0) events.push(dataLines.join('\n'));
    sep = rest.indexOf('\n\n');
  }
  return { events, rest };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/chat/sse.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**
```bash
git add src/lib/chat/types.ts src/lib/chat/sse.ts src/lib/chat/sse.test.ts
git rm --cached src/lib/chat/.gitkeep 2>/dev/null || true
git commit -m "feat: shared chat types and SSE frame parser"
```

---

## Task 4: Our SSE protocol (encode + decode `ServerEvent`)

**Files:**
- Create: `src/lib/chat/protocol.ts`
- Test: `src/lib/chat/protocol.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/chat/protocol.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encodeServerEvent, parseServerEvents } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

describe('protocol', () => {
  it('encodes an event as a single SSE data frame ending in a blank line', () => {
    expect(encodeServerEvent({ type: 'token', text: 'hi' })).toBe('data: {"type":"token","text":"hi"}\n\n');
  });

  it('round-trips a sequence of events', () => {
    const out: ServerEvent[] = [
      { type: 'meta', sources: [{ slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }] },
      { type: 'token', text: 'Halo' },
      { type: 'done' }
    ];
    const wire = out.map(encodeServerEvent).join('');
    const { events, rest } = parseServerEvents(wire);
    expect(events).toEqual(out);
    expect(rest).toBe('');
  });

  it('buffers a partial trailing frame as rest', () => {
    const { events, rest } = parseServerEvents('data: {"type":"token","text":"a"}\n\ndata: {"type":"to');
    expect(events).toEqual([{ type: 'token', text: 'a' }]);
    expect(rest).toBe('data: {"type":"to');
  });

  it('skips malformed JSON frames without throwing', () => {
    const { events } = parseServerEvents('data: not-json\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: 'done' }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chat/protocol.test.ts`
Expected: FAIL — cannot resolve `$lib/chat/protocol`.

- [ ] **Step 3: Implement**

`src/lib/chat/protocol.ts`:
```ts
import { parseSSEEvents } from '$lib/chat/sse';
import type { ServerEvent } from '$lib/chat/types';

export function encodeServerEvent(event: ServerEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Decode buffered wire text into ServerEvents; malformed frames are skipped. */
export function parseServerEvents(buffer: string): { events: ServerEvent[]; rest: string } {
  const { events: raw, rest } = parseSSEEvents(buffer);
  const events: ServerEvent[] = [];
  for (const payload of raw) {
    try {
      events.push(JSON.parse(payload) as ServerEvent);
    } catch {
      // ignore malformed frame
    }
  }
  return { events, rest };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chat/protocol.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/chat/protocol.ts src/lib/chat/protocol.test.ts
git commit -m "feat: normalized client/server SSE chat protocol"
```

---

## Task 5: Message segment parser (markdown → text/code segments, XSS-safe)

**Files:**
- Create: `src/lib/chat/segments.ts`
- Test: `src/lib/chat/segments.test.ts`

Renders model output without a markdown dependency: split fenced code blocks out for `CodeBlock`, and convert remaining prose to **escaped** HTML with a small allow-list (bold, italic, inline code, links, line breaks, `-`/`*` bullet lines). Because we HTML-escape first and only inject our own known tags, the `{@html}` in `ChatMessage` is safe against model-injected markup.

- [ ] **Step 1: Write the failing test**

`src/lib/chat/segments.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseMessageSegments } from '$lib/chat/segments';

describe('parseMessageSegments', () => {
  it('splits fenced code blocks from prose and captures the language', () => {
    const segs = parseMessageSegments('Pakai rune:\n```svelte\n<script>let n = $state(0)</script>\n```\nselesai.');
    expect(segs[0]).toEqual({ type: 'text', html: 'Pakai rune:' });
    expect(segs[1]).toEqual({ type: 'code', code: '<script>let n = $state(0)</script>', lang: 'svelte' });
    expect(segs[2]).toEqual({ type: 'text', html: 'selesai.' });
  });

  it('defaults missing fence language to svelte', () => {
    const segs = parseMessageSegments('```\nconst x = 1;\n```');
    expect(segs[0]).toEqual({ type: 'code', code: 'const x = 1;', lang: 'svelte' });
  });

  it('escapes HTML in prose before applying inline formatting', () => {
    const [seg] = parseMessageSegments('untuk <Comp> pakai **bold** dan `kode`');
    expect(seg).toEqual({
      type: 'text',
      html: 'untuk &lt;Comp&gt; pakai <strong>bold</strong> dan <code>kode</code>'
    });
  });

  it('renders links with escaped href and target/rel attributes', () => {
    const [seg] = parseMessageSegments('lihat [docs](/belajar/svelte/runes/state)');
    expect(seg.type).toBe('text');
    expect((seg as { html: string }).html).toBe(
      'lihat <a href="/belajar/svelte/runes/state" target="_blank" rel="noopener">docs</a>'
    );
  });

  it('converts newlines in prose to <br>', () => {
    const [seg] = parseMessageSegments('baris satu\nbaris dua');
    expect((seg as { html: string }).html).toBe('baris satu<br>baris dua');
  });

  it('returns an empty array for empty input', () => {
    expect(parseMessageSegments('')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chat/segments.test.ts`
Expected: FAIL — cannot resolve `$lib/chat/segments`.

- [ ] **Step 3: Implement**

`src/lib/chat/segments.ts`:
```ts
export type Segment =
  | { type: 'text'; html: string }
  | { type: 'code'; code: string; lang: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert one prose block (already separated from code) to safe HTML. */
function renderProse(raw: string): string {
  let html = escapeHtml(raw);
  // links [text](url) — url already escaped (quotes/брackets become entities); keep simple, safe chars only
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

/**
 * Split assistant markdown into ordered text/code segments. Fenced code blocks
 * (```lang ... ```) become `code` segments (rendered by CodeBlock); everything
 * else becomes XSS-safe `text` segments. Empty prose blocks are dropped.
 */
export function parseMessageSegments(content: string): Segment[] {
  if (!content) return [];
  const segments: Segment[] = [];
  const fence = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(content)) !== null) {
    const before = content.slice(last, m.index).trim();
    if (before) segments.push({ type: 'text', html: renderProse(before) });
    segments.push({ type: 'code', code: m[2].replace(/\n$/, ''), lang: m[1] || 'svelte' });
    last = fence.lastIndex;
  }
  const tail = content.slice(last).trim();
  if (tail) segments.push({ type: 'text', html: renderProse(tail) });
  return segments;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chat/segments.test.ts`
Expected: PASS (6 tests). If the `<em>` test fails on edge spacing, adjust the italic regex but keep behavior identical to the asserted outputs.

- [ ] **Step 5: Commit**
```bash
git add src/lib/chat/segments.ts src/lib/chat/segments.test.ts
git commit -m "feat: XSS-safe markdown segment parser for chat messages"
```

---

## Task 6: Provider adapter layer (Workers AI + registry + stubs)

**Files:**
- Create: `src/lib/server/ai/types.ts`
- Create: `src/lib/server/ai/providers/workers-ai.ts`
- Create: `src/lib/server/ai/providers/gemini.ts`
- Create: `src/lib/server/ai/providers/groq.ts`
- Create: `src/lib/server/ai/providers/index.ts`
- Test: `src/lib/server/ai/providers/workers-ai.test.ts`
- Test: `src/lib/server/ai/providers/index.test.ts`

Each provider exposes `streamChat(opts)` returning an **async generator of plain-text deltas** (already extracted from the provider's own SSE shape), so the rest of the app is provider-agnostic.

- [ ] **Step 1: Create the server-side provider types**

`src/lib/server/ai/types.ts`:
```ts
import type { ChatTurn } from '$lib/chat/types';

/** Minimal shape of the Workers AI binding we use (avoids a hard dep on generated types in tests). */
export interface AiLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface StreamChatOptions {
  /** Full system prompt (guardrails + retrieved context). */
  system: string;
  /** Conversation history (user/assistant turns only). */
  messages: ChatTurn[];
  model: string;
  /** Worker bindings (Workers AI uses `AI`). */
  bindings: { AI: AiLike };
  /** Secrets/keys for external providers (e.g. GEMINI_API_KEY). */
  secrets: Record<string, string | undefined>;
  /** Token cap for the answer. */
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly name: string;
  streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown>;
}
```

- [ ] **Step 2: Write the failing test for the Workers AI adapter**

`src/lib/server/ai/providers/workers-ai.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { workersAI } from '$lib/server/ai/providers/workers-ai';
import type { AiLike } from '$lib/server/ai/types';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    }
  });
}

describe('workersAI.streamChat', () => {
  it('yields .response tokens from the native SSE stream and stops at [DONE]', async () => {
    const ai: AiLike = {
      run: vi.fn().mockResolvedValue(
        streamOf([
          'data: {"response":"Ha"}\n\n',
          'data: {"response":"lo"}\n\n',
          'data: {"response":"","usage":{"prompt_tokens":1},"p":"xxxx"}\n\n',
          'data: [DONE]\n\n'
        ])
      )
    };
    const out: string[] = [];
    for await (const t of workersAI.streamChat({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      model: '@cf/qwen/qwen2.5-coder-32b-instruct',
      bindings: { AI: ai },
      secrets: {}
    })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Halo');
    // system prepended, stream + raised max_tokens passed through
    const [, input] = (ai.run as any).mock.calls[0];
    expect(input.stream).toBe(true);
    expect(input.max_tokens).toBeGreaterThanOrEqual(1024);
    expect(input.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(input.messages.at(-1)).toEqual({ role: 'user', content: 'hi' });
  });

  it('handles a non-stream object response by yielding its .response once', async () => {
    const ai: AiLike = { run: vi.fn().mockResolvedValue({ response: 'fallback' }) };
    const out: string[] = [];
    for await (const t of workersAI.streamChat({
      system: 's', messages: [{ role: 'user', content: 'q' }],
      model: 'm', bindings: { AI: ai }, secrets: {}
    })) out.push(t);
    expect(out).toEqual(['fallback']);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/providers/workers-ai.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/providers/workers-ai`.

- [ ] **Step 4: Implement the Workers AI adapter**

`src/lib/server/ai/providers/workers-ai.ts`:
```ts
import { parseSSEEvents } from '$lib/chat/sse';
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

async function* streamChat(opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  const messages = [{ role: 'system' as const, content: opts.system }, ...opts.messages];
  const res = await opts.bindings.AI.run(opts.model, {
    messages,
    stream: true,
    max_tokens: opts.maxTokens ?? 1024
  });

  // Non-streaming fallback (binding returned a JSON object).
  if (!(res instanceof ReadableStream)) {
    const obj = res as { response?: string };
    if (obj?.response) yield obj.response;
    return;
  }

  const reader = res.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (opts.signal?.aborted) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSSEEvents(buffer);
      buffer = rest;
      for (const payload of events) {
        if (payload === '[DONE]') return;
        try {
          const obj = JSON.parse(payload) as { response?: string };
          if (obj.response) yield obj.response;
        } catch {
          // ignore non-JSON keep-alive frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const workersAI: ChatProvider = { name: 'workers-ai', streamChat };
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/providers/workers-ai.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Create the external-provider stubs**

`src/lib/server/ai/providers/gemini.ts`:
```ts
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Stub: ready to implement against the Gemini streaming API. Flip CHAT_PROVIDER
// to 'gemini' and set GEMINI_API_KEY (Worker secret) once implemented.
async function* streamChat(_opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  throw new Error("Provider 'gemini' is not implemented yet. Set CHAT_PROVIDER=workers-ai.");
}

export const gemini: ChatProvider = { name: 'gemini', streamChat };
```

`src/lib/server/ai/providers/groq.ts`:
```ts
import type { ChatProvider, StreamChatOptions } from '$lib/server/ai/types';

// Stub: ready to implement against the Groq (OpenAI-compatible) streaming API.
async function* streamChat(_opts: StreamChatOptions): AsyncGenerator<string, void, unknown> {
  throw new Error("Provider 'groq' is not implemented yet. Set CHAT_PROVIDER=workers-ai.");
}

export const groq: ChatProvider = { name: 'groq', streamChat };
```

- [ ] **Step 7: Write the failing test for the registry**

`src/lib/server/ai/providers/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getProvider } from '$lib/server/ai/providers';

describe('getProvider', () => {
  it('returns the workers-ai provider by name', () => {
    expect(getProvider('workers-ai').name).toBe('workers-ai');
  });
  it('falls back to workers-ai for unknown/empty names', () => {
    expect(getProvider('nope').name).toBe('workers-ai');
    expect(getProvider(undefined).name).toBe('workers-ai');
  });
  it('exposes the gemini and groq adapters', () => {
    expect(getProvider('gemini').name).toBe('gemini');
    expect(getProvider('groq').name).toBe('groq');
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/providers/index.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/providers`.

- [ ] **Step 9: Implement the registry**

`src/lib/server/ai/providers/index.ts`:
```ts
import type { ChatProvider } from '$lib/server/ai/types';
import { workersAI } from '$lib/server/ai/providers/workers-ai';
import { gemini } from '$lib/server/ai/providers/gemini';
import { groq } from '$lib/server/ai/providers/groq';

const REGISTRY: Record<string, ChatProvider> = {
  'workers-ai': workersAI,
  gemini,
  groq
};

/** Resolve the active provider by name, defaulting to workers-ai. */
export function getProvider(name: string | undefined): ChatProvider {
  return (name && REGISTRY[name]) || workersAI;
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/providers/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 11: Commit**
```bash
git add src/lib/server/ai/types.ts src/lib/server/ai/providers
git commit -m "feat: swappable chat provider layer with Workers AI adapter"
```

---

## Task 7: Retrieval (embed + Vectorize query) and system-prompt builder

**Files:**
- Create: `src/lib/server/ai/retrieval.ts`
- Create: `src/lib/server/ai/prompt.ts`
- Test: `src/lib/server/ai/retrieval.test.ts`
- Test: `src/lib/server/ai/prompt.test.ts`

- [ ] **Step 1: Write the failing test for retrieval**

`src/lib/server/ai/retrieval.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { embedQuery, queryChunks } from '$lib/server/ai/retrieval';

describe('embedQuery', () => {
  it('calls the embed model with the text and returns the first vector', async () => {
    const ai = { run: vi.fn().mockResolvedValue({ shape: [1, 3], data: [[0.1, 0.2, 0.3]] }) };
    const vec = await embedQuery(ai, '@cf/baai/bge-m3', 'apa itu $state');
    expect(vec).toEqual([0.1, 0.2, 0.3]);
    expect(ai.run).toHaveBeenCalledWith('@cf/baai/bge-m3', { text: 'apa itu $state' });
  });
});

describe('queryChunks', () => {
  it('maps Vectorize matches into RetrievedChunk objects with source + text', async () => {
    const index = {
      query: vi.fn().mockResolvedValue({
        count: 1,
        matches: [
          {
            id: 'svelte/runes/state#0',
            score: 0.82,
            metadata: { text: '$state membuat nilai reaktif', slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }
          }
        ]
      })
    };
    const chunks = await queryChunks(index, [0.1, 0.2], 5);
    expect(index.query).toHaveBeenCalledWith([0.1, 0.2], { topK: 5, returnMetadata: 'all' });
    expect(chunks).toEqual([
      {
        id: 'svelte/runes/state#0',
        score: 0.82,
        text: '$state membuat nilai reaktif',
        source: { slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }
      }
    ]);
  });

  it('returns [] when there are no matches', async () => {
    const index = { query: vi.fn().mockResolvedValue({ count: 0, matches: [] }) };
    expect(await queryChunks(index, [0], 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/retrieval.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/retrieval`.

- [ ] **Step 3: Implement retrieval**

`src/lib/server/ai/retrieval.ts`:
```ts
import type { ChatSource } from '$lib/chat/types';
import type { AiLike } from '$lib/server/ai/types';

export interface RetrievedChunk {
  id: string;
  score: number;
  text: string;
  source: ChatSource;
}

interface VectorizeLike {
  query(
    vector: number[],
    opts: { topK: number; returnMetadata: 'all' | 'indexed' | 'none' }
  ): Promise<{ count: number; matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> }>;
}

export async function embedQuery(ai: AiLike, model: string, text: string): Promise<number[]> {
  const out = (await ai.run(model, { text })) as { data: number[][] };
  return out.data[0];
}

export async function queryChunks(
  index: VectorizeLike,
  vector: number[],
  topK = 5
): Promise<RetrievedChunk[]> {
  const res = await index.query(vector, { topK, returnMetadata: 'all' });
  return res.matches.map((m) => {
    const md = m.metadata ?? {};
    return {
      id: m.id,
      score: m.score,
      text: String(md.text ?? ''),
      source: {
        slug: String(md.slug ?? ''),
        title: String(md.title ?? ''),
        product: String(md.product ?? ''),
        section: String(md.section ?? '')
      }
    };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/retrieval.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test for the prompt builder**

`src/lib/server/ai/prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, dedupeSources } from '$lib/server/ai/prompt';
import type { RetrievedChunk } from '$lib/server/ai/retrieval';

const chunk = (slug: string, text: string): RetrievedChunk => ({
  id: slug + '#0',
  score: 0.9,
  text,
  source: { slug, title: slug.split('/').at(-1)!, product: slug.split('/')[0], section: 'x' }
});

describe('buildSystemPrompt', () => {
  it('includes the Svelte-5 guardrails and the retrieved context with slugs', () => {
    const sys = buildSystemPrompt({
      chunks: [chunk('svelte/runes/state', '$state bikin reaktif')],
      currentLesson: { slug: 'svelte/runes/derived', title: '$derived' }
    });
    expect(sys).toContain('Svelte 5'); // runes-first rule
    expect(sys).toContain('$state bikin reaktif'); // context injected
    expect(sys).toContain('svelte/runes/state'); // source tag for grounding
    expect(sys).toContain('svelte/runes/derived'); // current lesson hint
    expect(sys.toLowerCase()).toContain('bahasa indonesia'); // language rule
  });

  it('states clearly when no context was found', () => {
    const sys = buildSystemPrompt({ chunks: [], currentLesson: null });
    expect(sys.toLowerCase()).toContain('tidak ada konteks');
  });
});

describe('dedupeSources', () => {
  it('dedupes by slug, preserving first occurrence order', () => {
    const sources = dedupeSources([
      chunk('a/b/c', '1'),
      chunk('a/b/c', '2'),
      chunk('d/e/f', '3')
    ]);
    expect(sources.map((s) => s.slug)).toEqual(['a/b/c', 'd/e/f']);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/prompt.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/prompt`.

- [ ] **Step 7: Implement the prompt builder**

`src/lib/server/ai/prompt.ts`:
```ts
import type { ChatSource } from '$lib/chat/types';
import type { RetrievedChunk } from '$lib/server/ai/retrieval';

export interface CurrentLesson {
  slug: string;
  title: string;
}

const GUARDRAILS = `Kamu adalah "Tanya Svelte", tutor ramah untuk situs belajar Svelte & SvelteKit berbahasa Indonesia (gaya hangat, jelas, tidak bertele-tele).

Aturan:
- Selalu pakai Svelte 5 modern: runes ($state, $derived, $effect, $props). JANGAN pakai gaya lama (export let, $:, atau store sebagai default) kecuali diminta membandingkan dengan gaya lama.
- Utamakan KONTEKS dokumentasi di bawah sebagai sumber kebenaran. Kalau jawaban ada di konteks, dasarkan jawaban pada itu dan sebut nama lessonnya.
- Kalau tidak yakin atau konteks tidak relevan, katakan terus terang dan sarankan membuka dokumentasi terkait. Jangan mengarang.
- Tetap pada topik Svelte / SvelteKit / web development.
- Jawab dalam Bahasa Indonesia (ikuti bahasa pengguna kalau ia memakai bahasa lain).
- Tulis kode dalam blok \`\`\`svelte / \`\`\`ts sesuai bahasanya.`;

export function dedupeSources(chunks: RetrievedChunk[]): ChatSource[] {
  const seen = new Set<string>();
  const out: ChatSource[] = [];
  for (const c of chunks) {
    if (!c.source.slug || seen.has(c.source.slug)) continue;
    seen.add(c.source.slug);
    out.push(c.source);
  }
  return out;
}

export function buildSystemPrompt(opts: {
  chunks: RetrievedChunk[];
  currentLesson: CurrentLesson | null;
}): string {
  const parts = [GUARDRAILS];

  if (opts.currentLesson) {
    parts.push(
      `Pengguna sedang membaca lesson "${opts.currentLesson.title}" (${opts.currentLesson.slug}). Kalau ia bilang "ini"/"di sini", kemungkinan merujuk lesson tersebut.`
    );
  }

  if (opts.chunks.length > 0) {
    const ctx = opts.chunks
      .map((c, i) => `[${i + 1}] (${c.source.slug} — ${c.source.title})\n${c.text}`)
      .join('\n\n');
    parts.push(`KONTEKS DOKUMENTASI:\n${ctx}`);
  } else {
    parts.push('KONTEKS DOKUMENTASI: (tidak ada konteks relevan ditemukan — jawab hati-hati dan sarankan membuka dokumentasi)');
  }

  return parts.join('\n\n');
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/prompt.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**
```bash
git add src/lib/server/ai/retrieval.ts src/lib/server/ai/prompt.ts src/lib/server/ai/retrieval.test.ts src/lib/server/ai/prompt.test.ts
git commit -m "feat: Vectorize retrieval and grounded system-prompt builder"
```

---

## Task 8: Abuse guards — Turnstile verify, KV rate-limit, KV answer cache

**Files:**
- Create: `src/lib/server/ai/turnstile.ts`
- Create: `src/lib/server/ai/ratelimit.ts`
- Create: `src/lib/server/ai/cache.ts`
- Test: `src/lib/server/ai/turnstile.test.ts`
- Test: `src/lib/server/ai/ratelimit.test.ts`
- Test: `src/lib/server/ai/cache.test.ts`

A tiny in-memory KV fake is used by the rate-limit and cache tests.

- [ ] **Step 1: Write the failing test for Turnstile verify**

`src/lib/server/ai/turnstile.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { verifyTurnstile } from '$lib/server/ai/turnstile';

describe('verifyTurnstile', () => {
  it('returns false immediately for an empty token without calling siteverify', async () => {
    const fetchImpl = vi.fn();
    expect(await verifyTurnstile('secret', '', '1.2.3.4', fetchImpl as any)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs token + secret + remoteip and returns true on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
    const ok = await verifyTurnstile('sek', 'tok', '9.9.9.9', fetchImpl as any);
    expect(ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ secret: 'sek', response: 'tok', remoteip: '9.9.9.9' });
  });

  it('returns false when success is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    expect(await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any)).toBe(false);
  });

  it('returns false when siteverify throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    expect(await verifyTurnstile('s', 't', '0.0.0.0', fetchImpl as any)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/turnstile.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/turnstile`.

- [ ] **Step 3: Implement Turnstile verify**

`src/lib/server/ai/turnstile.ts`:
```ts
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Verify a Turnstile token server-side. Returns true only when success === true. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteip: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetchImpl(SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip })
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/turnstile.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test for rate-limit**

`src/lib/server/ai/ratelimit.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { checkAndIncrement } from '$lib/server/ai/ratelimit';

function fakeKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string, _opts?: { expirationTtl?: number }) { store.set(key, value); }
  };
}

const NOW = new Date('2026-06-07T10:00:00Z');

describe('checkAndIncrement', () => {
  it('allows and counts up to the limit, then blocks', async () => {
    const kv = fakeKV();
    const r1 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r1).toMatchObject({ allowed: true, remaining: 1 });
    const r2 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r2).toMatchObject({ allowed: true, remaining: 0 });
    const r3 = await checkAndIncrement(kv as any, '1.2.3.4', 2, NOW);
    expect(r3.allowed).toBe(false);
  });

  it('keys per IP per UTC day and reports the next-midnight reset', async () => {
    const kv = fakeKV();
    await checkAndIncrement(kv as any, '5.5.5.5', 5, NOW);
    expect([...kv.store.keys()][0]).toBe('rl:5.5.5.5:20260607');
    const { resetAt } = await checkAndIncrement(kv as any, '5.5.5.5', 5, NOW);
    expect(resetAt).toBe(Date.parse('2026-06-08T00:00:00Z'));
  });

  it('separate IPs have independent counters', async () => {
    const kv = fakeKV();
    await checkAndIncrement(kv as any, 'a', 1, NOW);
    const other = await checkAndIncrement(kv as any, 'b', 1, NOW);
    expect(other.allowed).toBe(true);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/ratelimit.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/ratelimit`.

- [ ] **Step 7: Implement rate-limit**

`src/lib/server/ai/ratelimit.ts`:
```ts
interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms of next UTC midnight
}

function utcDayKey(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function nextUtcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

/**
 * Atomically-ish increment a per-IP, per-UTC-day counter in KV. KV is not truly
 * atomic, but for abuse/cost protection an occasional race is acceptable.
 */
export async function checkAndIncrement(
  kv: KVLike,
  ip: string,
  limit: number,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const key = `rl:${ip}:${utcDayKey(now)}`;
  const resetAt = nextUtcMidnight(now);
  const current = Number((await kv.get(key)) ?? '0');
  if (current >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: Math.max(0, limit - next), resetAt };
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/ratelimit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing test for the cache**

`src/lib/server/ai/cache.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cacheKey, getCached, putCached } from '$lib/server/ai/cache';
import type { ChatSource } from '$lib/chat/types';

function fakeKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) { return store.get(key) ?? null; },
    async put(key: string, value: string) { store.set(key, value); }
  };
}

describe('cacheKey', () => {
  it('normalizes case/whitespace so equivalent questions share a key', () => {
    expect(cacheKey('  Apa  itu   $STATE? ')).toBe(cacheKey('apa itu $state?'));
  });
  it('produces a cache:-prefixed key', () => {
    expect(cacheKey('halo').startsWith('cache:')).toBe(true);
  });
  it('different questions produce different keys', () => {
    expect(cacheKey('a')).not.toBe(cacheKey('b'));
  });
});

describe('get/putCached', () => {
  it('round-trips text + sources', async () => {
    const kv = fakeKV();
    const sources: ChatSource[] = [{ slug: 's', title: 't', product: 'svelte', section: 'r' }];
    await putCached(kv as any, 'cache:x', { text: 'jawaban', sources });
    expect(await getCached(kv as any, 'cache:x')).toEqual({ text: 'jawaban', sources });
  });
  it('returns null on miss', async () => {
    const kv = fakeKV();
    expect(await getCached(kv as any, 'cache:nope')).toBeNull();
  });
});
```

- [ ] **Step 10: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/cache.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/cache`.

- [ ] **Step 11: Implement the cache**

`src/lib/server/ai/cache.ts`:
```ts
import type { ChatSource } from '$lib/chat/types';

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface CachedAnswer {
  text: string;
  sources: ChatSource[];
}

/** FNV-1a 32-bit hash → hex (stable, dependency-free). */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function cacheKey(question: string): string {
  const norm = question.trim().toLowerCase().replace(/\s+/g, ' ');
  return `cache:${fnv1a(norm)}`;
}

export async function getCached(kv: KVLike, key: string): Promise<CachedAnswer | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnswer;
  } catch {
    return null;
  }
}

export async function putCached(kv: KVLike, key: string, value: CachedAnswer): Promise<void> {
  // Cache for 7 days; content changes trigger a re-index but cached answers
  // expire on their own.
  await kv.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 7 });
}
```

- [ ] **Step 12: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/cache.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 13: Commit**
```bash
git add src/lib/server/ai/turnstile.ts src/lib/server/ai/ratelimit.ts src/lib/server/ai/cache.ts src/lib/server/ai/turnstile.test.ts src/lib/server/ai/ratelimit.test.ts src/lib/server/ai/cache.test.ts
git commit -m "feat: Turnstile verify, KV rate-limit, and KV answer cache"
```

---

## Task 9: Response-stream builder (token stream → our SSE)

**Files:**
- Create: `src/lib/server/ai/chat-stream.ts`
- Test: `src/lib/server/ai/chat-stream.test.ts`

Wraps a provider's async token generator into a `ReadableStream<Uint8Array>` of our protocol: `meta` (sources) first, then `token`*, then `done`. Accumulates the full text and calls `onComplete(fullText)` for caching. Emits `error` if the generator throws.

- [ ] **Step 1: Write the failing test**

`src/lib/server/ai/chat-stream.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { buildResponseStream } from '$lib/server/ai/chat-stream';
import { parseServerEvents } from '$lib/chat/protocol';
import type { ChatSource } from '$lib/chat/types';

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

async function* tokens(parts: string[]) {
  for (const p of parts) yield p;
}

const SOURCES: ChatSource[] = [{ slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' }];

describe('buildResponseStream', () => {
  it('emits meta, then tokens, then done; and calls onComplete with the full text', async () => {
    const onComplete = vi.fn();
    const stream = buildResponseStream(SOURCES, tokens(['Ha', 'lo']), onComplete);
    const { events } = parseServerEvents(await drain(stream));
    expect(events[0]).toEqual({ type: 'meta', sources: SOURCES });
    expect(events.filter((e) => e.type === 'token').map((e: any) => e.text)).toEqual(['Ha', 'lo']);
    expect(events.at(-1)).toEqual({ type: 'done' });
    expect(onComplete).toHaveBeenCalledWith('Halo');
  });

  it('emits an error event (and no done) if the generator throws, without calling onComplete', async () => {
    const onComplete = vi.fn();
    async function* boom() {
      yield 'partial';
      throw new Error('model exploded');
    }
    const stream = buildResponseStream(SOURCES, boom(), onComplete);
    const { events } = parseServerEvents(await drain(stream));
    expect(events.some((e) => e.type === 'token')).toBe(true);
    const err = events.find((e) => e.type === 'error') as any;
    expect(err).toBeTruthy();
    expect(err.message).toContain('model exploded');
    expect(onComplete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/chat-stream.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/chat-stream`.

- [ ] **Step 3: Implement the builder**

`src/lib/server/ai/chat-stream.ts`:
```ts
import { encodeServerEvent } from '$lib/chat/protocol';
import type { ChatSource } from '$lib/chat/types';

/**
 * Build a ReadableStream of our SSE protocol from a token generator.
 * onComplete receives the full accumulated answer (used for caching); it is
 * NOT called if the generator errors.
 */
export function buildResponseStream(
  sources: ChatSource[],
  tokens: AsyncGenerator<string, void, unknown>,
  onComplete?: (fullText: string) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let full = '';
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      send(encodeServerEvent({ type: 'meta', sources }));
      try {
        for await (const t of tokens) {
          if (!t) continue;
          full += t;
          send(encodeServerEvent({ type: 'token', text: t }));
        }
        send(encodeServerEvent({ type: 'done' }));
        onComplete?.(full);
      } catch (err) {
        send(encodeServerEvent({ type: 'error', message: err instanceof Error ? err.message : 'stream error' }));
      } finally {
        controller.close();
      }
    }
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/chat-stream.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/ai/chat-stream.ts src/lib/server/ai/chat-stream.test.ts
git commit -m "feat: response-stream builder for the chat SSE protocol"
```

---

## Task 10: Orchestrator `handleChat` + the `/api/chat` endpoint

**Files:**
- Create: `src/lib/server/ai/handle-chat.ts`
- Create: `src/routes/api/chat/+server.ts`
- Test: `src/lib/server/ai/handle-chat.test.ts`

`handleChat` is fully testable (no `$env`/`$app` imports). `+server.ts` is a thin adapter that injects `$env` + `platform` + client IP.

- [ ] **Step 1: Write the failing test for `handleChat`**

`src/lib/server/ai/handle-chat.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { handleChat } from '$lib/server/ai/handle-chat';
import { parseServerEvents } from '$lib/chat/protocol';

function fakeKV() {
  const store = new Map<string, string>();
  return { store, async get(k: string) { return store.get(k) ?? null; }, async put(k: string, v: string) { store.set(k, v); } };
}

function workersAiStream(text: string) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ response: text })}\n\n`));
      c.enqueue(enc.encode('data: [DONE]\n\n'));
      c.close();
    }
  });
}

function baseDeps(over: Partial<any> = {}) {
  const AI = {
    run: vi.fn(async (model: string) =>
      model.includes('bge') ? { data: [[0.1, 0.2, 0.3]] } : workersAiStream('Halo dari model')
    )
  };
  const VECTORIZE = {
    query: vi.fn().mockResolvedValue({
      count: 1,
      matches: [{ id: 'svelte/runes/state#0', score: 0.9, metadata: { text: '$state reaktif', slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' } }]
    })
  };
  return {
    platform: { env: { AI, VECTORIZE, CHAT_KV: fakeKV() }, context: { waitUntil: vi.fn() } },
    ip: '1.2.3.4',
    config: { provider: 'workers-ai', model: 'm', embedModel: '@cf/baai/bge-m3', turnstileSecret: 'sek', rateLimit: 40 },
    verifyToken: vi.fn().mockResolvedValue(true),
    ...over
  };
}

async function drain(res: Response): Promise<string> {
  return await res.text();
}

const req = (body: unknown) => new Request('https://x/api/chat', { method: 'POST', body: JSON.stringify(body) });

describe('handleChat', () => {
  it('streams meta+tokens+done for a valid request and caches the answer', async () => {
    const deps = baseDeps();
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'apa itu $state' }], turnstileToken: 'tok' }), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const { events } = parseServerEvents(await drain(res));
    expect(events[0]).toMatchObject({ type: 'meta' });
    expect(events.some((e) => e.type === 'token')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'done' });
    expect(deps.platform.context.waitUntil).toHaveBeenCalled(); // cache write scheduled
  });

  it('returns 403 when the Turnstile token fails', async () => {
    const deps = baseDeps({ verifyToken: vi.fn().mockResolvedValue(false) });
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'hi' }], turnstileToken: 'bad' }), deps);
    expect(res.status).toBe(403);
  });

  it('returns 429 with resetAt once the rate limit is exceeded', async () => {
    const deps = baseDeps({ config: { ...baseDeps().config, rateLimit: 1 } });
    await handleChat(req({ messages: [{ role: 'user', content: 'a' }], turnstileToken: 'tok' }), deps);
    const res2 = await handleChat(req({ messages: [{ role: 'user', content: 'b' }], turnstileToken: 'tok' }), deps);
    expect(res2.status).toBe(429);
    expect(await res2.json()).toHaveProperty('resetAt');
  });

  it('serves a cache hit without calling the model again', async () => {
    const deps = baseDeps();
    await handleChat(req({ messages: [{ role: 'user', content: 'sama' }], turnstileToken: 'tok' }), deps);
    const callsAfterFirst = deps.platform.env.AI.run.mock.calls.length;
    const res = await handleChat(req({ messages: [{ role: 'user', content: 'SAMA' }], turnstileToken: 'tok' }), deps);
    const { events } = parseServerEvents(await drain(res));
    expect(events.some((e) => e.type === 'token')).toBe(true);
    // No new model/embed calls on the cache hit.
    expect(deps.platform.env.AI.run.mock.calls.length).toBe(callsAfterFirst);
  });

  it('returns 400 for a body with no user message', async () => {
    const res = await handleChat(req({ messages: [], turnstileToken: 'tok' }), baseDeps());
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/server/ai/handle-chat.test.ts`
Expected: FAIL — cannot resolve `$lib/server/ai/handle-chat`.

- [ ] **Step 3: Implement `handleChat`**

`src/lib/server/ai/handle-chat.ts`:
```ts
import type { ChatTurn } from '$lib/chat/types';
import { encodeServerEvent } from '$lib/chat/protocol';
import { getProvider } from '$lib/server/ai/providers';
import { embedQuery, queryChunks } from '$lib/server/ai/retrieval';
import { buildSystemPrompt, dedupeSources, type CurrentLesson } from '$lib/server/ai/prompt';
import { buildResponseStream } from '$lib/server/ai/chat-stream';
import { checkAndIncrement } from '$lib/server/ai/ratelimit';
import { cacheKey, getCached, putCached } from '$lib/server/ai/cache';
import { verifyTurnstile } from '$lib/server/ai/turnstile';

export interface HandleChatConfig {
  provider: string;
  model: string;
  embedModel: string;
  turnstileSecret: string;
  rateLimit: number;
  secrets?: Record<string, string | undefined>;
}

export interface HandleChatDeps {
  platform: {
    env: { AI: any; VECTORIZE: any; CHAT_KV: any };
    // adapter-cloudflare exposes `context`; this repo's app.d.ts names it `ctx`.
    context?: { waitUntil(p: Promise<unknown>): void };
    ctx?: { waitUntil(p: Promise<unknown>): void };
  };
  ip: string;
  config: HandleChatConfig;
  /** Injectable for tests; defaults to verifyTurnstile. */
  verifyToken?: (secret: string, token: string, ip: string) => Promise<boolean>;
}

interface ChatBody {
  messages: ChatTurn[];
  turnstileToken?: string;
  currentLesson?: CurrentLesson | null;
}

const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-store',
  connection: 'keep-alive'
};

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function cachedStream(text: string, sources: any[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(encodeServerEvent({ type: 'meta', sources })));
      c.enqueue(enc.encode(encodeServerEvent({ type: 'token', text })));
      c.enqueue(enc.encode(encodeServerEvent({ type: 'done' })));
      c.close();
    }
  });
}

export async function handleChat(request: Request, deps: HandleChatDeps): Promise<Response> {
  const { platform, ip, config } = deps;
  const verify = deps.verifyToken ?? verifyTurnstile;

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const history = (body.messages ?? []).filter((m) => m.role === 'user' || m.role === 'assistant');
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser || !lastUser.content.trim()) {
    return json(400, { error: 'empty_question' });
  }

  // 1) Turnstile
  const ok = await verify(config.turnstileSecret, body.turnstileToken ?? '', ip);
  if (!ok) return json(403, { error: 'turnstile_failed' });

  // 2) Rate limit
  const rl = await checkAndIncrement(platform.env.CHAT_KV, ip, config.rateLimit);
  if (!rl.allowed) {
    return json(429, { error: 'rate_limited', resetAt: rl.resetAt });
  }

  // 3) Cache
  const key = cacheKey(lastUser.content);
  const hit = await getCached(platform.env.CHAT_KV, key);
  if (hit) {
    return new Response(cachedStream(hit.text, hit.sources), { headers: SSE_HEADERS });
  }

  // 4) Retrieve
  const vector = await embedQuery(platform.env.AI, config.embedModel, lastUser.content);
  const chunks = await queryChunks(platform.env.VECTORIZE, vector, 5);
  const sources = dedupeSources(chunks);

  // 5) Prompt + provider stream
  const system = buildSystemPrompt({ chunks, currentLesson: body.currentLesson ?? null });
  const provider = getProvider(config.provider);
  const tokens = provider.streamChat({
    system,
    messages: history,
    model: config.model,
    bindings: { AI: platform.env.AI },
    secrets: config.secrets ?? {}
  });

  // 6) Stream out + schedule cache write
  const waitUntil = platform.context?.waitUntil?.bind(platform.context) ?? platform.ctx?.waitUntil?.bind(platform.ctx);
  const stream = buildResponseStream(sources, tokens, (full) => {
    const write = putCached(platform.env.CHAT_KV, key, { text: full, sources });
    if (waitUntil) waitUntil(write);
    else void write;
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/server/ai/handle-chat.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the thin endpoint**

`src/routes/api/chat/+server.ts`:
```ts
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { handleChat } from '$lib/server/ai/handle-chat';

// Opt out of the site-wide prerender so this route runs live in the Worker.
export const prerender = false;

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
  if (!platform) {
    return new Response(JSON.stringify({ error: 'no_platform' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
  const ip = getClientAddress();
  return handleChat(request, {
    platform: platform as any,
    ip,
    config: {
      provider: env.CHAT_PROVIDER ?? 'workers-ai',
      model: env.CHAT_MODEL ?? '@cf/qwen/qwen2.5-coder-32b-instruct',
      embedModel: env.EMBED_MODEL ?? '@cf/baai/bge-m3',
      turnstileSecret: env.TURNSTILE_SECRET_KEY ?? '',
      rateLimit: Number(env.CHAT_RATE_LIMIT ?? '40'),
      secrets: env as unknown as Record<string, string | undefined>
    }
  });
};
```

- [ ] **Step 6: Type-check the endpoint**

Run: `npm run check` (the project's `svelte-check`; if absent, run `npx svelte-check --tsconfig ./tsconfig.json`)
Expected: no errors in `src/routes/api/chat/+server.ts` or `handle-chat.ts`. Fix any binding-type mismatches by confirming Task 1 Step 5 regenerated `Env`.

- [ ] **Step 7: Commit**
```bash
git add src/lib/server/ai/handle-chat.ts src/lib/server/ai/handle-chat.test.ts src/routes/api/chat/+server.ts
git commit -m "feat: /api/chat orchestrator and streaming endpoint"
```

---

## Task 11: Offline content indexing script (`scripts/index-content.mjs`)

**Files:**
- Modify: `vitest.config.ts` (add `scripts/**/*.test.mjs` to include)
- Create: `scripts/lib/chunk.mjs`
- Test: `scripts/lib/chunk.test.mjs`
- Create: `scripts/index-content.mjs`

**Free-tier constraint:** Vectorize free tier stores ≈ **5,000,000 ÷ 1024 ≈ 4,882 vectors**. Chunk **coarsely** (by `##` heading) and the script must abort if total chunks exceed a safe ceiling (4,500).

- [ ] **Step 1: Extend Vitest include to cover script tests**

Edit `vitest.config.ts` → `test.include`:
```ts
include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs']
```

- [ ] **Step 2: Write the failing test for the chunker**

`scripts/lib/chunk.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { chunkSvx, stripSvxBody } from '../lib/chunk.mjs';

const meta = { slug: 'svelte/runes/state', title: '$state', product: 'svelte', section: 'runes' };

describe('stripSvxBody', () => {
  it('removes <script>/<style> blocks and import lines', () => {
    const out = stripSvxBody('<script>\nimport X from "x";\n</script>\n\n## Judul\nisi teks');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('import X');
    expect(out).toContain('## Judul');
    expect(out).toContain('isi teks');
  });
});

describe('chunkSvx', () => {
  it('creates one chunk per ## section, each prefixed with title + heading', () => {
    const body = '## Apa itu\n$state bikin reaktif.\n\n## Contoh\nlet n = $state(0)';
    const chunks = chunkSvx(meta, body, 4000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe('svelte/runes/state#0');
    expect(chunks[0].metadata).toMatchObject({ slug: meta.slug, title: '$state', product: 'svelte', section: 'runes' });
    expect(chunks[0].text).toContain('# $state');
    expect(chunks[0].text).toContain('## Apa itu');
    expect(chunks[0].text).toContain('$state bikin reaktif');
    expect(chunks[1].text).toContain('## Contoh');
  });

  it('captures intro text before the first ## as its own chunk', () => {
    const chunks = chunkSvx(meta, 'kalimat pembuka\n\n## Bagian\nisi', 4000);
    expect(chunks[0].text).toContain('kalimat pembuka');
    expect(chunks[0].id).toBe('svelte/runes/state#0');
  });

  it('splits a section longer than maxChars into multiple chunks', () => {
    const long = 'x'.repeat(50) + '\n\n' + 'y'.repeat(50) + '\n\n' + 'z'.repeat(50);
    const chunks = chunkSvx(meta, '## Besar\n' + long, 80);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(80 + 60)); // + prefix headroom
  });

  it('drops empty sections', () => {
    const chunks = chunkSvx(meta, '## Kosong\n\n## Isi\nada', 4000);
    expect(chunks.every((c) => c.text.trim().length > 0)).toBe(true);
    expect(chunks.some((c) => c.text.includes('ada'))).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run scripts/lib/chunk.test.mjs`
Expected: FAIL — cannot resolve `../lib/chunk.mjs`.

- [ ] **Step 4: Implement the chunker**

`scripts/lib/chunk.mjs`:
```js
/** Remove mdsvex/Svelte noise so embeddings see mostly prose + code. */
export function stripSvxBody(body) {
  return body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .split('\n')
    .filter((line) => !/^\s*import\s.+from\s.+;?\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLong(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const paras = text.split(/\n\n+/);
  const out = [];
  let buf = '';
  for (const p of paras) {
    if (buf && (buf.length + p.length + 2) > maxChars) {
      out.push(buf);
      buf = '';
    }
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Chunk a stripped .svx body by `##` heading. Each chunk is prefixed with the
 * module title and heading so it is self-describing for retrieval.
 * Returns [{ id, text, metadata }].
 */
export function chunkSvx(meta, rawBody, maxChars = 1800) {
  const body = stripSvxBody(rawBody);
  const lines = body.split('\n');
  const sections = [];
  let heading = '';
  let buf = [];
  const flush = () => {
    const content = buf.join('\n').trim();
    if (content || heading) sections.push({ heading, content });
    buf = [];
  };
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flush();
      heading = line.replace(/^##\s+/, '').trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  const chunks = [];
  let idx = 0;
  for (const sec of sections) {
    const headingLine = sec.heading ? `## ${sec.heading}\n` : '';
    const prefix = `# ${meta.title}\n${headingLine}`;
    const pieces = splitLong(sec.content, maxChars);
    for (const piece of pieces) {
      const text = `${prefix}${piece}`.trim();
      if (!text.replace(/^#.*$/gm, '').trim()) continue; // skip header-only/empty
      chunks.push({
        id: `${meta.slug}#${idx}`,
        text,
        metadata: { text, slug: meta.slug, title: meta.title, product: meta.product, section: meta.section }
      });
      idx++;
    }
  }
  return chunks;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run scripts/lib/chunk.test.mjs`
Expected: PASS (5 tests). Re-run full suite `npm test` to confirm nothing else broke.

- [ ] **Step 6: Commit the chunker**
```bash
git add vitest.config.ts scripts/lib/chunk.mjs scripts/lib/chunk.test.mjs
git commit -m "feat: testable content chunker for the index script"
```

- [ ] **Step 7: Write the indexing script**

`scripts/index-content.mjs`:
```js
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chunkSvx } from './lib/chunk.mjs';

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const INDEX = process.env.VECTORIZE_INDEX || 'tanya-svelte';
const EMBED_MODEL = '@cf/baai/bge-m3';
const CONTENT_DIR = 'src/lib/content';
const MAX_VECTORS = 4500; // free-tier safety ceiling (~4,882 max)

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN (see .dev.vars).');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.svx')) out.push(full);
  }
  return out;
}

// Minimal frontmatter parser mirroring scripts/gen-manifest.mjs (flat key:value).
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  let body = src;
  if (m) {
    body = src.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf(':');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      meta[key] = val;
    }
  }
  return { meta, body };
}

async function embedBatch(texts) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBED_MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts })
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error('Embed failed: ' + JSON.stringify(data.errors));
  return data.result.data; // number[][]
}

async function upsertBatch(vectors) {
  const ndjson = vectors.map((v) => JSON.stringify(v)).join('\n');
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX}/upsert`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/x-ndjson' },
      body: ndjson
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error('Upsert failed: ' + JSON.stringify(data.errors));
  return data.result;
}

async function main() {
  const files = walk(CONTENT_DIR);
  const allChunks = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const { meta, body } = parseFrontmatter(src);
    const slug = relative(CONTENT_DIR, file).replace(/\\/g, '/').replace(/\.svx$/, '');
    const m = {
      slug,
      title: meta.title || slug.split('/').at(-1),
      product: meta.product || slug.split('/')[0],
      section: meta.section || ''
    };
    allChunks.push(...chunkSvx(m, body));
  }

  console.log(`Modules: ${files.length} → chunks: ${allChunks.length}`);
  if (allChunks.length > MAX_VECTORS) {
    console.error(`✗ ${allChunks.length} chunks exceeds free-tier ceiling ${MAX_VECTORS}. Increase maxChars in chunkSvx to make coarser chunks.`);
    process.exit(1);
  }

  // Embed (batches of 50), then upsert (batches of 500).
  const vectors = [];
  for (let i = 0; i < allChunks.length; i += 50) {
    const batch = allChunks.slice(i, i + 50);
    const embeds = await embedBatch(batch.map((c) => c.text));
    batch.forEach((c, j) => vectors.push({ id: c.id, values: embeds[j], metadata: c.metadata }));
    console.log(`Embedded ${Math.min(i + 50, allChunks.length)}/${allChunks.length}`);
  }
  for (let i = 0; i < vectors.length; i += 500) {
    await upsertBatch(vectors.slice(i, i + 500));
    console.log(`Upserted ${Math.min(i + 500, vectors.length)}/${vectors.length}`);
  }
  console.log('✓ Index build complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 8: Run the indexer (manual; requires Task 0 + creds)**

Load env then run:
```bash
set -a; source .dev.vars; set +a
npm run index
```
Expected: logs "Modules: 178 → chunks: N" (N should be well under 4,500), then embed/upsert progress, then "✓ Index build complete." If it aborts on the ceiling, raise `maxChars` in `chunkSvx` (e.g. 2400) and re-run.

- [ ] **Step 9: Commit**
```bash
git add scripts/index-content.mjs
git commit -m "feat: offline Vectorize indexing script with free-tier guard"
```

---

## Task 12: Client stream consumer + Turnstile token helper

**Files:**
- Create: `src/lib/chat/client-stream.ts`
- Create: `src/lib/chat/turnstile-client.ts`
- Test: `src/lib/chat/client-stream.test.ts`

- [ ] **Step 1: Write the failing test for the client stream consumer**

`src/lib/chat/client-stream.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { consumeChatStream } from '$lib/chat/client-stream';
import { encodeServerEvent } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

function bodyOf(events: ServerEvent[], splitMid = false): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const wire = events.map(encodeServerEvent).join('');
  const bytes = enc.encode(wire);
  const mid = Math.floor(bytes.length / 2);
  return new ReadableStream({
    start(c) {
      if (splitMid) {
        c.enqueue(bytes.slice(0, mid));
        c.enqueue(bytes.slice(mid));
      } else {
        c.enqueue(bytes);
      }
      c.close();
    }
  });
}

describe('consumeChatStream', () => {
  it('dispatches each ServerEvent in order', async () => {
    const events: ServerEvent[] = [
      { type: 'meta', sources: [] },
      { type: 'token', text: 'a' },
      { type: 'token', text: 'b' },
      { type: 'done' }
    ];
    const seen: ServerEvent[] = [];
    await consumeChatStream(bodyOf(events), (e) => seen.push(e));
    expect(seen).toEqual(events);
  });

  it('reassembles events split across chunk boundaries', async () => {
    const events: ServerEvent[] = [{ type: 'token', text: 'hello world' }, { type: 'done' }];
    const seen: ServerEvent[] = [];
    await consumeChatStream(bodyOf(events, true), (e) => seen.push(e));
    expect(seen).toEqual(events);
  });

  it('stops reading when the signal is already aborted', async () => {
    const handler = vi.fn();
    const ctrl = new AbortController();
    ctrl.abort();
    await consumeChatStream(bodyOf([{ type: 'token', text: 'x' }]), handler, ctrl.signal);
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chat/client-stream.test.ts`
Expected: FAIL — cannot resolve `$lib/chat/client-stream`.

- [ ] **Step 3: Implement the consumer**

`src/lib/chat/client-stream.ts`:
```ts
import { parseServerEvents } from '$lib/chat/protocol';
import type { ServerEvent } from '$lib/chat/types';

/** Read a fetch response body and dispatch each decoded ServerEvent. */
export async function consumeChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: ServerEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseServerEvents(buffer);
      buffer = rest;
      for (const e of events) onEvent(e);
    }
  } finally {
    reader.releaseLock();
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chat/client-stream.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the Turnstile token helper (browser-only, manual verify)**

`src/lib/chat/turnstile-client.ts`:
```ts
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string;
      execute(idOrEl: string | HTMLElement): void;
      reset(id?: string): void;
      ready(cb: () => void): void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Render an invisible Turnstile widget into `container` once and return a
 * function that produces a fresh single-use token per call (execute → callback).
 */
export async function createTokenSource(container: HTMLElement, sitekey: string) {
  await loadScript();
  let widgetId = '';
  let pending: ((token: string) => void) | null = null;
  let failed: ((err: Error) => void) | null = null;

  await new Promise<void>((resolve) => {
    window.turnstile!.ready(() => {
      widgetId = window.turnstile!.render(container, {
        sitekey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => pending?.(token),
        'error-callback': (code: string) => failed?.(new Error('turnstile:' + code))
      });
      resolve();
    });
  });

  return {
    getToken(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        pending = (t) => {
          window.turnstile!.reset(widgetId);
          resolve(t);
        };
        failed = reject;
        window.turnstile!.execute(widgetId);
      });
    }
  };
}
```

- [ ] **Step 6: Commit**
```bash
git add src/lib/chat/client-stream.ts src/lib/chat/client-stream.test.ts src/lib/chat/turnstile-client.ts
git commit -m "feat: client SSE consumer and Turnstile token helper"
```

---

## Task 13: Chat store (`chat.svelte.ts`)

**Files:**
- Create: `src/lib/stores/chat.svelte.ts`

Mirrors the runes-class singleton pattern of `theme.svelte.ts` / `progress.svelte.ts`. Browser-only orchestration; verified manually in Task 17.

- [ ] **Step 1: Create the store**

`src/lib/stores/chat.svelte.ts`:
```ts
import { browser } from '$app/environment';
import { consumeChatStream } from '$lib/chat/client-stream';
import type { ChatSource, UIMessage } from '$lib/chat/types';

const KEY = 'mastery:chat';

function newId(): string {
  return browser && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

interface Persisted {
  clientId: string;
  messages: UIMessage[];
}

class ChatStore {
  open = $state(false);
  messages = $state<UIMessage[]>([]);
  sending = $state(false);
  error = $state<string | null>(null);

  #clientId = newId();
  #tokenProvider: (() => Promise<string>) | null = null;
  #currentLesson: { slug: string; title: string } | null = null;
  #abort: AbortController | null = null;

  constructor() {
    if (!browser) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw) as Persisted;
        this.#clientId = data.clientId || this.#clientId;
        // Drop any half-streamed message from a previous session.
        this.messages = (data.messages || []).filter((m) => m.status !== 'streaming');
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  setTokenProvider(fn: () => Promise<string>) {
    this.#tokenProvider = fn;
  }

  setCurrentLesson(lesson: { slug: string; title: string } | null) {
    this.#currentLesson = lesson;
  }

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }

  clear() {
    this.messages = [];
    this.error = null;
    this.#save();
  }

  stop() {
    this.#abort?.abort();
  }

  #save() {
    if (!browser) return;
    const data: Persisted = { clientId: this.#clientId, messages: this.messages };
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* quota — ignore */
    }
  }

  #patch(id: string, fields: Partial<UIMessage>) {
    this.messages = this.messages.map((m) => (m.id === id ? { ...m, ...fields } : m));
  }

  async send(text: string) {
    const content = text.trim();
    if (!content || this.sending) return;
    this.error = null;

    const userMsg: UIMessage = { id: newId(), role: 'user', content, status: 'done' };
    const assistantId = newId();
    const assistantMsg: UIMessage = { id: assistantId, role: 'assistant', content: '', status: 'streaming', sources: [] };
    this.messages = [...this.messages, userMsg, assistantMsg];
    this.sending = true;
    this.#save();

    try {
      let turnstileToken = '';
      if (this.#tokenProvider) turnstileToken = await this.#tokenProvider();

      const history = this.messages
        .filter((m) => m.id !== assistantId && m.status !== 'error')
        .map((m) => ({ role: m.role, content: m.content }));

      this.#abort = new AbortController();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.#abort.signal,
        body: JSON.stringify({ messages: history, turnstileToken, currentLesson: this.#currentLesson })
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        this.#patch(assistantId, { status: 'error', content: this.#errorMessage(res.status, data) });
        return;
      }

      await consumeChatStream(
        res.body,
        (e) => {
          if (e.type === 'meta') this.#patch(assistantId, { sources: e.sources as ChatSource[] });
          else if (e.type === 'token') {
            const cur = this.messages.find((m) => m.id === assistantId);
            this.#patch(assistantId, { content: (cur?.content ?? '') + e.text });
          } else if (e.type === 'done') this.#patch(assistantId, { status: 'done' });
          else if (e.type === 'error') this.#patch(assistantId, { status: 'error', content: 'Maaf, ada gangguan saat menjawab. Coba lagi ya.' });
        },
        this.#abort.signal
      );

      const final = this.messages.find((m) => m.id === assistantId);
      if (final?.status === 'streaming') this.#patch(assistantId, { status: 'done' });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      this.#patch(assistantId, {
        status: aborted ? 'done' : 'error',
        content: aborted ? (this.messages.find((m) => m.id === assistantId)?.content ?? '') : 'Maaf, koneksi bermasalah. Coba lagi.'
      });
    } finally {
      this.sending = false;
      this.#abort = null;
      this.#save();
    }
  }

  #errorMessage(status: number, data: { error?: string; resetAt?: number }): string {
    if (status === 429) {
      const when = data.resetAt ? new Date(data.resetAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'besok';
      return `Kamu sudah mencapai batas pertanyaan harian. Coba lagi setelah ${when}.`;
    }
    if (status === 403) return 'Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.';
    return 'Maaf, ada gangguan. Coba lagi sebentar.';
  }
}

export const chat = new ChatStore();
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: no errors in `chat.svelte.ts`. (If `$app/environment` types complain in isolation, that's resolved by SvelteKit's generated types — confirm via the full check.)

- [ ] **Step 3: Commit**
```bash
git add src/lib/stores/chat.svelte.ts
git commit -m "feat: chat store with streaming, history persistence, and error states"
```

---

## Task 14: `ChatMessage.svelte`

**Files:**
- Create: `src/lib/components/chat/ChatMessage.svelte`

- [ ] **Step 1: Create the component**

`src/lib/components/chat/ChatMessage.svelte`:
```svelte
<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import { parseMessageSegments } from '$lib/chat/segments';
  import type { UIMessage } from '$lib/chat/types';

  let { message }: { message: UIMessage } = $props();

  const segments = $derived(message.role === 'assistant' ? parseMessageSegments(message.content) : []);
</script>

<div class="msg" class:user={message.role === 'user'} class:error={message.status === 'error'}>
  {#if message.role === 'user'}
    <p class="user-text">{message.content}</p>
  {:else}
    <div class="bubble">
      {#each segments as seg}
        {#if seg.type === 'code'}
          <CodeBlock code={seg.code} lang={seg.lang} />
        {:else}
          <!-- seg.html is escaped + allow-listed in parseMessageSegments -->
          <p>{@html seg.html}</p>
        {/if}
      {/each}
      {#if message.status === 'streaming'}
        <span class="caret" aria-hidden="true"></span>
      {/if}
      {#if message.sources && message.sources.length > 0}
        <div class="sources">
          <span class="sources-label">Sumber:</span>
          {#each message.sources as s}
            <a class="chip" href={`/belajar/${s.slug}`}>{s.title}</a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .msg {
    display: flex;
    margin: 0.6rem 0;
  }
  .msg.user {
    justify-content: flex-end;
  }
  .user-text {
    margin: 0;
    max-width: 85%;
    background: var(--brand);
    color: #fff;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius);
    border-bottom-right-radius: var(--radius-sm, 6px);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bubble {
    max-width: 92%;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    border-bottom-left-radius: var(--radius-sm, 6px);
    padding: 0.6rem 0.8rem;
    font-size: 0.92rem;
    line-height: 1.55;
  }
  .bubble :global(p) {
    margin: 0 0 0.5rem;
  }
  .bubble :global(p:last-child) {
    margin-bottom: 0;
  }
  .bubble :global(code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--bg-elevated);
    padding: 0.05em 0.35em;
    border-radius: 4px;
  }
  .msg.error .bubble {
    border-color: var(--danger, #c0362c);
    color: var(--danger, #c0362c);
  }
  .caret {
    display: inline-block;
    width: 7px;
    height: 1.05em;
    background: var(--brand);
    vertical-align: text-bottom;
    animation: blink 1s steps(2) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .sources {
    margin-top: 0.6rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .sources-label {
    font-size: 0.72rem;
    color: var(--text-muted);
  }
  .chip {
    font-size: 0.72rem;
    text-decoration: none;
    color: var(--text);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    transition: border-color 0.15s var(--ease);
  }
  .chip:hover {
    border-color: var(--brand);
  }
</style>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: no errors in `ChatMessage.svelte`. Confirm `CodeBlock`'s prop names (`code`, `lang`) match Task conventions; adjust import path if `CodeBlock.svelte` lives elsewhere (verify with `ls src/lib/components/CodeBlock.svelte`).

- [ ] **Step 3: Commit**
```bash
git add src/lib/components/chat/ChatMessage.svelte
git commit -m "feat: chat message renderer with code blocks and citation chips"
```

---

## Task 15: `ChatPanel.svelte`, `ChatBubble.svelte`, starter prompts

**Files:**
- Create: `src/lib/components/chat/starter-prompts.ts`
- Create: `src/lib/components/chat/ChatPanel.svelte`
- Create: `src/lib/components/chat/ChatBubble.svelte`

- [ ] **Step 1: Create starter prompts**

`src/lib/components/chat/starter-prompts.ts`:
```ts
export const STARTER_PROMPTS: string[] = [
  'Apa bedanya $state dan $derived?',
  'Gimana cara load data di SvelteKit?',
  'Kapan harus pakai $effect?',
  'Jelaskan snippet dan {@render}.'
];
```

- [ ] **Step 2: Create the panel**

`src/lib/components/chat/ChatPanel.svelte`:
```svelte
<script lang="ts">
  import { tick } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import { chat } from '$lib/stores/chat.svelte';
  import { createTokenSource } from '$lib/chat/turnstile-client';
  import { STARTER_PROMPTS } from '$lib/components/chat/starter-prompts';
  import ChatMessage from '$lib/components/chat/ChatMessage.svelte';

  let input = $state('');
  let listEl: HTMLDivElement;
  let turnstileEl: HTMLDivElement;

  // Mount the invisible Turnstile widget once and register its token source.
  $effect(() => {
    let cancelled = false;
    createTokenSource(turnstileEl, PUBLIC_TURNSTILE_SITE_KEY)
      .then((src) => {
        if (!cancelled) chat.setTokenProvider(() => src.getToken());
      })
      .catch(() => {
        /* if Turnstile fails to load, the server will reject — surfaced as an error message */
      });
    return () => {
      cancelled = true;
    };
  });

  // Auto-scroll to the newest message as it streams.
  $effect(() => {
    chat.messages;
    tick().then(() => {
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    });
  });

  async function submit(e: Event) {
    e.preventDefault();
    const text = input;
    input = '';
    await chat.send(text);
  }

  function useStarter(p: string) {
    input = p;
    chat.send(p);
    input = '';
  }
</script>

<div class="panel" role="dialog" aria-label="Tanya Svelte">
  <header class="head">
    <strong>🔥 Tanya Svelte</strong>
    <div class="head-actions">
      {#if chat.messages.length > 0}
        <button class="ghost" onclick={() => chat.clear()} title="Bersihkan">Bersihkan</button>
      {/if}
      <button class="ghost" onclick={() => chat.close()} aria-label="Tutup">✕</button>
    </div>
  </header>

  <div class="list" bind:this={listEl}>
    {#if chat.messages.length === 0}
      <div class="empty">
        <p>Tanya apa saja tentang Svelte & SvelteKit. Contoh:</p>
        <div class="starters">
          {#each STARTER_PROMPTS as p}
            <button class="starter" onclick={() => useStarter(p)}>{p}</button>
          {/each}
        </div>
      </div>
    {:else}
      {#each chat.messages as m (m.id)}
        <ChatMessage message={m} />
      {/each}
    {/if}
  </div>

  <form class="composer" onsubmit={submit}>
    <input
      bind:value={input}
      placeholder="Tanya sesuatu…"
      autocomplete="off"
      disabled={chat.sending}
    />
    {#if chat.sending}
      <button type="button" class="send" onclick={() => chat.stop()} title="Hentikan">■</button>
    {:else}
      <button type="submit" class="send" disabled={!input.trim()} aria-label="Kirim">▶</button>
    {/if}
  </form>

  <div bind:this={turnstileEl} class="turnstile"></div>
</div>

<style>
  .panel {
    position: fixed;
    right: 1.25rem;
    bottom: 5rem;
    z-index: 45;
    width: min(380px, calc(100vw - 2rem));
    height: min(560px, calc(100vh - 7rem));
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg, 16px);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  .head-actions {
    display: flex;
    gap: 0.25rem;
  }
  .ghost {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
  }
  .ghost:hover {
    background: var(--bg-subtle);
    color: var(--text);
  }
  .list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0.75rem;
  }
  .empty {
    color: var(--text-muted);
    font-size: 0.88rem;
    padding: 0.5rem 0.25rem;
  }
  .starters {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }
  .starter {
    text-align: left;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: var(--radius);
    padding: 0.5rem 0.7rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s var(--ease);
  }
  .starter:hover {
    border-color: var(--brand);
  }
  .composer {
    display: flex;
    gap: 0.4rem;
    padding: 0.6rem;
    border-top: 1px solid var(--border);
  }
  .composer input {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-subtle);
    color: var(--text);
    padding: 0.5rem 0.7rem;
    font: inherit;
    font-size: 0.9rem;
  }
  .composer input:focus {
    outline: none;
    border-color: var(--brand);
  }
  .send {
    border: none;
    background: var(--brand);
    color: #fff;
    width: 2.4rem;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 0.9rem;
  }
  .send:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .turnstile {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
```

- [ ] **Step 3: Create the bubble (mounts the panel)**

`src/lib/components/chat/ChatBubble.svelte`:
```svelte
<script lang="ts">
  import { chat } from '$lib/stores/chat.svelte';
  import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
</script>

{#if chat.open}
  <ChatPanel />
{/if}

<button class="bubble" onclick={() => chat.toggle()} aria-label={chat.open ? 'Tutup Tanya Svelte' : 'Buka Tanya Svelte'} aria-expanded={chat.open}>
  {#if chat.open}✕{:else}💬{/if}
</button>

<style>
  .bubble {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem;
    z-index: 45;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    border: none;
    background: var(--brand);
    color: #fff;
    font-size: 1.3rem;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition: transform 0.15s var(--ease);
  }
  .bubble:hover {
    transform: translateY(-2px);
  }
  @media (max-width: 560px) {
    .bubble {
      right: 1rem;
      bottom: 1rem;
    }
  }
</style>
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no errors. If `$env/static/public` errors because `PUBLIC_TURNSTILE_SITE_KEY` is unset, confirm `.env` (Task 1 Step 3) exists with the public test key.

- [ ] **Step 5: Commit**
```bash
git add src/lib/components/chat/starter-prompts.ts src/lib/components/chat/ChatPanel.svelte src/lib/components/chat/ChatBubble.svelte
git commit -m "feat: chat panel, bubble launcher, and starter prompts"
```

---

## Task 16: Mount the bubble site-wide + wire current-lesson context

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Import the bubble, content helper, and page state**

In the `<script lang="ts">` of `src/routes/+layout.svelte`, add (the file already imports `page` for the drawer effect — reuse it; if it imports from `$app/stores` instead of `$app/state`, match the existing import and use `$page`):
```ts
import ChatBubble from '$lib/components/chat/ChatBubble.svelte';
import { chat } from '$lib/stores/chat.svelte';
import { getModule } from '$lib/content';
```

- [ ] **Step 2: Keep the chat's current-lesson context in sync with the route**

Add this `$effect` alongside the existing drawer effect (use `page.url.pathname` exactly as the existing code reads it):
```ts
$effect(() => {
  const path = page.url.pathname;
  if (path.startsWith('/belajar/')) {
    const slug = path.slice('/belajar/'.length).replace(/\/$/, '');
    const mod = getModule(slug);
    chat.setCurrentLesson(mod ? { slug, title: mod.title } : { slug, title: slug });
  } else {
    chat.setCurrentLesson(null);
  }
});
```

- [ ] **Step 3: Render the bubble once, after the main body markup**

Just before the end of the layout template (after the `</div>` that closes `.body`, still inside the component root), add:
```svelte
<ChatBubble />
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no errors. Confirm `getModule` is exported from `src/lib/content.ts` (it is per conventions); if the helper name differs, use the actual export.

- [ ] **Step 5: Commit**
```bash
git add src/routes/+layout.svelte
git commit -m "feat: mount Tanya Svelte bubble site-wide with lesson context"
```

---

## Task 17: Full-suite check, manual verification, and deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Run the entire unit suite**

Run: `npm test`
Expected: all suites green (`sse`, `protocol`, `segments`, `workers-ai`, `providers`, `retrieval`, `prompt`, `turnstile`, `ratelimit`, `cache`, `chat-stream`, `handle-chat`, `client-stream`, `chunk`).

- [ ] **Step 2: Type-check + build**

Run: `npm run check && npm run build`
Expected: no type errors; build succeeds. The build runs `gen-data`/`gen-manifest` via `prebuild` as usual; `/api/chat` compiles into the Worker (not prerendered).

- [ ] **Step 3: Confirm the index is populated**

If not done in Task 11 Step 8, run:
```bash
set -a; source .dev.vars; set +a
npm run index
```
Expected: "✓ Index build complete." Sanity-check a query:
```bash
npx wrangler vectorize query tanya-svelte --help   # confirm CLI; or rely on the live endpoint below
```

- [ ] **Step 4: Local end-to-end smoke**

Run the app with Cloudflare bindings. Preferred:
```bash
npm run build && npx wrangler dev
```
(`wrangler dev` provides KV locally and proxies `AI`/`VECTORIZE` to the real account — you must be `wrangler login`'d. Alternatively `npm run dev` if the adapter's platform proxy is configured for your setup.)

Verify in the browser:
- [ ] Bubble appears bottom-right on the home page and on a `/belajar/...` lesson.
- [ ] Clicking it opens the panel; starter prompts show when empty.
- [ ] Asking "Apa itu $state?" streams an answer token-by-token, then shows **Sumber:** chips linking to lessons.
- [ ] A code block renders with syntax highlighting (reused `CodeBlock`).
- [ ] Asking the **same** question again returns instantly (cache hit).
- [ ] On a lesson page, asking "jelasin ini" references the current lesson.
- [ ] Stop button cancels a streaming answer; refresh preserves history (localStorage), minus any half-streamed message.
- [ ] Set `CHAT_RATE_LIMIT=2` temporarily (in `.dev.vars`/`wrangler.jsonc` vars), restart, send 3 messages → the 3rd shows the friendly daily-limit message. Restore to 40.

- [ ] **Step 5: Production secrets + keys**

```bash
# Real Turnstile secret (from Task 0 Step 4):
npx wrangler secret put TURNSTILE_SECRET_KEY
```
Set the real public site key for production builds: put `PUBLIC_TURNSTILE_SITE_KEY=<real-site-key>` in your deploy environment (CI/CD env var or build `.env`), replacing the test key. Keep `CF_API_TOKEN`/`CF_ACCOUNT_ID` only in your local `.dev.vars` / CI secrets (used by `npm run index`, never by the Worker).

- [ ] **Step 6: Deploy**

Run your normal deploy (e.g. `npx wrangler deploy` or the Cloudflare Pages/Workers CI). After deploy, confirm `/api/chat` responds (the bubble works on the live site) and that prerendered pages are unaffected.

- [ ] **Step 7: Final commit / docs note**

If you keep a README/CHANGELOG, note the new feature, the `npm run index` step for content updates, and the required bindings/secrets.
```bash
git add -A
git commit -m "docs: note Tanya Svelte chatbot setup (bindings, secrets, indexing)"
```

---

## Self-Review (completed by plan author)

**Spec coverage** — every spec section maps to a task:
- Broad tutor role + guardrails → Task 7 (`buildSystemPrompt`).
- Workers AI free backend + streaming → Task 6.
- Swappable provider (single configurable) → Task 6 registry + `CHAT_PROVIDER`.
- Vectorize semantic RAG w/ `bge-m3` (1024-dim) → Tasks 7 + 11.
- Floating bubble/panel UI → Tasks 14–16.
- Turnstile + KV rate-limit + KV cache → Tasks 8, 10.
- localStorage history → Task 13.
- Citations from metadata → Tasks 7/10 (`meta` event) + 14 (chips).
- Indonesian-primary + current-lesson context → Tasks 7, 13, 16.
- Error handling (429/403/timeout/no-match/abort) → Tasks 10, 13.
- Testing strategy → Vitest across Tasks 3–13 + manual checklist Task 17.
- New infra/config → Tasks 0, 1.

**Placeholder scan** — no "TBD/TODO/handle edge cases"; every code step shows complete code. Provider stubs intentionally `throw` a clear message (not placeholders — they're the documented "fill later" extension point).

**Type consistency** — shared names verified across tasks: `ChatTurn`, `ChatSource`, `UIMessage`, `ServerEvent`, `RetrievedChunk`, `AiLike`; `encodeServerEvent`/`parseServerEvents`, `parseSSEEvents`, `parseMessageSegments`, `buildSystemPrompt`/`dedupeSources`, `embedQuery`/`queryChunks`, `getProvider`, `buildResponseStream`, `checkAndIncrement`, `cacheKey`/`getCached`/`putCached`, `verifyTurnstile`, `handleChat`, `consumeChatStream`, `chunkSvx`/`stripSvxBody`, store singleton `chat`. Bindings `AI`/`VECTORIZE`/`CHAT_KV` and vars `CHAT_PROVIDER`/`CHAT_MODEL`/`EMBED_MODEL`/`CHAT_RATE_LIMIT`/`TURNSTILE_SECRET_KEY`/`PUBLIC_TURNSTILE_SITE_KEY` consistent throughout.

**Known judgment calls (flagged for the implementer):**
- `CodeBlock.svelte` import path assumes `src/lib/components/CodeBlock.svelte`; verify before Task 14.
- `+layout.svelte` `page` import source (`$app/state` vs `$app/stores`) must match the existing file (Task 16).
- `wrangler dev` proxies `AI`/`VECTORIZE` to the real account; pure `npm run dev` may not expose them depending on adapter platform-proxy config — Task 17 notes both.
