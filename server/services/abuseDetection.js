/**
 * Abuse Detection Service
 *
 * Tracks IP-level heuristics to detect and throttle:
 *   - Rapid account creation (registration spam)
 *   - Excessive failed logins (credential stuffing)
 *   - Burst content generation (bot-like behavior)
 *
 * All counters are in-memory with automatic expiry.
 * For multi-instance deployments, replace with Redis.
 */

const WINDOWS = {
  registration: { maxPerWindow: 3, windowMs: 60 * 60 * 1000 },
  failedLogin:  { maxPerWindow: 15, windowMs: 15 * 60 * 1000 },
  generate:     { maxPerWindow: 30, windowMs: 5 * 60 * 1000 },
};

const counters = new Map();

function getKey(ip, action) {
  return `${action}:${ip}`;
}

/**
 * Check whether an IP is allowed to perform an action.
 * Returns { allowed, remaining, retryAfterMs }
 */
export function checkAbuse(ip, action) {
  if (!ip || !WINDOWS[action]) return { allowed: true, remaining: Infinity };

  const key = getKey(ip, action);
  const { maxPerWindow, windowMs } = WINDOWS[action];
  const now = Date.now();
  let entry = counters.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0, blocked: false };
    counters.set(key, entry);
  }

  entry.count++;

  if (entry.count > maxPerWindow) {
    entry.blocked = true;
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: maxPerWindow - entry.count };
}

/**
 * Check if an IP is currently blocked for any action.
 */
export function isIpBlocked(ip, action) {
  const key = getKey(ip, action);
  const entry = counters.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > WINDOWS[action]?.windowMs) return false;
  return entry.blocked;
}

/**
 * Get abuse stats for admin visibility.
 */
export function getAbuseStats() {
  const now = Date.now();
  const stats = { totalTracked: 0, activeBlocks: 0 };

  for (const [key, entry] of counters) {
    const action = key.split(':')[0];
    const window = WINDOWS[action];
    if (!window) continue;
    if (now - entry.windowStart > window.windowMs) continue;
    stats.totalTracked++;
    if (entry.blocked) stats.activeBlocks++;
  }

  return stats;
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    const action = key.split(':')[0];
    const window = WINDOWS[action];
    if (!window || now - entry.windowStart > window.windowMs * 2) {
      counters.delete(key);
    }
  }
}, 5 * 60 * 1000);
