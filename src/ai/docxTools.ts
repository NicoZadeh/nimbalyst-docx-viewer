import type { AIToolContext, ExtensionAITool, ExtensionToolResult } from '@nimbalyst/extension-sdk';
import type { OutlineItem } from './extractOutline';
import type { DocxMetadata } from './extractMetadata';

/** One annotation as exposed to AI tools (no internal anchor detail). */
export interface AnnotationSummary {
  quote: string;
  comment: string;
  color: string;
  createdAt: number;
}

/** Imperative API the editor registers via host.registerEditorAPI() and the tools read. */
export interface DocxEditorAPI {
  getPlainText(): Promise<string>;
  getOutline(): Promise<OutlineItem[]>;
  getMetadata(): Promise<DocxMetadata>;
  /** Resolves with the live selected text; rejects with a clear message when there is none. */
  getSelection(): Promise<string>;
  getAnnotations(): Promise<AnnotationSummary[]>;
}

function editorTool(
  name: string,
  description: string,
  run: (api: DocxEditorAPI) => Promise<unknown>,
): ExtensionAITool {
  return {
    name,
    description,
    scope: 'editor',
    editorFilePatterns: ['*.docx'],
    inputSchema: { type: 'object', properties: {} },
    handler: async (_params: Record<string, unknown>, context: AIToolContext): Promise<ExtensionToolResult> => {
      const api = context.editorAPI as DocxEditorAPI | undefined;
      if (!api) {
        return { success: false, error: 'No .docx document is open.' };
      }
      try {
        const data = await run(api);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export const aiTools: ExtensionAITool[] = [
  editorTool(
    'docx.get_text',
    'Get the full plain-text content of the active Word .docx document so you can read, summarize, or answer questions about it.',
    async (api) => {
      const text = await api.getPlainText();
      return { text, charCount: text.length };
    },
  ),
  editorTool(
    'docx.get_outline',
    'Get the heading outline (level + text, in document order) of the active Word .docx document.',
    async (api) => ({ outline: await api.getOutline() }),
  ),
  editorTool(
    'docx.get_metadata',
    'Get document properties (title, author, dates, word/character counts, approximate saved page count) of the active Word .docx document.',
    async (api) => ({ metadata: await api.getMetadata() }),
  ),
  editorTool(
    'docx.get_selection',
    "Get the user's current text selection in the active Word .docx document (only available when the document is open and focused).",
    async (api) => {
      const text = await api.getSelection();
      return { text, charCount: text.length };
    },
  ),
  editorTool(
    'docx.get_annotations',
    'Get the user-created highlights and comments (annotations) for the active Word .docx document.',
    async (api) => {
      const annotations = await api.getAnnotations();
      return { annotations, count: annotations.length };
    },
  ),
];
