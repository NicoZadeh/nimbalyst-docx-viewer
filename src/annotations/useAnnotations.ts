import { useCallback, useRef, useState } from 'react';
import { AnnotationStore, makeAnnotation, type Annotation, type HighlightColor, type StorageLike } from './store';
import { serializeAnchor, resolveAnchor, type Span } from './anchor';

export interface ResolvedAnnotation extends Annotation {
  /** Span in the current rendered body text, or null when it can no longer be located. */
  span: Span | null;
}

export interface UseAnnotationsResult {
  annotations: Annotation[];
  add: (rootText: string, start: number, end: number, comment: string, color: HighlightColor) => Promise<Annotation>;
  update: (id: string, patch: Partial<Pick<Annotation, 'comment' | 'color'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  resolveAll: (rootText: string) => ResolvedAnnotation[];
}

export function useAnnotations(storage: StorageLike, filePath: string): UseAnnotationsResult {
  const storeRef = useRef<AnnotationStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new AnnotationStore(storage, filePath);
  }
  const store = storeRef.current;
  const [annotations, setAnnotations] = useState<Annotation[]>(() => store.list());

  // Updates are optimistic: React state changes synchronously and persistence (an async
  // host.storage IPC round-trip) happens in the background, so highlights appear instantly.
  const add = useCallback(
    async (rootText: string, start: number, end: number, comment: string, color: HighlightColor) => {
      const annotation = makeAnnotation({ anchor: serializeAnchor(rootText, start, end), comment, color });
      setAnnotations((prev) => {
        const next = [...prev, annotation];
        void store.setAll(next);
        return next;
      });
      return annotation;
    },
    [store],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Annotation, 'comment' | 'color'>>) => {
      setAnnotations((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
        void store.setAll(next);
        return next;
      });
    },
    [store],
  );

  const remove = useCallback(
    async (id: string) => {
      setAnnotations((prev) => {
        const next = prev.filter((a) => a.id !== id);
        void store.setAll(next);
        return next;
      });
    },
    [store],
  );

  const clear = useCallback(async () => {
    setAnnotations([]);
    void store.setAll([]);
  }, [store]);

  const resolveAll = useCallback(
    (rootText: string): ResolvedAnnotation[] =>
      annotations.map((a) => ({ ...a, span: resolveAnchor(rootText, a.anchor) })),
    [annotations],
  );

  return { annotations, add, update, remove, clear, resolveAll };
}
