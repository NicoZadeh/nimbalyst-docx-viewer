interface ToolbarProps {
  scale: number;
  fitToWidth: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToWidthToggle: () => void;
  onToggleSearch: () => void;
  onToggleOutline: () => void;
  outlineOpen: boolean;
  onToggleComments: () => void;
  commentsOpen: boolean;
  annotationCount: number;
  showNativeComments: boolean;
  onToggleNativeComments: () => void;
  onCopyMarkdown: () => void;
  onExportComments: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const percent = Math.round(props.scale * 100);
  return (
    <div className="nim-docx-toolbar">
      <button
        type="button"
        className={props.fitToWidth ? 'nim-docx-btn is-active' : 'nim-docx-btn'}
        onClick={props.onFitToWidthToggle}
        title="Fit to width (Cmd/Ctrl+0)"
      >
        Fit width
      </button>
      <div className="nim-docx-zoomgroup">
        <button type="button" className="nim-docx-btn" onClick={props.onZoomOut} disabled={!props.canZoomOut} title="Zoom out (Cmd/Ctrl+-)" aria-label="Zoom out">
          &#8722;
        </button>
        <button type="button" className="nim-docx-btn nim-docx-zoom" onClick={props.onZoomReset} title="Reset zoom to 100%">
          {percent}%
        </button>
        <button type="button" className="nim-docx-btn" onClick={props.onZoomIn} disabled={!props.canZoomIn} title="Zoom in (Cmd/Ctrl++)" aria-label="Zoom in">
          +
        </button>
      </div>

      <div className="nim-docx-toolbar-spacer" />

      <button type="button" className="nim-docx-btn" onClick={props.onToggleSearch} title="Find in document (Cmd/Ctrl+F)">
        Find
      </button>
      <button type="button" className={props.outlineOpen ? 'nim-docx-btn is-active' : 'nim-docx-btn'} onClick={props.onToggleOutline} title="Outline">
        Outline
      </button>
      <button type="button" className={props.commentsOpen ? 'nim-docx-btn is-active' : 'nim-docx-btn'} onClick={props.onToggleComments} title="Comments">
        Comments{props.annotationCount > 0 ? ` (${props.annotationCount})` : ''}
      </button>
      <button
        type="button"
        className={props.showNativeComments ? 'nim-docx-btn is-active' : 'nim-docx-btn'}
        onClick={props.onToggleNativeComments}
        title="Show the document's own Word comments and tracked changes (read-only)"
      >
        Word marks
      </button>
      <button type="button" className="nim-docx-btn" onClick={props.onCopyMarkdown} title="Copy the document as Markdown">
        Copy MD
      </button>
      <button type="button" className="nim-docx-btn" onClick={props.onExportComments} title="Export a .docx with your comments as Word comments" disabled={props.annotationCount === 0}>
        Export comments
      </button>
    </div>
  );
}
