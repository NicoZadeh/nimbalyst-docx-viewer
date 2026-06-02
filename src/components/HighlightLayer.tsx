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
  /** Click on an annotation (not search) highlight; rect is in scroll-content coords. */
  onAnnotationClick?: (id: string, rect: OverlayRect) => void;
}

function isAnnotation(kind: HighlightKind): boolean {
  return kind !== 'search' && kind !== 'search-active';
}

// Low-alpha translucent fills: enough tint to read as a highlight, light enough that the black
// text underneath stays fully legible. No blend mode (unreliable over a CSS-zoomed page).
const KIND_COLOR: Record<HighlightKind, string> = {
  yellow: 'rgba(255, 235, 59, 0.30)',
  green: 'rgba(102, 187, 106, 0.30)',
  pink: 'rgba(236, 64, 122, 0.26)',
  blue: 'rgba(66, 165, 245, 0.26)',
  search: 'rgba(255, 213, 79, 0.40)',
  'search-active': 'rgba(255, 145, 0, 0.55)',
};

interface PaintedRect {
  key: string;
  id: string;
  color: string;
  rect: OverlayRect;
  clickable: boolean;
}

/**
 * Paints highlight rectangles as a non-interactive DOM overlay computed from Range.getClientRects.
 * Rects are stored in scroll-content coordinates (scroll-invariant), so they only need recompute
 * on resize / zoom / re-render — never on scroll. getClientRects reflects the active CSS zoom, so
 * this aligns at any scale (unlike the CSS Custom Highlight API over `zoom`).
 */
export function HighlightLayer({ bodyRef, scrollRef, items, revision, scale, ready, onAnnotationClick }: HighlightLayerProps) {
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
        const clickable = isAnnotation(item.kind);
        const rects = rectsForSpan(body, scroll, item.span);
        rects.forEach((rect, i) => {
          if (rect.width <= 0 || rect.height <= 0) return; // skip degenerate/empty rects
          next.push({ key: `${item.id}:${i}`, id: item.id, color: KIND_COLOR[item.kind], rect, clickable });
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
          className={p.clickable ? 'nim-docx-hl nim-docx-hl-click' : 'nim-docx-hl'}
          style={{ left: p.rect.left, top: p.rect.top, width: p.rect.width, height: p.rect.height, background: p.color }}
          onClick={p.clickable && onAnnotationClick ? () => onAnnotationClick(p.id, p.rect) : undefined}
        />
      ))}
    </div>
  );
}
