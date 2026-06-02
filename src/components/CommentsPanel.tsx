import type { Annotation } from '../annotations/store';

interface CommentsPanelProps {
  annotations: Annotation[];
  unanchored: Set<string>;
  onJump: (id: string) => void;
  onEdit: (id: string, comment: string) => void;
  onDelete: (id: string) => void;
  onCopy: (annotation: Annotation) => void;
  onSend: (annotation: Annotation) => void;
  onCopyAll: () => void;
  onSendAll: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onClose: () => void;
}

export function CommentsPanel({
  annotations,
  unanchored,
  onJump,
  onEdit,
  onDelete,
  onCopy,
  onSend,
  onCopyAll,
  onSendAll,
  onExportMarkdown,
  onExportJson,
  onClose,
}: CommentsPanelProps) {
  return (
    <div className="nim-docx-panel nim-docx-comments">
      <div className="nim-docx-panel-head">
        <span>Comments ({annotations.length})</span>
        <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onClose} aria-label="Close comments">
          ✕
        </button>
      </div>

      {annotations.length === 0 ? (
        <div className="nim-docx-panel-empty">Select text in the document to highlight and comment.</div>
      ) : (
        <>
          <div className="nim-docx-panel-actions">
            <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onCopyAll}>Copy all</button>
            <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onSendAll}>Send all to AI</button>
            <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onExportMarkdown}>Export .md</button>
            <button type="button" className="nim-docx-btn nim-docx-mini" onClick={onExportJson}>Export .json</button>
          </div>
          <ul className="nim-docx-comment-list">
            {annotations.map((a) => (
              <li key={a.id} className={`nim-docx-comment-item nim-docx-color-${a.color}`}>
                <button type="button" className="nim-docx-quote" onClick={() => onJump(a.id)} title="Jump to highlight">
                  {a.quote.length > 140 ? `${a.quote.slice(0, 140)}…` : a.quote}
                </button>
                {unanchored.has(a.id) && <span className="nim-docx-unanchored" title="Could not locate in the current document">unanchored</span>}
                <textarea
                  className="nim-docx-comment-text"
                  defaultValue={a.comment}
                  placeholder="Add a comment…"
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== a.comment) onEdit(a.id, e.target.value);
                  }}
                />
                <div className="nim-docx-comment-actions">
                  <button type="button" className="nim-docx-btn nim-docx-mini" onClick={() => onCopy(a)}>Copy</button>
                  <button type="button" className="nim-docx-btn nim-docx-mini" onClick={() => onSend(a)}>Send to AI</button>
                  <button type="button" className="nim-docx-btn nim-docx-mini" onClick={() => onDelete(a.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
