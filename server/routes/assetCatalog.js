/**
 * Asset Catalog API
 *
 * Serves the 2D sprite asset catalog for paid users.
 * Free users receive a 403 with an upgrade prompt.
 */

import { Router } from 'express';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { PUBLIC_DIR, MEMBERSHIP_TIERS } from '../config/index.js';
import { readUser } from '../services/storage.js';

const SPRITES_DIR = path.join(PUBLIC_DIR, 'assets', 'sprites');

const PACK_METADATA = {
  'kenney-platformer': { label: 'Platformer Pack', category: 'platformer', tags: ['player', 'enemy', 'tile', 'item'] },
  'kenney-animals': { label: 'Animals Pack', category: 'characters', tags: ['animal', 'cute', 'cartoon'] },
  'kenney-fish': { label: 'Fish Pack', category: 'characters', tags: ['fish', 'ocean', 'underwater'] },
  'kenney-food': { label: 'Food Pack', category: 'items', tags: ['food', 'fruit', 'drink'] },
  'kenney-racing': { label: 'Racing Pack', category: 'vehicles', tags: ['car', 'road', 'race'] },
  'kenney-space-shooter': {
    label: 'Space Shooter Pack',
    category: 'space',
    tags: ['ship', 'laser', 'meteor', 'alien'],
  },
  'kenney-sports': { label: 'Sports Pack', category: 'sports', tags: ['ball', 'sports', 'equipment'] },
  'kenney-tower-defense': { label: 'Tower Defense Pack', category: 'strategy', tags: ['tower', 'defense', 'enemy'] },
  'kenney-roguelike': { label: 'Roguelike Pack', category: 'rpg', tags: ['dungeon', 'fantasy', 'pixel'] },
  'kenney-tiny-dungeon': { label: 'Tiny Dungeon Pack', category: 'rpg', tags: ['dungeon', 'tiny', 'pixel'] },
  'kenney-puzzle': { label: 'Puzzle Pack', category: 'puzzle', tags: ['gem', 'block', 'tile'] },
  'kenney-ui': { label: 'UI Pack', category: 'ui', tags: ['button', 'panel', 'icon'] },
  'kenney-prototype': { label: 'Prototype Pack', category: 'misc', tags: ['shape', 'prototype', 'placeholder'] },
  platformer: { label: 'Custom Platformer', category: 'platformer', tags: ['player', 'enemy', 'platform'] },
  'endless-runner': { label: 'Endless Runner', category: 'platformer', tags: ['runner', 'obstacle', 'coin'] },
  racing: { label: 'Racing', category: 'vehicles', tags: ['car', 'road'] },
  shooter: { label: 'Space Shooter', category: 'space', tags: ['ship', 'bullet', 'explosion'] },
  frogger: { label: 'Frogger', category: 'classic', tags: ['frog', 'car', 'log'] },
  puzzle: { label: 'Puzzle', category: 'puzzle', tags: ['gem', 'tile'] },
  'pet-sim': { label: 'Pet Simulator', category: 'characters', tags: ['pet', 'animal', 'cute'] },
  rpg: { label: 'RPG', category: 'rpg', tags: ['hero', 'enemy', 'dungeon'] },
  snake: { label: 'Snake', category: 'classic', tags: ['snake', 'food'] },
  sports: { label: 'Sports', category: 'sports', tags: ['ball', 'field'] },
  common: { label: 'Common Assets', category: 'misc', tags: ['star', 'heart', 'effect'] },
  clicker: { label: 'Clicker', category: 'misc', tags: ['button', 'upgrade'] },
  'tower-defense': { label: 'Tower Defense', category: 'strategy', tags: ['tower', 'creep', 'path'] },
  'brick-breaker': { label: 'Brick Breaker', category: 'classic', tags: ['brick', 'paddle', 'ball'] },
  'bubble-shooter': { label: 'Bubble Shooter', category: 'puzzle', tags: ['bubble', 'pop'] },
  'falling-blocks': { label: 'Falling Blocks', category: 'puzzle', tags: ['block', 'tetris'] },
  fighting: { label: 'Fighting', category: 'action', tags: ['fighter', 'punch', 'kick'] },
  flappy: { label: 'Flappy', category: 'classic', tags: ['bird', 'pipe'] },
  rhythm: { label: 'Rhythm', category: 'music', tags: ['note', 'beat'] },
};

const CATEGORY_LABELS = {
  platformer: 'Platformer',
  characters: 'Characters & Animals',
  items: 'Items & Objects',
  vehicles: 'Vehicles & Racing',
  space: 'Space & Sci-Fi',
  sports: 'Sports & Ball Games',
  strategy: 'Strategy & Defense',
  rpg: 'RPG & Fantasy',
  puzzle: 'Puzzle & Brain',
  classic: 'Classic Arcade',
  action: 'Action & Fighting',
  music: 'Music & Rhythm',
  ui: 'UI Elements',
  misc: 'Miscellaneous',
};

