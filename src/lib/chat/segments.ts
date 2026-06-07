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

/** Convert one prose block (already separated from code) to safe HTML. */
function renderProse(raw: string): string {
  let html = escapeHtml(raw);
  // links [text](url) — url already escaped (quotes/brackets become entities); keep simple, safe chars only
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br>');
  return html;
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
