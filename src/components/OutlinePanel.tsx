import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import type { OutlineItem } from '../ai/extractOutline';

interface OutlinePanelProps {
  items: OutlineItem[];
  loading: boolean;
  onJump: (item: OutlineItem) => void;
  onClose: () => void;
}

export function OutlinePanel({ items, loading, onJump, onClose }: OutlinePanelProps) {
  return (
    <div className="nim-docx-panel nim-docx-outline">
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
    </div>
  );
}
