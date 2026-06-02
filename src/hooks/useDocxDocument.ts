import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { renderAsync, type Options } from 'docx-preview';
import { sanitizeLinks } from '../util/sanitizeLinks';

export type DocxStatus = 'idle' | 'loading' | 'ready' | 'error' | 'too-large';

/**
 * Render-path hard cap. NOTE: the extension only learns the file size after the host has already
 * loaded the full binary (there is no host stat/preflight API), so this cap protects the render
 * and extraction paths, NOT the initial host binary load of a large hidden document.
 */
export const MAX_RENDER_BYTES = 50 * 1024 * 1024;

const RENDER_READY_TIMEOUT_MS = 8000;

const BASE_OPTIONS: Partial<Options> = {
  renderAltChunks: false, // upstream default TRUE; altChunks can embed HTML/MHT
  debug: false,
  inWrapper: true,
  useBase64URL: true, // can inflate memory on image-heavy docs (see samples/demo-images.docx)
  ignoreLastRenderedPageBreak: false, // honor Word's saved page breaks
};

export interface RenderOptions {
  /** Show the document's own Word comments + tracked changes (read-only). Off (hardened) by default. */
  showComments?: boolean;
}

export interface UseDocxDocumentResult {
  scrollRef: RefObject<HTMLDivElement>;
  bodyRef: RefObject<HTMLDivElement>;
  styleRef: RefObject<HTMLDivElement>;
  status: DocxStatus;
  render: (buf: ArrayBuffer, opts?: RenderOptions) => Promise<void>;
  /** Resolves when the current render completes; rejects on timeout/unmount. */
  whenRenderReady: () => Promise<void>;
  /** Rendered page <section> elements (docx-preview emits one per rendered page). */
  getSections: () => HTMLElement[];
}

interface Waiter {
  resolve: () => void;
  reject: (e: Error) => void;
}

export function useDocxDocument(): UseDocxDocumentResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const genRef = useRef(0);
  const isReadyRef = useRef(false);
  const waitersRef = useRef<Waiter[]>([]);
  const [status, setStatus] = useState<DocxStatus>('idle');

  const flushReady = useCallback(() => {
    isReadyRef.current = true;
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((w) => w.resolve());
  }, []);

  const failReady = useCallback((message: string) => {
    isReadyRef.current = false;
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((w) => w.reject(new Error(message)));
  }, []);

  const render = useCallback(
    async (buf: ArrayBuffer, opts: RenderOptions = {}) => {
      const gen = ++genRef.current; // bump on every load
      isReadyRef.current = false;
      const body = bodyRef.current;
      const style = styleRef.current;
      if (!body || !style) return;

      body.replaceChildren();
      style.replaceChildren();

      if (buf.byteLength > MAX_RENDER_BYTES) {
        if (gen === genRef.current) {
          setStatus('too-large');
          failReady('Document is too large to render.');
        }
        return;
      }

      setStatus('loading');
      try {
        await renderAsync(buf, body, style, {
          ...BASE_OPTIONS,
          renderComments: !!opts.showComments,
          renderChanges: !!opts.showComments,
        });
        if (gen !== genRef.current) return; // a newer load started or we unmounted: drop result
        sanitizeLinks(body);
        setStatus('ready');
        flushReady();
      } catch {
        if (gen !== genRef.current) return;
        setStatus('error');
        failReady('Document could not be rendered.');
      }
    },
    [flushReady, failReady],
  );

  const whenRenderReady = useCallback((): Promise<void> => {
    if (isReadyRef.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject };
      waitersRef.current.push(waiter);
      setTimeout(() => {
        const i = waitersRef.current.indexOf(waiter);
        if (i >= 0) {
          waitersRef.current.splice(i, 1);
          reject(new Error('Document is not rendered yet.'));
        }
      }, RENDER_READY_TIMEOUT_MS);
    });
  }, []);

  const getSections = useCallback((): HTMLElement[] => {
    const body = bodyRef.current;
    return body ? Array.from(body.querySelectorAll('section')) : [];
  }, []);

  useEffect(
    () => () => {
      genRef.current += 1;
      isReadyRef.current = false;
      const waiters = waitersRef.current;
      waitersRef.current = [];
      waiters.forEach((w) => w.reject(new Error('Editor unmounted.')));
    },
    [],
  );

  return { scrollRef, bodyRef, styleRef, status, render, whenRenderReady, getSections };
}
