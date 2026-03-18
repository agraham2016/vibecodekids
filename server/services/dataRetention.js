/**
 * Data Retention Service (COPPA Compliance)
 *
 * Four sweep passes run once on startup and then daily:
 *
 * 1. Inactive under-13 cleanup — anonymize child accounts inactive
 *    longer than DATA_RETENTION_DAYS (default 365).
 *
 * 2. 30-day hard purge — physically remove user records that were
 *    soft-deleted (status === 'deleted') more than 30 days ago.
 *
 * 3. Demo analytics purge — remove demo events older than 90 days.
 *
 * 4. Moderation reports purge — remove resolved reports older than 90 days.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { DATA_RETENTION_DAYS, DATA_DIR, USE_POSTGRES } from '../config/index.js';
import { listUsers, deleteUser } from './storage.js';
import { deleteUserData } from './consent.js';
import log from './logger.js';
import { purgeResolvedBugReports } from './bugReports.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_AFTER_DAYS = 30;
const EPHEMERAL_RETENTION_DAYS = 90;

async function sweepInactiveChildren(users) {
  const now = Date.now();
  const thresholdMs = DATA_RETENTION_DAYS * ONE_DAY_MS;
  let cleaned = 0;

  for (const user of users) {
    if (user.ageBracket !== 'under13') continue;
    if (user.status === 'deleted') continue;

    const lastActivity = user.lastLoginAt || user.createdAt;
    if (!lastActivity) continue;

    const elapsed = now - new Date(lastActivity).getTime();
    if (elapsed > thresholdMs) {
      try {
        await deleteUserData(user.id);
        cleaned++;
        log.info(
          { userId: user.id, inactiveDays: Math.round(elapsed / ONE_DAY_MS) },
          'Retention: cleaned inactive child account',
        );
      } catch (err) {
        log.error({ userId: user.id, err: err.message }, 'Retention: failed to clean user');
      }
    }
  }

  return cleaned;
}

async function purgeDeletedAccounts(users) {
  const now = Date.now();
  const purgeThresholdMs = PURGE_AFTER_DAYS * ONE_DAY_MS;
  let purged = 0;

  for (const user of users) {
    if (user.status !== 'deleted') continue;

    const deletedAt = user.dataDeletionAt || user.deletedAt;
    if (!deletedAt) continue;

    const elapsed = now - new Date(deletedAt).getTime();
    if (elapsed > purgeThresholdMs) {
      try {
        await deleteUser(user.id);
        purged++;
        log.info({ userId: user.id }, 'Retention: hard-purged deleted account');
      } catch (err) {
        log.error({ userId: user.id, err: err.message }, 'Retention: failed to purge user');
      }
    }
  }

  return purged;
}

async function purgeMarketingEvents() {
  const eventsFile = path.join(DATA_DIR, 'marketing_events.jsonl');
  try {
    const content = await fs.readFile(eventsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const cutoff = Date.now() - EPHEMERAL_RETENTION_DAYS * ONE_DAY_MS;
    const kept = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (new Date(event.timestamp).getTime() >= cutoff) {
          kept.push(line);
        }
      } catch {
        /* skip malformed lines */
      }
    }

    const removed = lines.length - kept.length;
    if (removed > 0) {
      await fs.writeFile(eventsFile, kept.join('\n') + (kept.length ? '\n' : ''));
      log.info({ removed, remaining: kept.length }, 'Retention: purged old marketing events');
    }
    return removed;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    log.error({ err: err.message }, 'Retention: marketing events purge error');
    return 0;
  }
}

