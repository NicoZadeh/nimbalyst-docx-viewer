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

  const add = useCallback(
    async (rootText: string, start: number, end: number, comment: string, color: HighlightColor) => {
      const annotation = makeAnnotation({ anchor: serializeAnchor(rootText, start, end), comment, color });
      setAnnotations(await store.add(annotation));
      return annotation;
    },
    [store],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Annotation, 'comment' | 'color'>>) => {
      setAnnotations(await store.update(id, patch));
    },
    [store],
  );

  const remove = useCallback(
    async (id: string) => {
      setAnnotations(await store.remove(id));
    },
    [store],
  );

  const clear = useCallback(async () => {
    await store.clear();
    setAnnotations([]);
  }, [store]);

  const resolveAll = useCallback(
    (rootText: string): ResolvedAnnotation[] =>
      annotations.map((a) => ({ ...a, span: resolveAnchor(rootText, a.anchor) })),
    [annotations],
  );

  return { annotations, add, update, remove, clear, resolveAll };
}
