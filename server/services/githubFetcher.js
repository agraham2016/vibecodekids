/**
 * GitHub Fetcher Service
 * 
 * Fetches code from public GitHub repos to use as reference material
 * for the AI when generating games. Handles:
 * - URL parsing (github.com/user/repo)
 * - GitHub API content fetching
 * - Smart file selection (prioritize HTML, JS, game logic files)
 * - In-memory cache with 24hr TTL
 * - Sanitization (strip credentials, external fetches)
 * - Character budget enforcement
 */

import { createHash } from 'crypto';
import {
  GITHUB_TOKEN,
  GITHUB_CACHE_TTL,
  GITHUB_MAX_FILE_SIZE,
  REFERENCE_MAX_CHARS,
} from '../config/index.js';

// ========== CACHE ==========

const repoCache = new Map();

// ========== URL PARSING ==========

/**
 * Extract owner/repo from various GitHub URL formats.
 * Supports:
 *   - https://github.com/owner/repo
 *   - github.com/owner/repo
 *   - owner/repo (shorthand)
 * 
 * @param {string} input - URL or shorthand
 * @returns {{ owner: string, repo: string } | null}
 */
export function parseGitHubUrl(input) {
  if (!input) return null;
  const cleaned = input.trim().replace(/\/+$/, '');

  // Full URL: https://github.com/owner/repo/...
  const urlMatch = cleaned.match(/(?:https?:\/\/)?github\.com\/([^/]+)\/([^/\s#?]+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }

  // Shorthand: owner/repo
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

/**
 * Detect a GitHub URL in a free-text prompt.
 * Returns the parsed {owner, repo} or null.
 */
export function detectGitHubUrl(prompt) {
  if (!prompt) return null;
  const match = prompt.match(/(?:https?:\/\/)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
}

// ========== GITHUB API ==========

/**
 * Build headers for GitHub API requests.
 */
function githubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VibeCodeKidz/1.0',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Fetch the file tree of a repo (recursive, up to 1000 files).
 */
async function fetchRepoTree(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const res = await fetch(url, { headers: githubHeaders() });
  
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Repository ${owner}/${repo} not found`);
    if (res.status === 403) throw new Error('GitHub API rate limit exceeded');
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return data.tree || [];
}

/**
 * Fetch a single file's content from a repo.
 */
async function fetchFileContent(owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, { headers: githubHeaders() });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  return null;
}

// ========== FILE SELECTION ==========

/**
 * Game-relevant file extensions, in priority order.
 */
const GAME_EXTENSIONS = ['.html', '.htm', '.js', '.ts', '.css'];

/**
 * Files/dirs to always skip.
 */
const SKIP_PATTERNS = [
  /node_modules/i,
  /\.git\//,
  /package-lock/,
  /\.min\./,
  /\.map$/,
  /\.test\./,
  /\.spec\./,
  /webpack/i,
  /rollup/i,
  /babel/i,
  /eslint/i,
  /tsconfig/,
  /\.d\.ts$/,
  /\.png$/i, /\.jpg$/i, /\.gif$/i, /\.svg$/i, /\.ico$/i,
  /\.mp3$/i, /\.wav$/i, /\.ogg$/i,
  /\.woff/i, /\.ttf$/i, /\.eot$/i,
];

/**
 * Priority files to look for first (common game entry points).
 */
const PRIORITY_FILENAMES = [
  'index.html', 'game.html', 'main.html',
  'game.js', 'main.js', 'app.js', 'index.js', 'script.js',
  'game.ts', 'main.ts', 'app.ts',
];

/**
 * Score a file path for relevance to game code.
 * Higher score = more relevant.
 */
function scoreFile(filePath, size) {
  const lower = filePath.toLowerCase();
  const name = lower.split('/').pop();
  let score = 0;

  // Skip obvious non-game files
  if (SKIP_PATTERNS.some(p => p.test(lower))) return -1;
  if (size > GITHUB_MAX_FILE_SIZE) return -1;

  // Priority filenames get a big boost
  if (PRIORITY_FILENAMES.includes(name)) score += 10;

  // Extension scoring
  const ext = '.' + name.split('.').pop();
  const extIdx = GAME_EXTENSIONS.indexOf(ext);
  if (extIdx >= 0) score += (GAME_EXTENSIONS.length - extIdx);
  else return -1; // Not a game-relevant extension

  // Depth penalty (prefer files closer to root)
  const depth = filePath.split('/').length - 1;
  score -= depth * 0.5;

  // Filename hints
  if (/game|player|enemy|level|scene|render|physics|collision|input|controls/i.test(name)) score += 3;
  if (/util|helper|config|constant/i.test(name)) score += 1;
  if (/readme/i.test(name)) score -= 2;

  return score;
}

/**
 * Select the most relevant files from a repo tree.
 * Respects a character budget.
 */
function selectFiles(tree, hintFiles = []) {
  // Score and sort all files
  const scored = tree
    .filter(f => f.type === 'blob')
    .map(f => ({ path: f.path, size: f.size || 0, score: scoreFile(f.path, f.size || 0) }))
    .filter(f => f.score >= 0);

  // Boost hint files (from known-repos.json mainFiles)
  for (const sf of scored) {
    if (hintFiles.some(h => sf.path.endsWith(h) || sf.path === h)) {
      sf.score += 20;
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Take files up to a budget (leave room for other reference material)
  const maxChars = Math.floor(REFERENCE_MAX_CHARS * 0.6); // 60% budget for GitHub code
  let totalChars = 0;
  const selected = [];

  for (const f of scored) {
    // Estimate chars from file size (bytes ~ chars for text)
    if (totalChars + f.size > maxChars) continue;
    selected.push(f.path);
    totalChars += f.size;
    if (selected.length >= 8) break; // Max 8 files
  }

  return selected;
}

// ========== SANITIZATION ==========

/**
 * Sanitize fetched code:
 * - Strip potential API keys / tokens
 * - Remove external fetch() / XMLHttpRequest calls
 * - Remove eval() calls
 */
function sanitizeCode(code) {
  let cleaned = code;

  // Strip potential secrets (anything that looks like an API key)
  cleaned = cleaned.replace(/(['"`])(?:sk-|api[_-]?key|token|secret|password)[^'"`]*\1/gi, "'REDACTED'");
  
  // Remove external network calls (keep internal ones)
  cleaned = cleaned.replace(/fetch\s*\(\s*['"`]https?:\/\/[^)]+\)/gi, '/* fetch removed for safety */');
  
  // Remove eval
  cleaned = cleaned.replace(/\beval\s*\(/g, '/* eval removed */ (');

  return cleaned;
}

// ========== MAIN FETCH FUNCTION ==========

/**
 * Fetch game-relevant code from a GitHub repo.
 * Returns a formatted string ready to inject into the AI prompt.
 * 
 * @param {string} owner - Repo owner
 * @param {string} repo - Repo name
 * @param {string[]} hintFiles - Optional list of known main files
 * @returns {Promise<{ code: string, files: string[], fromCache: boolean } | null>}
 */
export async function fetchRepoCode(owner, repo, hintFiles = []) {
  const cacheKey = `${owner}/${repo}`;

  // Check cache
  const cached = repoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GITHUB_CACHE_TTL) {
    console.log(`📦 GitHub cache HIT: ${cacheKey}`);
    return { ...cached.data, fromCache: true };
  }

  console.log(`🔍 Fetching GitHub repo: ${cacheKey}`);

  try {
    // 1. Get file tree
    const tree = await fetchRepoTree(owner, repo);
    if (!tree.length) return null;

    // 2. Select relevant files
    const filePaths = selectFiles(tree, hintFiles);
    if (!filePaths.length) {
      console.log(`⚠️ No game-relevant files found in ${cacheKey}`);
      return null;
    }

    console.log(`📂 Selected ${filePaths.length} files from ${cacheKey}: ${filePaths.join(', ')}`);

    // 3. Fetch file contents in parallel
    const fileContents = await Promise.all(
      filePaths.map(async (fp) => {
        const content = await fetchFileContent(owner, repo, fp);
        return content ? { path: fp, content: sanitizeCode(content) } : null;
      })
    );

    const validFiles = fileContents.filter(Boolean);
    if (!validFiles.length) return null;

    // 4. Format as a single reference string
    const parts = validFiles.map(f => 
      `// ===== FILE: ${f.path} =====\n${f.content}`
    );
    const code = parts.join('\n\n');

    // 5. Truncate if over budget
    const maxChars = Math.floor(REFERENCE_MAX_CHARS * 0.6);
    const finalCode = code.length > maxChars ? code.slice(0, maxChars) + '\n// ... (truncated)' : code;

    const result = {
      code: finalCode,
      files: validFiles.map(f => f.path),
    };

    // Cache it
    repoCache.set(cacheKey, { data: result, timestamp: Date.now() });
    console.log(`📦 GitHub cached: ${cacheKey} (${finalCode.length} chars, ${validFiles.length} files)`);

    return { ...result, fromCache: false };
  } catch (err) {
    console.error(`⚠️ GitHub fetch failed for ${cacheKey}:`, err.message);
    return null;
  }
}

/**
 * Clear the GitHub cache (for admin/testing).
 */
export function clearGitHubCache() {
  repoCache.clear();
  console.log('🗑️ GitHub cache cleared');
}
