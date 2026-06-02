import { MaterialSymbol } from '@nimbalyst/extension-sdk';

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
  pagesMode: boolean;
  onTogglePages: () => void;
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
        <MaterialSymbol icon="fit_screen" size={16} />
        Fit width
      </button>
      <div className="nim-docx-zoomgroup">
        <button type="button" className="nim-docx-btn nim-docx-icon" onClick={props.onZoomOut} disabled={!props.canZoomOut} title="Zoom out (Cmd/Ctrl+-)" aria-label="Zoom out">
          <MaterialSymbol icon="remove" size={16} />
        </button>
        <button type="button" className="nim-docx-btn nim-docx-zoom" onClick={props.onZoomReset} title="Reset zoom to 100%">
          {percent}%
        </button>
        <button type="button" className="nim-docx-btn nim-docx-icon" onClick={props.onZoomIn} disabled={!props.canZoomIn} title="Zoom in (Cmd/Ctrl++)" aria-label="Zoom in">
          <MaterialSymbol icon="add" size={16} />
        </button>
      </div>

      <div className="nim-docx-toolbar-spacer" />

      <button type="button" className="nim-docx-btn" onClick={props.onToggleSearch} title="Find in document (Cmd/Ctrl+F)">
        <MaterialSymbol icon="search" size={16} />
        Find
      </button>
      <button type="button" className={props.outlineOpen ? 'nim-docx-btn is-active' : 'nim-docx-btn'} onClick={props.onToggleOutline} title="Document outline">
        <MaterialSymbol icon="format_list_bulleted" size={16} />
        Outline
      </button>
      <button type="button" className={props.commentsOpen ? 'nim-docx-btn is-active' : 'nim-docx-btn'} onClick={props.onToggleComments} title="Your highlights and comments">
        <MaterialSymbol icon="chat_bubble" size={16} />
        Comments{props.annotationCount > 0 ? ` (${props.annotationCount})` : ''}
      </button>
      <button
        type="button"
        className={props.showNativeComments ? 'nim-docx-btn is-active' : 'nim-docx-btn'}
        onClick={props.onToggleNativeComments}
        title="Show the document's own Word comments and tracked changes (read-only). Off by default."
      >
        <MaterialSymbol icon="rate_review" size={16} />
        Markup
      </button>
      <button
        type="button"
        className={props.pagesMode ? 'nim-docx-btn is-active' : 'nim-docx-btn'}
        onClick={props.onTogglePages}
        title="Show visual page breaks between pages"
      >
        <MaterialSymbol icon="auto_stories" size={16} />
        Pages
      </button>
      <button type="button" className="nim-docx-btn" onClick={props.onCopyMarkdown} title="Copy the whole document as Markdown">
        <MaterialSymbol icon="content_copy" size={16} />
        Copy MD
      </button>
      <button type="button" className="nim-docx-btn" onClick={props.onExportComments} title="Download a .docx with your comments written as Word comments" disabled={props.annotationCount === 0}>
        <MaterialSymbol icon="ios_share" size={16} />
        Export
      </button>
    </div>
  );
}
