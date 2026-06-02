import { describe, it, expect } from 'vitest';
import { aiTools, type DocxEditorAPI } from '../src/ai/docxTools';
import type { AIToolContext } from '@nimbalyst/extension-sdk';

function tool(name: string) {
  const t = aiTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool ${name} not registered`);
  return t;
}
function ctx(api?: Partial<DocxEditorAPI>): AIToolContext {
  return { editorAPI: api } as unknown as AIToolContext;
}

describe('new docx AI tools', () => {
  it('registers all five tools with editor scope and the *.docx pattern', () => {
    const names = aiTools.map((t) => t.name).sort();
    expect(names).toEqual(
      ['docx.get_annotations', 'docx.get_metadata', 'docx.get_outline', 'docx.get_selection', 'docx.get_text'].sort(),
    );
    for (const t of aiTools) {
      expect(t.scope).toBe('editor');
      expect(t.editorFilePatterns).toEqual(['*.docx']);
    }
  });

  it('docx.get_outline returns the outline', async () => {
    const res = await tool('docx.get_outline').handler({}, ctx({ getOutline: () => Promise.resolve([{ level: 1, text: 'A' }]) }));
    expect(res.success).toBe(true);
    expect((res.data as { outline: unknown[] }).outline).toEqual([{ level: 1, text: 'A' }]);
  });

  it('docx.get_metadata returns metadata', async () => {
    const res = await tool('docx.get_metadata').handler({}, ctx({ getMetadata: () => Promise.resolve({ title: 'T', words: 5 }) }));
    expect(res.success).toBe(true);
    expect((res.data as { metadata: { title: string } }).metadata.title).toBe('T');
  });

  it('docx.get_selection returns selected text, and surfaces the no-selection message', async () => {
    const ok = await tool('docx.get_selection').handler({}, ctx({ getSelection: () => Promise.resolve('hello') }));
    expect(ok.success).toBe(true);
    expect((ok.data as { text: string }).text).toBe('hello');

    const none = await tool('docx.get_selection').handler(
      {},
      ctx({ getSelection: () => Promise.reject(new Error('No active selection; open the document and select text.')) }),
    );
    expect(none.success).toBe(false);
    expect(none.error).toMatch(/no active selection/i);
  });

  it('docx.get_annotations returns annotations + count', async () => {
    const res = await tool('docx.get_annotations').handler(
      {},
      ctx({ getAnnotations: () => Promise.resolve([{ quote: 'q', comment: 'c', color: 'yellow', createdAt: 1 }]) }),
    );
    expect(res.success).toBe(true);
    expect((res.data as { count: number }).count).toBe(1);
  });

  it('all new tools fail cleanly with no editor', async () => {
    for (const name of ['docx.get_outline', 'docx.get_metadata', 'docx.get_selection', 'docx.get_annotations']) {
      const res = await tool(name).handler({}, ctx(undefined));
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/no .docx document is open/i);
    }
  });
});
