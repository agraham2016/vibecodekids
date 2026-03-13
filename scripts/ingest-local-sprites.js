#!/usr/bin/env node
/**
 * Ingest local uploaded sprite packs from public/assets/sprites into Postgres.
 *
 * This indexes the actual sprite folders already in the repo so semantic sprite
 * search can retrieve them for freeform prompts, not just manifest defaults.
 *
 * Usage:
 *   node scripts/ingest-local-sprites.js
 *   node scripts/ingest-local-sprites.js --dry-run
 *   node scripts/ingest-local-sprites.js --limit=100
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import imageSize from 'image-size';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const SPRITES_DIR = path.join(ROOT, 'public', 'assets', 'sprites');
const SKIP_TOP_LEVEL_DIRS = new Set(['v2']);

const PACK_GENRES = {
  platformer: ['platformer'],
  'endless-runner': ['endless-runner', 'platformer'],
  racing: ['racing', 'frogger'],
  shooter: ['shooter', 'top-down-shooter'],
  rpg: ['rpg', 'maze'],
  flappy: ['flappy', 'rise-up'],
  snake: ['snake'],
  puzzle: ['puzzle', 'memory'],
  'bubble-shooter': ['bubble-shooter', 'puzzle'],
  'falling-blocks': ['falling-blocks', 'puzzle'],
  'brick-breaker': ['brick-breaker'],
  clicker: ['clicker'],
  'tower-defense': ['tower-defense'],
  fighting: ['fighting'],
  sports: ['sports'],
  'pet-sim': ['pet-sim', 'simulation'],
  frogger: ['frogger'],
  rhythm: ['rhythm'],
  common: [
    'platformer',
    'endless-runner',
    'racing',
    'shooter',
    'top-down-shooter',
    'rpg',
    'puzzle',
    'clicker',
    'pet-sim',
    'sports',
    'fighting',
    'snake',
    'frogger',
    'tower-defense',
    'rhythm',
    'flappy',
  ],
  'kenney-platformer': ['platformer', 'endless-runner'],
  'kenney-racing': ['racing', 'frogger'],
  'kenney-space-shooter': ['shooter', 'top-down-shooter'],
  'kenney-tiny-dungeon': ['rpg', 'maze'],
  'kenney-tower-defense': ['tower-defense'],
  'kenney-sports': ['sports', 'fighting'],
  'kenney-puzzle': ['puzzle', 'memory', 'bubble-shooter', 'falling-blocks', 'brick-breaker', 'clicker', 'rhythm'],
  'kenney-food': ['clicker', 'catch', 'snake', 'pet-sim'],
  'kenney-fish': ['fishing', 'pet-sim'],
  'kenney-animals': ['pet-sim', 'platformer', 'memory', 'find-the-friend'],
  'kenney-roguelike': ['rpg'],
  'kenney-prototype': ['platformer', 'endless-runner'],
  'kenney-ui': ['rhythm', 'sports', 'tower-defense', 'puzzle'],
};

const PACK_TAGS = {
  platformer: ['jump', 'runner'],
  'endless-runner': ['runner', 'speed'],
  racing: ['vehicle', 'road'],
  shooter: ['space', 'laser'],
  rpg: ['adventure', 'quest'],
  flappy: ['bird', 'arcade'],
  snake: ['arcade'],
  puzzle: ['match', 'brain'],
  'bubble-shooter': ['bubble', 'match'],
  'falling-blocks': ['blocks', 'stack'],
  'brick-breaker': ['brick', 'arcade'],
  clicker: ['tap', 'idle'],
  'tower-defense': ['tower', 'path'],
  fighting: ['combat', 'battle'],
  sports: ['ball', 'score'],
  'pet-sim': ['pet', 'care'],
  frogger: ['crossing', 'road'],
  rhythm: ['music', 'beat'],
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeToken(value) {
  return slugify(value).replace(/-/g, ' ');
}

function genresForPack(packName) {
  return PACK_GENRES[packName] || ['platformer'];
}

function inferRoles(relativePath, packName) {
  const pathParts = String(relativePath || '').toLowerCase().split('/');
  const lower = (pathParts.slice(1).join('/') || pathParts.join('/')).replace(/\.[^.]+$/, '');
  const roles = [];

  if (/\b(player|hero|pet|fighter|bird|frog|ship|car-player|head|paddle|basket|launcher)\b/.test(lower)) {
    roles.push('player');
  }
  if (packName === 'tower-defense' && /\btower\b/.test(lower)) {
    roles.push('player');
  }
  if (/\b(enemy|opponent|obstacle|alien|monster|truck|car-obstacle)\b/.test(lower)) {
    roles.push('enemy');
  }
  if (/\b(coin|gem|food|toy|heart|star|ball|treasure|powerup)\b/.test(lower)) {
    roles.push('collectible');
  }
  if (/\b(background|road|ground|platform|wall|tiles|tile|goal|path|pipe|log|target|brick)\b/.test(lower)) {
    roles.push('background');
  }
  if (/\b(bullet|explosion|sparkle|particle|punch|arrow|arrows)\b/.test(lower)) {
    roles.push('other');
  }

  if (packName === 'common' && roles.length === 0) roles.push('collectible');
  if (roles.length === 0) roles.push('other');
  return [...new Set(roles)];
}

function inferTags(relativePath, packName) {
  const base = relativePath.replace(/\.[^.]+$/, '');
  const parts = `${packName}/${base}`
    .split(/[\\/_.()\-\s]+/)
    .map((part) => normalizeToken(part))
    .flatMap((part) => part.split(/\s+/))
    .filter((part) => part.length >= 2 && !/^\d+$/.test(part));

  return [...new Set([...(PACK_TAGS[packName] || []), ...parts])].slice(0, 16);
}

async function findSpriteFiles(dir, baseDir, out = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findSpriteFiles(full, baseDir, out);
      continue;
    }
    if (!/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) continue;
    out.push({ full, relative: path.relative(baseDir, full).replace(/\\/g, '/') });
  }

  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  const topEntries = await fs.readdir(SPRITES_DIR, { withFileTypes: true });
  const packDirs = topEntries
    .filter((entry) => entry.isDirectory() && !SKIP_TOP_LEVEL_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .sort();

  console.log('Source:', SPRITES_DIR);
  console.log('Packs:', packDirs.join(', '));
  console.log('Dry run:', dryRun, '| Limit:', limit ?? 'none');

  let pool = null;
  if (!dryRun) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not set. Use --dry-run to scan only.');
      process.exit(1);
    }
    const { getPool } = await import('../server/services/db.js');
    pool = getPool();
  }

  const records = [];
  for (const packName of packDirs) {
    const packDir = path.join(SPRITES_DIR, packName);
    const files = await findSpriteFiles(packDir, SPRITES_DIR);
    for (const file of files) {
      const relativePath = file.relative;
      const webPath = `/assets/sprites/${relativePath}`.replace(/\\/g, '/');
      let w = 32;
      let h = 32;
      try {
        const dimensions = imageSize(file.full);
        if (dimensions.width && dimensions.height) {
          w = dimensions.width;
          h = dimensions.height;
        }
      } catch {
        // keep defaults
      }

      records.push({
        id: `local-${slugify(relativePath.replace(/\.[^.]+$/, ''))}`,
        path: webPath,
        w,
        h,
        tags: inferTags(relativePath, packName),
        roles: inferRoles(relativePath, packName),
        genres: genresForPack(packName),
        note: `Local uploaded sprite pack: ${packName}`,
      });
    }
  }

  console.log('Found', records.length, 'sprite files');

  let inserted = 0;
  for (const record of records) {
    if (limit && inserted >= limit) break;

    if (dryRun) {
      if (inserted < 15) {
        console.log(`${record.id} -> ${record.path}`);
        console.log(`  genres=${record.genres.join(',')} roles=${record.roles.join(',')} tags=${record.tags.join(',')}`);
      }
      inserted++;
      continue;
    }

    await pool.query(
      `INSERT INTO sprites (id, path, w, h, tags, roles, genres, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         path = EXCLUDED.path,
         w = EXCLUDED.w,
         h = EXCLUDED.h,
         tags = EXCLUDED.tags,
         roles = EXCLUDED.roles,
         genres = EXCLUDED.genres,
         note = EXCLUDED.note`,
      [record.id, record.path, record.w, record.h, record.tags, record.roles, record.genres, record.note],
    );
    inserted++;
  }

  if (pool) {
    const count = await pool.query(`SELECT COUNT(*) FROM sprites WHERE id LIKE 'local-%'`);
    console.log(`Done. Local uploaded sprites indexed: ${count.rows[0].count}`);
    await pool.end();
  } else {
    console.log(`Dry run complete. Records scanned: ${inserted}`);
  }
}

main().catch((err) => {
  console.error('Local sprite ingest failed:', err.message);
  process.exit(1);
});
