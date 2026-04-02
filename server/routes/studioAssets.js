import { Router } from 'express';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSET_MANIFEST } from '../assets/assetManifest.js';
import { calculateUsageRemaining } from '../middleware/rateLimit.js';
import { readUser } from '../services/storage.js';

const ASSET_SELECTION_LIMIT = 6;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PREMIUM_SPRITES_DIR = path.join(__dirname, '..', '..', 'public', 'assets', 'sprites', 'premium');

function humanizeToken(value) {
  return String(value || '')
    .replace(/^bg([A-Z])/, 'background $1')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\\/]+/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getGenreLabel(genre) {
  const labels = {
    'endless-runner': 'Endless Runner',
    'top-down-shooter': 'Top-Down Shooter',
    'treasure-diver': 'Treasure Diver',
    'fruit-slice': 'Fruit Slice',
    'find-the-friend': 'Find the Friend',
    'tower-defense': 'Tower Defense',
    'brick-breaker': 'Brick Breaker',
    'bubble-shooter': 'Bubble Shooter',
    'falling-blocks': 'Falling Blocks',
    'pet-sim': 'Pet Sim',
    'trash-sorter': 'Trash Sorter',
    'tower-stack': 'Tower Stack',
  };

  return labels[genre] || humanizeToken(genre);
}

function getPackLabel(assetPath) {
  const packId =
    String(assetPath || '')
      .split('/')
      .filter(Boolean)[2] || 'studio-picks';
  return {
    id: packId,
    label: humanizeToken(packId),
  };
}

function getAssetLabel(sprite) {
  if (sprite.note) {
    return humanizeToken(sprite.note.replace(/^uploaded\s+/i, ''));
  }

  return humanizeToken(sprite.key);
}

function matchesAssetSearch(asset, normalizedSearch) {
  if (!normalizedSearch) return true;

  const haystack = [asset.label, asset.genreLabel, asset.packLabel, asset.note, asset.key, asset.path]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildPremiumPackAssets() {
  const categories = [];
  const assets = [];

  function collectPremiumPngFiles(dirPath, prefix = '') {
    const files = [];
    const entries = readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        files.push(...collectPremiumPngFiles(fullPath, nextPrefix));
        continue;
      }

      if (entry.isFile() && /\.png$/i.test(entry.name)) {
        files.push(nextPrefix);
      }
    }

    return files;
  }

  try {
    const categoryEntries = readdirSync(PREMIUM_SPRITES_DIR, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    );

    for (const categoryEntry of categoryEntries) {
      const categoryId = categoryEntry.name;
      const categoryLabel = getGenreLabel(categoryId);
      const categoryDir = path.join(PREMIUM_SPRITES_DIR, categoryId);
      let categoryAssetCount = 0;

      const packEntries = readdirSync(categoryDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
      for (const packEntry of packEntries) {
        const packId = packEntry.name;
        const packDir = path.join(categoryDir, packId);
        const filePaths = collectPremiumPngFiles(packDir);

        for (const relativeFilePath of filePaths) {
          const normalizedRelativePath = relativeFilePath.replace(/\\/g, '/');
          const nestedDir = path.posix.dirname(normalizedRelativePath);
          const key = path.posix.basename(normalizedRelativePath).replace(/\.png$/i, '');
          const packLabel =
            nestedDir && nestedDir !== '.'
              ? `${humanizeToken(packId)} · ${humanizeToken(nestedDir)}`
              : humanizeToken(packId);

          categoryAssetCount += 1;
          assets.push({
            id: `premium:${categoryId}:${packId}:${normalizedRelativePath.replace(/[/.]/g, ':')}`,
            label: humanizeToken(key),
            key,
            genre: categoryId,
            genreLabel: categoryLabel,
            pack: nestedDir && nestedDir !== '.' ? `${packId}/${nestedDir}` : packId,
            packLabel,
            path: `/assets/sprites/premium/${categoryId}/${packId}/${normalizedRelativePath}`,
            width: null,
            height: null,
            note: `Premium ${packLabel.toLowerCase()} sprite`,
          });
        }
      }

      if (categoryAssetCount > 0) {
        categories.push({
          id: categoryId,
          label: categoryLabel,
          assetCount: categoryAssetCount,
        });
      }
    }
  } catch {
    return { categories: [], assets: [] };
  }

  return { categories, assets };
}

