export type Segment =
  | { type: 'text'; html: string }
  | { type: 'code'; code: string; lang: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline formatting for a single already-escaped line. */
function inline(s: string): string {
  // links [text](url) — url already escaped (quotes/brackets become entities); keep simple, safe chars only
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

/**
 * Convert one prose block (already separated from code) to safe block-level
 * HTML: ATX headings (`#`..`######`), unordered (`-`/`*`) and ordered (`1.`)
 * lists, and paragraphs (single newlines become <br>, blank lines split
 * paragraphs). Input is HTML-escaped first, so the emitted markup only ever
 * contains our own known-safe tags.
 */
function renderProse(raw: string): string {
  const lines = escapeHtml(raw).split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const ulItem = line.match(/^\s*[-*]\s+(.+)$/);
    const olItem = line.match(/^\s*\d+\.\s+(.+)$/);

    if (heading) {
      flushPara();
      flushList();
      const level = Math.min(heading[1].length, 6);
      out.push(`<div class="md-h md-h${level}">${inline(heading[2])}</div>`);
    } else if (ulItem) {
      flushPara();
      if (!list || list.type !== 'ul') {
        flushList();
        list = { type: 'ul', items: [] };
      }
      list.items.push(ulItem[1]);
    } else if (olItem) {
      flushPara();
      if (!list || list.type !== 'ol') {
        flushList();
        list = { type: 'ol', items: [] };
      }
      list.items.push(olItem[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join('');
}

/**
 * Split assistant markdown into ordered text/code segments. Fenced code blocks
 * (```lang ... ```) become `code` segments (rendered by CodeBlock); everything
 * else becomes XSS-safe `text` segments. Empty prose blocks are dropped.
 */
export function parseMessageSegments(content: string): Segment[] {
  if (!content) return [];
  const segments: Segment[] = [];
  const fence = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(content)) !== null) {
    const before = content.slice(last, m.index).trim();
    if (before) segments.push({ type: 'text', html: renderProse(before) });
    segments.push({ type: 'code', code: m[2].replace(/\n$/, ''), lang: m[1] || 'svelte' });
    last = fence.lastIndex;
  }
  const tail = content.slice(last).trim();
  if (tail) segments.push({ type: 'text', html: renderProse(tail) });
  return segments;
}
