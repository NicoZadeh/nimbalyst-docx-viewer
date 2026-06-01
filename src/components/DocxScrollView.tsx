import { useEffect, useRef, type CSSProperties } from 'react';
import { useDocxDocument } from '../hooks/useDocxDocument';

interface DocxScrollViewProps {
  buf: ArrayBuffer | null;
  scale: number;
  fitToWidth: boolean;
  onFitWidthScaleChange: (scale: number) => void;
}

const FIT_PADDING = 48; // px of breathing room around the page when fitting to width
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

export function DocxScrollView({ buf, scale, fitToWidth, onFitWidthScaleChange }: DocxScrollViewProps) {
  const { bodyRef, styleRef, status, render } = useDocxDocument();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (buf) void render(buf);
  }, [buf, render]);

  useEffect(() => {
    if (!fitToWidth || status !== 'ready') return;
    const scroll = scrollRef.current;
    const body = bodyRef.current;
    if (!scroll || !body) return;

    const computeFit = () => {
      const page = body.querySelector('section');
      const renderedWidth = page?.getBoundingClientRect().width;
      if (!renderedWidth) return;
      // getBoundingClientRect reflects the active CSS zoom, so divide it out for natural width.
      const naturalWidth = renderedWidth / (scale || 1);
      const available = scroll.clientWidth - FIT_PADDING;
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, available / naturalWidth));
      onFitWidthScaleChange(Number(next.toFixed(3)));
    };

    computeFit();
    const observer = new ResizeObserver(computeFit);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, [fitToWidth, status, scale, bodyRef, onFitWidthScaleChange]);

  const bodyStyle = { '--nim-docx-zoom': scale } as CSSProperties;

  return (
    <div ref={scrollRef} className="nim-docx-scroll">
      <div ref={styleRef} className="nim-docx-styles" />
      {status === 'loading' && <div className="nim-docx-message">Loading document…</div>}
      {status === 'too-large' && (
        <div className="nim-docx-message">This document is too large to display.</div>
      )}
      {status === 'error' && (
        <div className="nim-docx-message nim-docx-message-error">Could not render this document.</div>
      )}
      <div ref={bodyRef} className="nim-docx-body" style={bodyStyle} />
    </div>
  );
}
