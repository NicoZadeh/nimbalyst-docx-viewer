import type { TextAnchor } from './anchor';

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue';
export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'pink', 'blue'];

export interface Annotation {
  id: string;
  anchor: TextAnchor;
  quote: string;
  comment: string;
  color: HighlightColor;
  createdAt: number;
}

/**
 * Subset of the host's ExtensionStorage we use. GLOBAL scope keyed by absolute filePath so
 * annotations survive regardless of whether a workspace is open. get is synchronous, set is
 * async (matches ExtensionStorage exactly so the test fake is faithful).
 */
export interface StorageLike {
  getGlobal<T>(key: string): T | undefined;
  setGlobal<T>(key: string, value: T): Promise<void>;
}

const KEY_PREFIX = 'docx-annotations:';
const keyFor = (filePath: string): string => `${KEY_PREFIX}${filePath}`;

export interface NewAnnotation {
  anchor: TextAnchor;
  comment: string;
  color: HighlightColor;
  id?: string;
  createdAt?: number;
}

export function makeAnnotation(input: NewAnnotation): Annotation {
  const id = input.id ?? globalThis.crypto?.randomUUID?.() ?? `a_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
  return {
    id,
    anchor: input.anchor,
    quote: input.anchor.exact,
    comment: input.comment,
    color: input.color,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export class AnnotationStore {
  constructor(
    private readonly storage: StorageLike,
    private readonly filePath: string,
  ) {}

  list(): Annotation[] {
    return this.storage.getGlobal<Annotation[]>(keyFor(this.filePath)) ?? [];
  }

  private save(next: Annotation[]): Promise<void> {
    return this.storage.setGlobal(keyFor(this.filePath), next);
  }

  /** Persist a full annotation array (used for optimistic UI updates). */
  setAll(next: Annotation[]): Promise<void> {
    return this.save(next);
  }

  async add(annotation: Annotation): Promise<Annotation[]> {
    const next = [...this.list(), annotation];
    await this.save(next);
    return next;
  }

  async update(id: string, patch: Partial<Pick<Annotation, 'comment' | 'color'>>): Promise<Annotation[]> {
    const next = this.list().map((a) => (a.id === id ? { ...a, ...patch } : a));
    await this.save(next);
    return next;
  }

  async remove(id: string): Promise<Annotation[]> {
    const next = this.list().filter((a) => a.id !== id);
    await this.save(next);
    return next;
  }

  async clear(): Promise<void> {
    await this.save([]);
  }
}
