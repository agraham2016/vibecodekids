/**
 * Data Retention Service
 *
 * Automated cleanup of stale/expired data:
 * - Expired sessions (>24h)
 * - Old rate-limit entries (>1h)
 * - Resolved moderation reports (>90 days)
 * - Demo event logs (>90 days)
 * - Users who requested data deletion (>30 days after deletion request)
 *
 * Runs on a configurable interval via startRetentionJob().
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DATA_DIR, USE_POSTGRES } from '../config/index.js';
import { listUsers, readUser, writeUser, deleteUser } from './storage.js';

const DEMO_EVENTS_FILE = path.join(DATA_DIR, 'demo_events.jsonl');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.jsonl');

const MS_PER_DAY = 86_400_000;

async function purgeExpiredSessions() {
  if (!USE_POSTGRES) return 0;
  try {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    return rowCount;
  } catch { return 0; }
}

async function purgeOldRateLimitEntries() {
  if (!USE_POSTGRES) return 0;
  try {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    const { rowCount } = await pool.query("DELETE FROM rate_limit_requests WHERE requested_at < NOW() - INTERVAL '1 hour'");
    return rowCount;
  } catch { return 0; }
}

async function purgeOldDemoEvents(maxAgeDays = 90) {
  try {
    const data = await fs.readFile(DEMO_EVENTS_FILE, 'utf-8');
    const cutoff = Date.now() - maxAgeDays * MS_PER_DAY;
    const lines = data.trim().split('\n').filter(Boolean);
    let removed = 0;
    const kept = lines.filter(line => {
      try {
        const e = JSON.parse(line);
        const ts = new Date(e.timestamp || e.ts || 0).getTime();
        if (ts < cutoff) { removed++; return false; }
        return true;
      } catch { return true; }
    });
    if (removed > 0) {
      await fs.writeFile(DEMO_EVENTS_FILE, kept.join('\n') + (kept.length ? '\n' : ''));
    }
    return removed;
  } catch { return 0; }
}

async function purgeOldResolvedReports(maxAgeDays = 90) {
  try {
    if (USE_POSTGRES) {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        "DELETE FROM moderation_reports WHERE status IN ('actioned','dismissed') AND reviewed_at < NOW() - $1::INTERVAL",
        [`${maxAgeDays} days`]
      );
      return rowCount;
    }

    const data = await fs.readFile(REPORTS_FILE, 'utf-8');
    const cutoff = Date.now() - maxAgeDays * MS_PER_DAY;
    const lines = data.trim().split('\n').filter(Boolean);
    let removed = 0;
    const kept = lines.filter(line => {
      try {
        const r = JSON.parse(line);
        if ((r.status === 'actioned' || r.status === 'dismissed') && r.reviewedAt) {
          if (new Date(r.reviewedAt).getTime() < cutoff) { removed++; return false; }
        }
        return true;
      } catch { return true; }
    });
    if (removed > 0) {
      await fs.writeFile(REPORTS_FILE, kept.join('\n') + (kept.length ? '\n' : ''));
    }
    return removed;
  } catch { return 0; }
}

async function purgeDeletionRequests(graceDays = 30) {
  try {
    const users = await listUsers();
    const cutoff = Date.now() - graceDays * MS_PER_DAY;
    let purged = 0;
    for (const u of users) {
      if (u.dataDeletionRequested && u.dataDeletionAt) {
        if (new Date(u.dataDeletionAt).getTime() < cutoff) {
          try {
            await deleteUser(u.id);
            purged++;
          } catch { /* skip */ }
        }
      }
    }
    return purged;
  } catch { return 0; }
}

export async function runRetentionSweep() {
  const results = {
    sessions: await purgeExpiredSessions(),
    rateLimits: await purgeOldRateLimitEntries(),
    demoEvents: await purgeOldDemoEvents(90),
    resolvedReports: await purgeOldResolvedReports(90),
    deletedAccounts: await purgeDeletionRequests(30),
    timestamp: new Date().toISOString(),
  };

  const total = Object.values(results).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
  if (total > 0) {
    console.log(`Data retention sweep: ${JSON.stringify(results)}`);
  }
  return results;
}

let retentionTimer = null;

export function startRetentionJob(intervalMs = 6 * 60 * 60 * 1000) {
  if (retentionTimer) clearInterval(retentionTimer);

  // Run first sweep after 60s to let server finish booting
  setTimeout(() => {
    runRetentionSweep().catch(err => console.error('Retention sweep error:', err.message));
  }, 60_000);

  retentionTimer = setInterval(() => {
    runRetentionSweep().catch(err => console.error('Retention sweep error:', err.message));
  }, intervalMs);

  console.log(`Data retention job scheduled every ${Math.round(intervalMs / 3600000)}h`);
}
