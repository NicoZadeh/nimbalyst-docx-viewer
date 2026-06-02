export interface Match {
  start: number;
  end: number;
}

/**
 * Case-insensitive, non-overlapping plain-substring matches of `query` within `text`.
 * Returns character offsets into `text` (the rendered document's textContent).
 */
export function findMatches(text: string, query: string): Match[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hay = text.toLowerCase();
  const matches: Match[] = [];
  let from = 0;
  for (;;) {
    const idx = hay.indexOf(needle, from);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + needle.length });
    from = idx + needle.length;
  }
  return matches;
}
