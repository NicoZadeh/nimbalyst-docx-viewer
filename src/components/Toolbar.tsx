import { MaterialSymbol } from '@nimbalyst/extension-sdk';
import { OverflowMenu, type MenuItem } from './OverflowMenu';

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
  const moreItems: MenuItem[] = [
    { label: 'Page breaks', icon: 'auto_stories', onClick: props.onTogglePages, active: props.pagesMode },
    {
      label: 'Show Word comments & changes',
      icon: 'rate_review',
      onClick: props.onToggleNativeComments,
      active: props.showNativeComments,
    },
    { label: 'Copy as Markdown', icon: 'content_copy', onClick: props.onCopyMarkdown },
    { label: 'Export comments to Word', icon: 'ios_share', onClick: props.onExportComments, disabled: props.annotationCount === 0 },
  ];

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
      <OverflowMenu items={moreItems} />
    </div>
  );
}
