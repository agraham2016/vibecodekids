#!/usr/bin/env node
/**
 * Seed script for sprites table.
 * Inserts sample sprites with tags/roles/genres for testing RAG search.
 * Run: node scripts/seed-sprites.js
 * Requires DATABASE_URL to be set.
 */

import 'dotenv/config';
import { DATABASE_URL } from '../server/config/index.js';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Cannot seed sprites.');
  process.exit(1);
}

const { getPool } = await import('../server/services/db.js');

const SAMPLE_SPRITES = [
  // Platformer - dinosaurs
  {
    id: 'sprite-dino-player-001',
    path: '/assets/sprites/v2/dino-player-001.png',
    w: 32,
    h: 32,
    tags: ['dinosaur', 'character', 'cute', 'green', 'player'],
    roles: ['player'],
    genres: ['platformer', 'endless-runner'],
  },
  {
    id: 'sprite-dino-player-002',
    path: '/assets/sprites/v2/dino-player-002.png',
    w: 32,
    h: 32,
    tags: ['dinosaur', 'character', 'blue', 'player'],
    roles: ['player'],
    genres: ['platformer', 'endless-runner'],
  },
  {
    id: 'sprite-dino-enemy-001',
    path: '/assets/sprites/v2/dino-enemy-001.png',
    w: 32,
    h: 32,
    tags: ['dinosaur', 'enemy', 'spiky', 'red'],
    roles: ['enemy'],
    genres: ['platformer', 'endless-runner'],
  },
  {
    id: 'sprite-coin-001',
    path: '/assets/sprites/v2/coin-001.png',
    w: 16,
    h: 16,
    tags: ['coin', 'collectible', 'gold', 'treasure'],
    roles: ['collectible'],
    genres: ['platformer', 'endless-runner', 'rpg', 'puzzle'],
  },
  // Shooter - space
  {
    id: 'sprite-ship-001',
    path: '/assets/sprites/v2/ship-001.png',
    w: 32,
    h: 48,
    tags: ['spaceship', 'ship', 'player', 'space', 'sci-fi'],
    roles: ['player'],
    genres: ['shooter', 'top-down-shooter'],
  },
  {
    id: 'sprite-ship-002',
    path: '/assets/sprites/v2/ship-002.png',
    w: 32,
    h: 48,
    tags: ['spaceship', 'ship', 'player', 'space', 'laser'],
    roles: ['player'],
    genres: ['shooter', 'top-down-shooter'],
  },
  {
    id: 'sprite-alien-001',
    path: '/assets/sprites/v2/alien-001.png',
    w: 28,
    h: 28,
    tags: ['alien', 'enemy', 'space', 'ufo'],
    roles: ['enemy'],
    genres: ['shooter', 'top-down-shooter'],
  },
  {
    id: 'sprite-alien-002',
    path: '/assets/sprites/v2/alien-002.png',
    w: 28,
    h: 28,
    tags: ['alien', 'enemy', 'space', 'green'],
    roles: ['enemy'],
    genres: ['shooter', 'top-down-shooter'],
  },
  // Racing
  {
    id: 'sprite-car-player-001',
    path: '/assets/sprites/v2/car-player-001.png',
    w: 24,
    h: 40,
    tags: ['car', 'vehicle', 'racing', 'red', 'player'],
    roles: ['player'],
    genres: ['racing', 'street-racing'],
  },
  {
    id: 'sprite-car-obstacle-001',
    path: '/assets/sprites/v2/car-obstacle-001.png',
    w: 24,
    h: 40,
    tags: ['car', 'vehicle', 'obstacle', 'enemy'],
    roles: ['enemy'],
    genres: ['racing', 'street-racing', 'frogger'],
  },
  // RPG
  {
    id: 'sprite-hero-001',
    path: '/assets/sprites/v2/hero-001.png',
    w: 32,
    h: 32,
    tags: ['hero', 'character', 'knight', 'player'],
    roles: ['player'],
    genres: ['rpg', 'platformer'],
  },
  {
    id: 'sprite-enemy-skeleton',
    path: '/assets/sprites/v2/enemy-skeleton.png',
    w: 32,
    h: 32,
    tags: ['skeleton', 'enemy', 'rpg', 'dungeon'],
    roles: ['enemy'],
    genres: ['rpg'],
  },
  {
    id: 'sprite-gem-001',
    path: '/assets/sprites/v2/gem-001.png',
    w: 16,
    h: 16,
    tags: ['gem', 'treasure', 'collectible', 'crystal'],
    roles: ['collectible'],
    genres: ['rpg', 'puzzle', 'clicker'],
  },
  // Background
  {
    id: 'sprite-bg-space',
    path: '/assets/sprites/v2/bg-space.png',
    w: 256,
    h: 256,
    tags: ['background', 'space', 'stars', 'sky'],
    roles: ['background'],
    genres: ['shooter', 'top-down-shooter'],
  },
  {
    id: 'sprite-bg-grass',
    path: '/assets/sprites/v2/bg-grass.png',
    w: 64,
    h: 64,
    tags: ['background', 'grass', 'nature', 'platform'],
    roles: ['background'],
    genres: ['platformer', 'endless-runner', 'rpg'],
  },
];

async function seed() {
  const pool = getPool();

  console.log('Seeding sprites table...');

  for (const s of SAMPLE_SPRITES) {
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
      [s.id, s.path, s.w, s.h, s.tags, s.roles, s.genres, s.note || null],
    );
  }

  const count = await pool.query('SELECT COUNT(*) FROM sprites');
  console.log(`Done. Total sprites: ${count.rows[0].count}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
