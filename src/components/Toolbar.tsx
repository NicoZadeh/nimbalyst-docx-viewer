interface ToolbarProps {
  scale: number;
  fitToWidth: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToWidthToggle: () => void;
}

export function Toolbar({
  scale,
  fitToWidth,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToWidthToggle,
}: ToolbarProps) {
  const percent = Math.round(scale * 100);
  return (
    <div className="nim-docx-toolbar">
      <button
        type="button"
        className={fitToWidth ? 'nim-docx-btn is-active' : 'nim-docx-btn'}
        onClick={onFitToWidthToggle}
        title="Fit to width (Cmd/Ctrl+0)"
      >
        Fit width
      </button>
      <div className="nim-docx-toolbar-spacer" />
      <div className="nim-docx-zoomgroup">
        <button
          type="button"
          className="nim-docx-btn"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          title="Zoom out (Cmd/Ctrl+-)"
          aria-label="Zoom out"
        >
          &#8722;
        </button>
        <button
          type="button"
          className="nim-docx-btn nim-docx-zoom"
          onClick={onZoomReset}
          title="Reset zoom to 100%"
        >
          {percent}%
        </button>
        <button
          type="button"
          className="nim-docx-btn"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          title="Zoom in (Cmd/Ctrl++)"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
