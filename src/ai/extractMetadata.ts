import JSZip from 'jszip';
import { xmlText } from '../util/xml';
import { MAX_EXTRACT_BYTES } from './extractText';

export interface DocxMetadata {
  title?: string;
  author?: string;
  lastModifiedBy?: string;
  subject?: string;
  keywords?: string;
  created?: string;
  modified?: string;
  words?: number;
  characters?: number;
  /** Word's saved <Pages> value. APPROXIMATE — not a live/authoritative page count. */
  savedPageCountApprox?: number;
}

async function readEntry(zip: JSZip, path: string): Promise<string | undefined> {
  const file = zip.file(path);
  return file ? file.async('string') : undefined;
}

function toInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read document properties from docProps/core.xml + app.xml using jszip + a dependency-free,
 * portable XML value extractor (no browser DOMParser, so the same code runs in Node tests).
 * Missing parts/fields simply come back undefined.
 */
export async function extractMetadata(
  buf: ArrayBuffer,
  options: { maxBytes?: number } = {},
): Promise<DocxMetadata> {
  const maxBytes = options.maxBytes ?? MAX_EXTRACT_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new Error('Document is too large to read metadata.');
  }
  const zip = await JSZip.loadAsync(buf);
  const core = await readEntry(zip, 'docProps/core.xml');
  const app = await readEntry(zip, 'docProps/app.xml');
  return {
    title: core ? xmlText(core, 'title') : undefined,
    author: core ? xmlText(core, 'creator') : undefined,
    lastModifiedBy: core ? xmlText(core, 'lastModifiedBy') : undefined,
    subject: core ? xmlText(core, 'subject') : undefined,
    keywords: core ? xmlText(core, 'keywords') : undefined,
    created: core ? xmlText(core, 'created') : undefined,
    modified: core ? xmlText(core, 'modified') : undefined,
    words: toInt(app ? xmlText(app, 'Words') : undefined),
    characters: toInt(app ? xmlText(app, 'Characters') : undefined),
    savedPageCountApprox: toInt(app ? xmlText(app, 'Pages') : undefined),
  };
}
