import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorHostProps } from '@nimbalyst/extension-sdk';
import { useEditorLifecycle, copyToClipboard } from '@nimbalyst/extension-sdk';
import { Toolbar } from './components/Toolbar';
import { DocxScrollView } from './components/DocxScrollView';
import { HighlightLayer, type HighlightItem } from './components/HighlightLayer';
import { SelectionToolbar } from './components/SelectionToolbar';
import { CommentsPanel } from './components/CommentsPanel';
import { SearchBar } from './components/SearchBar';
import { OutlinePanel } from './components/OutlinePanel';
import { PageNav } from './components/PageNav';
import { useDocxDocument } from './hooks/useDocxDocument';
import { useAnnotations } from './annotations/useAnnotations';
import { getSelectionSpan, rectsForSpan } from './annotations/domRange';
import type { Span } from './annotations/anchor';
import type { Annotation, HighlightColor } from './annotations/store';
import { extractText } from './ai/extractText';
import { extractOutline, type OutlineItem } from './ai/extractOutline';
import { extractMetadata } from './ai/extractMetadata';
import type { DocxEditorAPI, AnnotationSummary } from './ai/docxTools';
import { findMatches } from './search/search';
import { isZoomWheel, nextScaleFromWheel, clampScale } from './util/zoom';
import { buildAnnotatedDocx } from './export/docxComments';
import { docToMarkdown } from './export/markdown';
import { annotationsToMarkdown, annotationsToJSON, annotationToText } from './export/annotationsExport';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

interface ViewState {
  scale: number;
  fitToWidth: boolean;
  scrollTop: number;
}

function bodyText(body: HTMLElement | null): string {
  return body?.textContent ?? '';
}

