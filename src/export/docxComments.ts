import JSZip from 'jszip';
import type { Annotation } from '../annotations/store';
import { decodeXmlEntities } from '../util/xml';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface AnnotatedDocxResult {
  bytes: Uint8Array;
  matched: number;
  unmatched: Annotation[];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Concatenated, normalized visible text of a `<w:p>` (joins runs, so split runs still match). */
function paragraphText(paragraphXml: string): string {
  const texts = [...paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
  return normalize(decodeXmlEntities(texts.join('')));
}

function findParagraph(documentXml: string, needle: string): { start: number; end: number; xml: string } | null {
  const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(documentXml)) !== null) {
    if (paragraphText(m[0]).includes(needle)) {
      return { start: m.index, end: m.index + m[0].length, xml: m[0] };
    }
  }
  return null;
}

/** Wrap a paragraph's content with comment range markers + a reference (after pPr if present). */
function wrapParagraph(paragraphXml: string, id: number): string {
  const open = /^<w:p\b[^>]*>/.exec(paragraphXml);
  if (!open) return paragraphXml;
  let insertAt = open[0].length;
  const ppr = /^\s*<w:pPr>[\s\S]*?<\/w:pPr>/.exec(paragraphXml.slice(insertAt));
  if (ppr) insertAt += ppr[0].length;
  const closeIdx = paragraphXml.lastIndexOf('</w:p>');
  const start = `<w:commentRangeStart w:id="${id}"/>`;
  const endRef =
    `<w:commentRangeEnd w:id="${id}"/>` +
    `<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
  return paragraphXml.slice(0, insertAt) + start + paragraphXml.slice(insertAt, closeIdx) + endRef + paragraphXml.slice(closeIdx);
}

function buildCommentsXml(items: { id: number; annotation: Annotation }[]): string {
  const body = items
    .map(({ id, annotation }) => {
      const text = annotation.comment.trim() || '(highlight)';
      return (
        `<w:comment w:id="${id}" w:author="Reviewer" w:date="2024-01-01T00:00:00Z" w:initials="R">` +
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:comment>`
      );
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W_NS}">${body}</w:comments>`;
}

/**
 * Produce a NEW .docx (the source is never mutated) with the annotations injected as real Word
 * comments. Anchoring is at PARAGRAPH granularity: a comment is attached to the first paragraph
 * whose joined text contains the quote (robust to runs split across <w:r>). Paragraphs with no
 * confident match are returned in `unmatched` and skipped — never mis-placed.
 */
export async function buildAnnotatedDocx(buf: ArrayBuffer, annotations: Annotation[]): Promise<AnnotatedDocxResult> {
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Not a Word document (missing word/document.xml).');
  let documentXml = await docFile.async('string');

  const matched: { id: number; annotation: Annotation }[] = [];
  const unmatched: Annotation[] = [];
  let nextId = 0;

  for (const annotation of annotations) {
    const needle = normalize(annotation.quote);
    if (!needle) {
      unmatched.push(annotation);
      continue;
    }
    const para = findParagraph(documentXml, needle);
    if (!para) {
      unmatched.push(annotation);
      continue;
    }
    const id = nextId++;
    const wrapped = wrapParagraph(para.xml, id);
    documentXml = documentXml.slice(0, para.start) + wrapped + documentXml.slice(para.end);
    matched.push({ id, annotation });
  }

  if (matched.length === 0) {
    return { bytes: await zip.generateAsync({ type: 'uint8array' }), matched: 0, unmatched };
  }

  zip.file('word/document.xml', documentXml);
  zip.file('word/comments.xml', buildCommentsXml(matched));

  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ct = await ctFile.async('string');
    if (!ct.includes('comments+xml')) {
      ct = ct.replace(
        '</Types>',
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>',
      );
      zip.file('[Content_Types].xml', ct);
    }
  }

  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  let rels =
    (await relsFile?.async('string')) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!rels.includes('comments.xml')) {
    rels = rels.replace(
      '</Relationships>',
      '<Relationship Id="rIdComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>',
    );
    zip.file(relsPath, rels);
  }

  return { bytes: await zip.generateAsync({ type: 'uint8array' }), matched: matched.length, unmatched };
}
