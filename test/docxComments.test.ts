import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';
import { buildAnnotatedDocx } from '../src/export/docxComments';
import { extractText } from '../src/ai/extractText';
import { makeAnnotation, type Annotation } from '../src/annotations/store';

const here = dirname(fileURLToPath(import.meta.url));
function fixture(name: string): ArrayBuffer {
  const b = readFileSync(join(here, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}
function ann(quote: string, comment: string): Annotation {
  return makeAnnotation({ id: quote, createdAt: 1, color: 'yellow', comment, anchor: { exact: quote, prefix: '', suffix: '', startHint: 0 } });
}

describe('buildAnnotatedDocx', () => {
  it('injects a Word comment, keeps the doc readable, and never corrupts the body', async () => {
    const res = await buildAnnotatedDocx(fixture('sample.docx'), [ann('quick brown fox jumps', 'check this claim')]);
    expect(res.matched).toBe(1);
    expect(res.unmatched).toHaveLength(0);

    const zip = await JSZip.loadAsync(res.bytes);
    const comments = await zip.file('word/comments.xml')!.async('string');
    expect(comments).toContain('check this claim');
    const doc = await zip.file('word/document.xml')!.async('string');
    expect(doc).toContain('w:commentRangeStart');
    expect(doc).toContain('w:commentReference');
    const ct = await zip.file('[Content_Types].xml')!.async('string');
    expect(ct).toContain('comments+xml');

    // The output is still a valid .docx whose body text is intact.
    const text = await extractText(toArrayBuffer(res.bytes));
    expect(text).toContain('The quick brown fox');
    expect(text).toContain('PINEAPPLE-7281');
  });

  it('matches at paragraph granularity (case-insensitive, across runs)', async () => {
    const res = await buildAnnotatedDocx(fixture('sample.docx'), [ann('QUICK BROWN', 'x')]);
    expect(res.matched).toBe(1);
  });

  it('reports unmatched annotations and still returns a valid zip', async () => {
    const res = await buildAnnotatedDocx(fixture('sample.docx'), [ann('this text is not in the document at all', 'x')]);
    expect(res.matched).toBe(0);
    expect(res.unmatched).toHaveLength(1);
    const zip = await JSZip.loadAsync(res.bytes);
    expect(zip.file('word/document.xml')).toBeTruthy();
    expect(zip.file('word/comments.xml')).toBeNull();
  });
});
