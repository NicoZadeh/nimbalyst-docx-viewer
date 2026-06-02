/**
 * Text-quote anchoring (the web-annotation pattern). Anchors are computed over the rendered
 * document's plain text (textContent) so they survive re-render and zoom: we store the exact
 * quote plus a little surrounding context, and re-find it later, disambiguating duplicates by
 * context and proximity to the original offset. Pure and fully unit-testable.
 */

const CONTEXT = 32;

export interface TextAnchor {
  exact: string;
  prefix: string;
  suffix: string;
  startHint: number;
}

export interface Span {
  start: number;
  end: number;
}

export function serializeAnchor(text: string, start: number, end: number): TextAnchor {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, Math.min(text.length, end + CONTEXT)),
    startHint: start,
  };
}

function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

/**
 * Resolve an anchor to a span in (possibly changed) text. Returns null when the quote is not
 * found at all, so the caller can mark the annotation "unanchored" rather than mis-place it.
 */
export function resolveAnchor(text: string, anchor: TextAnchor): Span | null {
  if (!anchor.exact) return null;
  const occurrences: number[] = [];
  let from = 0;
  for (;;) {
    const i = text.indexOf(anchor.exact, from);
    if (i === -1) break;
    occurrences.push(i);
    from = i + Math.max(1, anchor.exact.length);
  }
  if (occurrences.length === 0) return null;
  if (occurrences.length === 1) {
    return { start: occurrences[0], end: occurrences[0] + anchor.exact.length };
  }
  let best = occurrences[0];
  let bestScore = -1;
  for (const i of occurrences) {
    const pre = text.slice(Math.max(0, i - anchor.prefix.length), i);
    const suf = text.slice(i + anchor.exact.length, i + anchor.exact.length + anchor.suffix.length);
    const score = commonSuffixLen(pre, anchor.prefix) + commonPrefixLen(suf, anchor.suffix);
    const closer = Math.abs(i - anchor.startHint) < Math.abs(best - anchor.startHint);
    if (score > bestScore || (score === bestScore && closer)) {
      best = i;
      bestScore = score;
    }
  }
  return { start: best, end: best + anchor.exact.length };
}
