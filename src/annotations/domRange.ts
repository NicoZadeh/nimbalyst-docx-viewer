import type { Span } from './anchor';

/**
 * Map between character offsets into an element's textContent and DOM (text node, offset) pairs,
 * and from a Span to absolutely-positioned overlay rectangles. Offset<->node mapping is layout-
 * free (TreeWalker over text nodes) and unit-tested; rect computation uses getClientRects and is
 * runtime-only (it reflects the active CSS zoom, so overlay rects align at any scale).
 */

export interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function doc(root: Node): Document {
  return root.ownerDocument ?? document;
}

const TEXT_NODE = 3;

/** All text-node descendants of root, in document order (portable: no TreeWalker dependency). */
function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const visit = (node: Node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === TEXT_NODE) out.push(child as Text);
      else visit(child);
    }
  };
  visit(root);
  return out;
}

/** Character offset of (node, offsetInNode) within root.textContent. */
export function offsetOf(root: Node, node: Node, offsetInNode: number): number {
  // Element container: offsetInNode is a CHILD INDEX (common for triple-click / edge selections).
  // Resolve it to a character offset = (text before the element) + (text of children[0..index]).
  if (node.nodeType !== TEXT_NODE) {
    let beforeEl = 0;
    let foundStart = false;
    for (const n of textNodes(root)) {
      if (node.contains(n)) {
        foundStart = true;
        break;
      }
      beforeEl += n.data.length;
    }
    if (!foundStart) return beforeEl; // element has no text; position after preceding text
    let withinEl = 0;
    const children = node.childNodes;
    for (let i = 0; i < Math.min(offsetInNode, children.length); i += 1) {
      withinEl += (children[i].textContent ?? '').length;
    }
    return beforeEl + withinEl;
  }
  let total = 0;
  for (const n of textNodes(root)) {
    if (n === node) return total + offsetInNode;
    total += n.data.length;
  }
  return total;
}

/** Inverse of offsetOf: the text node + local offset for a character offset into root. */
export function locateOffset(root: Node, target: number): { node: Text; offset: number } | null {
  let total = 0;
  let last: Text | null = null;
  for (const n of textNodes(root)) {
    const len = n.data.length;
    if (target <= total + len) return { node: n, offset: Math.max(0, target - total) };
    total += len;
    last = n;
  }
  return last ? { node: last, offset: last.data.length } : null;
}

export function rangeFromSpan(root: Node, span: Span): Range | null {
  const a = locateOffset(root, span.start);
  const b = locateOffset(root, span.end);
  if (!a || !b) return null;
  const range = doc(root).createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

/** The current user selection as a Span within root, or null if none / outside root. */
export function getSelectionSpan(root: HTMLElement): Span | null {
  const selection = doc(root).getSelection?.() ?? (typeof window !== 'undefined' ? window.getSelection() : null);
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const start = offsetOf(root, range.startContainer, range.startOffset);
  const end = offsetOf(root, range.endContainer, range.endOffset);
  if (end <= start) return null;
  return { start, end };
}

/** Overlay rectangles (in `container` scroll coordinates) covering a span in `root`. Runtime. */
export function rectsForSpan(root: HTMLElement, container: HTMLElement, span: Span): OverlayRect[] {
  const range = rangeFromSpan(root, span);
  if (!range) return [];
  const base = container.getBoundingClientRect();
  return Array.from(range.getClientRects()).map((r) => ({
    left: r.left - base.left + container.scrollLeft,
    top: r.top - base.top + container.scrollTop,
    width: r.width,
    height: r.height,
  }));
}
