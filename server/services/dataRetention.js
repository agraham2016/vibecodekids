/**
 * Data Retention Service (COPPA Compliance)
 *
 * Automatically deletes/anonymizes inactive child (under-13) accounts
 * that have exceeded the configured DATA_RETENTION_DAYS threshold.
 *
 * Runs once on server startup and then on a daily interval.
 */

import { DATA_RETENTION_DAYS } from '../config/index.js';
import { listUsers } from './storage.js';
import { deleteUserData } from './consent.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function runRetentionCleanup() {
  try {
    const users = await listUsers();
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
          console.log(
            `Data retention: cleaned inactive child account ${user.username} (inactive ${Math.round(elapsed / ONE_DAY_MS)}d)`,
          );
        } catch (err) {
          console.error(`Data retention: failed to clean ${user.id}:`, err.message);
        }
      }
    }

    if (cleaned > 0) {
      console.log(`Data retention sweep complete: ${cleaned} inactive child account(s) cleaned`);
    }
  } catch (err) {
    console.error('Data retention sweep error:', err.message);
  }
}

export function startRetentionSchedule() {
  runRetentionCleanup();
  setInterval(runRetentionCleanup, ONE_DAY_MS);
  console.log(`Data retention: scheduled daily cleanup (threshold: ${DATA_RETENTION_DAYS} days)`);
}
