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
  'racing': 'racing.html',
  'street-racing': 'racing.html',
  'driving': 'racing.html',
  'shooter': 'shooter.html',
  'platformer': 'platformer.html',
  'frogger': 'frogger.html',
  'puzzle': 'puzzle.html',
  'clicker': 'clicker.html',
  'rpg': 'rpg.html',
  'endless-runner': 'platformer.html', // Closest match
  'fighting': 'shooter.html',          // Closest match
  'tower-defense': 'shooter.html',     // Closest match
  'card': 'puzzle.html',               // Closest match
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
  const effectiveGenre = genre || (gameConfig?.gameType) || null;

  console.log(`🔎 Resolving references: genre="${effectiveGenre}", isNew=${isNewGame}, prompt="${(prompt || '').slice(0, 60)}..."`);

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
  if (!githubRef) { // Don't double-fetch if they already pasted a URL
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
  if (isNewGame && effectiveGenre) {
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

  // ===== 4. LOAD RELEVANT SNIPPETS =====
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
    'REFERENCE CODE LIBRARY (use these as a starting point — adapt to match the kid\'s request):',
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
  ].filter(Boolean).join('\n');
}

function formatTemplateReference(template, genre) {
  return [
    `// ══════════════════════════════════════════════════════════`,
    `// BUILT-IN TEMPLATE: ${genre} (${template.filename})`,
    `// This is a working ${genre} game template. Use it as your starting point.`,
    `// Restyle, retheme, and modify it to match the kid's description.`,
    `// ══════════════════════════════════════════════════════════`,
    '',
    template.content,
  ].join('\n');
}

function formatSnippetReference(snippet) {
  return [
    `// ── SNIPPET: ${snippet.name} ──`,
    snippet.content,
  ].join('\n');
}
