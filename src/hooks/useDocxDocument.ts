import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { renderAsync, type Options } from 'docx-preview';
import { sanitizeLinks } from '../util/sanitizeLinks';

export type DocxStatus = 'idle' | 'loading' | 'ready' | 'error' | 'too-large';

/**
 * Render-path hard cap. NOTE: the extension only learns the file size after the host has
 * already loaded the full binary (there is no host stat/preflight API), so this cap protects
 * the render and extraction paths, NOT the initial host binary load of a large hidden document.
 */
export const MAX_RENDER_BYTES = 50 * 1024 * 1024;

const HARDENED_OPTIONS: Partial<Options> = {
  renderAltChunks: false, // upstream default TRUE; altChunks can embed HTML/MHT
  renderComments: false,
  renderChanges: false,
  debug: false,
  inWrapper: true,
  useBase64URL: true, // simple; can inflate memory on image-heavy docs (see samples/demo-images.docx)
  ignoreLastRenderedPageBreak: false, // honor Word's saved page breaks
};

export interface UseDocxDocumentResult {
  bodyRef: RefObject<HTMLDivElement>;
  styleRef: RefObject<HTMLDivElement>;
  status: DocxStatus;
  render: (buf: ArrayBuffer) => Promise<void>;
}

export function useDocxDocument(): UseDocxDocumentResult {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const genRef = useRef(0);
  const [status, setStatus] = useState<DocxStatus>('idle');

  const render = useCallback(async (buf: ArrayBuffer) => {
    const gen = ++genRef.current; // bump on every load
    const body = bodyRef.current;
    const style = styleRef.current;
    if (!body || !style) return;

    body.replaceChildren(); // clear containers before render
    style.replaceChildren();

    if (buf.byteLength > MAX_RENDER_BYTES) {
      if (gen === genRef.current) setStatus('too-large');
      return;
    }

    setStatus('loading');
    try {
      await renderAsync(buf, body, style, HARDENED_OPTIONS);
      if (gen !== genRef.current) return; // a newer load started or we unmounted: drop result
      sanitizeLinks(body);
      setStatus('ready');
    } catch {
      if (gen !== genRef.current) return;
      setStatus('error');
    }
  }, []);

  // Bump the generation on unmount so an in-flight render is ignored.
  useEffect(() => () => {
    genRef.current += 1;
  }, []);

  return { bodyRef, styleRef, status, render };
}
