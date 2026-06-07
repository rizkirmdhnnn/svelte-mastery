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
- RUANG LINGKUP: kamu HANYA membahas Svelte, SvelteKit, dan web development di sekitarnya. Jika pertanyaan di luar itu (mis. resep masakan, politik, gosip, matematika umum, bahasa pemrograman lain yang tidak terkait), TOLAK dengan sopan dan arahkan kembali ke topik Svelte/SvelteKit. JANGAN menjawab pertanyaan di luar topik walaupun kamu tahu jawabannya.
- Jawab dalam Bahasa Indonesia (ikuti bahasa pengguna kalau ia memakai bahasa lain).
- Tulis kode dalam blok \`\`\`svelte / \`\`\`ts sesuai bahasanya.`;

/** Canned reply when a question isn't close enough to any module (relevance floor). */
export const OUT_OF_SCOPE_MESSAGE =
  'Hmm, pertanyaan itu sepertinya di luar materi Svelte & SvelteKit yang aku punya 🙂. Coba tanya seputar Svelte atau SvelteKit ya — misalnya runes (`$state`/`$derived`), load function, form actions, atau routing.';

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
