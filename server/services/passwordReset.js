/**
 * Password Reset Token Service
 *
 * Handles creation, lookup, and consumption of password reset tokens.
 * Supports both file-based and Postgres storage.
 * Token expiry: 1 hour (shorter than consent tokens).
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { DATA_DIR, USE_POSTGRES } from '../config/index.js';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'password_reset_tokens.json');

let fileTokens = new Map();

async function loadFileTokens() {
  if (USE_POSTGRES) return;
  try {
    const data = await fs.readFile(RESET_TOKENS_FILE, 'utf-8');
    const entries = JSON.parse(data);
    fileTokens = new Map(entries);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not load password reset tokens:', err.message);
  }
}

async function saveFileTokens() {
  if (USE_POSTGRES) return;
  try {
    await fs.writeFile(
      RESET_TOKENS_FILE,
      JSON.stringify(Array.from(fileTokens.entries()), null, 2)
    );
  } catch (err) {
    console.error('Could not save password reset tokens:', err.message);
  }
}

await loadFileTokens();

function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Create a password reset token.
 * @param {string} userId - User ID (e.g. user_username)
 * @param {string} email - Email to send reset link to (parentEmail for under-13, recoveryEmail for 13+)
 * @returns {Promise<string>} The token
 */
export async function createResetToken(userId, email) {
  const token = generateToken();
  const now = Date.now();
  const expiresAt = new Date(now + RESET_TOKEN_EXPIRY_MS).toISOString();

  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    await pool.query(
      `INSERT INTO password_reset_tokens (token, user_id, email, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token, userId, email, expiresAt]
    );
  } else {
    fileTokens.set(token, { userId, email, expiresAt });
    await saveFileTokens();
  }

  return token;
}

/**
 * Get a reset token record. Returns null if not found or expired.
 * @param {string} token - The reset token
 * @returns {Promise<{userId: string, email: string} | null>}
 */
export async function getResetByToken(token) {
  if (!token) return null;

  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT user_id, email, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    if (new Date(row.expires_at) < new Date()) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
      return null;
    }
    return { userId: row.user_id, email: row.email };
  } else {
    const record = fileTokens.get(token);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) {
      fileTokens.delete(token);
      await saveFileTokens();
      return null;
    }
    return { userId: record.userId, email: record.email };
  }
}

/**
 * Consume (delete) a reset token after successful password reset.
 * @param {string} token - The reset token
 */
export async function consumeToken(token) {
  if (!token) return;

  if (USE_POSTGRES) {
    const { getPool } = await import('./db.js');
    const pool = getPool();
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
  } else {
    fileTokens.delete(token);
    await saveFileTokens();
  }
}
