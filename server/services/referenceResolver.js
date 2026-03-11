/**
 * Reference Resolver
 *
 * The brain of the reference code system. Decides what reference material
 * to inject into the AI prompt based on the kid's request:
 *
 * 1. Built-in templates (server/templates/) — full working games
 * 2. Curated snippets (server/snippets/) — reusable components
 * 3. GitHub fetched code — from URLs the kid pastes or known repos
 *
 * Respects a total character budget to avoid blowing up the context window.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REFERENCE_MAX_CHARS } from '../config/index.js';
import { getRelevantSnippets } from '../snippets/index.js';
import { detectGitHubUrl, fetchRepoCode } from './githubFetcher.js';
import {
  formatAssetsForPrompt,
  formatAssetsFromSearch,
  formatModelsForPrompt,
  MODEL_MANIFEST,
} from '../assets/assetManifest.js';
import { searchSprites } from './spriteSearch.js';
import { USE_POSTGRES } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const KNOWN_REPOS_PATH = path.join(__dirname, '..', 'data', 'known-repos.json');

// ========== KNOWN REPOS ==========

let knownRepos = null;

async function loadKnownRepos() {
  if (knownRepos) return knownRepos;
  try {
    const raw = await fs.readFile(KNOWN_REPOS_PATH, 'utf-8');
    knownRepos = JSON.parse(raw);
    return knownRepos;
  } catch (err) {
    console.error('⚠️ Could not load known-repos.json:', err.message);
    knownRepos = { repos: [] };
    return knownRepos;
  }
}

/**
 * Check if the kid's prompt matches a known repo.
 * Returns { repo, owner, hintFiles, description } or null.
 */
async function matchKnownRepo(prompt) {
  const data = await loadKnownRepos();
  const lower = (prompt || '').toLowerCase();

  for (const entry of data.repos) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        const [owner, repo] = entry.repo.split('/');
        return {
          owner,
          repo,
          hintFiles: entry.mainFiles || [],
          description: entry.description || '',
          matchedKeyword: kw,
        };
      }
    }
  }
  return null;
}

// ========== TEMPLATE LOADING ==========

/**
 * Genre-to-template mapping.
 */
const GENRE_TEMPLATE_MAP = {
  racing: 'racing.html',
  'street-racing': 'racing.html',
  driving: 'racing.html',
  shooter: 'shooter.html',
  platformer: 'platformer.html',
  frogger: 'frogger.html',
  puzzle: 'puzzle.html',
  clicker: 'clicker.html',
  rpg: 'rpg.html',
  'endless-runner': 'endless-runner.html',
  fighting: 'fighting.html',
  'tower-defense': 'tower-defense.html',
  card: 'puzzle.html',
  snake: 'snake.html',
  sports: 'sports.html',
  'brick-breaker': 'brick-breaker.html',
  flappy: 'flappy.html',
  'bubble-shooter': 'bubble-shooter.html',
  'falling-blocks': 'falling-blocks.html',
  rhythm: 'rhythm.html',
  'pet-sim': 'pet-sim.html',
  simulation: 'pet-sim.html',
  pong: 'pong.html',
  'ping-pong': 'pong.html',
  paddle: 'pong.html',
  catch: 'catch.html',
  'catch-game': 'catch.html',
  dodge: 'catch.html',
  'whack-a-mole': 'whack-a-mole.html',
  reaction: 'whack-a-mole.html',
  memory: 'memory.html',
  'memory-card': 'memory.html',
  maze: 'maze.html',
  'pac-man': 'maze.html',
  'collect-dots': 'maze.html',
  'top-down-shooter': 'top-down-shooter.html',
  'twin-stick': 'top-down-shooter.html',
  fishing: 'fishing.html',
  'fish-game': 'fishing.html',
  'simon-says': 'simon-says.html',
  sequence: 'simon-says.html',
  parking: 'parking.html',
  'car-parking': 'parking.html',
  '3d-parking': 'parking.html',
  'treasure-diver': 'treasure-diver.html',
  diver: 'treasure-diver.html',
  'trash-sorter': 'trash-sorter.html',
  sorting: 'trash-sorter.html',
  recycle: 'trash-sorter.html',
  'fruit-slice': 'fruit-slice.html',
  fruit: 'fruit-slice.html',
  slice: 'fruit-slice.html',
  'tower-stack': 'tower-stack.html',
  stack: 'tower-stack.html',
  'find-the-friend': 'find-the-friend.html',
  'hidden-object': 'find-the-friend.html',
  seek: 'find-the-friend.html',
  roblox: 'platformer.html',
  obby: 'platformer.html',
};