function download(name: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DocxViewerEditor({ host }: EditorHostProps) {
  const viewKey = `docx-viewstate:${host.filePath}`;
  const savedView = host.storage.getGlobal<ViewState>(viewKey);

  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const bufRef = useRef<ArrayBuffer | null>(null);
  const textCacheRef = useRef<{ buf: ArrayBuffer; promise: Promise<string> } | null>(null);
  const outlineCacheRef = useRef<{ buf: ArrayBuffer; promise: Promise<OutlineItem[]> } | null>(null);

  const [scale, setScale] = useState(savedView?.scale ?? 1);
  const [fitToWidth, setFitToWidth] = useState(savedView?.fitToWidth ?? true);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const [showNativeComments, setShowNativeComments] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; span: Span } | null>(null);
  const [revision, setRevision] = useState(0);
  const [pages, setPages] = useState<{ current: number; total: number }>({ current: 1, total: 0 });

  const { scrollRef, bodyRef, styleRef, status, render, whenRenderReady, getSections } = useDocxDocument();
  const annotations = useAnnotations(host.storage, host.filePath);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep refs fresh for the imperative editorAPI (registered once in onLoaded).
  const annotationsListRef = useRef<Annotation[]>(annotations.annotations);
  annotationsListRef.current = annotations.annotations;

  const getPlainText = useCallback((): Promise<string> => {
    const current = bufRef.current;
    if (!current) return Promise.reject(new Error('Document not loaded yet.'));
    if (textCacheRef.current?.buf !== current) {
      const promise = extractText(current);
      promise.catch(() => {
        if (textCacheRef.current?.promise === promise) textCacheRef.current = null;
      });
      textCacheRef.current = { buf: current, promise };
    }
    return textCacheRef.current.promise;
  }, []);

  const getOutline = useCallback((): Promise<OutlineItem[]> => {
    const current = bufRef.current;
    if (!current) return Promise.reject(new Error('Document not loaded yet.'));
    if (outlineCacheRef.current?.buf !== current) {
      const promise = extractOutline(current);
      promise.catch(() => {
        if (outlineCacheRef.current?.promise === promise) outlineCacheRef.current = null;
      });
      outlineCacheRef.current = { buf: current, promise };
    }
    return outlineCacheRef.current.promise;
  }, []);

  const getMetadata = useCallback(() => {
    const current = bufRef.current;
    if (!current) return Promise.reject(new Error('Document not loaded yet.'));
    return extractMetadata(current);
  }, []);

  const getSelection = useCallback(async (): Promise<string> => {
    await whenRenderReady();
    const body = bodyRef.current;
    const span = body ? getSelectionSpan(body) : null;
    if (!body || !span) {
      throw new Error('No active selection; open the document and select text.');
    }
    return bodyText(body).slice(span.start, span.end);
  }, [whenRenderReady, bodyRef]);

  const getAnnotations = useCallback(
    async (): Promise<AnnotationSummary[]> =>
      annotationsListRef.current.map((a) => ({ quote: a.quote, comment: a.comment, color: a.color, createdAt: a.createdAt })),
    [],
  );

  const { isLoading, error, theme } = useEditorLifecycle<ArrayBuffer>(host, {
    binary: true,
    applyContent: (data) => {
      bufRef.current = data;
      textCacheRef.current = null;
      outlineCacheRef.current = null;
      setBuf(data);
    },
    onLoaded: () => {
      const api: DocxEditorAPI = { getPlainText, getOutline, getMetadata, getSelection, getAnnotations };
      host.registerEditorAPI(api);
    },
  });

  useEffect(() => () => host.registerEditorAPI(null), [host]);

  // Render whenever the buffer or native-comments toggle changes.
  useEffect(() => {
    if (buf) {
      void render(buf, { showComments: showNativeComments }).then(() => setRevision((r) => r + 1));
    }
  }, [buf, showNativeComments, render]);

  // ---- Zoom ----
  const applyScale = useCallback((next: number) => {
    setFitToWidth(false);
    setScale(clampScale(next));
  }, []);
  const zoomIn = useCallback(() => applyScale(ZOOM_LEVELS.find((l) => l > scaleRef.current) ?? scaleRef.current), [applyScale]);
  const zoomOut = useCallback(() => applyScale([...ZOOM_LEVELS].reverse().find((l) => l < scaleRef.current) ?? scaleRef.current), [applyScale]);
  const zoomReset = useCallback(() => applyScale(1), [applyScale]);
  const toggleFit = useCallback(() => setFitToWidth((f) => !f), []);

  // Trackpad pinch / Ctrl+wheel zoom (non-passive so preventDefault works).
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const onWheel = (e: WheelEvent) => {
      if (!isZoomWheel(e)) return;
      e.preventDefault();
      setFitToWidth(false);
      setScale(nextScaleFromWheel(e.deltaY, scaleRef.current));
    };
    scroll.addEventListener('wheel', onWheel, { passive: false });
    return () => scroll.removeEventListener('wheel', onWheel);
  }, [scrollRef]);

  // Keyboard: Cmd/Ctrl +/-/0 and Cmd/Ctrl+F.
  useEffect(() => {
    if (!host.isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        setFitToWidth(true);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [host.isActive, zoomIn, zoomOut]);

  // ---- Fit-to-width ----
  useEffect(() => {
    if (!fitToWidth || status !== 'ready') return;
    const scroll = scrollRef.current;
    const body = bodyRef.current;
    if (!scroll || !body) return;
    const computeFit = () => {
      const page = body.querySelector('section');
      const renderedWidth = page?.getBoundingClientRect().width;
      if (!renderedWidth) return;
      const naturalWidth = renderedWidth / (scaleRef.current || 1);
      const available = scroll.clientWidth - 48;
      setScale(clampScale(available / naturalWidth));
    };
    computeFit();
    const observer = new ResizeObserver(computeFit);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, [fitToWidth, status, scrollRef, bodyRef]);

  // ---- Persist view state ----
  useEffect(() => {
    void host.storage.setGlobal<ViewState>(viewKey, {
      scale,
      fitToWidth,
      scrollTop: scrollRef.current?.scrollTop ?? 0,
    });
  }, [scale, fitToWidth, host.storage, viewKey, scrollRef]);

  useEffect(() => {
    if (status === 'ready' && savedView?.scrollTop) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: savedView.scrollTop }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---- Page tracking (rendered pages, approximate) ----
  useEffect(() => {
    if (status !== 'ready') return;
    const scroll = scrollRef.current;
    const sections = getSections();
    setPages({ current: 1, total: sections.length });
    if (!scroll || sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = sections.indexOf(visible.target as HTMLElement);
          if (idx >= 0) setPages((p) => ({ ...p, current: idx + 1 }));
        }
      },
      { root: scroll, threshold: [0.1, 0.5, 0.9] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [status, revision, getSections, scrollRef]);

  const gotoPage = useCallback(
    (n: number) => {
      const sections = getSections();
      const target = sections[n - 1];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [getSections],
  );

  // ---- Search ----
  const matches = useMemo<Span[]>(() => {
    if (!searchOpen || !query.trim() || status !== 'ready') return [];
    return findMatches(bodyText(bodyRef.current), query);
  }, [searchOpen, query, status, revision, bodyRef]);

  useEffect(() => {
    setActiveMatch(0);
  }, [query]);

  useEffect(() => {
    if (matches.length === 0) return;
    const m = matches[Math.min(activeMatch, matches.length - 1)];
    const body = bodyRef.current;
    const scroll = scrollRef.current;
    if (!body || !scroll) return;
    // Scroll the active match roughly into view via its first client rect.
    const rects = rectsForSpan(body, scroll, m);
    if (rects[0]) scroll.scrollTo({ top: Math.max(0, rects[0].top - scroll.clientHeight / 3), behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMatch, matches]);

  // ---- Highlight overlay items (annotations + search) ----
  const resolved = useMemo(
    () => annotations.resolveAll(bodyText(bodyRef.current)),
    // recompute when annotations or the rendered DOM change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [annotations.annotations, revision, status],
  );
  const unanchored = useMemo(() => new Set(resolved.filter((a) => !a.span).map((a) => a.id)), [resolved]);

  const highlightItems = useMemo<HighlightItem[]>(() => {
    const items: HighlightItem[] = [];
    for (const a of resolved) {
      if (a.span) items.push({ id: a.id, span: a.span, kind: a.color });
    }
    matches.forEach((span, i) => {
      items.push({ id: `search-${i}`, span, kind: i === activeMatch ? 'search-active' : 'search' });
    });
    return items;
  }, [resolved, matches, activeMatch]);

  // ---- Selection toolbar ----
  const onMouseUp = useCallback(() => {
    const body = bodyRef.current;
    const scroll = scrollRef.current;
    if (!body || !scroll) return setSelection(null);
    const span = getSelectionSpan(body);
    const sel = window.getSelection();
    if (!span || !sel || sel.rangeCount === 0) return setSelection(null);
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const base = scroll.getBoundingClientRect();
    const x = rect.left - base.left + scroll.scrollLeft + rect.width / 2;
    const y = rect.top - base.top + scroll.scrollTop - 8;
    setSelection({ x, y: Math.max(4, y), span });
  }, [bodyRef, scrollRef]);

  const selectionText = useCallback((span: Span) => bodyText(bodyRef.current).slice(span.start, span.end), [bodyRef]);

  const addHighlight = useCallback(
    async (color: HighlightColor, comment: string) => {
      if (!selection) return;
      const text = bodyText(bodyRef.current);
      await annotations.add(text, selection.span.start, selection.span.end, comment, color);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      setRevision((r) => r + 1);
    },
    [annotations, selection, bodyRef],
  );

  const sendTextToAgent = useCallback(
    (label: string, description: string) => host.setEditorContext({ label, description }),
    [host],
  );

  // ---- Toolbar actions ----
  const toggleOutline = useCallback(() => {
    setOutlineOpen((open) => {
      const next = !open;
      if (next && outline.length === 0) {
        setOutlineLoading(true);
        getOutline()
          .then(setOutline)
          .catch(() => setOutline([]))
          .finally(() => setOutlineLoading(false));
      }
      return next;
    });
  }, [getOutline, outline.length]);

  const onCopyMarkdown = useCallback(async () => {
    const current = bufRef.current;
    if (!current) return;
    try {
      await copyToClipboard(await docToMarkdown(current));
      host.setEditorContext(null);
    } catch {
      /* clipboard unavailable: no-op */
    }
  }, [host]);

  const onExportComments = useCallback(async () => {
    const current = bufRef.current;
    if (!current || annotations.annotations.length === 0) return;
    const result = await buildAnnotatedDocx(current, annotations.annotations);
    const base = host.fileName.replace(/\.docx$/i, '');
    download(`${base}-commented.docx`, result.bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }, [annotations.annotations, host.fileName]);

  const onJumpHeading = useCallback(
    (item: OutlineItem) => {
      const body = bodyRef.current;
      if (!body) return;
      const el = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6')).find(
        (n) => (n.textContent ?? '').trim() === item.text.trim(),
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [bodyRef],
  );

  const onJumpAnnotation = useCallback(
    (id: string) => {
      const target = resolved.find((a) => a.id === id);
      const body = bodyRef.current;
      const scroll = scrollRef.current;
      if (!target?.span || !body || !scroll) return;
      const rects = rectsForSpan(body, scroll, target.span);
      if (rects[0]) scroll.scrollTo({ top: Math.max(0, rects[0].top - scroll.clientHeight / 3), behavior: 'smooth' });
    },
    [resolved, bodyRef, scrollRef],
  );

  const copyAnnotation = useCallback((a: Annotation) => void copyToClipboard(annotationToText(a)), []);
  const sendAnnotation = useCallback(
    (a: Annotation) => sendTextToAgent('DOCX comment', annotationToText(a)),
    [sendTextToAgent],
  );

  const showLayer = status === 'ready';

  return (
    <div ref={rootRef} className={`nim-docx-root theme-${theme}`}>
      <Toolbar
        scale={scale}
        fitToWidth={fitToWidth}
        canZoomIn={scale < ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        canZoomOut={scale > ZOOM_LEVELS[0]}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        onFitToWidthToggle={toggleFit}
        onToggleSearch={() => setSearchOpen((s) => !s)}
        onToggleOutline={toggleOutline}
        outlineOpen={outlineOpen}
        onToggleComments={() => setCommentsOpen((c) => !c)}
        commentsOpen={commentsOpen}
        annotationCount={annotations.annotations.length}
        showNativeComments={showNativeComments}
        onToggleNativeComments={() => setShowNativeComments((v) => !v)}
        onCopyMarkdown={onCopyMarkdown}
        onExportComments={onExportComments}
      />
      {searchOpen && (
        <SearchBar
          query={query}
          count={matches.length}
          active={activeMatch}
          onChange={setQuery}
          onNext={() => setActiveMatch((i) => (matches.length ? (i + 1) % matches.length : 0))}
          onPrev={() => setActiveMatch((i) => (matches.length ? (i - 1 + matches.length) % matches.length : 0))}
          onClose={() => {
            setSearchOpen(false);
            setQuery('');
          }}
        />
      )}
      <PageNav current={pages.current} total={pages.total} onPrev={() => gotoPage(pages.current - 1)} onNext={() => gotoPage(pages.current + 1)} />

      <div className="nim-docx-main">
        {outlineOpen && <OutlinePanel items={outline} loading={outlineLoading} onJump={onJumpHeading} onClose={() => setOutlineOpen(false)} />}

        {error ? (
          <div className="nim-docx-message nim-docx-message-error">Could not load this document. {error.message}</div>
        ) : (
          <DocxScrollView scrollRef={scrollRef} bodyRef={bodyRef} styleRef={styleRef} status={status} scale={scale} onMouseUp={onMouseUp}>
            <HighlightLayer bodyRef={bodyRef} scrollRef={scrollRef} items={highlightItems} revision={revision + scale} ready={showLayer} />
            {selection && (
              <SelectionToolbar
                x={selection.x}
                y={selection.y}
                onHighlight={(color) => void addHighlight(color, '')}
                onComment={() => {
                  const comment = window.prompt('Comment:') ?? '';
                  void addHighlight('yellow', comment);
                }}
                onCopy={() => {
                  void copyToClipboard(selectionText(selection.span));
                  setSelection(null);
                }}
                onAsk={() => {
                  sendTextToAgent('DOCX selection', selectionText(selection.span));
                  setSelection(null);
                }}
              />
            )}
          </DocxScrollView>
        )}

        {commentsOpen && (
          <CommentsPanel
            annotations={annotations.annotations}
            unanchored={unanchored}
            onJump={onJumpAnnotation}
            onEdit={(id, comment) => void annotations.update(id, { comment })}
            onDelete={(id) => void annotations.remove(id).then(() => setRevision((r) => r + 1))}
            onCopy={copyAnnotation}
            onSend={sendAnnotation}
            onCopyAll={() => void copyToClipboard(annotationsToMarkdown(annotations.annotations))}
            onSendAll={() => sendTextToAgent('DOCX comments', annotationsToMarkdown(annotations.annotations))}
            onExportMarkdown={() => {
              const md = annotationsToMarkdown(annotations.annotations);
              download(`${host.fileName.replace(/\.docx$/i, '')}-comments.md`, new TextEncoder().encode(md), 'text/markdown');
            }}
            onExportJson={() => {
              const json = annotationsToJSON(annotations.annotations);
              download(`${host.fileName.replace(/\.docx$/i, '')}-comments.json`, new TextEncoder().encode(json), 'application/json');
            }}
            onClose={() => setCommentsOpen(false)}
          />
        )}
      </div>

      {isLoading && !buf ? <div className="nim-docx-message">Loading…</div> : null}
    </div>
  );
}
