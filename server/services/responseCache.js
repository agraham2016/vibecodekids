/**
 * Response Cache (Dual-Model)
 * 
 * Caches AI responses by hashing: prompt + currentCode context + model.
 * Stores responses from BOTH Claude and Grok → higher hit rate when kids
 * repeat common requests like "add lasers", "fix jump", "make it faster".
 * 
 * Key features:
 * - Deterministic hash from prompt + code snapshot + model
 * - TTL-based expiration (default 1 hour)
 * - Max size cap with LRU eviction
 * - Stats tracking (hit rate, per-model hits)
 */

import { createHash } from 'crypto';
import { RESPONSE_CACHE_TTL, RESPONSE_CACHE_MAX_SIZE } from '../config/index.js';

// ========== CACHE STORAGE ==========

const cache = new Map();

const cacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  claudeHits: 0,
  grokHits: 0,
  patternHits: 0,
  patternMisses: 0,
};

// ========== HASH FUNCTION ==========

/**
 * Generate a deterministic cache key from the request context.
 * 
 * We hash:
 * - The user's prompt (what they asked for)
 * - A fingerprint of the current code (first 2000 + last 2000 chars to keep it fast)
 * - The target model ('claude' or 'grok')
 * - The mode ('default', 'creative', 'debug', 'critic', etc.)
 * 
 * This means "add lasers" with the same base code will hit cache
 * regardless of conversation history length.
 * 
 * @param {string} prompt - The user's message
 * @param {string|null} currentCode - The current game code (can be large)
 * @param {'claude'|'grok'} model - Which model to cache for
 * @param {string} mode - The routing mode
 * @returns {string} SHA-256 hex hash as cache key
 */
export function generateCacheKey(prompt, currentCode, model, mode) {
  // Normalize prompt: lowercase, trim, collapse whitespace
  const normalizedPrompt = (prompt || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Code fingerprint: first 2000 + last 2000 chars (fast for large code)
  let codeFingerprint = '';
  if (currentCode) {
    const code = currentCode.trim();
    if (code.length <= 4000) {
      codeFingerprint = code;
    } else {
      codeFingerprint = code.slice(0, 2000) + '|||' + code.slice(-2000);
    }
  }

  const input = `${normalizedPrompt}::${codeFingerprint}::${model}::${mode}`;
  return createHash('sha256').update(input).digest('hex');
}

// ========== CACHE OPERATIONS ==========

/**
 * Look up a cached response.
 * 
 * @param {string} key - Cache key from generateCacheKey()
 * @returns {object|null} Cached entry { response, code, model, timestamp } or null
 */
export function getCachedResponse(key) {
  if (!key) return null;
  
  const entry = cache.get(key);
  if (!entry) {
    cacheStats.misses++;
    return null;
  }

  // Check TTL
  if (Date.now() - entry.timestamp > RESPONSE_CACHE_TTL) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }

  // Cache hit!
  cacheStats.hits++;
  if (entry.model === 'grok') cacheStats.grokHits++;
  else cacheStats.claudeHits++;
  
  entry.lastAccessed = Date.now();
  entry.hitCount++;

  console.log(`📦 Response cache HIT [${entry.model}] (${entry.hitCount} hits) — serving instantly`);
  return entry;
}

/**
 * Store a response in the cache.
 * 
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 * @param {string} data.response - The AI's text response (friendly message)
 * @param {string|null} data.code - The extracted game code
 * @param {'claude'|'grok'} data.model - Which model generated this
 */
export function setCachedResponse(key, { response, code, model }) {
  if (!key || !response) return;

  // Evict if at capacity (LRU: remove oldest-accessed entry)
  if (cache.size >= RESPONSE_CACHE_MAX_SIZE) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.lastAccessed < oldestTime) {
        oldestTime = v.lastAccessed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      cache.delete(oldestKey);
      cacheStats.evictions++;
    }
  }

  cache.set(key, {
    response,
    code,
    model,
    timestamp: Date.now(),
    lastAccessed: Date.now(),
    hitCount: 0,
  });

  console.log(`📦 Response cached [${model}] (${cache.size}/${RESPONSE_CACHE_MAX_SIZE} entries)`);
}

// ========== PATTERN CACHE (Prompt-Only, Ignores Code Context) ==========
//
// The primary cache above uses prompt+code as the key, so iterative changes
// (where the code changes every turn) always miss. This secondary cache keys
// on the prompt PATTERN only — so if kid A says "make it faster" and kid B
// says "make it faster" on a totally different game, we can give the AI a
// *hint* about what kind of code changes worked last time. This isn't a full
// cached response — it's a "here's what worked before" context injection.

const patternCache = new Map();
const PATTERN_CACHE_MAX = 200;
const PATTERN_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Common iteration patterns kids use. If the prompt matches one of these,
 * we store/retrieve from the pattern cache.
 */
