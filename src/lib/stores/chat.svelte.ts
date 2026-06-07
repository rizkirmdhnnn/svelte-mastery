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
