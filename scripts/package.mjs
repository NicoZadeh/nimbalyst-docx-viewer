#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;

console.log('Building extension...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

const required = ['dist/index.js', 'dist/index.css', 'manifest.json'];
for (const file of required) {
  if (!existsSync(join(root, file))) {
    console.error(`Packaging failed: required file missing: ${file}`);
    process.exit(1);
  }
}

const outDir = join(root, 'build');
mkdirSync(outDir, { recursive: true });
const artifact = join(outDir, `docx-viewer-${version}.nimext`);
rmSync(artifact, { force: true });

const include = ['manifest.json', 'dist', 'README.md', 'LICENSE'];
for (const optional of ['screenshots', 'samples']) {
  if (existsSync(join(root, optional))) include.push(optional);
  else console.warn(`(note) ${optional}/ not found; skipping. Add it before publishing.`);
}

const quoted = include.map((p) => `'${p}'`).join(' ');
execSync(`zip -r -X '${artifact}' ${quoted}`, { cwd: root, stdio: 'inherit' });

console.log(`\nPackaged ${artifact}`);
