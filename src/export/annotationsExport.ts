import type { Annotation } from '../annotations/store';

/** Render annotations as readable Markdown (quoted text + comment per item). */
export function annotationsToMarkdown(annotations: Annotation[], title = 'Annotations'): string {
  if (annotations.length === 0) return `# ${title}\n\n_No annotations._`;
  const body = annotations
    .map((a, i) => {
      const quote = a.quote
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      const comment = a.comment.trim() ? `\n\n${a.comment.trim()}` : '';
      return `## ${i + 1}. ${a.color} highlight\n\n${quote}${comment}`;
    })
    .join('\n\n');
  return `# ${title}\n\n${body}`;
}

/** Render one annotation (quote + comment) as a compact clipboard/agent payload. */
export function annotationToText(a: Annotation): string {
  const quote = a.quote
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return a.comment.trim() ? `${quote}\n\nComment: ${a.comment.trim()}` : quote;
}

export function annotationsToJSON(annotations: Annotation[]): string {
  return JSON.stringify(annotations, null, 2);
}
