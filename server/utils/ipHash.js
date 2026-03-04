/**
 * IP Hashing Utility (COPPA / Data Minimization)
 *
 * We never persist raw IP addresses in logs or audit trails.
 * Per non-negotiable: "IP addresses in logs: 30-day max retention, then hash or anonymize."
 * Solution: hash at write time so we never retain raw IPs.
 *
 * Use cases:
 * - Request correlation (same IP = same hash) for abuse detection
 * - Audit trail for admin actions (no raw IP exposure)
 * - Irreversible: salt prevents rainbow-table reversal
 */

import crypto from 'crypto';

const SALT = process.env.LOG_IP_SALT || 'vibecodekidz-log-salt';

export function hashIp(ip) {
  if (!ip || ip === 'unknown') return null;
  return crypto
    .createHash('sha256')
    .update(SALT + ip)
    .digest('hex')
    .slice(0, 16);
}