async function purgeDemoEvents() {
  const eventsFile = path.join(DATA_DIR, 'demo_events.jsonl');
  try {
    const content = await fs.readFile(eventsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const cutoff = Date.now() - EPHEMERAL_RETENTION_DAYS * ONE_DAY_MS;
    const kept = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (new Date(event.timestamp).getTime() >= cutoff) {
          kept.push(line);
        }
      } catch {
        // Skip malformed lines
      }
    }

    const removed = lines.length - kept.length;
    if (removed > 0) {
      await fs.writeFile(eventsFile, kept.join('\n') + (kept.length ? '\n' : ''));
      log.info({ removed, remaining: kept.length }, 'Retention: purged old demo events');
    }
    return removed;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    log.error({ err: err.message }, 'Retention: demo events purge error');
    return 0;
  }
}

async function purgeResolvedReports() {
  const cutoff = new Date(Date.now() - EPHEMERAL_RETENTION_DAYS * ONE_DAY_MS).toISOString();
  let removed = 0;

  if (USE_POSTGRES) {
    try {
      const { getPool } = await import('./db.js');
      const pool = getPool();
      const { rowCount } = await pool.query(
        "DELETE FROM moderation_reports WHERE status IN ('actioned', 'dismissed') AND reviewed_at < $1",
        [cutoff],
      );
      removed = rowCount;
      if (removed > 0) {
        log.info({ removed }, 'Retention: purged old moderation reports (pg)');
      }
      return removed;
    } catch (err) {
      log.error({ err: err.message }, 'Retention: moderation reports pg purge error');
    }
  }

  // File-based fallback
  const reportsFile = path.join(DATA_DIR, 'reports.jsonl');
  try {
    const content = await fs.readFile(reportsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const kept = [];

    for (const line of lines) {
      try {
        const report = JSON.parse(line);
        const isResolved = report.status === 'actioned' || report.status === 'dismissed';
        const isOld = report.reviewedAt && report.reviewedAt < cutoff;
        if (!(isResolved && isOld)) {
          kept.push(line);
        }
      } catch {
        kept.push(line);
      }
    }

    removed = lines.length - kept.length;
    if (removed > 0) {
      await fs.writeFile(reportsFile, kept.join('\n') + (kept.length ? '\n' : ''));
      log.info({ removed, remaining: kept.length }, 'Retention: purged old moderation reports (file)');
    }
    return removed;
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    log.error({ err: err.message }, 'Retention: moderation reports file purge error');
    return 0;
  }
}

async function purgeResolvedBugReportsRetention() {
  const cutoff = new Date(Date.now() - EPHEMERAL_RETENTION_DAYS * ONE_DAY_MS).toISOString();
  try {
    const removed = await purgeResolvedBugReports(cutoff);
    if (removed > 0) {
      log.info({ removed }, 'Retention: purged old bug reports');
    }
    return removed;
  } catch (err) {
    log.error({ err: err.message }, 'Retention: bug reports purge error');
    return 0;
  }
}

export async function runRetentionCleanup() {
  try {
    const users = await listUsers();
    const cleaned = await sweepInactiveChildren(users);
    const purged = await purgeDeletedAccounts(users);
    const demoEventsRemoved = await purgeDemoEvents();
    const marketingEventsRemoved = await purgeMarketingEvents();
    const reportsRemoved = await purgeResolvedReports();
    const bugReportsRemoved = await purgeResolvedBugReportsRetention();

    if (
      cleaned > 0 ||
      purged > 0 ||
      demoEventsRemoved > 0 ||
      marketingEventsRemoved > 0 ||
      reportsRemoved > 0 ||
      bugReportsRemoved > 0
    ) {
      log.info(
        { cleaned, purged, demoEventsRemoved, marketingEventsRemoved, reportsRemoved, bugReportsRemoved },
        'Retention sweep complete',
      );
    }
  } catch (err) {
    log.error({ err: err.message }, 'Retention sweep error');
  }
}

export function startRetentionSchedule() {
  runRetentionCleanup();
  setInterval(runRetentionCleanup, ONE_DAY_MS);
  log.info({ retentionDays: DATA_RETENTION_DAYS, purgeDays: PURGE_AFTER_DAYS }, 'Retention schedule started');
}
