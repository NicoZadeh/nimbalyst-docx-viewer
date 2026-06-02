import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractOutline, parseHeadings } from '../src/ai/extractOutline';

const here = dirname(fileURLToPath(import.meta.url));
function fixture(name: string): ArrayBuffer {
  const b = readFileSync(join(here, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

describe('parseHeadings', () => {
  it('extracts level + text in order and strips inner tags', () => {
    expect(parseHeadings('<h1>One</h1><p>x</p><h2>Two <strong>bold</strong></h2><h3>Three</h3>')).toEqual([
      { level: 1, text: 'One' },
      { level: 2, text: 'Two bold' },
      { level: 3, text: 'Three' },
    ]);
  });
});

describe('extractOutline', () => {
  it('returns real headings from the style map of a .docx', async () => {
    const outline = await extractOutline(fixture('headings.docx'));
    expect(outline).toEqual([
      { level: 1, text: 'Introduction' },
      { level: 2, text: 'Background' },
      { level: 2, text: 'Method' },
      { level: 3, text: 'Deep Dive' },
    ]);
  });

  it('returns an empty outline when there are no heading elements', () => {
    expect(parseHeadings('<p>just body text</p><p>more body</p>')).toEqual([]);
  });

  it('fails fast over the byte cap', async () => {
    await expect(extractOutline(fixture('headings.docx'), { maxBytes: 10 })).rejects.toThrow(/too large/i);
  });
});
