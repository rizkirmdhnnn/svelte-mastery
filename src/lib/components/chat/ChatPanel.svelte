<script lang="ts">
  import { tick } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import { chat } from '$lib/stores/chat.svelte';
  import { createTokenSource, type TokenSource } from '$lib/chat/turnstile-client';
  import { STARTER_PROMPTS } from '$lib/components/chat/starter-prompts';
  import ChatMessage from '$lib/components/chat/ChatMessage.svelte';

  let input = $state('');
  let listEl: HTMLDivElement;
  let turnstileEl: HTMLDivElement;

  // Mount the invisible Turnstile widget and register its token source. The
  // widget is removed on unmount so toggling the panel doesn't leak widgets.
  $effect(() => {
    let cancelled = false;
    let source: TokenSource | null = null;
    createTokenSource(turnstileEl, PUBLIC_TURNSTILE_SITE_KEY)
      .then((src) => {
        source = src;
        if (cancelled) {
          src.destroy();
          return;
        }
        chat.setTokenProvider((opts) => src.getToken(opts));
      })
      .catch(() => {
        /* Turnstile failed to load; send() bounds the wait and surfaces a retryable error */
      });
    return () => {
      cancelled = true;
      source?.destroy();
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

  <!-- Turnstile shows only until a session token is held; then it hides. -->
  <div bind:this={turnstileEl} class="turnstile" class:idle={chat.sessionActive}></div>
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
  /* Turnstile must mount into a real (non-zero, non-hidden) container or it
     never renders. An interaction-only widget stays ~0-height when no challenge
     is needed, so this is invisible in normal use. */
  .turnstile {
    display: flex;
    justify-content: center;
  }
  .turnstile.idle {
    display: none;
  }
  .turnstile:not(:empty) {
    padding: 0 0.6rem 0.6rem;
  }
</style>
