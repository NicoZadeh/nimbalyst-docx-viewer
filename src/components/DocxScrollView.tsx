import { type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { DocxStatus } from '../hooks/useDocxDocument';

interface DocxScrollViewProps {
  scrollRef: RefObject<HTMLDivElement>;
  bodyRef: RefObject<HTMLDivElement>;
  styleRef: RefObject<HTMLDivElement>;
  status: DocxStatus;
  scale: number;
  onMouseUp?: () => void;
  /** Overlay layer + floating selection toolbar, rendered above the body. */
  children?: ReactNode;
}

export function DocxScrollView({ scrollRef, bodyRef, styleRef, status, scale, onMouseUp, children }: DocxScrollViewProps) {
  const bodyStyle = { '--nim-docx-zoom': scale } as CSSProperties;
  return (
    <div ref={scrollRef} className="nim-docx-scroll" onMouseUp={onMouseUp}>
      <div ref={styleRef} className="nim-docx-styles" />
      {status === 'loading' && <div className="nim-docx-message">Loading document…</div>}
      {status === 'too-large' && <div className="nim-docx-message">This document is too large to display.</div>}
      {status === 'error' && <div className="nim-docx-message nim-docx-message-error">Could not render this document.</div>}
      <div ref={bodyRef} className="nim-docx-body" style={bodyStyle} />
      {children}
    </div>
  );
}
