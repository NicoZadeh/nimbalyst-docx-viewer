import { MaterialSymbol } from '@nimbalyst/extension-sdk';

interface SearchBarProps {
  query: string;
  count: number;
  active: number;
  onChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function SearchBar({ query, count, active, onChange, onNext, onPrev, onClose }: SearchBarProps) {
  return (
    <div className="nim-docx-searchbar">
      <input
        autoFocus
        className="nim-docx-search-input"
        value={query}
        placeholder="Find in document"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="nim-docx-search-count">{count ? `${active + 1} / ${count}` : '0 / 0'}</span>
      <button type="button" className="nim-docx-btn nim-docx-icon" onClick={onPrev} disabled={!count} aria-label="Previous match">
        <MaterialSymbol icon="keyboard_arrow_up" size={16} />
      </button>
      <button type="button" className="nim-docx-btn nim-docx-icon" onClick={onNext} disabled={!count} aria-label="Next match">
        <MaterialSymbol icon="keyboard_arrow_down" size={16} />
      </button>
      <button type="button" className="nim-docx-btn nim-docx-icon" onClick={onClose} aria-label="Close search">
        <MaterialSymbol icon="close" size={16} />
      </button>
    </div>
  );
}
