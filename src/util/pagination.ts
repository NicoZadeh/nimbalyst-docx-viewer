export interface PageGap {
  beforeIndex: number;
  height: number;
}

/**
 * Block-level visual pagination. Given the heights (in unzoomed CSS px) of a section's top-level
 * blocks and the page height, returns the spacer insertions that push each block which would
 * straddle a page boundary down to the start of the next page, so the content renders as discrete
 * page sheets. A block taller than a page is left whole (it overflows — e.g. a single large table
 * cannot be split at the block level).
 */
export function computePageGaps(blockHeights: number[], pageHeight: number, gap = 24): PageGap[] {
  if (!(pageHeight > 0)) return [];
  const gaps: PageGap[] = [];
  let used = 0; // content height already placed on the current page
  for (let i = 0; i < blockHeights.length; i += 1) {
    const h = blockHeights[i];
    if (used > 0 && used + h > pageHeight && h <= pageHeight) {
      // Doesn't fit on the current page: fill the remainder + a gap, start it on the next page.
      gaps.push({ beforeIndex: i, height: Math.max(0, pageHeight - used) + gap });
      used = h;
    } else {
      used += h;
      while (used > pageHeight) used -= pageHeight; // wrap oversized/accumulated content
    }
  }
  return gaps;
}