/**
 * Load a built-in template by genre.
 * Returns the HTML string or null.
 */
async function loadTemplate(genre) {
  const filename = GENRE_TEMPLATE_MAP[genre];
  if (!filename) return null;

  try {
    const filepath = path.join(TEMPLATES_DIR, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return { filename, content };
  } catch {
    return null;
  }
}

// ========== MAIN RESOLVER ==========

/**
 * Resolve all reference material for a given request.
 *
 * Returns a formatted string to inject into the AI's dynamic context,
 * plus metadata about what was included.
 *
 * @param {object} params
 * @param {string} params.prompt - The kid's message
 * @param {string|null} params.genre - Detected game genre
 * @param {object|null} params.gameConfig - Survey config
 * @param {boolean} params.isNewGame - Whether this is a brand-new game (no existing code)
 * @returns {Promise<{ referenceCode: string, sources: string[], totalChars: number }>}
 */
export async function resolveReferences({ prompt, genre, gameConfig, isNewGame }) {
  const sources = [];
  const parts = [];
  let charBudget = REFERENCE_MAX_CHARS;

  // Use genre from gameConfig if available
  const effectiveGenre = genre || gameConfig?.gameType || null;

  console.log(
    `🔎 Resolving references: genre="${effectiveGenre}", isNew=${isNewGame}, prompt="${(prompt || '').slice(0, 60)}..."`,
  );

  // ===== 1. CHECK FOR GITHUB URL IN PROMPT =====
  const githubRef = detectGitHubUrl(prompt);
  if (githubRef) {
    console.log(`🔗 GitHub URL detected: ${githubRef.owner}/${githubRef.repo}`);
    const result = await fetchRepoCode(githubRef.owner, githubRef.repo);
    if (result) {
      const chunk = formatGitHubReference(githubRef.owner, githubRef.repo, result);
      if (chunk.length <= charBudget) {
        parts.push(chunk);
        charBudget -= chunk.length;
        sources.push(`github:${githubRef.owner}/${githubRef.repo}`);
      }
    }
  }

  // ===== 2. CHECK KNOWN REPOS (by game name in prompt) =====
  if (!githubRef) {
    // Don't double-fetch if they already pasted a URL
    const known = await matchKnownRepo(prompt);
    if (known) {
      console.log(`📚 Known repo match: "${known.matchedKeyword}" → ${known.owner}/${known.repo}`);
      const result = await fetchRepoCode(known.owner, known.repo, known.hintFiles);
      if (result) {
        const chunk = formatGitHubReference(known.owner, known.repo, result, known.description);
        if (chunk.length <= charBudget) {
          parts.push(chunk);
          charBudget -= chunk.length;
          sources.push(`known-repo:${known.owner}/${known.repo}`);
        }
      }
    }
  }

  // ===== 3. LOAD BUILT-IN TEMPLATE (for new games) =====
  // Skip 2D templates when the prompt implies a 3D game (roblox, obby, explicit 3D, etc.)
  const lowerPrompt = (prompt || '').toLowerCase();
  const force3D =
    lowerPrompt.includes('roblox') ||
    lowerPrompt.includes('obby') ||
    lowerPrompt.includes('3d') ||
    lowerPrompt.includes('three.js') ||
    gameConfig?.dimension === '3d';

  if (isNewGame && effectiveGenre && !force3D) {
    const template = await loadTemplate(effectiveGenre);
    if (template) {
      const chunk = formatTemplateReference(template, effectiveGenre);
      if (chunk.length <= charBudget) {
        parts.push(chunk);
        charBudget -= chunk.length;
        sources.push(`template:${template.filename}`);
      }
    }
  }

  // ===== 4. INJECT ASSET LIST FOR GENRE =====
  if (effectiveGenre) {
    let assetBlock = '';
    if (USE_POSTGRES) {
      try {
        const sprites = await searchSprites({
          prompt,
          genre: effectiveGenre,
          roles: ['player', 'enemy', 'collectible', 'background'],
        });
        if (sprites && sprites.length > 0) {
          assetBlock = formatAssetsFromSearch(sprites, effectiveGenre);
          sources.push(`assets:search:${effectiveGenre}`);
        }
      } catch (err) {
        console.error('⚠️ Sprite search failed (using manifest):', err.message);
      }
    }
    if (!assetBlock) {
      assetBlock = formatAssetsForPrompt(effectiveGenre);
      if (assetBlock) sources.push(`assets:${effectiveGenre}`);
    }
    if (assetBlock && assetBlock.length <= charBudget) {
      parts.push(assetBlock);
      charBudget -= assetBlock.length;
    }
  }

  // ===== 5. INJECT 3D MODEL LIST (when prompt mentions 3D or genre has 3D models) =====
  {
    const implies3D = force3D || effectiveGenre === 'parking';

    let modelKey = null;
    if (effectiveGenre) {
      const modelGenre3D = effectiveGenre + '-3d';
      modelKey = MODEL_MANIFEST[effectiveGenre]
        ? effectiveGenre
        : MODEL_MANIFEST[modelGenre3D]
          ? modelGenre3D
          : implies3D
            ? 'common-3d'
            : null;
    } else if (implies3D) {
      modelKey = 'common-3d';
    }

    if (modelKey) {
      const modelBlock = formatModelsForPrompt(modelKey);
      if (modelBlock && modelBlock.length <= charBudget) {
        parts.push(modelBlock);
        charBudget -= modelBlock.length;
        sources.push(`models:${modelKey}`);
      }
    }
  }

  // ===== 6. LOAD RELEVANT SNIPPETS =====
  const snippets = getRelevantSnippets(effectiveGenre, prompt);
  for (const snippet of snippets) {
    if (snippet.content.length > charBudget) continue;
    parts.push(formatSnippetReference(snippet));
    charBudget -= snippet.content.length;
    sources.push(`snippet:${snippet.name}`);
  }

  // ===== BUILD FINAL REFERENCE STRING =====
  if (parts.length === 0) {
    console.log('🔎 No reference material found for this request');
    return { referenceCode: '', sources: [], totalChars: 0 };
  }

  const referenceCode = [
    "REFERENCE CODE LIBRARY (use these as a starting point — adapt to match the kid's request):",
    '',
    ...parts,
  ].join('\n');

  const totalChars = referenceCode.length;
  console.log(`📚 Reference resolved: ${sources.length} sources, ${totalChars} chars (${sources.join(', ')})`);

  return { referenceCode, sources, totalChars };
}

// ========== FORMATTING HELPERS ==========

function formatGitHubReference(owner, repo, result, description) {
  return [
    `// ══════════════════════════════════════════════════════════`,
    `// GITHUB REFERENCE: ${owner}/${repo}`,
    description ? `// ${description}` : '',
    `// Files: ${result.files.join(', ')}`,
    `// Adapt this code to match what the kid wants. Don't copy it exactly —`,
    `// use it as inspiration for mechanics, structure, and patterns.`,
    `// ══════════════════════════════════════════════════════════`,
    '',
    result.code,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatTemplateReference(template, genre) {
  return [
    `// ══════════════════════════════════════════════════════════`,
    `// BUILT-IN TEMPLATE: ${genre} (${template.filename})`,
    `// ⛔ THIS TEMPLATE USES this.load.image() FOR SPRITES — YOU MUST DO THE SAME!`,
    `// ⛔ DO NOT replace the this.load.image() calls with generateTexture() or Canvas drawing!`,
    `// ⛔ DO NOT rewrite the preload() method to use this.make.graphics()!`,
    `// Use this template as your starting point. Restyle and retheme it for the kid.`,
    `// KEEP the preload() with this.load.image() calls and the loaderror handler.`,
    `// Add .setDisplaySize(w, h) after creating sprites to size them for the game.`,
    `// ══════════════════════════════════════════════════════════`,
    '',
    template.content,
  ].join('\n');
}

function formatSnippetReference(snippet) {
  return [`// ── SNIPPET: ${snippet.name} ──`, snippet.content].join('\n');
}
