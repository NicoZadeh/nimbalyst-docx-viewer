import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractMetadata } from '../src/ai/extractMetadata';

const here = dirname(fileURLToPath(import.meta.url));
function fixture(name: string): ArrayBuffer {
  const b = readFileSync(join(here, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

describe('extractMetadata', () => {
  it('reads core.xml and app.xml properties', async () => {
    const m = await extractMetadata(fixture('meta.docx'));
    expect(m.title).toBe('Quarterly Report');
    expect(m.author).toBe('Nico Zadeh');
    expect(m.lastModifiedBy).toBe('Nico Zadeh');
    expect(m.subject).toBe('Finance');
    expect(m.keywords).toBe('q3, finance, report');
    expect(m.created).toBe('2024-01-15T10:00:00Z');
    expect(m.modified).toBe('2024-02-20T14:30:00Z');
    expect(m.words).toBe(1234);
    expect(m.characters).toBe(6789);
    expect(m.savedPageCountApprox).toBe(5);
  });

  it('returns all-undefined for a doc with no docProps (negative case)', async () => {
    const m = await extractMetadata(fixture('sample.docx'));
    expect(m.title).toBeUndefined();
    expect(m.author).toBeUndefined();
    expect(m.words).toBeUndefined();
    expect(m.savedPageCountApprox).toBeUndefined();
  });

  it('fails fast over the byte cap', async () => {
    await expect(extractMetadata(fixture('meta.docx'), { maxBytes: 10 })).rejects.toThrow(/too large/i);
  });
});
