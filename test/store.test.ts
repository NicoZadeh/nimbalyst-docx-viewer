import { describe, it, expect } from 'vitest';
import { AnnotationStore, makeAnnotation, type StorageLike, type Annotation } from '../src/annotations/store';

class FakeStorage implements StorageLike {
  private map = new Map<string, unknown>();
  getGlobal<T>(key: string): T | undefined {
    return this.map.get(key) as T | undefined;
  }
  async setGlobal<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
}

function ann(id: string, comment = 'note'): Annotation {
  return makeAnnotation({
    id,
    createdAt: 1000,
    color: 'yellow',
    comment,
    anchor: { exact: 'quote ' + id, prefix: '', suffix: '', startHint: 0 },
  });
}

describe('AnnotationStore', () => {
  it('persists and lists per file via global storage', async () => {
    const storage = new FakeStorage();
    const store = new AnnotationStore(storage, '/abs/path/a.docx');
    expect(store.list()).toEqual([]);
    await store.add(ann('1'));
    await store.add(ann('2'));
    expect(store.list().map((a) => a.id)).toEqual(['1', '2']);

    // A second store for the same file (new instance) sees the persisted data.
    const reopened = new AnnotationStore(storage, '/abs/path/a.docx');
    expect(reopened.list().map((a) => a.id)).toEqual(['1', '2']);

    // Different file is isolated.
    expect(new AnnotationStore(storage, '/abs/path/b.docx').list()).toEqual([]);
  });

  it('updates and removes by id', async () => {
    const store = new AnnotationStore(new FakeStorage(), '/x.docx');
    await store.add(ann('1', 'first'));
    await store.add(ann('2', 'second'));
    await store.update('1', { comment: 'edited', color: 'green' });
    const a1 = store.list().find((a) => a.id === '1')!;
    expect(a1.comment).toBe('edited');
    expect(a1.color).toBe('green');
    await store.remove('2');
    expect(store.list().map((a) => a.id)).toEqual(['1']);
    await store.clear();
    expect(store.list()).toEqual([]);
  });

  it('makeAnnotation copies the quote from the anchor and generates an id', () => {
    const a = makeAnnotation({ anchor: { exact: 'hi', prefix: '', suffix: '', startHint: 0 }, comment: '', color: 'pink' });
    expect(a.quote).toBe('hi');
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
  });
});
