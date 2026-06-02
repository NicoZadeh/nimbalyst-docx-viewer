import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import { HIGHLIGHT_COLORS, type HighlightColor } from '../annotations/store';

interface SelectionToolbarProps {
  x: number;
  y: number;
  onHighlight: (color: HighlightColor) => void;
  onComment: () => void;
  onCopy: () => void;
  onAsk: () => void;
}

const SWATCH: Record<HighlightColor, string> = {
  yellow: '#ffe066',
  green: '#86efac',
  pink: '#f9a8d4',
  blue: '#93c5fd',
};

export function SelectionToolbar({ x, y, onHighlight, onComment, onCopy, onAsk }: SelectionToolbarProps) {
  return (
    <div
      className="nim-docx-seltoolbar"
      style={{ left: x, top: y }}
      // Keep the selection alive while interacting with the toolbar.
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="nim-docx-swatch"
          style={{ background: SWATCH[color] }}
          title={`Highlight ${color}`}
          aria-label={`Highlight ${color}`}
          onClick={() => onHighlight(color)}
        />
      ))}
      <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onComment} title="Highlight and add a comment">
        <MaterialSymbol icon="add_comment" size={15} />
        Comment
      </button>
      <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onCopy} title="Copy selection">
        <MaterialSymbol icon="content_copy" size={15} />
        Copy
      </button>
      <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onAsk} title="Send selection to the assistant">
        <MaterialSymbol icon="auto_awesome" size={15} />
        Ask AI
      </button>
    </div>
  );
}
