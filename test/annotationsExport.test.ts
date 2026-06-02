import { describe, it, expect } from 'vitest';
import { annotationsToMarkdown, annotationsToJSON, annotationToText } from '../src/export/annotationsExport';
import { makeAnnotation, type Annotation } from '../src/annotations/store';

function ann(quote: string, comment: string): Annotation {
  return makeAnnotation({
    id: quote,
    createdAt: 1,
    color: 'yellow',
    comment,
    anchor: { exact: quote, prefix: '', suffix: '', startHint: 0 },
  });
}

describe('annotations export', () => {
  it('renders markdown with quotes and comments', () => {
    const md = annotationsToMarkdown([ann('hello world', 'my note'), ann('second', '')]);
    expect(md).toContain('> hello world');
    expect(md).toContain('my note');
    expect(md).toContain('> second');
  });

  it('handles the empty case', () => {
    expect(annotationsToMarkdown([])).toContain('_No annotations._');
    expect(JSON.parse(annotationsToJSON([]))).toEqual([]);
  });

  it('annotationToText includes the comment when present', () => {
    expect(annotationToText(ann('q', 'c'))).toBe('> q\n\nComment: c');
    expect(annotationToText(ann('q', ''))).toBe('> q');
  });

  it('JSON round-trips', () => {
    const list = [ann('a', 'x')];
    expect(JSON.parse(annotationsToJSON(list))).toHaveLength(1);
  });
});
