import { useState } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';

interface CommentPopoverProps {
  x: number;
  y: number;
  quote: string;
  comment: string;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Shown when a highlight is clicked: view/edit its comment, or delete the highlight. */
export function CommentPopover({ x, y, quote, comment, onSave, onDelete, onClose }: CommentPopoverProps) {
  const [text, setText] = useState(comment);
  return (
    <div className="nim-docx-popover" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="nim-docx-popover-quote">{quote.length > 90 ? `${quote.slice(0, 90)}…` : quote}</div>
      <textarea
        className="nim-docx-composer-input"
        rows={3}
        value={text}
        placeholder="Add a comment… (Cmd/Ctrl+Enter to save)"
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave(text);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <div className="nim-docx-popover-actions">
        <button type="button" className="nim-docx-btn nim-docx-mini nim-docx-btn-accent" onClick={() => onSave(text)}>
          <MaterialSymbol icon="check" size={15} />
          Save
        </button>
        <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onClose}>
          Close
        </button>
        <div className="nim-docx-popover-spacer" />
        <button type="button" className="nim-docx-btn nim-docx-icon nim-docx-btn-danger" onClick={onDelete} title="Delete highlight" aria-label="Delete highlight">
          <MaterialSymbol icon="delete" size={16} />
        </button>
      </div>
    </div>
  );
}
