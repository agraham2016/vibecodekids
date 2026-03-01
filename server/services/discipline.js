/**
 * Progressive Discipline Service
 *
 * Tracks per-user content filter violations and escalates:
 *   1-2 violations  → warning (returned in response)
 *   3-4 violations  → 1-hour cooldown
 *   5+  violations  → 24-hour suspension + admin notification
 */

import { readUser, writeUser } from './storage.js';
import { trackSuspension } from './adminAlerts.js';

const COOLDOWN_1H_THRESHOLD = 3;
const SUSPEND_24H_THRESHOLD = 5;

/**
 * Record a content filter violation for a user and return the discipline action.
 * Returns { action: 'warn' | 'cooldown' | 'suspend', message: string }
 */
export async function recordViolation(userId) {
  if (!userId) return { action: 'warn', message: null };

  try {
    const user = await readUser(userId);
    user.filterViolations = (user.filterViolations || 0) + 1;
    user.lastViolationAt = new Date().toISOString();

    const count = user.filterViolations;

    if (count >= SUSPEND_24H_THRESHOLD) {
      trackSuspension();
      user.status = 'suspended';
      user.suspendedAt = new Date().toISOString();
      user.suspendReason = `Automatic: ${count} content filter violations`;
      const until = new Date();
      until.setHours(until.getHours() + 24);
      user.suspendedUntil = until.toISOString();
      await writeUser(userId, user);
      return {
        action: 'suspend',
        message: 'Your account has been temporarily suspended for repeated policy violations. Please review our community guidelines.',
      };
    }

    if (count >= COOLDOWN_1H_THRESHOLD) {
      const until = new Date();
      until.setHours(until.getHours() + 1);
      user.rateLimitedUntil = until.toISOString();
      await writeUser(userId, user);
      return {
        action: 'cooldown',
        message: 'You have been temporarily rate limited. Please take a break and try again later.',
      };
    }

    await writeUser(userId, user);
    return {
      action: 'warn',
      message: null,
    };
  } catch (err) {
    console.error('Discipline recording failed:', err.message);
    return { action: 'warn', message: null };
  }
}

/**
 * Get current violation count for a user (for admin display).
 */
export async function getViolationCount(userId) {
  try {
    const user = await readUser(userId);
    return user.filterViolations || 0;
  } catch {
    return 0;
  }
}
