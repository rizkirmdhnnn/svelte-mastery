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
