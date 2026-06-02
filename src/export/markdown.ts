import mammoth from 'mammoth';
import { runMammoth } from '../ai/mammothInput';
import { withTimeout, MAX_EXTRACT_BYTES, EXTRACT_TIMEOUT_MS } from '../ai/extractText';
import { decodeXmlEntities } from '../util/xml';

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/**
 * Minimal HTML -> Markdown for the subset Mammoth emits (headings, paragraphs, bold/italic,
 * links, lists, line breaks). Not a general converter; just enough for "Copy as Markdown".
 */
export function htmlToMarkdown(html: string): string {
  let s = html.replace(/\r\n?/g, '\n');
  // Inline first, so heading/paragraph extraction sees plain markers.
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_m, _t, c: string) => `**${c}**`);
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_m, _t, c: string) => `*${c}*`);
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, c: string) => `[${stripTags(c)}](${href})`);
  s = s.replace(/<br\s*\/?>/gi, '  \n');
  // Lists.
  s = s.replace(/<li>([\s\S]*?)<\/li>/gi, (_m, c: string) => `- ${stripTags(c).trim()}\n`);
  s = s.replace(/<\/?(ul|ol)>/gi, '\n');
  // Headings.
  for (let n = 6; n >= 1; n -= 1) {
    const re = new RegExp(`<h${n}>([\\s\\S]*?)</h${n}>`, 'gi');
    s = s.replace(re, (_m, c: string) => `\n${'#'.repeat(n)} ${stripTags(c).trim()}\n`);
  }
  // Paragraphs.
  s = s.replace(/<p>([\s\S]*?)<\/p>/gi, (_m, c: string) => `\n${c.trim()}\n`);
  // Anything left.
  s = stripTags(s);
  s = decodeXmlEntities(s);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convert a whole .docx to Markdown via Mammoth's HTML, then htmlToMarkdown. Byte-guard before
 * Mammoth + best-effort timeout, matching extractText/extractOutline.
 */
export async function docToMarkdown(buf: ArrayBuffer, options: { maxBytes?: number; timeoutMs?: number } = {}): Promise<string> {
  const maxBytes = options.maxBytes ?? MAX_EXTRACT_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new Error('Document is too large to convert to Markdown.');
  }
  const html = await withTimeout(
    runMammoth(buf, (input) => mammoth.convertToHtml(input).then((r) => r.value)),
    options.timeoutMs ?? EXTRACT_TIMEOUT_MS,
  );
  return htmlToMarkdown(html);
}
