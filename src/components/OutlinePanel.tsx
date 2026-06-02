import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { OutlineItem } from '../ai/extractOutline';

interface OutlinePanelProps {
  items: OutlineItem[];
  loading: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onJump: (item: OutlineItem) => void;
  onClose: () => void;
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 560;

export function OutlinePanel({ items, loading, width, onWidthChange, onJump, onClose }: OutlinePanelProps) {
  const startResize = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const onMove = (ev: MouseEvent) => {
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX)));
        onWidthChange(next);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [width, onWidthChange],
  );

  return (
    <div className="nim-docx-panel nim-docx-outline" style={{ flex: `0 0 ${width}px`, width }}>
      <div className="nim-docx-panel-head">
        <span>Outline</span>
        <button type="button" className="nim-docx-btn nim-docx-icon" onClick={onClose} aria-label="Close outline">
          <MaterialSymbol icon="close" size={16} />
        </button>
      </div>
      {loading ? (
        <div className="nim-docx-panel-empty">Reading headings…</div>
      ) : items.length === 0 ? (
        <div className="nim-docx-panel-empty">No headings found.</div>
      ) : (
        <ul className="nim-docx-outline-list">
          {items.map((item, i) => (
            <li key={`${i}-${item.text}`} style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
              <button type="button" className="nim-docx-outline-item" onClick={() => onJump(item)} title={item.text}>
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="nim-docx-resize nim-docx-resize-right" onMouseDown={startResize} aria-hidden="true" />
    </div>
  );
}
