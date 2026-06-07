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
