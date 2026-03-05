/**
 * Sprite RAG Search Service
 *
 * Tag-based retrieval for the 60K sprite catalog.
 * Extracts terms from user prompts and queries Postgres for relevant sprites.
 * Returns null when no results, so caller can fall back to assetManifest.
 */

import { USE_POSTGRES, SPRITE_SEARCH_LIMIT_PER_ROLE, SPRITE_SEARCH_MAX_TOTAL } from '../config/index.js';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'make',
  'me',
  'my',
  'i',
  'want',
  'game',
  'create',
  'like',
  'get',
  'go',
  'do',
  'can',
  'please',
  'thanks',
  'hi',
  'hello',
]);

const SYNONYMS = {
  dino: 'dinosaur',
  dinos: 'dinosaur',
  car: 'vehicle',
  cars: 'vehicle',
  ship: 'spaceship',
  ships: 'spaceship',
  alien: 'alien',
  aliens: 'alien',
  zombies: 'zombie',
  zombie: 'zombie',
  robot: 'robot',
  robots: 'robot',
  cat: 'cat',
  dog: 'dog',
  dragon: 'dragon',
  knight: 'knight',
  gem: 'gem',
  gems: 'gem',
  coin: 'coin',
  coins: 'coin',
  slime: 'slime',
  spaceship: 'spaceship',
  castle: 'castle',
  medieval: 'medieval',
  pirate: 'pirate',
  fish: 'fish',
  tank: 'tank',
  plane: 'plane',
};

/**
 * Extract 3-8 meaningful search terms from the user prompt.
 * @param {string} prompt - Raw user message
 * @returns {string[]} - Lowercased terms for tag matching
 */
export function extractPromptTerms(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => {
      const resolved = SYNONYMS[w] || w;
      return resolved.length >= 3 ? resolved : null;
    })
    .filter(Boolean);

  const seen = new Set();
  const terms = [];
  for (const w of words) {
    if (STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    terms.push(w);
    if (terms.length >= 8) break;
  }
  return terms;
}

/**
 * Search sprites by genre, roles, and prompt-derived terms.
 * Role-balanced: fetches up to limitPerRole per role (player, enemy, collectible, background)
 * so the AI gets a useful mix instead of e.g. 24 background tiles.
 *
 * @param {object} opts
 * @param {string} opts.prompt - User message
 * @param {string|null} opts.genre - Game genre (platformer, shooter, etc.)
 * @param {string[]} opts.roles - Semantic roles to match
 * @param {number} opts.limitPerRole - Max sprites per role
 * @param {number} opts.maxTotal - Max total sprites returned
 * @returns {Promise<Array<{id,path,w,h,tags,roles,genres,note}>|null>}
 */
export async function searchSprites({
  prompt,
  genre,
  roles = ['player', 'enemy', 'collectible', 'background'],
  limitPerRole = SPRITE_SEARCH_LIMIT_PER_ROLE,
  maxTotal = SPRITE_SEARCH_MAX_TOTAL,
}) {
  if (!USE_POSTGRES || !genre) return null;

  const terms = extractPromptTerms(prompt || '');
  const rolesOrder = ['player', 'enemy', 'collectible', 'background'];
  const rolesArr = Array.isArray(roles) ? roles.filter((r) => rolesOrder.includes(r)) : rolesOrder;

  try {
    const { getPool } = await import('./db.js');
    const pool = getPool();

    const hasTerms = terms.length > 0;
    const byRole = { player: [], enemy: [], collectible: [], background: [] };

    // Fetch per-role in parallel for efficiency (balanced mix)
    const queries = rolesArr.map((role) => {
      if (hasTerms) {
        return pool.query(
          `SELECT id, path, w, h, tags, roles, genres, note
           FROM sprites
           WHERE genres @> ARRAY[$1] AND $4 = ANY(roles) AND tags && $2
           ORDER BY (SELECT COUNT(*) FROM unnest(tags) t WHERE t = ANY($2)) DESC NULLS LAST, created_at
           LIMIT $3`,
          [genre, terms, limitPerRole, role],
        );
      }
      return pool.query(
        `SELECT id, path, w, h, tags, roles, genres, note
         FROM sprites
         WHERE genres @> ARRAY[$1] AND $3 = ANY(roles)
         ORDER BY created_at
         LIMIT $2`,
        [genre, limitPerRole, role],
      );
    });

    const results = await Promise.all(queries);
    const seen = new Set();
    const merged = [];

    for (let i = 0; i < results.length; i++) {
      const role = rolesArr[i];
      const rows = results[i]?.rows || [];
      for (const r of rows) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          merged.push(r);
          if (merged.length >= maxTotal) break;
        }
      }
      if (merged.length >= maxTotal) break;
    }

    if (merged.length === 0) return null;

    return merged.map((r) => ({
      id: r.id,
      path: r.path,
      w: r.w,
      h: r.h,
      tags: r.tags || [],
      roles: r.roles || [],
      genres: r.genres || [],
      note: r.note,
    }));
  } catch (err) {
    console.error('⚠️ Sprite search failed (falling back to manifest):', err.message);
    return null;
  }
}
