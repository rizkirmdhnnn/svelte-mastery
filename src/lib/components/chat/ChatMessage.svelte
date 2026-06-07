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
          <!-- seg.html is escaped + allow-listed block markup from parseMessageSegments -->
          <div class="prose">{@html seg.html}</div>
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
  .bubble :global(.prose:last-child > :last-child) {
    margin-bottom: 0;
  }
  .bubble :global(.md-h) {
    font-weight: 700;
    line-height: 1.3;
    margin: 0.7rem 0 0.35rem;
  }
  .bubble :global(.prose:first-child > .md-h:first-child) {
    margin-top: 0;
  }
  .bubble :global(.md-h1) {
    font-size: 1.05rem;
  }
  .bubble :global(.md-h2) {
    font-size: 1rem;
  }
  .bubble :global(.md-h3) {
    font-size: 0.95rem;
  }
  .bubble :global(.md-h4),
  .bubble :global(.md-h5),
  .bubble :global(.md-h6) {
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .bubble :global(ul),
  .bubble :global(ol) {
    margin: 0 0 0.5rem;
    padding-left: 1.25rem;
  }
  .bubble :global(li) {
    margin: 0.15rem 0;
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