const ITERATION_PATTERNS = [
  // Speed / difficulty
  { pattern: /\b(faster|quicker|speed up|too slow|more speed)\b/i, category: 'speed-up' },
  { pattern: /\b(slower|slow down|too fast|less speed)\b/i, category: 'slow-down' },
  { pattern: /\b(harder|more difficult|too easy|challenge)\b/i, category: 'harder' },
  { pattern: /\b(easier|too hard|simpler)\b/i, category: 'easier' },
  // Visual changes
  { pattern: /\b(change.*(color|colour)|different color|new color)\b/i, category: 'color-change' },
  { pattern: /\b(bigger|larger|make it big|increase size)\b/i, category: 'bigger' },
  { pattern: /\b(smaller|tinier|shrink|decrease size)\b/i, category: 'smaller' },
  { pattern: /\b(background|backdrop|bg color)\b/i, category: 'background' },
  // Features
  { pattern: /\b(add sound|sound effect|sfx|audio|music)\b/i, category: 'add-sound' },
  { pattern: /\b(add score|scoring|points|keep score)\b/i, category: 'add-score' },
  { pattern: /\b(add lives|health|hearts|hp)\b/i, category: 'add-lives' },
  { pattern: /\b(add power.?up|powerup|boost)\b/i, category: 'add-powerup' },
  { pattern: /\b(add enemy|enemies|bad guys|monsters)\b/i, category: 'add-enemies' },
  { pattern: /\b(add level|next level|levels|stage)\b/i, category: 'add-levels' },
  { pattern: /\b(add particle|explosion|confetti|effects)\b/i, category: 'add-effects' },
  { pattern: /\b(more fun|cooler|awesome|epic|make it better)\b/i, category: 'more-fun' },
  // Fixes
  { pattern: /\b(fix|broken|doesn.?t work|not working|bug|glitch)\b/i, category: 'fix-bug' },
  { pattern: /\b(fix.*(jump|jumping)|can.?t jump|jump.*(broken|not))\b/i, category: 'fix-jump' },
  { pattern: /\b(fix.*(collision|hit)|going through|pass through)\b/i, category: 'fix-collision' },
  { pattern: /\b(fix.*(move|movement|control)|can.?t move|stuck)\b/i, category: 'fix-movement' },
];

/**
 * Detect which iteration pattern a prompt matches (if any).
 * @param {string} prompt
 * @returns {string|null} Pattern category or null
 */
export function detectIterationPattern(prompt) {
  if (!prompt) return null;
  for (const { pattern, category } of ITERATION_PATTERNS) {
    if (pattern.test(prompt)) return category;
  }
  return null;
}

/**
 * Generate a pattern cache key from the category + genre + model.
 * Ignores the actual code content.
 */
function patternCacheKey(category, genre, model) {
  return `${category}::${genre || 'unknown'}::${model}`;
}

/**
 * Look up a pattern hint. Returns a description of what changes were
 * made previously for a similar request, or null.
 * 
 * @param {string} category - From detectIterationPattern()
 * @param {string|null} genre - Detected game genre
 * @param {string} model - 'claude' or 'grok'
 * @returns {{ hint: string, successCount: number } | null}
 */
export function getPatternHint(category, genre, model) {
  if (!category) return null;
  const key = patternCacheKey(category, genre, model);
  const entry = patternCache.get(key);
  if (!entry) {
    cacheStats.patternMisses++;
    return null;
  }
  if (Date.now() - entry.lastUpdated > PATTERN_CACHE_TTL) {
    patternCache.delete(key);
    cacheStats.patternMisses++;
    return null;
  }
  cacheStats.patternHits++;
  console.log(`🧩 Pattern cache HIT: "${category}" (${entry.successCount} past successes)`);
  return { hint: entry.hint, successCount: entry.successCount };
}

/**
 * Store what worked for a given pattern. We keep a short summary
 * of the kinds of changes that resolved the request.
 * 
 * @param {string} category - Pattern category
 * @param {string|null} genre - Game genre
 * @param {string} model - Which model succeeded
 * @param {string} prompt - The original prompt
 * @param {string} codeSummary - Brief description of what changed
 */
export function storePatternSuccess(category, genre, model, prompt, codeSummary) {
  if (!category) return;
  const key = patternCacheKey(category, genre, model);
  const existing = patternCache.get(key);

  if (existing) {
    existing.successCount++;
    existing.lastUpdated = Date.now();
    // Keep the most recent hint
    existing.hint = codeSummary;
    existing.lastPrompt = prompt;
  } else {
    // Evict if full
    if (patternCache.size >= PATTERN_CACHE_MAX) {
      const oldest = [...patternCache.entries()].sort((a, b) => a[1].lastUpdated - b[1].lastUpdated)[0];
      if (oldest) patternCache.delete(oldest[0]);
    }
    patternCache.set(key, {
      hint: codeSummary,
      successCount: 1,
      lastUpdated: Date.now(),
      lastPrompt: prompt,
    });
  }
  console.log(`🧩 Pattern cached: "${category}" for ${genre || 'unknown'}/${model}`);
}

// ========== STATS ==========

/**
 * Get cache statistics for monitoring.
 */
export function getResponseCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  const patternTotal = cacheStats.patternHits + cacheStats.patternMisses;
  return {
    responseCache: {
      entries: cache.size,
      maxSize: RESPONSE_CACHE_MAX_SIZE,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      evictions: cacheStats.evictions,
      hitRate: total > 0 ? (cacheStats.hits / total * 100).toFixed(1) + '%' : '0%',
      claudeHits: cacheStats.claudeHits,
      grokHits: cacheStats.grokHits,
    },
    patternCache: {
      entries: patternCache.size,
      maxSize: PATTERN_CACHE_MAX,
      hits: cacheStats.patternHits,
      misses: cacheStats.patternMisses,
      hitRate: patternTotal > 0 ? (cacheStats.patternHits / patternTotal * 100).toFixed(1) + '%' : '0%',
    },
  };
}

/**
 * Clear the entire response cache (for admin/testing).
 */
export function clearResponseCache() {
  cache.clear();
  console.log('🗑️ Response cache cleared');
}
