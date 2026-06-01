import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorHostProps } from '@nimbalyst/extension-sdk';
import { useEditorLifecycle } from '@nimbalyst/extension-sdk';
import { Toolbar } from './components/Toolbar';
import { DocxScrollView } from './components/DocxScrollView';
import { extractText } from './ai/extractText';
import type { DocxEditorAPI } from './ai/docxTools';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function DocxViewerEditor({ host }: EditorHostProps) {
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const bufRef = useRef<ArrayBuffer | null>(null);
  const textCacheRef = useRef<{ buf: ArrayBuffer; promise: Promise<string> } | null>(null);
  const [scale, setScale] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true);

  // Memoized per loaded buffer; invalidated when the buffer is replaced (external change).
  const getPlainText = useCallback((): Promise<string> => {
    const current = bufRef.current;
    if (!current) return Promise.reject(new Error('Document not loaded yet.'));
    if (textCacheRef.current?.buf !== current) {
      const promise = extractText(current);
      // Memoize success; evict on failure so a transient extraction error can be retried.
      promise.catch(() => {
        if (textCacheRef.current?.promise === promise) {
          textCacheRef.current = null;
        }
      });
      textCacheRef.current = { buf: current, promise };
    }
    return textCacheRef.current.promise;
  }, []);

  const { isLoading, error, theme } = useEditorLifecycle<ArrayBuffer>(host, {
    binary: true,
    applyContent: (data) => {
      bufRef.current = data;
      textCacheRef.current = null;
      setBuf(data);
    },
    // Register on buffer load (not render completion) so docx.get_text works for hidden mounts.
    onLoaded: () => {
      const api: DocxEditorAPI = { getPlainText };
      host.registerEditorAPI(api);
    },
  });

  useEffect(() => () => host.registerEditorAPI(null), [host]);

  const zoomIn = useCallback(() => {
    setFitToWidth(false);
    setScale((s) => ZOOM_LEVELS.find((level) => level > s) ?? s);
  }, []);
  const zoomOut = useCallback(() => {
    setFitToWidth(false);
    setScale((s) => [...ZOOM_LEVELS].reverse().find((level) => level < s) ?? s);
  }, []);
  const zoomReset = useCallback(() => {
    setFitToWidth(false);
    setScale(1);
  }, []);
  const toggleFit = useCallback(() => setFitToWidth((f) => !f), []);
  const onFitWidthScaleChange = useCallback((next: number) => setScale(next), []);

  useEffect(() => {
    if (!host.isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        zoomIn();
      } else if (event.key === '-') {
        event.preventDefault();
        zoomOut();
      } else if (event.key === '0') {
        event.preventDefault();
        setFitToWidth(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [host.isActive, zoomIn, zoomOut]);

  const canZoomIn = scale < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = scale > ZOOM_LEVELS[0];

  return (
    <div className={`nim-docx-root theme-${theme}`}>
      <Toolbar
        scale={scale}
        fitToWidth={fitToWidth}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onFitToWidthToggle={toggleFit}
      />
      {error ? (
        <div className="nim-docx-message nim-docx-message-error">
          Could not load this document. {error.message}
        </div>
      ) : (
        <DocxScrollView
          buf={buf}
          scale={scale}
          fitToWidth={fitToWidth}
          onFitWidthScaleChange={onFitWidthScaleChange}
        />
      )}
      {isLoading && !buf ? <div className="nim-docx-message">Loading…</div> : null}
    </div>
  );
}
