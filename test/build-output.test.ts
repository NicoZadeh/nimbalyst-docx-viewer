import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('build output', () => {
  it('emits dist/index.js and dist/index.css after build', () => {
    expect(existsSync(join(repoRoot, 'dist', 'index.js'))).toBe(true);
    expect(existsSync(join(repoRoot, 'dist', 'index.css'))).toBe(true);
  });
});
