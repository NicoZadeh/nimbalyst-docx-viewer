import mammoth from 'mammoth';
import { runMammoth } from './mammothInput';

/** Soft/hard cap for extraction. The byteLength guard is the real protection; see EXTRACT_TIMEOUT_MS. */
export const MAX_EXTRACT_BYTES = 25 * 1024 * 1024;

/**
 * Best-effort extraction timeout. NOTE: Mammoth parses on the renderer main thread, so a
 * CPU-bound parse blocks the event loop and this timer cannot fire until it yields. The
 * byteLength guard below is the actual safeguard; the timeout only catches async stalls.
 */
export const EXTRACT_TIMEOUT_MS = 20_000;

interface ExtractOptions {
  maxBytes?: number;
  timeoutMs?: number;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Text extraction timed out after ${ms}ms.`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Extract the full plain text of a .docx via Mammoth's extractRawText. The byteLength guard
 * runs BEFORE Mammoth so pathological inputs fail fast.
 */
export async function extractText(buf: ArrayBuffer, options: ExtractOptions = {}): Promise<string> {
  const maxBytes = options.maxBytes ?? MAX_EXTRACT_BYTES;
  if (buf.byteLength > maxBytes) {
    throw new Error('Document is too large to extract text.');
  }
  return withTimeout(
    runMammoth(buf, (input) => mammoth.extractRawText(input).then((r) => r.value)),
    options.timeoutMs ?? EXTRACT_TIMEOUT_MS,
  );
}
