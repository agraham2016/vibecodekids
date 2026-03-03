/**
 * Session Store (Auto-Switch)
 *
 * Uses Postgres-backed sessions when DATABASE_URL is set,
 * otherwise falls back to file-backed JSON persistence.
 */

import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import { SESSIONS_FILE, SESSION_MAX_AGE_MS, USE_POSTGRES } from '../config/index.js';
import log from './logger.js';

export function generateToken() {
  return randomBytes(32).toString('hex');
}

// ========== FILE-BACKED SESSION STORE ==========

class FileSessionStore {
  constructor() {
    this._map = new Map();
    this._dirty = false;
    this._loaded = false;
    this._persistTimer = null;
  }

  async load() {
    try {
      const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
      const entries = JSON.parse(data);
      const now = Date.now();
      let expired = 0;
      for (const [token, session] of entries) {
        if (session.createdAt && now - session.createdAt > SESSION_MAX_AGE_MS) {
          expired++;
          continue;
        }
        this._map.set(token, session);
      }
      if (expired > 0) {
        log.info({ expired }, 'Cleaned expired file sessions');
        this._dirty = true;
      }
      log.info({ active: this._map.size }, 'Loaded file sessions');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error({ err: err.message }, 'Could not load sessions');
      }
    }
    this._loaded = true;
  }

  async _persist() {
    if (!this._dirty) return;
    try {
      const entries = Array.from(this._map.entries());
      await fs.writeFile(SESSIONS_FILE, JSON.stringify(entries));
      this._dirty = false;
    } catch (err) {
      log.error({ err: err.message }, 'Could not persist sessions');
    }
  }

  get(token, reqContext) {
    const session = this._map.get(token);
    if (!session) return undefined;
    if (session.createdAt && Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
      this._map.delete(token);
      this._dirty = true;
      return undefined;
    }
    // Session binding: reject if User-Agent changed (blocks stolen tokens)
    if (reqContext?.userAgent && session.boundUserAgent) {
      if (reqContext.userAgent !== session.boundUserAgent) {
        log.warn({ userId: session.userId, event: 'session_ua_mismatch' }, 'Session UA mismatch — invalidating');
        this._map.delete(token);
        this._dirty = true;
        return undefined;
      }
    }
    return session;
  }

  /**
   * Rotate a session token: delete old token, create new one with same session data.
   * Returns the new token.
   */
  rotate(oldToken) {
    const session = this._map.get(oldToken);
    if (!session) return null;
    this._map.delete(oldToken);
    const newToken = generateToken();
    session.rotatedAt = Date.now();
    this._map.set(newToken, session);
    this._dirty = true;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => this._persist(), 1000);
    return newToken;
  }

  set(token, session) {
    this._map.set(token, session);
    this._dirty = true;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => this._persist(), 1000);
  }

  delete(token) {
    this._map.delete(token);
    this._dirty = true;
    clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => this._persist(), 1000);
  }
}

// ========== POSTGRES SESSION STORE ==========

class PgSessionStore {
  constructor() {
    this._pool = null;
  }

  async load() {
    const { getPool } = await import('./db.js');
    this._pool = getPool();
    // Clean expired sessions on startup
    const { rowCount } = await this._pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    if (rowCount > 0) {
      log.info({ expired: rowCount }, 'Cleaned expired pg sessions');
    }
    const { rows } = await this._pool.query('SELECT COUNT(*) FROM sessions');
    log.info({ active: rows[0].count }, 'Loaded pg sessions');
  }

  async get(token, reqContext) {
    const { rows } = await this._pool.query('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (rows.length === 0) return undefined;
    const row = rows[0];
    const session = {
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      createdAt: Number(row.created_at),
      boundUserAgent: row.bound_ua || null,
    };
    if (reqContext?.userAgent && session.boundUserAgent) {
      if (reqContext.userAgent !== session.boundUserAgent) {
        log.warn({ userId: session.userId, event: 'session_ua_mismatch' }, 'Session UA mismatch — invalidating');
        await this.delete(token);
        return undefined;
      }
    }
    return session;
  }

  async set(token, session) {
    await this._pool.query(
      `
      INSERT INTO sessions (token, user_id, username, display_name, created_at, bound_ua, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '24 hours')
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        bound_ua = EXCLUDED.bound_ua,
        expires_at = NOW() + INTERVAL '24 hours'
    `,
      [
        token,
        session.userId,
        session.username,
        session.displayName,
        session.createdAt || Date.now(),
        session.boundUserAgent || null,
      ],
    );
  }

  async delete(token) {
    await this._pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }
}

// ========== EXPORT THE RIGHT STORE ==========

export const SessionStore = USE_POSTGRES ? PgSessionStore : FileSessionStore;
