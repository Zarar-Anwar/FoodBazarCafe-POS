/**
 * Optional cleanup — kept for safety if a native Rollup package appears.
 * Main fix is package.json overrides → @rollup/wasm-node.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = path.join(root, 'node_modules');

for (const dir of [
  '@rollup/rollup-win32-x64-msvc',
  '@rollup/rollup-win32-ia32-msvc',
  '@rollup/rollup-win32-arm64-msvc',
]) {
  const full = path.join(nm, ...dir.split('/'));
  if (fs.existsSync(full)) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log('Removed native Rollup package:', dir);
  }
}
