import { describe, it, expect } from 'vitest';
import { aiTools, type DocxEditorAPI } from '../src/ai/docxTools';
import type { AIToolContext } from '@nimbalyst/extension-sdk';

const getText = aiTools.find((tool) => tool.name === 'docx.get_text');

function makeContext(editorAPI?: Partial<DocxEditorAPI>): AIToolContext {
  return { editorAPI } as unknown as AIToolContext;
}

describe('docx.get_text', () => {
  it('is registered with editor scope and the *.docx pattern', () => {
    expect(getText).toBeDefined();
    expect(getText?.scope).toBe('editor');
    expect(getText?.editorFilePatterns).toEqual(['*.docx']);
  });

  it('returns text and charCount from the editor API', async () => {
    const result = await getText!.handler({}, makeContext({ getPlainText: () => Promise.resolve('hello world') }));
    expect(result.success).toBe(true);
    expect((result.data as { text: string }).text).toBe('hello world');
    expect((result.data as { charCount: number }).charCount).toBe(11);
  });

  it('fails when no editor is open', async () => {
    const result = await getText!.handler({}, makeContext(undefined));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no .docx document is open/i);
  });

  it('surfaces the size error when the editor API fails fast', async () => {
    const result = await getText!.handler(
      {},
      makeContext({ getPlainText: () => Promise.reject(new Error('Document is too large to extract text.')) }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });
});
