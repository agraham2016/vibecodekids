/**
 * Asset Matcher
 *
 * Keyword-based heuristic that auto-selects relevant sprites from the
 * full studio catalog based on the kid's game description, detected genre,
 * and any manually picked asset IDs.
 *
 * No ML required — uses noun extraction, label matching, and role-diversity
 * scoring to return a compact list the AI can reference in its system prompt.
 */

import { buildCatalog } from '../routes/studioAssets.js';

const MAX_AUTO_PICKS = 12;

const VISUAL_ROLES = [
  'player',
  'character',
  'enemy',
  'npc',
  'obstacle',
  'platform',
  'tile',
  'ground',
  'background',
  'collectible',
  'coin',
  'powerup',
  'projectile',
  'bullet',
  'vehicle',
  'building',
  'tree',
  'decoration',
  'ui',
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'it',
  'my',
  'me',
  'i',
  'make',
  'create',
  'build',
  'want',
  'like',
  'with',
  'and',
  'but',
  'or',
  'so',
  'to',
  'can',
  'you',
  'do',
  'add',
  'game',
  'please',
  'really',
  'super',
  'cool',
  'awesome',
  'fun',
  'that',
  'this',
  'have',
  'get',
  'put',
  'some',
  'very',
  'just',
  'also',
  'where',
  'when',
  'how',
  'what',
  'more',
  'new',
  'big',
  'small',
  'one',
  'two',
  'three',
]);

let cachedCatalog = null;
let catalogBuiltAt = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

function getCatalog() {
  const now = Date.now();
  if (!cachedCatalog || now - catalogBuiltAt > CATALOG_TTL_MS) {
    cachedCatalog = buildCatalog();
    catalogBuiltAt = now;
  }
  return cachedCatalog;
}

function extractKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function guessRole(asset) {
  const haystack = `${asset.label} ${asset.key} ${asset.packLabel} ${asset.note || ''}`.toLowerCase();
  for (const role of VISUAL_ROLES) {
    if (haystack.includes(role)) return role;
  }
  return 'other';
}

function scoreAsset(asset, keywords, genre) {
  let score = 0;
  const haystack =
    `${asset.label} ${asset.key} ${asset.packLabel} ${asset.genreLabel} ${asset.note || ''}`.toLowerCase();

  for (const kw of keywords) {
    const labelLower = asset.label.toLowerCase();
    const keyLower = asset.key.toLowerCase();
    if (labelLower === kw || keyLower === kw) {
      score += 5;
    } else if (labelLower.includes(kw) || keyLower.includes(kw)) {
      score += 3;
    } else if (haystack.includes(kw)) {
      score += 1;
    }
  }

  if (genre && asset.genre === genre) {
    score += 2;
  }

  return score;
}

/**
 * @param {object} opts
 * @param {string} opts.prompt - The kid's message
 * @param {string|null} opts.genre - Detected game genre
 * @param {string[]} opts.kidPickedIds - Asset IDs the kid manually selected
 * @returns {{ assets: object[], kidPicks: object[], autoPicks: object[] }}
 */
export function matchAssets({ prompt, genre = null, kidPickedIds = [] }) {
  const catalog = getCatalog();
  const allAssets = catalog.assets;
  const kidPickedSet = new Set(kidPickedIds);

  const kidPicks = kidPickedIds.length > 0 ? allAssets.filter((a) => kidPickedSet.has(a.id)) : [];

  const keywords = extractKeywords(prompt);
  if (keywords.length === 0 && !genre) {
    return { assets: kidPicks, kidPicks, autoPicks: [] };
  }

  const kidPickPaths = new Set(kidPicks.map((a) => a.path));
  const candidates = allAssets.filter((a) => !kidPickPaths.has(a.path));

  const scored = candidates
    .map((asset) => ({ asset, score: scoreAsset(asset, keywords, genre) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const roleCounts = {};
  const autoPicks = [];
  const remainingSlots = MAX_AUTO_PICKS - kidPicks.length;

  for (const { asset } of scored) {
    if (autoPicks.length >= remainingSlots) break;

    const role = guessRole(asset);
    const currentCount = roleCounts[role] || 0;
    if (currentCount >= 2) continue;

    roleCounts[role] = currentCount + 1;
    autoPicks.push(asset);
  }

  const merged = [...kidPicks, ...autoPicks];
  return { assets: merged, kidPicks, autoPicks };
}

/**
 * Format matched assets into a system prompt block with pre-built
 * this.load.image() calls the AI can copy directly.
 */
export function formatMatchedAssetsForPrompt(assets, kidPickedIds = []) {
  if (!assets || assets.length === 0) return '';

  const kidPickedSet = new Set(kidPickedIds);
  const lines = [
    '═══════════════════════════════════════════════════════════════',
    '🎨 SELECTED & RECOMMENDED SPRITE ASSETS — USE THESE FIRST',
    '═══════════════════════════════════════════════════════════════',
    '',
    'You MUST use these exact sprite paths in your preload() function.',
    'These are real PNG files on the server — do NOT invent other paths.',
    'Map each asset to an appropriate game role (player, enemy, collectible, background, obstacle).',
    '',
    'Copy these lines into preload():',
    '```',
    'preload() {',
  ];

  for (const asset of assets) {
    const alias = `${asset.genre}-${asset.key}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const source = kidPickedSet.has(asset.id) ? '👤 kid-picked' : '🤖 auto-matched';
    const size = asset.width && asset.height ? ` (${asset.width}×${asset.height})` : '';
    lines.push(`  this.load.image('${alias}', '${asset.path}');  // ${source}: ${asset.label}${size}`);
  }

  lines.push('');
  lines.push('  // MANDATORY fallback handler');
  lines.push('  this.load.on("loaderror", (file) => {');
  lines.push('    const c = document.createElement("canvas"); c.width = 64; c.height = 64;');
  lines.push('    const ctx = c.getContext("2d");');
  lines.push('    ctx.fillStyle = "#d63384"; ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();');
  lines.push('    this.textures.addCanvas(file.key, c);');
  lines.push('  });');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('IMPORTANT:');
  lines.push('- Use the kid-picked (👤) assets with highest priority — the kid chose them on purpose.');
  lines.push('- Auto-matched (🤖) assets are suggestions — use them if they fit the game theme.');
  lines.push('- If you need something not listed here, use the Canvas Drawing Skill patterns to draw it procedurally.');
  lines.push('- NEVER make up file paths like "player.png" or "enemy.png" that are not listed above.');

  return lines.join('\n');
}