export function buildCatalog() {
  const categoriesById = new Map();
  const assets = [];
  const seenPaths = new Set();
  const upsertCategory = (id, label, assetCount) => {
    const existing = categoriesById.get(id);
    if (existing) {
      existing.assetCount += assetCount;
      return;
    }

    categoriesById.set(id, { id, label, assetCount });
  };

  for (const [genre, manifest] of Object.entries(ASSET_MANIFEST)) {
    if (genre === 'common' || !Array.isArray(manifest?.sprites) || manifest.sprites.length === 0) {
      continue;
    }

    const genreLabel = getGenreLabel(genre);
    upsertCategory(genre, genreLabel, manifest.sprites.length);

    manifest.sprites.forEach((sprite, index) => {
      if (!sprite?.path || seenPaths.has(sprite.path)) return;

      seenPaths.add(sprite.path);
      const pack = getPackLabel(sprite.path);

      assets.push({
        id: `${genre}:${sprite.key}:${index}`,
        label: getAssetLabel(sprite),
        key: sprite.key,
        genre,
        genreLabel,
        pack: pack.id,
        packLabel: pack.label,
        path: sprite.path,
        width: sprite.w || null,
        height: sprite.h || null,
        note: sprite.note || '',
      });
    });
  }

  const premiumCatalog = buildPremiumPackAssets();
  for (const category of premiumCatalog.categories) {
    upsertCategory(category.id, category.label, category.assetCount);
  }
  for (const asset of premiumCatalog.assets) {
    if (seenPaths.has(asset.path)) continue;
    seenPaths.add(asset.path);
    assets.push(asset);
  }

  const categories = [...categoriesById.values()];
  categories.sort((a, b) => a.label.localeCompare(b.label));
  assets.sort((a, b) => {
    const genreCompare = a.genreLabel.localeCompare(b.genreLabel);
    if (genreCompare !== 0) return genreCompare;
    return a.label.localeCompare(b.label);
  });

  return { categories, assets };
}

export default function createStudioAssetsRouter(sessions) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const session = await sessions.get(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const user = await readUser(session.userId);
      const usage = calculateUsageRemaining(user);
      if (!usage.canAccessPremiumAssets) {
        return res.status(403).json({
          error: 'Premium asset catalog is available on paid plans.',
          upgradeRequired: true,
        });
      }

      const catalog = buildCatalog();
      const genreFilter = typeof req.query.genre === 'string' ? req.query.genre.trim() : '';
      const normalizedSearch = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
      const limit = Math.min(Math.max(parsePositiveInteger(req.query.limit, 60), 1), 120);
      const offset = Math.max(parsePositiveInteger(req.query.offset, 0), 0);
      const selectedRaw = Array.isArray(req.query.selected)
        ? req.query.selected
        : typeof req.query.selected === 'string'
          ? [req.query.selected]
          : [];
      const selectedIds = new Set(
        selectedRaw
          .flatMap((value) => String(value).split(','))
          .map((value) => value.trim())
          .filter(Boolean),
      );
      const filteredAssets = catalog.assets.filter((asset) => {
        if (genreFilter && genreFilter !== 'all' && asset.genre !== genreFilter) {
          return false;
        }

        return matchesAssetSearch(asset, normalizedSearch);
      });
      const pagedAssets = filteredAssets.slice(offset, offset + limit);
      const selectedAssets =
        selectedIds.size === 0
          ? []
          : catalog.assets.filter((asset) => selectedIds.has(asset.id)).slice(0, ASSET_SELECTION_LIMIT);

      return res.json({
        ok: true,
        categories: catalog.categories,
        assets: pagedAssets,
        totalAssets: filteredAssets.length,
        hasMore: offset + pagedAssets.length < filteredAssets.length,
        selectedAssets,
        selectionLimit: ASSET_SELECTION_LIMIT,
      });
    } catch (error) {
      console.error('Studio assets route error:', error);
      return res.status(500).json({ error: 'Could not load asset catalog' });
    }
  });

  return router;
}
