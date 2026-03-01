/**
 * Content Filter Stats
 *
 * Tracks blocked content filter hits (anonymized).
 * In-memory counters; resets on restart.
 */

const stats = {
  totalBlocked: 0,
  bySource: new Map(), // 'generate' | 'auth' | 'projects' | 'billing' | 'esa'
  recentBlocked: [],   // last 50: { ts, source } - no content
  lastBlockedAt: null,
};

import { trackContentBlock } from './adminAlerts.js';

const MAX_RECENT = 50;

export function recordBlocked(source = 'unknown') {
  trackContentBlock();
  stats.totalBlocked++;
  const count = stats.bySource.get(source) || 0;
  stats.bySource.set(source, count + 1);
  stats.lastBlockedAt = new Date().toISOString();
  stats.recentBlocked.push({ ts: stats.lastBlockedAt, source });
  if (stats.recentBlocked.length > MAX_RECENT) {
    stats.recentBlocked = stats.recentBlocked.slice(-MAX_RECENT);
  }
}

export function getContentFilterStats() {
  return {
    totalBlocked: stats.totalBlocked,
    bySource: Object.fromEntries(stats.bySource),
    lastBlockedAt: stats.lastBlockedAt,
    recentBlocked: [...stats.recentBlocked].reverse(),
  };
}
