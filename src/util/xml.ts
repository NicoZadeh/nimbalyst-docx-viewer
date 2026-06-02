/**
 * Dependency-free XML helpers for the small, well-known docProps parts (core.xml, app.xml).
 * We deliberately avoid a parser dependency and the browser DOMParser (so the same code runs in
 * Node tests and the renderer). Only used for trusted, structurally-simple OOXML metadata.
 */

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // last, so we never double-decode
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * First text content of an element matched by LOCAL name (any/no namespace prefix), trimmed and
 * entity-decoded. Returns undefined if absent, self-closing, or empty.
 */
export function xmlText(xml: string, localName: string): string | undefined {
  const name = escapeRe(localName);
  const re = new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`, 'i');
  const m = re.exec(xml);
  if (!m) return undefined;
  const inner = decodeXmlEntities(m[1].trim());
  return inner.length ? inner : undefined;
}
