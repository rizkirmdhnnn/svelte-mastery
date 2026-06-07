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

  // Embed in token-budget-aware batches. bge-m3 caps TOTAL tokens per request at
  // 60k, so batch by character budget (~3 chars/token → stay well under) rather
  // than a fixed count.
  const MAX_BATCH_CHARS = 90000;
  const MAX_BATCH_ITEMS = 40;
  const vectors = [];
  let batch = [];
  let batchChars = 0;
  let done = 0;
  const flushEmbed = async () => {
    if (batch.length === 0) return;
    const embeds = await embedBatch(batch.map((c) => c.text));
    batch.forEach((c, j) => vectors.push({ id: c.id, values: embeds[j], metadata: c.metadata }));
    done += batch.length;
    console.log(`Embedded ${done}/${allChunks.length}`);
    batch = [];
    batchChars = 0;
  };
  for (const c of allChunks) {
    if (batch.length > 0 && (batchChars + c.text.length > MAX_BATCH_CHARS || batch.length >= MAX_BATCH_ITEMS)) {
      await flushEmbed();
    }
    batch.push(c);
    batchChars += c.text.length;
  }
  await flushEmbed();
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
