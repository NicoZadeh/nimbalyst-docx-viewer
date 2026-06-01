import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractText } from '../src/ai/extractText';

const here = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): ArrayBuffer {
  const b = readFileSync(join(here, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

describe('extractText', () => {
  it('extracts plain text from a real .docx', async () => {
    const text = await extractText(fixture('sample.docx'));
    expect(text).toContain('The quick brown fox');
    expect(text).toContain('PINEAPPLE-7281');
  });

  it('fails fast when the buffer exceeds the byte cap, before Mammoth runs', async () => {
    await expect(extractText(fixture('sample.docx'), { maxBytes: 10 })).rejects.toThrow(/too large/i);
  });
});
