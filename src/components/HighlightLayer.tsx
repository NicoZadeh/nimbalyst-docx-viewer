import { useEffect, useState, type RefObject } from 'react';
import { rectsForSpan, type OverlayRect } from '../annotations/domRange';
import type { Span } from '../annotations/anchor';

export type HighlightKind = 'yellow' | 'green' | 'pink' | 'blue' | 'search' | 'search-active';

export interface HighlightItem {
  id: string;
  span: Span;
  kind: HighlightKind;
}

interface HighlightLayerProps {
  bodyRef: RefObject<HTMLDivElement>;
  scrollRef: RefObject<HTMLDivElement>;
  items: HighlightItem[];
  /** Bumped on re-render to force recompute. */
  revision: number;
  /** Current zoom; a change re-lays-out the rects. Kept separate from `revision` so the two can never collide. */
  scale: number;
  ready: boolean;
}

// Solid pastels; the overlay uses mix-blend-mode:multiply so these tint the white page while
// leaving the (black) text crisp — a real highlighter look that stays readable.
const KIND_COLOR: Record<HighlightKind, string> = {
  yellow: '#ffe35c',
  green: '#a5e29a',
  pink: '#f7a8cf',
  blue: '#8ec5f6',
  search: '#ffe082',
  'search-active': '#ffb300',
};

interface PaintedRect {
  key: string;
  color: string;
  rect: OverlayRect;
}

/**
 * Paints highlight rectangles as a non-interactive DOM overlay computed from Range.getClientRects.
 * Rects are stored in scroll-content coordinates (scroll-invariant), so they only need recompute
 * on resize / zoom / re-render — never on scroll. getClientRects reflects the active CSS zoom, so
 * this aligns at any scale (unlike the CSS Custom Highlight API over `zoom`).
 */
export function HighlightLayer({ bodyRef, scrollRef, items, revision, scale, ready }: HighlightLayerProps) {
  const [painted, setPainted] = useState<PaintedRect[]>([]);

  useEffect(() => {
    const body = bodyRef.current;
    const scroll = scrollRef.current;
    if (!body || !scroll || !ready) {
      setPainted([]);
      return;
    }
    const compute = () => {
      const next: PaintedRect[] = [];
      for (const item of items) {
        const rects = rectsForSpan(body, scroll, item.span);
        rects.forEach((rect, i) => {
          if (rect.width <= 0 || rect.height <= 0) return; // skip degenerate/empty rects
          next.push({ key: `${item.id}:${i}`, color: KIND_COLOR[item.kind], rect });
        });
      }
      setPainted(next);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(scroll);
    observer.observe(body);
    return () => observer.disconnect();
  }, [bodyRef, scrollRef, items, revision, scale, ready]);

  return (
    <div className="nim-docx-overlay" aria-hidden="true">
      {painted.map((p) => (
        <div
          key={p.key}
          className="nim-docx-hl"
          style={{ left: p.rect.left, top: p.rect.top, width: p.rect.width, height: p.rect.height, background: p.color }}
        />
      ))}
    </div>
  );
}
