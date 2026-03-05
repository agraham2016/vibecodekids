#!/usr/bin/env node
/**
 * Bulk ingest Kenney sprites into the sprites table.
 *
 * Scans a Kenney asset folder, infers tags/roles/genres from pack names and
 * filenames, copies PNGs to public/assets/sprites/v2/kenney/, and inserts
 * metadata into Postgres.
 *
 * Usage:
 *   node scripts/ingest-kenney-sprites.js [KENNEY_SOURCE_DIR]
 *
 * Env:
 *   KENNEY_SOURCE_DIR - Default source (e.g. C:\Users\...\Kenney-Assets-Raw)
 *   DATABASE_URL      - Postgres connection (required unless --dry-run)
 *
 * Flags:
 *   --dry-run         - Scan and log only, no copy/insert
 *   --limit=N         - Max sprites to ingest (default: no limit)
 *   --skip-copy       - Insert into DB but skip copying files (if already copied)
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import imageSize from 'image-size';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

// Pack name (or substring) -> genres
const PACK_GENRES = {
  platformer: ['platformer', 'endless-runner'],
  '1-bit platformer': ['platformer', 'endless-runner'],
  'abstract platformer': ['platformer'],
  'pixel platformer': ['platformer'],
  'pixel platformer blocks': ['platformer'],
  'pixel platformer farm': ['platformer'],
  'pixel platformer food': ['platformer'],
  'pixel platformer industrial': ['platformer'],
  'platformer assets': ['platformer'],
  'platformer bricks': ['platformer'],
  'platformer characters': ['platformer'],
  'platformer pack': ['platformer'],
  'simplified platformer': ['platformer'],
  'scribble platformer': ['platformer'],
  'pico-8 platformer': ['platformer'],
  'pixel line platformer': ['platformer'],
  jumper: ['platformer', 'endless-runner'],
  'alien ufo': ['shooter', 'top-down-shooter'],
  'desert shooter': ['shooter', 'top-down-shooter'],
  'space shooter': ['shooter', 'top-down-shooter'],
  'pixel shmup': ['shooter', 'top-down-shooter'],
  'topdown shooter': ['shooter', 'top-down-shooter'],
  'simple space': ['shooter', 'top-down-shooter'],
  'tappy plane': ['flappy', 'endless-runner'],
  racing: ['racing', 'frogger'],
  'pixel vehicle': ['racing'],
  'tank pack': ['top-down-shooter'],
  'topdown tanks': ['top-down-shooter'],
  rpg: ['rpg'],
  'roguelike': ['rpg'],
  'isometric miniature dungeon': ['rpg'],
  'monochrome rpg': ['rpg'],
  'tiny dungeon': ['rpg'],
  puzzle: ['puzzle'],
  boardgame: ['puzzle', 'memory'],
  sokoban: ['puzzle'],
  'playing cards': ['puzzle', 'memory'],
  'tower defense': ['tower-defense'],
  'rolling ball': ['brick-breaker'],
  'brick pack': ['brick-breaker'],
  fish: ['fishing', 'pet-sim'],
  animal: ['pet-sim', 'platformer'],
  'character pack': ['platformer', 'rpg', 'fighting'],
  'toon characters': ['platformer', 'rpg'],
  'shape characters': ['platformer'],
  'robot pack': ['shooter', 'platformer'],
  'explosion pack': ['shooter', 'platformer', 'brick-breaker'],
  'particle pack': ['shooter', 'platformer'],
  'background elements': ['platformer', 'endless-runner', 'rpg', 'shooter'],
  'generic items': ['rpg', 'puzzle', 'clicker'],
  'foliage': ['platformer', 'rpg'],
  'sports pack': ['sports'],
  'donuts': ['clicker', 'catch'],
  'hexagon': ['tower-defense', 'puzzle'],
  'isometric': ['rpg', 'puzzle'],
  pirate: ['rpg', 'platformer'],
  'shooting gallery': ['brick-breaker'],
  'tiny ski': ['racing', 'endless-runner'],
  'tiny battle': ['fighting'],
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function genresForPack(packName) {
  const lower = packName.toLowerCase();
  const genres = new Set();
  for (const [key, vals] of Object.entries(PACK_GENRES)) {
    if (lower.includes(key)) {
      vals.forEach((g) => genres.add(g));
    }
  }
  return genres.size > 0 ? [...genres] : ['platformer'];
}

function inferRoles(filename) {
  const lower = filename.toLowerCase().replace('.png', '');
  const roles = [];
  // Player: character/player/hero (Kenney: character_green_jump, character_femalePerson)
  if (
    /^(character|player|hero|runner|frog|bird|hitman)\b/.test(lower) ||
    /\b(character|player|hero|runner|frog|bird)_/.test(lower)
  )
    roles.push('player');
  // Enemy: slime/alien/ufo/zombie (Kenney: slimeBlue_dead, slime_normal)
  if (
    /^(slime|enemy|alien|ufo|zombie|skeleton|monster|obstacle)\b/.test(lower) ||
    /\b(slime|enemy|alien|ufo|zombie|skeleton|monster)\b/.test(lower) ||
    /_(slime|enemy|alien)\b/.test(lower)
  )
    roles.push('enemy');
  // Collectible: coin/gem/star (Kenney: coin_gold, coin_silver)
  if (
    /^(coin|gem|star|collectible|treasure|heart|medal|donut)\b/.test(lower) ||
    /\b(coin|gem|star|collectible|treasure|heart|medal|donut)\b/.test(lower) ||
    /_(coin|gem|heart)\b/.test(lower)
  )
    roles.push('collectible');
  // Background: terrain/tile/block/road/sky (Kenney: background_solid_sky, tile_0080)
  if (
    /^(background|terrain|tile|block|platform|road|ground|sky)\b/.test(lower) ||
    /^(background|terrain|tile|block|platform|road|ground|sky)_/.test(lower) ||
    /_(sky|ground|hill|grass|dirt|sand|snow|water)\b/.test(lower) ||
    /\b(map|roof|wall|tree|foliage)\b/.test(lower)
  )
    roles.push('background');
  // Vehicle as player (ship/car when not enemy)
  if (
    /\b(ship|car|tank|plane|jet)\b/.test(lower) &&
    !/\b(enemy|obstacle)\b/.test(lower) &&
    !roles.includes('player')
  )
    roles.push('player');
  // Effects/props
  if (/\b(explosion|particle|smoke|splat|beam|bullet)\b/.test(lower)) roles.push('other');
  if (roles.length === 0) roles.push('other');
  return roles;
}

function inferTags(filename, packName) {
  const parts = filename
    .replace('.png', '')
    .split(/[_-]/)
    .map((p) => p.toLowerCase())
    .filter((p) => p.length >= 2 && !/^\d+$/.test(p));
  const packWords = packName
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((p) => p.length >= 3);
  const combined = [...new Set([...parts, ...packWords])];
  return combined.slice(0, 12);
}

async function findPngs(dir, baseDir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await findPngs(full, baseDir, out);
    } else if (e.name.toLowerCase().endsWith('.png')) {
      const relative = path.relative(baseDir, full);
      out.push({ full, relative });
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipCopy = args.includes('--skip-copy');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  const sourceDir =
    args.find((a) => !a.startsWith('-')) ||
    process.env.KENNEY_SOURCE_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Kenney-Assets-Raw');

  const destDir = path.join(ROOT, 'public', 'assets', 'sprites', 'v2', 'kenney');

  console.log('Source:', sourceDir);
  console.log('Dest:', destDir);
  console.log('Dry run:', dryRun, '| Skip copy:', skipCopy, '| Limit:', limit ?? 'none');

  let stat;
  try {
    stat = await fs.stat(sourceDir);
  } catch (e) {
    console.error('Source directory not found:', sourceDir);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error('Source is not a directory');
    process.exit(1);
  }

  // Scan 2D assets (game packs) and optionally Game Icons
  const candidates = [
    path.join(sourceDir, '2D assets'),
    path.join(sourceDir, 'Icons', 'Game Icons'),
    path.join(sourceDir, 'Icons', 'Game Icons Expansion'),
  ];
  const scanRoots = [];
  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isDirectory()) scanRoots.push(p);
    } catch {
      // skip
    }
  }
  if (scanRoots.length === 0) scanRoots.push(sourceDir);

  const allPngs = [];
  for (const root of scanRoots) {
    try {
      const list = await findPngs(root, root);
      allPngs.push(...list);
    } catch (e) {
      console.warn('Skip', root, e.message);
    }
  }

  console.log('Found', allPngs.length, 'PNG files');

  if (!dryRun && !skipCopy) {
    await fs.mkdir(destDir, { recursive: true });
  }

  let pool = null;
  if (!dryRun && process.env.DATABASE_URL) {
    const { getPool } = await import('../server/services/db.js');
    pool = getPool();
  }
  if (!dryRun && !pool) {
    console.error('DATABASE_URL not set. Use --dry-run to scan only.');
    process.exit(1);
  }

  let copied = 0;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < allPngs.length; i++) {
    if (limit && inserted >= limit) break;

    const { full, relative } = allPngs[i];
    const pathParts = relative.replace(/\\/g, '/').split('/');
    const packName = pathParts[0] || 'unknown';
    const filename = pathParts[pathParts.length - 1];

    let w = 32;
    let h = 32;
    try {
      const dims = imageSize(full);
      if (dims.width && dims.height) {
        w = dims.width;
        h = dims.height;
      }
    } catch {
      // keep defaults
    }

    const genres = genresForPack(packName);
    const roles = inferRoles(filename);
    const tags = inferTags(filename, packName);

    const packSlug = slugify(packName);
    const destSubdir = path.join(destDir, packSlug);
    const destPath = path.join(destSubdir, filename);
    const webPath = `/assets/sprites/v2/kenney/${packSlug}/${filename}`.replace(/\\/g, '/');
    const id = `kenney-${packSlug}-${filename.replace('.png', '')}`.replace(/[^a-z0-9_-]/gi, '-');

    if (dryRun) {
      if (inserted < 5 || inserted % 500 === 0) {
        console.log(`  ${id} -> ${webPath} (${w}x${h}) roles=${roles.join(',')}`);
      }
      inserted++;
      continue;
    }

    if (!skipCopy) {
      try {
        await fs.mkdir(destSubdir, { recursive: true });
        await fs.copyFile(full, destPath);
        copied++;
      } catch (e) {
        console.warn('Copy failed:', full, e.message);
        errors++;
        continue;
      }
    }

    try {
      await pool.query(
        `INSERT INTO sprites (id, path, w, h, tags, roles, genres, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           path = EXCLUDED.path,
           w = EXCLUDED.w,
           h = EXCLUDED.h,
           tags = EXCLUDED.tags,
           roles = EXCLUDED.roles,
           genres = EXCLUDED.genres`,
        [id, webPath, w, h, tags, roles, genres, `Kenney: ${packName}`],
      );
      inserted++;
    } catch (e) {
      console.warn('Insert failed:', id, e.message);
      errors++;
    }

    if ((inserted + errors) % 500 === 0) {
      console.log('  ...', inserted, 'inserted');
    }
  }

  if (pool) await pool.end();

  console.log('');
  console.log('Done. Inserted:', inserted, '| Copied:', copied, '| Errors:', errors);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
