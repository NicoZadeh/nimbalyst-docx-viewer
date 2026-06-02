import { useState } from 'react';

interface CommentComposerProps {
  x: number;
  y: number;
  onSave: (text: string) => void;
  onCancel: () => void;
}

/** Inline comment input shown at the selection. Replaces window.prompt (unsupported in Electron). */
export function CommentComposer({ x, y, onSave, onCancel }: CommentComposerProps) {
  const [text, setText] = useState('');
  return (
    <div className="nim-docx-composer" style={{ left: x, top: y }} onMouseDown={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        className="nim-docx-composer-input"
        rows={3}
        value={text}
        placeholder="Add a comment… (Cmd/Ctrl+Enter to save)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave(text);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div className="nim-docx-composer-actions">
        <button type="button" className="nim-docx-btn nim-docx-mini" onClick={() => onSave(text)}>
          Save
        </button>
        <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
