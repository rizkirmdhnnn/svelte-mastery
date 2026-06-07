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
