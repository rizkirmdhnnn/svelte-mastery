import { browser } from '$app/environment';
import { consumeChatStream } from '$lib/chat/client-stream';
import type { ChatSource, UIMessage } from '$lib/chat/types';

/** Yields a fresh single-use Turnstile token; cancellable via the signal. */
type TokenProvider = (opts?: { signal?: AbortSignal }) => Promise<string>;

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
  #tokenProvider: TokenProvider | null = null;
  #currentLesson: { slug: string; title: string } | null = null;
  #abort: AbortController | null = null;
  /** Resolves once the Turnstile widget has registered a token provider. */
  #tokenReady: Promise<void>;
  #resolveTokenReady!: () => void;

  constructor() {
    this.#tokenReady = new Promise<void>((resolve) => (this.#resolveTokenReady = resolve));
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

  setTokenProvider(fn: TokenProvider) {
    this.#tokenProvider = fn;
    this.#resolveTokenReady();
  }

  /**
   * Wait (bounded + cancellable) for the Turnstile widget to register. Prevents
   * both the first-open race (sending before the provider exists → empty token →
   * 403) and a hang when the widget never loads at all.
   */
  #awaitTokenReady(signal: AbortSignal, timeoutMs = 8000): Promise<void> {
    if (this.#tokenProvider) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('verification not ready'));
      }, timeoutMs);
      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.#tokenReady.then(() => {
        cleanup();
        resolve();
      });
    });
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

    // Create the abort controller BEFORE awaiting the token so Stop can cancel
    // the security check itself, not just the fetch that follows it.
    this.#abort = new AbortController();
    const signal = this.#abort.signal;

    try {
      // Security check — bounded and cancellable. A Turnstile widget that never
      // solves (e.g. a managed challenge that needs interaction the invisible
      // widget can't surface) used to hang here forever, leaving an empty bubble
      // and a dead Stop button. Now it times out into a retryable error.
      let turnstileToken = '';
      try {
        await this.#awaitTokenReady(signal);
        if (this.#tokenProvider) turnstileToken = await this.#tokenProvider({ signal });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          this.#patch(assistantId, { status: 'done' });
        } else {
          const reason = err instanceof Error ? err.message : 'penyebab tidak diketahui';
          this.#patch(assistantId, {
            status: 'error',
            content: `Verifikasi keamanan tidak selesai (${reason}). Muat ulang halaman; kalau tetap gagal, cek apakah ekstensi/pemblokir iklan menghalangi challenges.cloudflare.com.`
          });
        }
        return;
      }

      const history = this.messages
        .filter((m) => m.id !== assistantId && m.status !== 'error')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
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
        signal
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

  #errorMessage(status: number, data: { error?: string; resetAt?: number; codes?: string[] }): string {
    if (status === 429) {
      const when = data.resetAt ? new Date(data.resetAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'besok';
      return `Kamu sudah mencapai batas pertanyaan harian. Coba lagi setelah ${when}.`;
    }
    if (status === 403) {
      const codes = Array.isArray(data.codes) ? data.codes : [];
      const reasons: Record<string, string> = {
        'missing-input-response': 'token verifikasi kosong (widget belum menghasilkan token)',
        'timeout-or-duplicate': 'token kedaluwarsa atau sudah dipakai — coba kirim lagi',
        'invalid-input-response': 'token tidak valid',
        'invalid-input-secret': 'konfigurasi server salah (secret tidak cocok dengan site key)',
        'bad-request': 'permintaan verifikasi tidak valid',
        'siteverify-unreachable': 'server verifikasi tidak bisa dihubungi'
      };
      const detail = codes.length ? (reasons[codes[0]] ?? `kode: ${codes.join(', ')}`) : 'alasan tidak diketahui';
      return `Verifikasi keamanan ditolak: ${detail}. Muat ulang halaman lalu coba lagi.`;
    }
    return 'Maaf, ada gangguan. Coba lagi sebentar.';
  }
}

export const chat = new ChatStore();
