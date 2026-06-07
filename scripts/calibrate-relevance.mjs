// Probe the live Vectorize index with on-topic vs off-topic questions and print
// the top similarity scores, so we can pick a sensible relevance threshold.
// Usage:  set -a; source .dev.vars; set +a;  node scripts/calibrate-relevance.mjs

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const INDEX = process.env.VECTORIZE_INDEX || 'tanya-svelte';
const EMBED_MODEL = '@cf/baai/bge-m3';

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN (source .dev.vars).');
  process.exit(1);
}

const PROBES = [
  ['on ', 'apa itu $state di svelte'],
  ['on ', 'bedanya $state dan $derived'],
  ['on ', 'gimana cara load data di sveltekit'],
  ['on ', 'cara pakai snippet dan render'],
  ['on ', 'apa itu rune dan kenapa dipakai'],
  ['on ', 'cara bikin form action di sveltekit'],
  ['near', 'cara pakai useState di react'],
  ['near', 'apa itu python decorator'],
  ['OFF', 'resep rendang padang'],
  ['OFF', 'siapa presiden indonesia'],
  ['OFF', 'cara masak nasi goreng enak'],
  ['OFF', 'harga emas hari ini'],
  ['OFF', 'rekomendasi film action terbaik']
];

async function embed(text) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBED_MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error('embed: ' + JSON.stringify(j.errors));
  return j.result.data[0];
}

async function query(vector) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, topK: 3, returnMetadata: 'all' })
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error('query: ' + JSON.stringify(j.errors));
  return j.result.matches;
}

console.log('label | top1   top2   top3  | top-slug                         | question');
console.log('------+----------------------+----------------------------------+---------');
for (const [label, q] of PROBES) {
  try {
    const matches = await query(await embed(q));
    const s = matches.map((m) => m.score.toFixed(3));
    const slug = matches[0]?.metadata?.slug ?? '-';
    console.log(`${label.padEnd(5)} | ${(s[0] ?? '-').padEnd(6)} ${(s[1] ?? '-').padEnd(6)} ${(s[2] ?? '-').padEnd(5)}| ${String(slug).padEnd(32)} | ${q}`);
  } catch (e) {
    console.log(`${label.padEnd(5)} | ERROR ${e.message} | ${q}`);
  }
}
