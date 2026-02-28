/**
 * Admin Audit Log
 *
 * Records admin actions for security and compliance.
 * Stored as JSONL in data/admin_audit.jsonl.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from '../config/index.js';

const AUDIT_FILE = path.join(DATA_DIR, 'admin_audit.jsonl');

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    /* dir exists */
  }
  try {
    await fs.access(AUDIT_FILE);
  } catch {
    await fs.writeFile(AUDIT_FILE, '');
  }
}

/**
 * Log an admin action.
 *
 * @param {object} opts
 * @param {string} opts.action - approve | deny | suspend | unsuspend | reset-password | delete-user | delete-project | set-tier | opt-out-improvement | cache-clear
 * @param {string} [opts.targetId] - user id, project id, etc.
 * @param {object} [opts.details] - extra context (e.g. { username, reason, tier })
 * @param {string} [opts.ip] - requester IP
 */
export async function logAdminAction({ action, targetId, details = {}, ip }) {
  await ensureFile();
  const record = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    action,
    targetId: targetId || null,
    details,
    ip: ip || null,
  };
  await fs.appendFile(AUDIT_FILE, JSON.stringify(record) + '\n');
}

/**
 * Read audit log entries.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=100]
 * @param {number} [opts.offset=0]
 * @param {string} [opts.action] - filter by action
 * @returns {Promise<object[]>}
 */
export async function readAuditLog(opts = {}) {
  try {
    await ensureFile();
    const content = await fs.readFile(AUDIT_FILE, 'utf-8');
    let lines = content.trim().split('\n').filter(Boolean);
    const entries = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (opts.action) {
      entries = entries.filter((e) => e.action === opts.action);
    }
    const offset = opts.offset || 0;
    const limit = opts.limit ?? 100;
    return entries.reverse().slice(offset, offset + limit);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
