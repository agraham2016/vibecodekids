/**
 * Data Retention Service (COPPA Compliance)
 *
 * Two sweep passes run once on startup and then daily:
 *
 * 1. Inactive under-13 cleanup — anonymize child accounts inactive
 *    longer than DATA_RETENTION_DAYS (default 365).
 *
 * 2. 30-day hard purge — physically remove user records that were
 *    soft-deleted (status === 'deleted') more than 30 days ago,
 *    fulfilling the privacy policy's "permanently removed within 30 days"
 *    commitment.
 */

import { DATA_RETENTION_DAYS } from '../config/index.js';
import { listUsers, deleteUser } from './storage.js';
import { deleteUserData } from './consent.js';
import log from './logger.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PURGE_AFTER_DAYS = 30;

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

export async function runRetentionCleanup() {
  try {
    const users = await listUsers();
    const cleaned = await sweepInactiveChildren(users);
    const purged = await purgeDeletedAccounts(users);

    if (cleaned > 0 || purged > 0) {
      log.info({ cleaned, purged }, 'Retention sweep complete');
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
