interface PageNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * docx-preview emits one <section> per rendered PAGE (not per Word section), so this is labeled
 * "Page x / N (approx.)" and is never presented as an authoritative Word page count.
 */
export function PageNav({ current, total, onPrev, onNext }: PageNavProps) {
  if (total <= 1) return null;
  return (
    <div className="nim-docx-pagenav">
      <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onPrev} disabled={current <= 1} aria-label="Previous page">
        ‹
      </button>
      <span className="nim-docx-pagelabel">Page {current} / {total} (approx.)</span>
      <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onNext} disabled={current >= total} aria-label="Next page">
        ›
      </button>
    </div>
  );
}
