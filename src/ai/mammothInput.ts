/**
 * Shared dual-input runner for Mammoth.
 *
 * Mammoth's Node build (unit tests) accepts `{ buffer }`; its browser build (bundled into the
 * renderer) accepts `{ arrayBuffer }`. We can't know which build the bundler/runtime resolved, so
 * we try the environment-appropriate form first and fall back on the "Could not find file in
 * options" error. Used by extractRawText (extractText) and convertToHtml (extractOutline,
 * docToMarkdown) so the same code passes in Node tests and the renderer.
 */

type MammothInput = { buffer: unknown } | { arrayBuffer: ArrayBuffer };

export function mammothInputs(buf: ArrayBuffer): MammothInput[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeBuffer: any = (globalThis as any).Buffer;
  return NodeBuffer ? [{ buffer: NodeBuffer.from(buf) }, { arrayBuffer: buf }] : [{ arrayBuffer: buf }];
}

export async function runMammoth<T>(
  buf: ArrayBuffer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call: (input: any) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const input of mammothInputs(buf)) {
    try {
      return await call(input);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /Could not find file in options/.test(error.message)) {
        continue; // wrong input form for the resolved build; try the next
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