function collectSpritesFromDir(dirPath, urlPrefix, maxDepth = 2, depth = 0) {
  if (!existsSync(dirPath) || depth > maxDepth) return [];
  const results = [];
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
        const stat = statSync(fullPath);
        results.push({
          filename: entry.name,
          url: `${urlPrefix}/${entry.name}`.replace(/\\/g, '/'),
          size: stat.size,
        });
      } else if (entry.isDirectory()) {
        const nested = collectSpritesFromDir(fullPath, `${urlPrefix}/${entry.name}`, maxDepth, depth + 1);
        results.push(...nested);
      }
    }
  } catch {
    // Silently skip unreadable directories
  }
  return results;
}

let _cachedCatalog = null;
let _cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

function buildCatalog() {
  const now = Date.now();
  if (_cachedCatalog && now - _cachedAt < CACHE_TTL) return _cachedCatalog;

  const packs = [];
  if (!existsSync(SPRITES_DIR)) {
    _cachedCatalog = { packs, categories: {} };
    _cachedAt = now;
    return _cachedCatalog;
  }

  const entries = readdirSync(SPRITES_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packName = entry.name;
    if (packName === 'v2') continue;
    const meta = PACK_METADATA[packName] || { label: packName, category: 'misc', tags: [] };
    const urlPrefix = `/assets/sprites/${packName}`;
    const sprites = collectSpritesFromDir(path.join(SPRITES_DIR, packName), urlPrefix);
    if (sprites.length > 0) {
      packs.push({
        id: packName,
        label: meta.label,
        category: meta.category,
        tags: meta.tags,
        spriteCount: sprites.length,
        previewSprites: sprites.slice(0, 8).map((s) => s.url),
        sprites,
      });
    }
  }

  const categories = {};
  for (const pack of packs) {
    if (!categories[pack.category]) {
      categories[pack.category] = {
        id: pack.category,
        label: CATEGORY_LABELS[pack.category] || pack.category,
        packCount: 0,
        totalSprites: 0,
      };
    }
    categories[pack.category].packCount++;
    categories[pack.category].totalSprites += pack.spriteCount;
  }

  _cachedCatalog = { packs, categories };
  _cachedAt = now;
  return _cachedCatalog;
}

function createRequirePaidPlan(sessions) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Login required', upgradeRequired: false });
    }

    const session = await sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session', upgradeRequired: false });
    }

    req.userId = session.userId;

    try {
      const user = await readUser(session.userId);
      const tier = user?.membershipTier || 'free';
      const tierConfig = MEMBERSHIP_TIERS[tier] || MEMBERSHIP_TIERS.free;

      if (!tierConfig.canAccessPremiumAssets) {
        return res.status(403).json({
          error: 'Asset catalog requires a paid plan',
          upgradeRequired: true,
          message: 'Unlock the 2D Asset Catalog with a Creator or Pro plan!',
        });
      }
      next();
    } catch {
      return res.status(500).json({ error: 'Could not verify plan status' });
    }
  };
}

export default function createAssetCatalogRouter(sessions) {
  const router = Router();
  const requirePaidPlan = createRequirePaidPlan(sessions);

  router.get('/categories', requirePaidPlan, (_req, res) => {
    const { categories } = buildCatalog();
    res.json({ ok: true, categories: Object.values(categories) });
  });

  router.get('/packs', requirePaidPlan, (req, res) => {
    const { packs } = buildCatalog();
    const { category } = req.query;

    let filtered = packs;
    if (category) {
      filtered = packs.filter((p) => p.category === category);
    }

    const summary = filtered.map((p) => ({
      id: p.id,
      label: p.label,
      category: p.category,
      tags: p.tags,
      spriteCount: p.spriteCount,
      previewSprites: p.previewSprites,
    }));

    res.json({ ok: true, packs: summary });
  });

  router.get('/packs/:packId', requirePaidPlan, (req, res) => {
    const { packs } = buildCatalog();
    const pack = packs.find((p) => p.id === req.params.packId);
    if (!pack) {
      return res.status(404).json({ error: 'Pack not found' });
    }
    res.json({ ok: true, pack });
  });

  router.get('/search', requirePaidPlan, (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({ ok: true, results: [] });
    }

    const { packs } = buildCatalog();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];

    for (const pack of packs) {
      const matchingSprites = pack.sprites.filter((sprite) => {
        const name = sprite.filename.toLowerCase();
        return terms.some((term) => name.includes(term));
      });

      if (matchingSprites.length > 0) {
        results.push({
          packId: pack.id,
          packLabel: pack.label,
          category: pack.category,
          sprites: matchingSprites.slice(0, 20).map((s) => s.url),
        });
      } else {
        const packNameMatch = terms.some(
          (term) =>
            pack.id.toLowerCase().includes(term) ||
            pack.label.toLowerCase().includes(term) ||
            pack.tags.some((tag) => tag.includes(term)),
        );
        if (packNameMatch) {
          results.push({
            packId: pack.id,
            packLabel: pack.label,
            category: pack.category,
            sprites: pack.previewSprites,
          });
        }
      }
    }

    res.json({ ok: true, results: results.slice(0, 10) });
  });

  return router;
}
