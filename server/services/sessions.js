/**
 * File-Backed Session Store
 * 
 * Persists sessions across server restarts via a JSON file.
 * Will be replaced by Redis in Phase 6.
 */

import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import { SESSIONS_FILE, SESSION_MAX_AGE_MS } from '../config/index.js';

export function generateToken() {
  return randomBytes(32).toString('hex');
}

export class SessionStore {
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
        if (session.createdAt && (now - session.createdAt) > SESSION_MAX_AGE_MS) {
          expired++;
          continue;
        }
        this._map.set(token, session);
      }
      if (expired > 0) {
        console.log(`🧹 Cleaned ${expired} expired session(s)`);
        this._dirty = true;
      }
      console.log(`📋 Loaded ${this._map.size} active session(s)`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('⚠️ Could not load sessions:', err.message);
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
      console.error('⚠️ Could not persist sessions:', err.message);
    }
  }

  get(token) {
    const session = this._map.get(token);
    if (!session) return undefined;
    if (session.createdAt && (Date.now() - session.createdAt) > SESSION_MAX_AGE_MS) {
      this._map.delete(token);
      this._dirty = true;
      return undefined;
    }
    return session;
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
