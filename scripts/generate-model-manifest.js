#!/usr/bin/env node
/**
 * Regenerate model-manifest.txt from the files on disk.
 *
 * Scans public/assets/models/ for all .glb files and writes
 * model-manifest.txt in the format: packName\filename.glb
 *
 * Usage:
 *   node scripts/generate-model-manifest.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MODELS_DIR = path.join(ROOT, 'public', 'assets', 'models');
const MANIFEST_PATH = path.join(ROOT, 'model-manifest.txt');

async function main() {
  const packDirs = await fs.readdir(MODELS_DIR, { withFileTypes: true });
  const lines = [];

  for (const dir of packDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!dir.isDirectory()) continue;

    const packPath = path.join(MODELS_DIR, dir.name);
    const files = await fs.readdir(packPath);
    const glbFiles = files
      .filter((f) => f.toLowerCase().endsWith('.glb'))
      .sort();

    for (const glb of glbFiles) {
      lines.push(`${dir.name}\\${glb}`);
    }
  }

  await fs.writeFile(MANIFEST_PATH, lines.join('\n') + '\n', 'utf-8');
  console.log(`Wrote ${lines.length} entries to model-manifest.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
