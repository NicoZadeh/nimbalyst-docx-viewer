import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { htmlToMarkdown, docToMarkdown } from '../src/export/markdown';

const here = dirname(fileURLToPath(import.meta.url));
function fixture(name: string): ArrayBuffer {
  const b = readFileSync(join(here, 'fixtures', name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

describe('htmlToMarkdown', () => {
  it('converts headings, paragraphs, emphasis, links and lists', () => {
    const html =
      '<h1>Title</h1><p>Some <strong>bold</strong> and <em>italic</em> text with a <a href="https://x.test/">link</a>.</p><ul><li>one</li><li>two</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Title');
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
    expect(md).toContain('[link](https://x.test/)');
    expect(md).toContain('- one');
    expect(md).toContain('- two');
  });
});

describe('docToMarkdown', () => {
  it('renders heading markers from a real .docx with heading styles', async () => {
    const md = await docToMarkdown(fixture('headings.docx'));
    expect(md).toContain('# Introduction');
    expect(md).toContain('## Background');
    expect(md).toContain('### Deep Dive');
  });

  it('renders body text from a plain .docx', async () => {
    const md = await docToMarkdown(fixture('sample.docx'));
    expect(md).toContain('The quick brown fox');
  });
});
