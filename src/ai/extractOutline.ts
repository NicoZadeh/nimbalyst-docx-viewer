import mammoth from 'mammoth';
import { runMammoth } from './mammothInput';
import { withTimeout, MAX_EXTRACT_BYTES, EXTRACT_TIMEOUT_MS } from './extractText';
import { decodeXmlEntities } from '../util/xml';

export interface OutlineItem {
  level: number;
  text: string;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** Parse h1..h6 from Mammoth HTML into an ordered outline. Never derived from raw text. */
export function parseHeadings(html: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeXmlEntities(stripTags(m[2])).trim();
    if (text) items.push({ level: Number(m[1]), text });
  }
  return items;
}

/**
 * Heading hierarchy via Mammoth's style map (Word "Heading N" / styleId "HeadingN" -> hN by
 * default). Images are replaced with empty <img> (harmless; we only read headings). Byte guard
 * before Mammoth; best-effort timeout. Runs in Node tests and the renderer (shared input helper).
 */
export async function extractOutline(
  buf: ArrayBuffer,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<OutlineItem[]> {
  const maxBytes = options.maxBytes ?? MAX_EXTRACT_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new Error('Document is too large to extract an outline.');
  }
  const html = await withTimeout(
    runMammoth(buf, (input) =>
      mammoth
        .convertToHtml(input, { convertImage: mammoth.images.imgElement(async () => ({ src: '' })) })
        .then((r) => r.value),
    ),
    options.timeoutMs ?? EXTRACT_TIMEOUT_MS,
  );
  return parseHeadings(html);
}
