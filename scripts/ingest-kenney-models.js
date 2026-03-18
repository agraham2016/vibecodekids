#!/usr/bin/env node
/**
 * Bulk ingest Kenney 3D models into public/assets/models/.
 *
 * Scans a Kenney 3D assets folder, copies GLB files (or converts OBJ
 * via obj2gltf) into public/assets/models/kenney-{packname}/.
 *
 * Usage:
 *   node scripts/ingest-kenney-models.js [KENNEY_3D_ASSETS_DIR]
 *
 * Flags:
 *   --dry-run        Scan and log only, no file operations
 *   --skip-existing  Skip packs whose target directory already exists
 *   --force          Overwrite existing files in target directories
 *   --only=PackName  Process only the named pack (case-insensitive substring match)
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MODELS_DIR = path.join(ROOT, 'public', 'assets', 'models');

const SKIP_PACKS = [
  'animated characters 1',
  'animated characters 2',
  'animated characters 3',
  'animated characters bundle',
  'weapon pack',
  'road pack',
];

const ALREADY_IN_REPO = [
  'car kit',
  'castle kit',
  'platformer kit',
  'pirate kit',
];

function normalizeName(packFolder) {
  return (
    'kenney-' +
    packFolder
      .toLowerCase()
      .replace(/\s*\(classic\)\s*/g, 'classic')
      .replace(/[^a-z0-9]+/g, '')
  );
}

async function findGlbFiles(dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() && e.name.toLowerCase().endsWith('.glb')) {
        files.push(path.join(dir, e.name));
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files;
}

async function findObjFiles(dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() && e.name.toLowerCase().endsWith('.obj')) {
        files.push(path.join(dir, e.name));
      }
    }
  } catch {
    // directory doesn't exist
  }
  return files;
}

async function copyGlbFiles(glbFiles, destDir, dryRun, force) {
  let copied = 0;
  let skipped = 0;

  if (!dryRun) {
    await fs.mkdir(destDir, { recursive: true });
  }

  for (const src of glbFiles) {
    const filename = path.basename(src);
    const dest = path.join(destDir, filename);

    if (!force && existsSync(dest)) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      await fs.copyFile(src, dest);
    }
    copied++;
  }

  return { copied, skipped };
}

async function convertObjFiles(objFiles, destDir, dryRun) {
  let converted = 0;
  let errors = 0;

  if (!dryRun) {
    await fs.mkdir(destDir, { recursive: true });
  }

  let obj2gltf;
  if (!dryRun) {
    try {
      obj2gltf = (await import('obj2gltf')).default;
    } catch {
      console.error(
        'obj2gltf not installed. Run: npm install --save-dev obj2gltf',
      );
      process.exit(1);
    }
  }

  for (const src of objFiles) {
    const basename = path.basename(src, '.obj');
    const dest = path.join(destDir, `${basename}.glb`);

    if (existsSync(dest)) {
      continue;
    }

    if (dryRun) {
      converted++;
      continue;
    }

    try {
      const glb = await obj2gltf(src, { binary: true });
      await fs.writeFile(dest, glb);
      converted++;
    } catch (e) {
      console.warn(`  Convert failed: ${path.basename(src)} — ${e.message}`);
      errors++;
    }
  }

  return { converted, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipExisting = args.includes('--skip-existing');
  const force = args.includes('--force');
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const onlyFilter = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null;

  const sourceDir =
    args.find((a) => !a.startsWith('-')) ||
    path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      'Downloads',
      'Kenney Game Assets All-in-1 3.4.0',
      '3D assets',
    );

  console.log('Source:', sourceDir);
  console.log('Dest:  ', MODELS_DIR);
  console.log(
    `Flags:  dry-run=${dryRun} skip-existing=${skipExisting} force=${force}`,
  );
  if (onlyFilter) console.log('Filter:', onlyFilter);
  console.log('');

  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    console.error('Source directory not found:', sourceDir);
    process.exit(1);
  }

  const packFolders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const summary = {
    processed: 0,
    skippedBlacklist: 0,
    skippedExisting: 0,
    skippedNoModels: 0,
    glbCopied: 0,
    objConverted: 0,
    errors: 0,
    totalFiles: 0,
  };

  for (const folder of packFolders) {
    const lowerFolder = folder.toLowerCase();

    if (onlyFilter && !lowerFolder.includes(onlyFilter)) {
      continue;
    }

    if (SKIP_PACKS.includes(lowerFolder)) {
      console.log(`SKIP  ${folder} (blacklisted)`);
      summary.skippedBlacklist++;
      continue;
    }

    if (ALREADY_IN_REPO.includes(lowerFolder)) {
      console.log(`SKIP  ${folder} (already in repo)`);
      summary.skippedExisting++;
      continue;
    }

    const targetName = normalizeName(folder);
    const targetDir = path.join(MODELS_DIR, targetName);

    if (skipExisting && existsSync(targetDir)) {
      console.log(`SKIP  ${folder} -> ${targetName} (target exists)`);
      summary.skippedExisting++;
      continue;
    }

    const packRoot = path.join(sourceDir, folder);
    const glbDir = path.join(packRoot, 'Models', 'GLB format');
    const objDir = path.join(packRoot, 'Models', 'OBJ format');

    const glbFiles = await findGlbFiles(glbDir);

    if (glbFiles.length > 0) {
      const { copied, skipped } = await copyGlbFiles(
        glbFiles,
        targetDir,
        dryRun,
        force,
      );
      const total = copied + skipped;
      console.log(
        `COPY  ${folder} -> ${targetName} (${total} GLB, ${copied} new${skipped > 0 ? `, ${skipped} exist` : ''})`,
      );
      summary.glbCopied += copied;
      summary.totalFiles += total;
      summary.processed++;
      continue;
    }

    const objFiles = await findObjFiles(objDir);

    if (objFiles.length > 0) {
      const { converted, errors } = await convertObjFiles(
        objFiles,
        targetDir,
        dryRun,
      );
      console.log(
        `CONV  ${folder} -> ${targetName} (${objFiles.length} OBJ -> ${converted} GLB${errors > 0 ? `, ${errors} errors` : ''})`,
      );
      summary.objConverted += converted;
      summary.totalFiles += converted;
      summary.errors += errors;
      summary.processed++;
      continue;
    }

    console.log(`SKIP  ${folder} (no GLB or OBJ models found)`);
    summary.skippedNoModels++;
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Packs processed:   ${summary.processed}`);
  console.log(`GLB files copied:  ${summary.glbCopied}`);
  console.log(`OBJ -> GLB:        ${summary.objConverted}`);
  console.log(`Total new files:   ${summary.totalFiles}`);
  console.log(`Skipped (blocked): ${summary.skippedBlacklist}`);
  console.log(`Skipped (exists):  ${summary.skippedExisting}`);
  console.log(`Skipped (empty):   ${summary.skippedNoModels}`);
  console.log(`Errors:            ${summary.errors}`);

  process.exit(summary.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
