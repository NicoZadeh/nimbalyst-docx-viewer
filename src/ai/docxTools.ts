import type { AIToolContext, ExtensionAITool, ExtensionToolResult } from '@nimbalyst/extension-sdk';

/** Imperative API the editor registers via host.registerEditorAPI() and the tool reads. */
export interface DocxEditorAPI {
  getPlainText(): Promise<string>;
}

export const aiTools: ExtensionAITool[] = [
  {
    name: 'docx.get_text',
    description:
      'Get the full plain-text content of the active Word .docx document so you can read, summarize, or answer questions about it.',
    scope: 'editor',
    editorFilePatterns: ['*.docx'],
    inputSchema: { type: 'object', properties: {} },
    handler: async (
      _params: Record<string, unknown>,
      context: AIToolContext,
    ): Promise<ExtensionToolResult> => {
      const api = context.editorAPI as DocxEditorAPI | undefined;
      if (!api) {
        return { success: false, error: 'No .docx document is open.' };
      }
      try {
        const text = await api.getPlainText();
        return { success: true, data: { text, charCount: text.length } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  },
];
