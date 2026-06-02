import { describe, it, expect } from 'vitest';
import { serializeAnchor, resolveAnchor } from '../src/annotations/anchor';
import { AnnotationStore, makeAnnotation, type StorageLike } from '../src/annotations/store';

class FakeStorage implements StorageLike {
  private map = new Map<string, unknown>();
  getGlobal<T>(key: string): T | undefined {
    return this.map.get(key) as T | undefined;
  }
  async setGlobal<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
}

// Exercises the exact composition useAnnotations performs (serializeAnchor on add, resolveAnchor
// on resolveAll), without a React renderer.
describe('annotation selection -> persist -> resolve round-trip', () => {
  const text = 'Intro paragraph. The key finding is significant. Closing remarks here.';

  it('re-resolves a persisted annotation to its original span against the same text', async () => {
    const store = new AnnotationStore(new FakeStorage(), '/doc.docx');
    const start = text.indexOf('key finding');
    const end = start + 'key finding'.length;
    await store.add(makeAnnotation({ anchor: serializeAnchor(text, start, end), comment: 'note', color: 'yellow' }));

    const resolved = store.list().map((a) => ({ id: a.id, span: resolveAnchor(text, a.anchor) }));
    expect(resolved[0].span).toEqual({ start, end });
  });

  it('marks an annotation unanchored when its quote vanishes from the text', async () => {
    const store = new AnnotationStore(new FakeStorage(), '/doc.docx');
    const start = text.indexOf('key finding');
    await store.add(makeAnnotation({ anchor: serializeAnchor(text, start, start + 11), comment: '', color: 'green' }));

    const edited = 'Completely different document content with no overlap.';
    const resolved = store.list().map((a) => resolveAnchor(edited, a.anchor));
    expect(resolved[0]).toBeNull();
  });
});
