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

// ========== STATS ==========

/**
 * Get cache statistics for monitoring.
 */
export function getResponseCacheStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    entries: cache.size,
    maxSize: RESPONSE_CACHE_MAX_SIZE,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    evictions: cacheStats.evictions,
    hitRate: total > 0 ? (cacheStats.hits / total * 100).toFixed(1) + '%' : '0%',
    claudeHits: cacheStats.claudeHits,
    grokHits: cacheStats.grokHits,
  };
}

/**
 * Clear the entire response cache (for admin/testing).
 */
export function clearResponseCache() {
  cache.clear();
  console.log('🗑️ Response cache cleared');
}
